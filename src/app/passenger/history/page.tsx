import { LinkButton } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Cards";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { StatusBadge, type BadgeTone } from "@/components/ui/StatusBadge";
import { requireRole } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/domain/fare";
import {
  getPassengerRideHistory,
  type RideHistoryItem,
} from "@/lib/passenger/queries";

function statusTone(status: string): BadgeTone {
  if (status === "completed") return "emerald";
  if (["requested", "accepted", "driver_arrived", "in_progress"].includes(status))
    return "orange";
  return "slate";
}

const COLUMNS: TableColumn<RideHistoryItem>[] = [
  {
    key: "id",
    header: "Ride ID",
    render: (row) => (
      <span className="font-mono text-xs font-semibold text-[#181A20]">
        {row.id.slice(0, 8).toUpperCase()}
      </span>
    ),
  },
  {
    key: "date",
    header: "Date & Time",
    render: (row) => (
      <span className="text-xs text-slate-600">
        {new Date(row.created_at).toLocaleString()}
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
  {
    key: "rating",
    header: "Rating",
    render: (row) =>
      row.ratingScore ? (
        <span className="font-semibold text-orange-600">
          {row.ratingScore} / 5 ★
        </span>
      ) : (
        <span className="text-xs text-slate-400">—</span>
      ),
  },
];

export default async function PassengerHistoryPage() {
  const { userId } = await requireRole("passenger");
  const rides = await getPassengerRideHistory(userId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
            Ride History
          </h1>
        </div>
        <LinkButton href="/passenger/book" variant="primary" size="sm">
          Book a Ride
        </LinkButton>
      </div>

      <SectionCard
        title={`All Rides (${rides.length})`}
        description="Showing up to 50 most recent trips on your account."
      >
        {/* Mobile card list (avoids awkward horizontal table scrolling on phones) */}
        <div className="space-y-3 md:hidden">
          {rides.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              No ride history yet. Book a ride to get started!
            </p>
          ) : (
            rides.map((row) => (
              <div
                key={row.id}
                className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-[#181A20]">
                    {row.id.slice(0, 8).toUpperCase()}
                  </span>
                  <StatusBadge
                    label={row.status.replaceAll("_", " ")}
                    tone={statusTone(row.status)}
                    dot
                  />
                </div>
                <p className="text-sm font-semibold text-[#181A20]">
                  {row.pickup_address} → {row.dropoff_address}
                </p>
                <div className="flex items-center justify-between border-t border-slate-200/70 pt-2 text-slate-600">
                  <span>{new Date(row.created_at).toLocaleDateString()}</span>
                  <span className="text-sm font-bold text-orange-600">
                    {formatCurrency(row.final_fare ?? row.estimated_fare)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <DataTable
            columns={COLUMNS}
            rows={rides}
            rowKey={(r) => r.id}
            emptyMessage="No ride history yet. Book a ride to get started!"
          />
        </div>
      </SectionCard>
    </div>
  );
}
