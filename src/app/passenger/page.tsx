import { CheckCircle2, Clock, MapPin, Navigation, Wallet } from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SectionCard, StatCard } from "@/components/ui/Cards";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/ErrorStates";
import { StatusBadge, type BadgeTone } from "@/components/ui/StatusBadge";
import { requireRole } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/domain/fare";
import {
  getPassengerDashboardData,
  type RideHistoryItem,
} from "@/lib/passenger/queries";

function statusTone(status: string): BadgeTone {
  if (status === "completed") return "emerald";
  if (status === "in_progress" || status === "accepted" || status === "driver_arrived")
    return "orange";
  if (status === "requested") return "blue";
  return "slate";
}

const RECENT_COLUMNS: TableColumn<RideHistoryItem>[] = [
  {
    key: "date",
    header: "Date",
    render: (row) => (
      <span className="text-xs text-slate-500">
        {new Date(row.created_at).toLocaleDateString()}
      </span>
    ),
  },
  {
    key: "route",
    header: "Route",
    render: (row) => (
      <span className="font-medium text-[#181A20]">
        {row.pickup_address} → {row.dropoff_address}
      </span>
    ),
  },
  {
    key: "fare",
    header: "Fare",
    align: "right",
    render: (row) => (
      <span className="font-semibold">
        {formatCurrency(row.final_fare ?? row.estimated_fare)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <StatusBadge
        label={row.status.replaceAll("_", " ")}
        tone={statusTone(row.status)}
        dot
      />
    ),
  },
];

export default async function PassengerDashboardPage() {
  const { userId, profile } = await requireRole("passenger");
  const { totalRides, completedRides, totalSpent, activeRide, assignedDriver, recentRides } =
    await getPassengerDashboardData(userId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#181A20] sm:text-2xl">
            Welcome back, {profile.full_name}
          </h1>
          <p className="mt-0.5 text-xs text-slate-600 sm:text-sm">
            Book a verified motorcycle ride or track your active booking.
          </p>
        </div>
        <LinkButton
          href="/passenger/book"
          variant="primary"
          className="w-full sm:w-auto"
        >
          <MapPin className="h-4 w-4" />
          Book a Ride
        </LinkButton>
      </div>

      {/* Live KPI Cards — 2x2 grid on mobile, 4 columns on desktop */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Rides"
          value={String(totalRides)}
          subtext="All bookings on your account"
          icon={<Clock className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          label="Completed Rides"
          value={String(completedRides)}
          subtext="Successfully finished trips"
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          label="Active Booking"
          value={activeRide ? activeRide.status.replaceAll("_", " ") : "None"}
          subtext={
            activeRide
              ? `${activeRide.estimated_distance_km} km · ${formatCurrency(activeRide.estimated_fare)}`
              : "Ready to book anytime"
          }
          icon={<Navigation className="h-5 w-5" />}
          accent="orange"
        />
        <StatCard
          label="Total Spent"
          value={formatCurrency(totalSpent)}
          subtext="Across completed trips"
          icon={<Wallet className="h-5 w-5" />}
          accent="blue"
        />
      </div>

      {/* Active Booking + Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Active Booking"
          description="Live status of your current trip"
          className="lg:col-span-2"
          action={
            activeRide ? (
              <StatusBadge
                label={activeRide.status.replaceAll("_", " ").toUpperCase()}
                tone="orange"
                dot
              />
            ) : (
              <StatusBadge label="No Active Ride" tone="slate" />
            )
          }
        >
          {activeRide ? (
            <div className="space-y-4">
              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Pickup
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#181A20]">
                    {activeRide.pickup_address}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">
                    Destination
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#181A20]">
                    {activeRide.dropoff_address}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  {assignedDriver ? (
                    <>
                      Assigned Driver:{" "}
                      <span className="font-semibold text-[#181A20]">
                        {assignedDriver.fullName}
                        {assignedDriver.plateNumber
                          ? ` (${assignedDriver.plateNumber})`
                          : ""}
                      </span>
                    </>
                  ) : (
                    <span>Waiting for an approved online driver to accept...</span>
                  )}
                </div>
                <LinkButton href="/passenger/active-ride" variant="navy" size="sm">
                  Open Live Tracker
                </LinkButton>
              </div>
            </div>
          ) : (
            <EmptyState
              title="You have no active ride"
              description="Need a fast, affordable ride? Estimate your fare upfront and request a verified SakayNa driver."
              action={
                <LinkButton href="/passenger/book" variant="primary" size="sm">
                  Book a Ride Now
                </LinkButton>
              }
            />
          )}
        </SectionCard>

        <SectionCard title="Quick Actions" description="Passenger portal shortcuts">
          <div className="space-y-2.5">
            <LinkButton href="/passenger/book" variant="primary" fullWidth>
              Request a New Ride
            </LinkButton>
            <LinkButton href="/passenger/history" variant="outline" fullWidth>
              View Full Ride History
            </LinkButton>
            <LinkButton href="/passenger/notifications" variant="outline" fullWidth>
              View Notifications
            </LinkButton>
            <LinkButton href="/passenger/profile" variant="outline" fullWidth>
              Manage Profile
            </LinkButton>
          </div>
        </SectionCard>
      </div>

      {/* Recent Ride History */}
      <SectionCard
        title="Recent Ride History"
        description="Your 5 most recent bookings"
        action={
          <LinkButton href="/passenger/history" variant="outline" size="sm">
            View All
          </LinkButton>
        }
      >
        <DataTable
          columns={RECENT_COLUMNS}
          rows={recentRides}
          rowKey={(r) => r.id}
          emptyMessage="You haven't taken any SakayNa rides yet. Book your first ride to see it here."
        />
      </SectionCard>
    </div>
  );
}
