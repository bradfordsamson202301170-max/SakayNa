import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FareSettingRule } from "@/lib/domain/fare";
import {
  aggregateRideTimeWindows,
  type DriverPerformanceRow,
  type RideSummaryInput,
} from "@/lib/domain/reports";

export interface AdminDashboardStats {
  totalPassengers: number;
  totalDrivers: number;
  approvedDrivers: number;
  pendingDrivers: number;
  activeRides: number;
  completedRides: number;
  cancelledRides: number;
  recordedFareTotal: number;
  recordedCommissionTotal: number;
}

export interface AdminPassengerRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  account_status: "active" | "suspended";
  created_at: string;
  rideCount: number;
}

export interface AdminDriverRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  license_number: string;
  approval_status: "pending" | "approved" | "rejected" | "suspended";
  availability_status: "offline" | "online" | "on_trip";
  rejection_reason: string | null;
  rating_average: number;
  total_completed_rides: number;
  vehicleLabel: string | null;
  plateNumber: string | null;
  documents: {
    profilePhotoUrl: string | null;
    licenseDocUrl: string | null;
    vehicleRegUrl: string | null;
    motorcyclePhotoUrl: string | null;
  };
}

export interface AdminMotorcycleRow {
  id: string;
  driver_id: string;
  driverName: string;
  plate_number: string;
  make: string;
  model: string;
  year: number;
  color: string;
  verification_status: "pending" | "verified" | "rejected";
  is_active: boolean;
  created_at: string;
}

export interface AdminRideRow {
  id: string;
  passengerName: string;
  driverName: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_fare: number;
  final_fare: number | null;
  status: string;
  created_at: string;
}

export interface AdminActivityLogRow {
  id: string;
  actorName: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  const supabase = await createSupabaseServerClient();

  const [
    { count: totalPassengers },
    { count: totalDrivers },
    { count: approvedDrivers },
    { count: pendingDrivers },
    { count: activeRides },
    { count: completedRides },
    { count: cancelledRides },
    { data: paymentRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "passenger"),
    supabase.from("drivers").select("*", { count: "exact", head: true }),
    supabase
      .from("drivers")
      .select("*", { count: "exact", head: true })
      .eq("approval_status", "approved"),
    supabase
      .from("drivers")
      .select("*", { count: "exact", head: true })
      .eq("approval_status", "pending"),
    supabase
      .from("rides")
      .select("*", { count: "exact", head: true })
      .in("status", ["requested", "accepted", "driver_arrived", "in_progress"]),
    supabase
      .from("rides")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed"),
    supabase
      .from("rides")
      .select("*", { count: "exact", head: true })
      .in("status", [
        "cancelled_by_passenger",
        "cancelled_by_driver",
        "cancelled_by_admin",
        "expired",
      ]),
    supabase.from("payments").select("gross_amount, platform_fee"),
  ]);

  let recordedFareTotal = 0;
  let recordedCommissionTotal = 0;
  for (const p of paymentRows ?? []) {
    recordedFareTotal += Number(p.gross_amount ?? 0);
    recordedCommissionTotal += Number(p.platform_fee ?? 0);
  }

  return {
    totalPassengers: totalPassengers ?? 0,
    totalDrivers: totalDrivers ?? 0,
    approvedDrivers: approvedDrivers ?? 0,
    pendingDrivers: pendingDrivers ?? 0,
    activeRides: activeRides ?? 0,
    completedRides: completedRides ?? 0,
    cancelledRides: cancelledRides ?? 0,
    recordedFareTotal,
    recordedCommissionTotal,
  };
}

export async function getAdminPassengers(): Promise<AdminPassengerRow[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data: profiles }, { data: rides }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, account_status, created_at")
      .eq("role", "passenger")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("rides").select("passenger_id"),
  ]);

  const countMap = new Map<string, number>();
  for (const r of rides ?? []) {
    countMap.set(r.passenger_id, (countMap.get(r.passenger_id) ?? 0) + 1);
  }

  return (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    phone: p.phone,
    account_status: p.account_status as "active" | "suspended",
    created_at: p.created_at,
    rideCount: countMap.get(p.id) ?? 0,
  }));
}

async function signDoc(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  path: string | null | undefined
): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("driver-documents")
    .createSignedUrl(path, 300);
  return data?.signedUrl ?? null;
}

export async function getAdminDrivers(
  includeSignedUrls = false
): Promise<AdminDriverRow[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data: drivers }, { data: profiles }, { data: vehicles }] =
    await Promise.all([
      supabase
        .from("drivers")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("profiles")
        .select("id, full_name, email, phone, created_at")
        .eq("role", "driver")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("vehicles")
        .select("driver_id, make, model, color, plate_number, registration_doc_path, photo_path, is_active")
        .eq("is_active", true),
    ]);

  const driverByUserId = new Map((drivers ?? []).map((d) => [d.user_id, d]));
  const vehicleMap = new Map((vehicles ?? []).map((v) => [v.driver_id, v]));

  const results: AdminDriverRow[] = [];
  for (const prof of profiles ?? []) {
    const d = driverByUserId.get(prof.id);
    const veh = d ? vehicleMap.get(d.id) : undefined;

    let documents = {
      profilePhotoUrl: null as string | null,
      licenseDocUrl: null as string | null,
      vehicleRegUrl: null as string | null,
      motorcyclePhotoUrl: null as string | null,
    };

    if (includeSignedUrls && d) {
      const [profilePhotoUrl, licenseDocUrl, vehicleRegUrl, motorcyclePhotoUrl] =
        await Promise.all([
          signDoc(supabase, d.profile_photo_path),
          signDoc(supabase, d.license_doc_path),
          signDoc(supabase, veh?.registration_doc_path ?? d.orcr_doc_path),
          signDoc(supabase, veh?.photo_path),
        ]);
      documents = {
        profilePhotoUrl,
        licenseDocUrl,
        vehicleRegUrl,
        motorcyclePhotoUrl,
      };
    }

    results.push({
      id: d?.id ?? `profile-${prof.id}`,
      user_id: prof.id,
      full_name: prof.full_name ?? "Driver",
      email: prof.email ?? "—",
      phone: prof.phone ?? null,
      address: d?.address ?? null,
      license_number: d?.license_number ?? "Awaiting Driver Confirmation / Details",
      approval_status: d?.approval_status ?? "pending",
      availability_status: d?.availability_status ?? "offline",
      rejection_reason: d?.rejection_reason ?? null,
      rating_average: Number(d?.rating_average ?? 0),
      total_completed_rides: Number(d?.total_completed_rides ?? 0),
      vehicleLabel: veh ? `${veh.make} ${veh.model} (${veh.color})` : null,
      plateNumber: veh?.plate_number ?? null,
      documents,
    });
  }

  return results;
}

export async function getAdminMotorcycles(): Promise<AdminMotorcycleRow[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data: vehicles }, { data: drivers }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("drivers").select("id, user_id"),
      supabase.from("profiles").select("id, full_name"),
    ]);

  const driverUserMap = new Map((drivers ?? []).map((d) => [d.id, d.user_id]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (vehicles ?? []).map((v) => {
    const uid = driverUserMap.get(v.driver_id);
    return {
      id: v.id,
      driver_id: v.driver_id,
      driverName: uid ? (profileMap.get(uid) ?? "Driver") : "Driver",
      plate_number: v.plate_number,
      make: v.make,
      model: v.model,
      year: Number(v.year),
      color: v.color,
      verification_status: v.verification_status,
      is_active: Boolean(v.is_active),
      created_at: v.created_at,
    };
  });
}

export async function getAdminRides(): Promise<AdminRideRow[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data: rides }, { data: drivers }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("rides")
        .select(
          "id, passenger_id, driver_id, pickup_address, dropoff_address, estimated_fare, final_fare, status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("drivers").select("id, user_id"),
      supabase.from("profiles").select("id, full_name"),
    ]);

  const driverUserMap = new Map((drivers ?? []).map((d) => [d.id, d.user_id]));
  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (rides ?? []).map((r) => {
    const dUid = r.driver_id ? driverUserMap.get(r.driver_id) : undefined;
    return {
      id: r.id,
      passengerName: profileMap.get(r.passenger_id) ?? "Passenger",
      driverName: dUid ? (profileMap.get(dUid) ?? "Driver") : "Unassigned",
      pickup_address: r.pickup_address,
      dropoff_address: r.dropoff_address,
      estimated_fare: Number(r.estimated_fare),
      final_fare: r.final_fare !== null ? Number(r.final_fare) : null,
      status: r.status,
      created_at: r.created_at,
    };
  });
}

export async function getAdminFareSetting(): Promise<FareSettingRule | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("fare_settings")
    .select("*")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (!data) return null;
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

export async function getAdminReportsData() {
  const supabase = await createSupabaseServerClient();
  const [stats, { data: rideRows }, { data: payments }, drivers] =
    await Promise.all([
      getAdminDashboardStats(),
      supabase
        .from("rides")
        .select("id, driver_id, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("payments")
        .select(
          "id, ride_id, driver_id, gross_amount, platform_fee, driver_net_earnings, payment_method, payment_status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(500),
      getAdminDrivers(false),
    ]);

  const timeWindows = aggregateRideTimeWindows(
    (rideRows ?? []) as RideSummaryInput[]
  );

  const paymentList = (payments ?? []).map((p) => ({
    id: p.id,
    ride_id: p.ride_id,
    driver_id: p.driver_id,
    gross_amount: Number(p.gross_amount),
    platform_fee: Number(p.platform_fee),
    driver_net_earnings: Number(p.driver_net_earnings),
    payment_method: p.payment_method,
    payment_status: p.payment_status,
    created_at: p.created_at,
  }));

  const totalDriverNet = paymentList.reduce(
    (sum, p) => sum + p.driver_net_earnings,
    0
  );

  const revenueByDriver = new Map<string, { gross: number; net: number }>();
  for (const p of paymentList) {
    const cur = revenueByDriver.get(p.driver_id) ?? { gross: 0, net: 0 };
    cur.gross += p.gross_amount;
    cur.net += p.driver_net_earnings;
    revenueByDriver.set(p.driver_id, cur);
  }

  const driverPerformance: DriverPerformanceRow[] = drivers
    .map((d) => {
      const rev = revenueByDriver.get(d.id) ?? { gross: 0, net: 0 };
      return {
        driverId: d.id,
        driverName: d.full_name,
        approvalStatus: d.approval_status,
        completedRides: d.total_completed_rides,
        ratingAverage: d.rating_average,
        totalRatings: 0,
        grossRevenue: Number(rev.gross.toFixed(2)),
        driverNetPayout: Number(rev.net.toFixed(2)),
      };
    })
    .sort((a, b) => b.completedRides - a.completedRides);

  return {
    stats,
    timeWindows,
    totalDriverNet,
    completionRate: timeWindows.completionRate,
    driverPerformance,
    payments: paymentList,
  };
}

export async function getAdminActivityLogs(): Promise<AdminActivityLogRow[]> {
  const supabase = await createSupabaseServerClient();
  const [{ data: logs }, { data: profiles }] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("id, full_name, email"),
  ]);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, `${p.full_name} (${p.email})`])
  );

  return (logs ?? []).map((l) => ({
    id: l.id,
    actorName: l.actor_id ? (profileMap.get(l.actor_id) ?? l.actor_id) : "System",
    action: l.action,
    entity_type: l.entity_type,
    entity_id: l.entity_id,
    metadata: (l.metadata as Record<string, unknown>) ?? {},
    created_at: l.created_at,
  }));
}
