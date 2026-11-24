"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import {
  buildRideFareBreakdownSnapshot,
  calculateFareEstimate,
} from "@/lib/domain/fare";
import { validateRideRequestInput } from "@/lib/domain/rideRequest";
import { fetchRoadRoute } from "@/lib/routing/osrm";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ACTIVE_RIDE_STATUSES, getActiveFareSetting } from "./queries";

export interface PassengerActionState {
  error?: string;
  success?: string;
}

export async function createRideRequestAction(
  _prevState: PassengerActionState,
  formData: FormData
): Promise<PassengerActionState> {
  const { userId } = await requireRole("passenger");

  const pickupAddress = String(formData.get("pickup_address") ?? "").trim();
  const dropoffAddress = String(formData.get("dropoff_address") ?? "").trim();
  const pickupLat = Number(formData.get("pickup_lat"));
  const pickupLng = Number(formData.get("pickup_lng"));
  const dropoffLat = Number(formData.get("dropoff_lat"));
  const dropoffLng = Number(formData.get("dropoff_lng"));
  const notes = String(formData.get("passenger_notes") ?? "").trim();

  const supabase = await createSupabaseServerClient();

  // Check BR-02: Single active ride per passenger
  const { data: existingActive } = await supabase
    .from("rides")
    .select("id")
    .eq("passenger_id", userId)
    .in("status", [...ACTIVE_RIDE_STATUSES])
    .limit(1)
    .maybeSingle();

  // Always compute distance & fare server-side from active DB fare_settings (BR-07, BR-08)
  const fareSetting = await getActiveFareSetting();
  if (!fareSetting) {
    return {
      error:
        "No active fare configuration is available. Please contact an Administrator.",
    };
  }

  const preCheck = validateRideRequestInput({
    passengerId: userId,
    pickupAddress,
    dropoffAddress,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    estimatedFare: 1,
    hasExistingActiveRide: Boolean(existingActive),
  });

  if (!preCheck.valid) {
    return { error: preCheck.error };
  }

  const route = await fetchRoadRoute(
    { lat: pickupLat, lng: pickupLng },
    { lat: dropoffLat, lng: dropoffLng }
  );
  const estimate = calculateFareEstimate(
    route.distanceKm,
    route.durationMin,
    fareSetting
  );

  const finalCheck = validateRideRequestInput({
    passengerId: userId,
    pickupAddress,
    dropoffAddress,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    estimatedFare: estimate.estimatedFare,
    hasExistingActiveRide: Boolean(existingActive),
  });
  if (!finalCheck.valid) {
    return { error: finalCheck.error };
  }

  const breakdownSnapshot = buildRideFareBreakdownSnapshot(
    fareSetting,
    estimate
  );

  const corePayload = {
    passenger_id: userId,
    fare_setting_id: fareSetting.id,
    pickup_address: pickupAddress,
    pickup_lat: pickupLat,
    pickup_lng: pickupLng,
    dropoff_address: dropoffAddress,
    dropoff_lat: dropoffLat,
    dropoff_lng: dropoffLng,
    passenger_notes: notes || null,
    estimated_distance_km: estimate.distanceKm,
    estimated_duration_min: estimate.durationMin,
    snapshot_base_fare: fareSetting.base_fare,
    snapshot_per_km_rate: fareSetting.per_km_rate,
    snapshot_per_min_rate: fareSetting.per_min_rate,
    snapshot_minimum_fare: fareSetting.minimum_fare,
    snapshot_commission_rate: fareSetting.commission_rate,
    estimated_fare: estimate.estimatedFare,
    status: "requested",
  };

  let { error: insertError } = await supabase.from("rides").insert({
    ...corePayload,
    snapshot_waiting_fee: fareSetting.waiting_fee,
    snapshot_cancellation_fee: fareSetting.cancellation_fee,
    fare_breakdown: breakdownSnapshot,
  });

  // Graceful fallback if migration 0005 has not been applied yet on the remote DB
  if (
    insertError &&
    (insertError.code === "42703" || insertError.code === "PGRST204")
  ) {
    const fallbackRes = await supabase.from("rides").insert(corePayload);
    insertError = fallbackRes.error;
  }

  if (insertError) {
    return { error: insertError.message };
  }

  revalidatePath("/passenger");
  revalidatePath("/passenger/active-ride");
  revalidatePath("/passenger/history");
  redirect("/passenger/active-ride");
}

export async function cancelPassengerRideAction(
  _prevState: PassengerActionState,
  formData: FormData
): Promise<PassengerActionState> {
  await requireRole("passenger");
  const rideId = String(formData.get("ride_id") ?? "").trim();
  const reason =
    String(formData.get("reason") ?? "").trim() || "Cancelled by passenger";

  if (!rideId) {
    return { error: "Missing ride identifier." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("transition_ride_status", {
    p_ride_id: rideId,
    p_next_status: "cancelled_by_passenger",
    p_note: reason,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/passenger");
  revalidatePath("/passenger/active-ride");
  revalidatePath("/passenger/history");
  return { success: "Your ride request has been cancelled." };
}

export async function submitDriverRatingAction(
  _prevState: PassengerActionState,
  formData: FormData
): Promise<PassengerActionState> {
  const { userId } = await requireRole("passenger");
  const rideId = String(formData.get("ride_id") ?? "").trim();
  const driverId = String(formData.get("driver_id") ?? "").trim();
  const score = Number(formData.get("score"));
  const comment = String(formData.get("comment") ?? "").trim();

  if (!rideId || !driverId || !Number.isInteger(score) || score < 1 || score > 5) {
    return { error: "Please choose a valid rating between 1 and 5 stars." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("ratings").insert({
    ride_id: rideId,
    passenger_id: userId,
    driver_id: driverId,
    score,
    comment: comment || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/passenger/history");
  revalidatePath("/passenger/active-ride");
  return { success: "Thank you! Your driver rating has been submitted." };
}

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const { userId } = await requireRole("passenger");
  const notificationId = String(formData.get("notification_id") ?? "").trim();
  if (!notificationId) return;

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);

  revalidatePath("/passenger/notifications");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const { userId } = await requireRole("passenger");
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false);

  revalidatePath("/passenger/notifications");
}
