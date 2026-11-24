import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FareSettingRule } from "@/lib/domain/fare";

export const ACTIVE_RIDE_STATUSES = [
  "requested",
  "accepted",
  "driver_arrived",
  "in_progress",
] as const;

export interface PassengerRideRecord {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  passenger_notes: string | null;
  estimated_distance_km: number;
  estimated_duration_min: number;
  estimated_fare: number;
  final_fare: number | null;
  status: string;
  cancellation_reason: string | null;
  requested_at: string;
  accepted_at: string | null;
  arrived_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  driver_id: string | null;
  vehicle_id: string | null;
}

export interface AssignedDriverDetails {
  driverId: string;
  fullName: string;
  phone: string | null;
  ratingAverage: number;
  totalCompletedRides: number;
  vehicleLabel: string | null;
  plateNumber: string | null;
}

export interface RideHistoryItem {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_fare: number;
  final_fare: number | null;
  status: string;
  created_at: string;
  driver_id: string | null;
  ratingScore: number | null;
}

export interface NotificationRecord {
  id: string;
  ride_id: string | null;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export async function getActiveFareSetting(): Promise<FareSettingRule | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("fare_settings")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    currency: data.currency,
    base_fare: Number(data.base_fare),
    per_km_rate: Number(data.per_km_rate),
    per_min_rate: Number(data.per_min_rate ?? 0),
    minimum_fare: Number(data.minimum_fare),
    waiting_fee: Number(data.waiting_fee ?? 5),
    cancellation_fee: Number(data.cancellation_fee ?? 20),
    commission_rate: Number(data.commission_rate),
  };
}

export async function getAssignedDriverDetails(
  driverId: string | null,
  vehicleId: string | null
): Promise<AssignedDriverDetails | null> {
  if (!driverId) return null;

  const supabase = await createSupabaseServerClient();
  const { data: driverRow } = await supabase
    .from("drivers")
    .select("id, user_id, rating_average, total_completed_rides")
    .eq("id", driverId)
    .maybeSingle();

  if (!driverRow) return null;

  const [{ data: profileRow }, { data: vehicleRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", driverRow.user_id)
      .maybeSingle(),
    vehicleId
      ? supabase
          .from("vehicles")
          .select("make, model, color, plate_number")
          .eq("id", vehicleId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    driverId: driverRow.id,
    fullName: profileRow?.full_name ?? "Assigned SakayNa Driver",
    phone: profileRow?.phone ?? null,
    ratingAverage: Number(driverRow.rating_average ?? 0),
    totalCompletedRides: Number(driverRow.total_completed_rides ?? 0),
    vehicleLabel: vehicleRow
      ? `${vehicleRow.make} ${vehicleRow.model} · ${vehicleRow.color}`
      : null,
    plateNumber: vehicleRow?.plate_number ?? null,
  };
}

export async function getPassengerDashboardData(passengerId: string) {
  const supabase = await createSupabaseServerClient();

  const [
    { count: totalRides },
    { count: completedRides },
    { data: activeRideRow },
    { data: recentRows },
    { data: completedFares },
  ] = await Promise.all([
    supabase
      .from("rides")
      .select("*", { count: "exact", head: true })
      .eq("passenger_id", passengerId),
    supabase
      .from("rides")
      .select("*", { count: "exact", head: true })
      .eq("passenger_id", passengerId)
      .eq("status", "completed"),
    supabase
      .from("rides")
      .select("*")
      .eq("passenger_id", passengerId)
      .in("status", [...ACTIVE_RIDE_STATUSES])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("rides")
      .select("id, pickup_address, dropoff_address, estimated_fare, final_fare, status, created_at, driver_id")
      .eq("passenger_id", passengerId)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("rides")
      .select("final_fare, estimated_fare")
      .eq("passenger_id", passengerId)
      .eq("status", "completed"),
  ]);

  const activeRide = (activeRideRow as PassengerRideRecord | null) ?? null;
  const assignedDriver = activeRide
    ? await getAssignedDriverDetails(activeRide.driver_id, activeRide.vehicle_id)
    : null;

  const totalSpent = (completedFares ?? []).reduce(
    (sum, r) => sum + Number(r.final_fare ?? r.estimated_fare ?? 0),
    0
  );

  return {
    totalRides: totalRides ?? 0,
    completedRides: completedRides ?? 0,
    totalSpent,
    activeRide,
    assignedDriver,
    recentRides: (recentRows ?? []).map((r) => ({
      ...r,
      estimated_fare: Number(r.estimated_fare),
      final_fare: r.final_fare !== null ? Number(r.final_fare) : null,
      ratingScore: null,
    })) as RideHistoryItem[],
  };
}

export async function getPassengerActiveRideData(passengerId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: activeRideRow } = await supabase
    .from("rides")
    .select("*")
    .eq("passenger_id", passengerId)
    .in("status", [...ACTIVE_RIDE_STATUSES])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let targetRideRow = activeRideRow;

  // If no currently active ride, check for the most recent completed ride awaiting rating
  if (!targetRideRow) {
    const { data: recentCompleted } = await supabase
      .from("rides")
      .select("*")
      .eq("passenger_id", passengerId)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recentCompleted) {
      const { data: existingRatingCheck } = await supabase
        .from("ratings")
        .select("id")
        .eq("ride_id", recentCompleted.id)
        .maybeSingle();

      if (!existingRatingCheck) {
        targetRideRow = recentCompleted;
      }
    }
  }

  if (!targetRideRow) {
    return { activeRide: null, assignedDriver: null, history: [], existingRating: null };
  }

  const activeRide = targetRideRow as PassengerRideRecord;
  const [assignedDriver, { data: historyRows }, { data: ratingRow }] =
    await Promise.all([
      getAssignedDriverDetails(activeRide.driver_id, activeRide.vehicle_id),
      supabase
        .from("ride_status_history")
        .select("id, previous_status, new_status, note, created_at")
        .eq("ride_id", activeRide.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("ratings")
        .select("id, score, comment")
        .eq("ride_id", activeRide.id)
        .maybeSingle(),
    ]);

  return {
    activeRide,
    assignedDriver,
    history: historyRows ?? [],
    existingRating: ratingRow ?? null,
  };
}

export async function getPassengerRideHistory(
  passengerId: string
): Promise<RideHistoryItem[]> {
  const supabase = await createSupabaseServerClient();

  const [{ data: rides }, { data: ratings }] = await Promise.all([
    supabase
      .from("rides")
      .select(
        "id, pickup_address, dropoff_address, estimated_fare, final_fare, status, created_at, driver_id"
      )
      .eq("passenger_id", passengerId)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("ratings")
      .select("ride_id, score")
      .eq("passenger_id", passengerId),
  ]);

  const ratingMap = new Map<string, number>();
  for (const r of ratings ?? []) {
    ratingMap.set(r.ride_id, Number(r.score));
  }

  return (rides ?? []).map((r) => ({
    id: r.id,
    pickup_address: r.pickup_address,
    dropoff_address: r.dropoff_address,
    estimated_fare: Number(r.estimated_fare),
    final_fare: r.final_fare !== null ? Number(r.final_fare) : null,
    status: r.status,
    created_at: r.created_at,
    driver_id: r.driver_id,
    ratingScore: ratingMap.get(r.id) ?? null,
  }));
}

export async function getPassengerNotifications(
  passengerId: string
): Promise<NotificationRecord[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, ride_id, type, title, body, is_read, created_at")
    .eq("user_id", passengerId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []) as NotificationRecord[];
}
