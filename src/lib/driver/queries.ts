import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  DriverApprovalStatus,
  DriverAvailabilityStatus,
} from "@/lib/domain/driver";

export interface DriverRecord {
  id: string;
  user_id: string;
  license_number: string;
  address: string | null;
  profile_photo_path: string | null;
  license_doc_path: string | null;
  orcr_doc_path: string | null;
  gov_id_doc_path: string | null;
  approval_status: DriverApprovalStatus;
  rejection_reason: string | null;
  availability_status: DriverAvailabilityStatus;
  rating_average: number;
  total_ratings: number;
  total_completed_rides: number;
}

export interface VehicleRecord {
  id: string;
  driver_id: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color: string;
  verification_status: "pending" | "verified" | "rejected";
  is_active: boolean;
  registration_doc_path: string | null;
  photo_path: string | null;
}

export interface DriverRideItem {
  id: string;
  passenger_id: string;
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
  snapshot_commission_rate: number;
  status: string;
  created_at: string;
}

export interface DriverPaymentRow {
  id: string;
  ride_id: string;
  gross_amount: number;
  platform_fee: number;
  driver_net_earnings: number;
  payment_status: string;
  created_at: string;
}

export async function getDriverAndVehicle(userId: string): Promise<{
  driver: DriverRecord | null;
  vehicle: VehicleRecord | null;
}> {
  const supabase = await createSupabaseServerClient();

  const { data: driverRow } = await supabase
    .from("drivers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!driverRow) {
    return { driver: null, vehicle: null };
  }

  const { data: vehicleRow } = await supabase
    .from("vehicles")
    .select("*")
    .eq("driver_id", driverRow.id)
    .eq("is_active", true)
    .maybeSingle();

  return {
    driver: {
      id: driverRow.id,
      user_id: driverRow.user_id,
      license_number: driverRow.license_number,
      address: driverRow.address ?? null,
      profile_photo_path: driverRow.profile_photo_path ?? null,
      license_doc_path: driverRow.license_doc_path ?? null,
      orcr_doc_path: driverRow.orcr_doc_path ?? null,
      gov_id_doc_path: driverRow.gov_id_doc_path ?? null,
      approval_status: driverRow.approval_status,
      rejection_reason: driverRow.rejection_reason ?? null,
      availability_status: driverRow.availability_status,
      rating_average: Number(driverRow.rating_average ?? 0),
      total_ratings: Number(driverRow.total_ratings ?? 0),
      total_completed_rides: Number(driverRow.total_completed_rides ?? 0),
    },
    vehicle: vehicleRow
      ? {
          id: vehicleRow.id,
          driver_id: vehicleRow.driver_id,
          plate_number: vehicleRow.plate_number,
          make: vehicleRow.make,
          model: vehicleRow.model,
          year: Number(vehicleRow.year),
          color: vehicleRow.color,
          verification_status: vehicleRow.verification_status,
          is_active: Boolean(vehicleRow.is_active),
          registration_doc_path: vehicleRow.registration_doc_path ?? null,
          photo_path: vehicleRow.photo_path ?? null,
        }
      : null,
  };
}

export async function getDriverEarningsData(driverId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: rows } = await supabase
    .from("payments")
    .select(
      "id, ride_id, gross_amount, platform_fee, driver_net_earnings, payment_status, created_at"
    )
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false })
    .limit(50);

  const payments: DriverPaymentRow[] = (rows ?? []).map((r) => ({
    id: r.id,
    ride_id: r.ride_id,
    gross_amount: Number(r.gross_amount),
    platform_fee: Number(r.platform_fee),
    driver_net_earnings: Number(r.driver_net_earnings),
    payment_status: r.payment_status,
    created_at: r.created_at,
  }));

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  const startOfWeek = startOfToday - 6 * 24 * 60 * 60 * 1000;

  let todayNet = 0;
  let weekNet = 0;
  let lifetimeNet = 0;

  for (const p of payments) {
    const ts = new Date(p.created_at).getTime();
    lifetimeNet += p.driver_net_earnings;
    if (ts >= startOfWeek) weekNet += p.driver_net_earnings;
    if (ts >= startOfToday) todayNet += p.driver_net_earnings;
  }

  return { todayNet, weekNet, lifetimeNet, payments };
}

export async function getDriverDashboardData(userId: string) {
  const { driver, vehicle } = await getDriverAndVehicle(userId);
  if (!driver) {
    return {
      driver: null,
      vehicle: null,
      todayNet: 0,
      weekNet: 0,
      lifetimeNet: 0,
      recentRides: [] as DriverRideItem[],
      activeRide: null as DriverRideItem | null,
    };
  }

  const supabase = await createSupabaseServerClient();
  const [earnings, { data: recentRows }, { data: activeRow }] =
    await Promise.all([
      getDriverEarningsData(driver.id),
      supabase
        .from("rides")
        .select(
          "id, passenger_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, passenger_notes, estimated_distance_km, estimated_duration_min, estimated_fare, final_fare, snapshot_commission_rate, status, created_at"
        )
        .eq("driver_id", driver.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("rides")
        .select(
          "id, passenger_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, passenger_notes, estimated_distance_km, estimated_duration_min, estimated_fare, final_fare, snapshot_commission_rate, status, created_at"
        )
        .eq("driver_id", driver.id)
        .in("status", ["accepted", "driver_arrived", "in_progress"])
        .limit(1)
        .maybeSingle(),
    ]);

  const mapRide = (r: Record<string, unknown>): DriverRideItem => ({
    id: String(r.id),
    passenger_id: String(r.passenger_id),
    pickup_address: String(r.pickup_address),
    dropoff_address: String(r.dropoff_address),
    pickup_lat: Number(r.pickup_lat ?? 8.228),
    pickup_lng: Number(r.pickup_lng ?? 124.2452),
    dropoff_lat: Number(r.dropoff_lat ?? 8.2414),
    dropoff_lng: Number(r.dropoff_lng ?? 124.2439),
    passenger_notes: r.passenger_notes ? String(r.passenger_notes) : null,
    estimated_distance_km: Number(r.estimated_distance_km),
    estimated_duration_min: Number(r.estimated_duration_min),
    estimated_fare: Number(r.estimated_fare),
    final_fare: r.final_fare !== null ? Number(r.final_fare) : null,
    snapshot_commission_rate: Number(r.snapshot_commission_rate ?? 0.15),
    status: String(r.status),
    created_at: String(r.created_at),
  });

  return {
    driver,
    vehicle,
    todayNet: earnings.todayNet,
    weekNet: earnings.weekNet,
    lifetimeNet: earnings.lifetimeNet,
    recentRides: (recentRows ?? []).map((r) =>
      mapRide(r as Record<string, unknown>)
    ),
    activeRide: activeRow ? mapRide(activeRow as Record<string, unknown>) : null,
  };
}

export async function getAvailableRideRequests(
  driverId?: string
): Promise<DriverRideItem[]> {
  const supabase = await createSupabaseServerClient();

  let rejectedIds = new Set<string>();
  if (driverId) {
    const { data: rejRows } = await supabase
      .from("ride_rejections")
      .select("ride_id")
      .eq("driver_id", driverId);
    if (rejRows) {
      rejectedIds = new Set(rejRows.map((r) => String(r.ride_id)));
    }
  }

  const { data } = await supabase
    .from("rides")
    .select(
      "id, passenger_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, passenger_notes, estimated_distance_km, estimated_duration_min, estimated_fare, final_fare, snapshot_commission_rate, status, created_at"
    )
    .eq("status", "requested")
    .is("driver_id", null)
    .order("created_at", { ascending: true })
    .limit(25);

  return (data ?? [])
    .filter((r) => !rejectedIds.has(r.id))
    .map((r) => ({
      id: r.id,
      passenger_id: r.passenger_id,
      pickup_address: r.pickup_address,
      dropoff_address: r.dropoff_address,
      pickup_lat: Number(r.pickup_lat ?? 8.228),
      pickup_lng: Number(r.pickup_lng ?? 124.2452),
      dropoff_lat: Number(r.dropoff_lat ?? 8.2414),
      dropoff_lng: Number(r.dropoff_lng ?? 124.2439),
      passenger_notes: r.passenger_notes,
      estimated_distance_km: Number(r.estimated_distance_km),
      estimated_duration_min: Number(r.estimated_duration_min),
      estimated_fare: Number(r.estimated_fare),
      final_fare: r.final_fare !== null ? Number(r.final_fare) : null,
      snapshot_commission_rate: Number(r.snapshot_commission_rate ?? 0.15),
      status: r.status,
      created_at: r.created_at,
    }));
}

export interface DriverRatingRow {
  id: string;
  ride_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

export async function getDriverRatingsHistory(
  driverId: string
): Promise<DriverRatingRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("ratings")
    .select("id, ride_id, score, comment, created_at")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((r) => ({
    id: r.id,
    ride_id: r.ride_id,
    score: Number(r.score),
    comment: r.comment ?? null,
    created_at: r.created_at,
  }));
}

export async function getDriverActiveRideDetails(userId: string) {
  const { driver } = await getDriverAndVehicle(userId);
  if (!driver) return { driver: null, activeRide: null, passenger: null };

  const supabase = await createSupabaseServerClient();
  const { data: activeRow } = await supabase
    .from("rides")
    .select(
      "id, passenger_id, pickup_address, dropoff_address, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, passenger_notes, estimated_distance_km, estimated_duration_min, estimated_fare, final_fare, snapshot_commission_rate, status, created_at"
    )
    .eq("driver_id", driver.id)
    .in("status", ["accepted", "driver_arrived", "in_progress"])
    .limit(1)
    .maybeSingle();

  if (!activeRow) {
    return { driver, activeRide: null, passenger: null };
  }

  return {
    driver,
    activeRide: {
      id: activeRow.id,
      passenger_id: activeRow.passenger_id,
      pickup_address: activeRow.pickup_address,
      dropoff_address: activeRow.dropoff_address,
      pickup_lat: Number(activeRow.pickup_lat ?? 8.228),
      pickup_lng: Number(activeRow.pickup_lng ?? 124.2452),
      dropoff_lat: Number(activeRow.dropoff_lat ?? 8.2414),
      dropoff_lng: Number(activeRow.dropoff_lng ?? 124.2439),
      passenger_notes: activeRow.passenger_notes,
      estimated_distance_km: Number(activeRow.estimated_distance_km),
      estimated_duration_min: Number(activeRow.estimated_duration_min),
      estimated_fare: Number(activeRow.estimated_fare),
      final_fare: activeRow.final_fare !== null ? Number(activeRow.final_fare) : null,
      snapshot_commission_rate: Number(activeRow.snapshot_commission_rate ?? 0.15),
      status: activeRow.status,
      created_at: activeRow.created_at,
    } as DriverRideItem,
    passenger: {
      id: activeRow.passenger_id,
      label: `Passenger #${activeRow.passenger_id.slice(0, 8).toUpperCase()}`,
    },
  };
}
