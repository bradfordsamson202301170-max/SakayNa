import { NextResponse } from "next/server";
import { getCurrentUserContext } from "@/lib/auth/guards";
import {
  getAdminActivityLogs,
  getAdminDrivers,
  getAdminReportsData,
  getAdminRides,
} from "@/lib/admin/queries";
import { toCsvString } from "@/lib/domain/reports";

export async function GET(request: Request) {
  const context = await getCurrentUserContext();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (context.profile.role !== "admin" || context.profile.account_status !== "active") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "rides";
  const statusFilter = (searchParams.get("status") ?? "").trim().toLowerCase();
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();

  let csv = "";
  let filename = `motogo-${type}.csv`;

  if (type === "rides") {
    let rides = await getAdminRides();
    if (statusFilter) {
      rides = rides.filter((r) => r.status.toLowerCase() === statusFilter);
    }
    if (q) {
      rides = rides.filter(
        (r) =>
          r.passengerName.toLowerCase().includes(q) ||
          r.driverName.toLowerCase().includes(q) ||
          r.pickup_address.toLowerCase().includes(q) ||
          r.dropoff_address.toLowerCase().includes(q)
      );
    }
    csv = toCsvString(
      ["Ride ID", "Passenger", "Driver", "Pickup", "Destination", "Fare", "Status", "Created At"],
      rides.map((r) => [
        r.id,
        r.passengerName,
        r.driverName,
        r.pickup_address,
        r.dropoff_address,
        r.final_fare ?? r.estimated_fare,
        r.status,
        r.created_at,
      ])
    );
  } else if (type === "payments") {
    const { payments } = await getAdminReportsData();
    csv = toCsvString(
      ["Payment ID", "Ride ID", "Method", "Status", "Gross Amount", "Platform Fee", "Driver Net", "Created At"],
      payments.map((p) => [
        p.id,
        p.ride_id,
        p.payment_method,
        p.payment_status,
        p.gross_amount,
        p.platform_fee,
        p.driver_net_earnings,
        p.created_at,
      ])
    );
  } else if (type === "driver_performance") {
    const drivers = await getAdminDrivers(false);
    csv = toCsvString(
      ["Driver ID", "Name", "Email", "Approval Status", "Completed Rides", "Average Rating", "Plate Number"],
      drivers.map((d) => [
        d.id,
        d.full_name,
        d.email,
        d.approval_status,
        d.total_completed_rides,
        d.rating_average,
        d.plateNumber ?? "",
      ])
    );
  } else if (type === "activity_logs") {
    let logs = await getAdminActivityLogs();
    if (q) {
      logs = logs.filter(
        (l) =>
          l.action.toLowerCase().includes(q) ||
          l.actorName.toLowerCase().includes(q) ||
          l.entity_type.toLowerCase().includes(q)
      );
    }
    csv = toCsvString(
      ["Log ID", "Timestamp", "Actor", "Action", "Entity Type", "Entity ID", "Metadata"],
      logs.map((l) => [
        l.id,
        l.created_at,
        l.actorName,
        l.action,
        l.entity_type,
        l.entity_id ?? "",
        JSON.stringify(l.metadata),
      ])
    );
  } else {
    return NextResponse.json({ error: "Unsupported export type." }, { status: 400 });
  }

  filename = `motogo-${type}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
