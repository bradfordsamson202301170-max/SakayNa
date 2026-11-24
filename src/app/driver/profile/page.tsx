import { Star } from "lucide-react";
import { ProfileForm } from "@/components/auth/AuthForms";
import { SectionCard } from "@/components/ui/Cards";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { requireRole } from "@/lib/auth/guards";
import {
  getDriverAndVehicle,
  getDriverRatingsHistory,
  type DriverRatingRow,
} from "@/lib/driver/queries";

const RATING_COLUMNS: TableColumn<DriverRatingRow>[] = [
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
    key: "ride",
    header: "Ride ID",
    render: (r) => (
      <span className="font-mono text-xs font-semibold text-[#181A20]">
        {r.ride_id.slice(0, 8).toUpperCase()}
      </span>
    ),
  },
  {
    key: "score",
    header: "Score",
    render: (r) => (
      <span className="inline-flex items-center gap-1 font-bold text-orange-600">
        <Star className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
        {r.score} / 5
      </span>
    ),
  },
  {
    key: "comment",
    header: "Passenger Feedback",
    render: (r) => r.comment || <span className="text-xs text-slate-400">No comment</span>,
  },
];

export default async function DriverProfilePage() {
  const { userId, profile, driver } = await requireRole("driver");
  const { driver: fullDriver } = await getDriverAndVehicle(userId);
  const ratings = fullDriver
    ? await getDriverRatingsHistory(fullDriver.id)
    : [];
  const approval = driver?.approval_status ?? "pending";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
            Driver Profile &amp; Rating History
          </h1>
        </div>
        <StatusBadge
          label={`Approval: ${approval}`}
          tone={
            approval === "approved"
              ? "emerald"
              : approval === "pending"
                ? "amber"
                : "red"
          }
          dot
        />
      </div>

      <SectionCard title="Driver Account Details">
        <ProfileForm
          fullName={profile.full_name}
          email={profile.email}
          phone={profile.phone ?? ""}
          roleLabel="Driver"
        />
      </SectionCard>

      <SectionCard
        title={`Passenger Rating History (${ratings.length})`}
        description={
          fullDriver
            ? `Overall average: ${fullDriver.rating_average.toFixed(2)} ★ (${fullDriver.total_ratings} ratings)`
            : undefined
        }
      >
        <DataTable
          columns={RATING_COLUMNS}
          rows={ratings}
          rowKey={(r) => r.id}
          emptyMessage="No passenger ratings received yet. Ratings appear here after completed rides."
        />
      </SectionCard>
    </div>
  );
}
