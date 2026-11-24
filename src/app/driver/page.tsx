import { Bike, ShieldCheck, Star, Wallet } from "lucide-react";
import { OnlineToggleControl } from "@/components/driver/DriverClientControls";
import { LinkButton } from "@/components/ui/Button";
import { SectionCard, StatCard } from "@/components/ui/Cards";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { StatusBadge, type BadgeTone } from "@/components/ui/StatusBadge";
import { requireRole } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/domain/fare";
import {
  getDriverDashboardData,
  type DriverRideItem,
} from "@/lib/driver/queries";

function approvalTone(status: string): BadgeTone {
  if (status === "approved") return "emerald";
  if (status === "pending") return "amber";
  return "red";
}

const RIDE_HISTORY_COLUMNS: TableColumn<DriverRideItem>[] = [
  {
    key: "date",
    header: "Date",
    render: (r) => (
      <span className="text-xs text-slate-500">
        {new Date(r.created_at).toLocaleDateString()}
      </span>
    ),
  },
  {
    key: "route",
    header: "Route",
    render: (r) => (
      <span className="font-medium text-[#181A20]">
        {r.pickup_address} → {r.dropoff_address}
      </span>
    ),
  },
  {
    key: "fare",
    header: "Fare",
    align: "right",
    render: (r) => (
      <span className="font-semibold">
        {formatCurrency(r.final_fare ?? r.estimated_fare)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (r) => (
      <StatusBadge
        label={r.status.replaceAll("_", " ")}
        tone={r.status === "completed" ? "emerald" : "orange"}
        dot
      />
    ),
  },
];

export default async function DriverDashboardPage() {
  const { userId, profile } = await requireRole("driver");
  const {
    driver,
    vehicle,
    todayNet,
    weekNet,
    lifetimeNet,
    recentRides,
    activeRide,
  } = await getDriverDashboardData(userId);

  const approval = driver?.approval_status ?? "pending";
  const availability = driver?.availability_status ?? "offline";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
            Welcome, {profile.full_name}
          </h1>
          <p className="mt-0.5 text-sm text-slate-600">
            Manage your approval status, online availability, motorcycle
            details, and earnings.
          </p>
        </div>

        <OnlineToggleControl
          approvalStatus={approval}
          availabilityStatus={availability}
          hasActiveVehicle={Boolean(vehicle)}
        />
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Approval Status"
          value={approval.toUpperCase()}
          subtext={
            approval === "approved"
              ? "Eligible to go online"
              : "Restricted until admin approves"
          }
          icon={<ShieldCheck className="h-5 w-5" />}
          accent={approval === "approved" ? "emerald" : "orange"}
        />
        <StatCard
          label="Today's Net Earnings"
          value={formatCurrency(todayNet)}
          subtext={`Week: ${formatCurrency(weekNet)}`}
          icon={<Wallet className="h-5 w-5" />}
          accent="orange"
        />
        <StatCard
          label="Completed Rides"
          value={String(driver?.total_completed_rides ?? 0)}
          subtext={`Lifetime net: ${formatCurrency(lifetimeNet)}`}
          icon={<Bike className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          label="Driver Rating"
          value={`${(driver?.rating_average ?? 0).toFixed(2)} ★`}
          subtext={`${driver?.total_ratings ?? 0} passenger ratings`}
          icon={<Star className="h-5 w-5" />}
          accent="blue"
        />
      </div>

      {/* Motorcycle Details + Active Ride / Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Registered Motorcycle Details"
          description="Required for Admin approval and going online (BR-01)."
          className="lg:col-span-2"
          action={
            <StatusBadge
              label={vehicle ? vehicle.verification_status : "Not Registered"}
              tone={
                vehicle?.verification_status === "verified"
                  ? "emerald"
                  : vehicle
                    ? "amber"
                    : "red"
              }
              dot
            />
          }
        >
          {vehicle ? (
            <div className="grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Brand &amp; Model</p>
                <p className="mt-1 font-bold text-[#181A20]">
                  {vehicle.make} {vehicle.model}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Plate Number</p>
                <p className="mt-1 font-mono font-bold text-[#181A20]">
                  {vehicle.plate_number}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Color &amp; Year</p>
                <p className="mt-1 font-semibold text-[#181A20]">
                  {vehicle.color} · {vehicle.year}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <p className="text-sm text-slate-600">
                No active motorcycle registered yet. Complete your Driver
                Verification to submit your bike &amp; documents.
              </p>
              <LinkButton href="/driver/verification" variant="primary" size="sm">
                Complete Verification
              </LinkButton>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs">
            <span className="text-slate-500">
              Approval Status:{" "}
              <StatusBadge label={approval} tone={approvalTone(approval)} />
            </span>
            <LinkButton href="/driver/verification" variant="outline" size="sm">
              Manage Motorcycle &amp; Documents
            </LinkButton>
          </div>
        </SectionCard>

        <SectionCard title="Driver Actions">
          <div className="space-y-2.5">
            {activeRide ? (
              <LinkButton href="/driver/active-ride" variant="primary" fullWidth>
                Resume Active Ride
              </LinkButton>
            ) : (
              <LinkButton
                href="/driver/available-rides"
                variant="primary"
                fullWidth
              >
                View Available Rides
              </LinkButton>
            )}
            <LinkButton href="/driver/verification" variant="outline" fullWidth>
              Verification &amp; Uploads
            </LinkButton>
            <LinkButton href="/driver/earnings" variant="outline" fullWidth>
              Earnings Summary
            </LinkButton>
          </div>
        </SectionCard>
      </div>

      {/* Ride History */}
      <SectionCard
        title="Recent Ride History"
        description="Trips assigned to your driver account"
      >
        <DataTable
          columns={RIDE_HISTORY_COLUMNS}
          rows={recentRides}
          rowKey={(r) => r.id}
          emptyMessage="No rides assigned yet. Once approved and online, accepted rides will appear here."
        />
      </SectionCard>
    </div>
  );
}
