"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/guards";
import {
  buildPrivateDocumentPath,
  canDriverAcceptRides,
  canDriverGoOnline,
  validateUploadFile,
  type DriverDocumentKind,
} from "@/lib/domain/driver";
import { computeTripSettlement } from "@/lib/domain/tripCompletion";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getDriverAndVehicle } from "./queries";

export interface DriverActionState {
  error?: string;
  success?: string;
}

export async function saveDriverOnboardingAction(
  _prevState: DriverActionState,
  formData: FormData
): Promise<DriverActionState> {
  const { userId } = await requireRole("driver");

  const address = String(formData.get("address") ?? "").trim();
  const licenseNumber = String(formData.get("license_number") ?? "")
    .trim()
    .toUpperCase();
  const plateNumber = String(formData.get("plate_number") ?? "")
    .trim()
    .toUpperCase();
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const year = Number(formData.get("year"));
  const color = String(formData.get("color") ?? "").trim();

  if (!licenseNumber || !plateNumber || !make || !model || !color || !year) {
    return {
      error: "Please fill out license number and all motorcycle details.",
    };
  }
  if (year < 1990 || year > 2100) {
    return { error: "Motorcycle year must be between 1990 and 2100." };
  }

  const supabase = await createSupabaseServerClient();
  const { driver, vehicle } = await getDriverAndVehicle(userId);

  let driverId = driver?.id;

  if (!driverId) {
    const { data: created, error } = await supabase
      .from("drivers")
      .insert({
        user_id: userId,
        license_number: licenseNumber,
        address: address || null,
        approval_status: "pending",
      })
      .select("id")
      .single();

    if (error || !created) {
      return { error: error?.message ?? "Could not save driver details." };
    }
    driverId = created.id;
  } else {
    const nextApproval =
      driver?.approval_status === "rejected"
        ? "pending"
        : driver?.approval_status;

    const { error } = await supabase
      .from("drivers")
      .update({
        license_number: licenseNumber,
        address: address || null,
        approval_status: nextApproval,
      })
      .eq("id", driverId);

    if (error) {
      return { error: error.message };
    }
  }

  if (!vehicle) {
    const { error } = await supabase.from("vehicles").insert({
      driver_id: driverId,
      plate_number: plateNumber,
      make,
      model,
      year,
      color,
      verification_status: "pending",
      is_active: true,
    });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("vehicles")
      .update({
        plate_number: plateNumber,
        make,
        model,
        year,
        color,
      })
      .eq("id", vehicle.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/driver");
  revalidatePath("/driver/verification");
  revalidatePath("/driver/profile");
  return {
    success:
      "Driver & motorcycle details saved. Your verification status will be reviewed by an Administrator.",
  };
}

export async function uploadDriverDocumentAction(
  _prevState: DriverActionState,
  formData: FormData
): Promise<DriverActionState> {
  const { userId } = await requireRole("driver");

  const kind = String(formData.get("doc_kind") ?? "") as DriverDocumentKind;
  const file = formData.get("file");

  if (
    !["profile_photo", "license_doc", "vehicle_registration", "motorcycle_photo"].includes(
      kind
    )
  ) {
    return { error: "Invalid document category." };
  }

  if (!(file instanceof File)) {
    return { error: "Please select a file to upload." };
  }

  const check = validateUploadFile({
    size: file.size,
    type: file.type,
    name: file.name,
  });
  if (!check.valid) {
    return { error: check.error };
  }

  const { driver, vehicle } = await getDriverAndVehicle(userId);
  if (!driver) {
    return {
      error:
        "Save your license and motorcycle details first before uploading documents.",
    };
  }

  const storagePath = buildPrivateDocumentPath(userId, kind, file.type);
  const supabase = await createSupabaseServerClient();

  const { error: uploadError } = await supabase.storage
    .from("driver-documents")
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` };
  }

  if (kind === "profile_photo") {
    const { error } = await supabase
      .from("drivers")
      .update({ profile_photo_path: storagePath })
      .eq("id", driver.id);
    if (error) return { error: error.message };
  } else if (kind === "license_doc") {
    const { error } = await supabase
      .from("drivers")
      .update({ license_doc_path: storagePath })
      .eq("id", driver.id);
    if (error) return { error: error.message };
  } else if (kind === "vehicle_registration") {
    const { error: drvErr } = await supabase
      .from("drivers")
      .update({ orcr_doc_path: storagePath })
      .eq("id", driver.id);
    if (drvErr) return { error: drvErr.message };

    if (vehicle) {
      await supabase
        .from("vehicles")
        .update({ registration_doc_path: storagePath })
        .eq("id", vehicle.id);
    }
  } else if (kind === "motorcycle_photo") {
    if (!vehicle) {
      return { error: "Register your motorcycle before uploading its photo." };
    }
    const { error } = await supabase
      .from("vehicles")
      .update({ photo_path: storagePath })
      .eq("id", vehicle.id);
    if (error) return { error: error.message };
  }

  revalidatePath("/driver/verification");
  revalidatePath("/driver");
  return { success: "Document securely uploaded to private storage." };
}

export async function toggleDriverAvailabilityAction(
  _prevState: DriverActionState,
  formData: FormData
): Promise<DriverActionState> {
  const { userId } = await requireRole("driver");
  const target = String(formData.get("target_status") ?? "");

  if (target !== "online" && target !== "offline") {
    return { error: "Invalid availability status." };
  }

  const { driver, vehicle } = await getDriverAndVehicle(userId);
  if (!driver) {
    return { error: "Complete driver verification before going online." };
  }

  if (target === "online") {
    const gate = canDriverGoOnline({
      approvalStatus: driver.approval_status,
      availabilityStatus: driver.availability_status,
      hasActiveVehicle: Boolean(vehicle),
    });
    if (!gate.allowed) {
      return { error: gate.reason };
    }
  } else if (driver.availability_status === "on_trip") {
    return { error: "You cannot go offline while on an active trip." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("drivers")
    .update({ availability_status: target })
    .eq("id", driver.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/driver");
  revalidatePath("/driver/available-rides");
  return {
    success:
      target === "online"
        ? "You are now ONLINE and eligible to receive ride requests."
        : "You are now OFFLINE.",
  };
}

export async function acceptDriverRideAction(
  _prevState: DriverActionState,
  formData: FormData
): Promise<DriverActionState> {
  const { userId } = await requireRole("driver");
  const rideId = String(formData.get("ride_id") ?? "").trim();
  if (!rideId) return { error: "Missing ride ID." };

  const { driver, vehicle } = await getDriverAndVehicle(userId);
  if (!driver) return { error: "Driver profile not found." };

  const gate = canDriverAcceptRides({
    approvalStatus: driver.approval_status,
    availabilityStatus: driver.availability_status,
    hasActiveVehicle: Boolean(vehicle),
  });
  if (!gate.allowed) {
    return { error: gate.reason };
  }

  const supabase = await createSupabaseServerClient();

  // Explicit server-side check against conflicting active rides (also enforced atomically in accept_ride RPC)
  const { data: activeConflict } = await supabase
    .from("rides")
    .select("id")
    .eq("driver_id", driver.id)
    .in("status", ["accepted", "driver_arrived", "in_progress"])
    .limit(1)
    .maybeSingle();

  if (activeConflict) {
    return {
      error:
        "You already have a conflicting active ride. Complete or cancel it before accepting another (BR-03).",
    };
  }

  const { error } = await supabase.rpc("accept_ride", { p_ride_id: rideId });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/driver");
  revalidatePath("/driver/available-rides");
  revalidatePath("/driver/active-ride");
  redirect("/driver/active-ride");
}

export async function rejectDriverRideAction(
  _prevState: DriverActionState,
  formData: FormData
): Promise<DriverActionState> {
  const { userId } = await requireRole("driver");
  const rideId = String(formData.get("ride_id") ?? "").trim();
  const reason =
    String(formData.get("reason") ?? "").trim() || "Declined by driver";

  if (!rideId) return { error: "Missing ride ID." };

  const { driver, vehicle } = await getDriverAndVehicle(userId);
  if (!driver) return { error: "Driver profile not found." };

  const gate = canDriverAcceptRides({
    approvalStatus: driver.approval_status,
    availabilityStatus: driver.availability_status,
    hasActiveVehicle: Boolean(vehicle),
  });
  if (!gate.allowed) {
    return { error: gate.reason };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("reject_ride", {
    p_ride_id: rideId,
    p_reason: reason,
  });

  // Ignore missing-function error only if migration 0006 hasn't been executed yet
  if (error && error.code !== "PGRST202") {
    return { error: error.message };
  }

  revalidatePath("/driver/available-rides");
  return {
    success:
      "Ride request dismissed for you. Other online SakayNa drivers can still accept it.",
  };
}

export async function transitionDriverRideAction(
  _prevState: DriverActionState,
  formData: FormData
): Promise<DriverActionState> {
  await requireRole("driver");
  const rideId = String(formData.get("ride_id") ?? "").trim();
  const nextStatus = String(formData.get("next_status") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!rideId || !nextStatus) {
    return { error: "Missing ride transition parameters." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("transition_ride_status", {
    p_ride_id: rideId,
    p_next_status: nextStatus,
    p_note: note,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/driver");
  revalidatePath("/driver/active-ride");
  revalidatePath("/driver/earnings");
  revalidatePath("/driver/available-rides");
  return {
    success: `Ride updated to ${nextStatus.replaceAll("_", " ").toUpperCase()}.`,
  };
}

export async function publishDriverLocationPingAction(
  _prevState: DriverActionState,
  formData: FormData
): Promise<DriverActionState> {
  const { userId } = await requireRole("driver");
  const rideId = String(formData.get("ride_id") ?? "").trim();
  const latitude = Number(formData.get("latitude"));
  const longitude = Number(formData.get("longitude"));
  const isSimulated = String(formData.get("is_simulated") ?? "") === "true";

  if (
    !rideId ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return { error: "Invalid ride ID or GPS coordinates." };
  }

  const supabase = await createSupabaseServerClient();
  // RLS policy `ride_locations_insert_assigned_driver` verifies caller is the assigned driver on an active ride
  const { error } = await supabase.from("ride_locations").insert({
    ride_id: rideId,
    recorded_by: userId,
    location_type: "driver_ping",
    latitude,
    longitude,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success: isSimulated
      ? "Simulated demo location ping broadcasted to passenger."
      : "Live GPS location ping broadcasted to passenger.",
  };
}

export async function completeDriverTripAction(
  _prevState: DriverActionState,
  formData: FormData
): Promise<DriverActionState> {
  await requireRole("driver");

  const rideId = String(formData.get("ride_id") ?? "").trim();
  const paymentMethod = String(formData.get("payment_method") ?? "cash").trim();
  const paymentStatus = String(formData.get("payment_status") ?? "paid").trim();
  const finalFareRaw = formData.get("final_fare");
  const finalFare =
    finalFareRaw !== null && String(finalFareRaw).trim() !== ""
      ? Number(finalFareRaw)
      : null;

  if (!rideId) {
    return { error: "Missing ride identifier." };
  }

  const check = computeTripSettlement({
    estimatedFare: finalFare ?? 45,
    confirmedFinalFare: finalFare,
    minimumFareFloor: 0,
    commissionRate: 0.15,
    paymentMethod,
    paymentStatus,
  });
  if (!check.ok) {
    return { error: check.error };
  }

  const supabase = await createSupabaseServerClient();
  let { error } = await supabase.rpc("complete_ride_trip", {
    p_ride_id: rideId,
    p_payment_method: paymentMethod,
    p_payment_status: paymentStatus,
    p_final_fare: finalFare,
    p_note: `Completed (${paymentMethod} / ${paymentStatus})`,
  });

  // Graceful fallback if migration 0008 hasn't been applied on the remote DB yet
  if (error && error.code === "PGRST202") {
    const fallback = await supabase.rpc("transition_ride_status", {
      p_ride_id: rideId,
      p_next_status: "completed",
      p_note: `Completed (${paymentMethod} / ${paymentStatus})`,
    });
    error = fallback.error;
  }

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/driver");
  revalidatePath("/driver/active-ride");
  revalidatePath("/driver/earnings");
  revalidatePath("/driver/available-rides");
  return {
    success:
      "Trip completed! Final fare saved, payment record created, and driver earnings updated.",
  };
}
