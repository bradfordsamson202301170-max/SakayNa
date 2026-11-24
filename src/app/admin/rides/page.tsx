import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Cards";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { SelectInput, TextInput } from "@/components/ui/FormComponents";
import { StatusBadge, type BadgeTone } from "@/components/ui/StatusBadge";
import { getAdminRides, type AdminRideRow } from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/domain/fare";

function rideTone(status: string): BadgeTone {
  if (status === "completed") return "emerald";
  if (["accepted", "driver_arrived", "in_progress"].includes(status)) return "orange";
  if (status === "requested") return "blue";
  return "slate";
}

const COLUMNS: TableColumn<AdminRideRow>[] = [
  {
    key: "id",
    header: "Ride ID",
    render: (r) => (
      <span className="font-mono text-xs font-semibold text-[#181A20]">
        {r.id.slice(0, 8).toUpperCase()}
      </span>
    ),
  },
  { key: "passenger", header: "Passenger", render: (r) => r.passengerName },
  { key: "driver", header: "Driver", render: (r) => r.driverName },
  {
    key: "route",
    header: "Route",
    render: (r) => `${r.pickup_address} → ${r.dropoff_address}`,
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
        tone={rideTone(r.status)}
        dot
      />
    ),
  },
  {
    key: "created_at",
    header: "Requested At",
    align: "right",
    render: (r) => (
      <span className="text-xs text-slate-500">
        {new Date(r.created_at).toLocaleString()}
      </span>
    ),
  },
];

export default async function AdminRidesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const statusFilter = (params.status ?? "").trim();

  let rides = await getAdminRides();
  if (statusFilter) {
    rides = rides.filter((r) => r.status === statusFilter);
  }
  if (q) {
    const ql = q.toLowerCase();
    rides = rides.filter(
      (r) =>
        r.passengerName.toLowerCase().includes(ql) ||
        r.driverName.toLowerCase().includes(ql) ||
        r.pickup_address.toLowerCase().includes(ql) ||
        r.dropoff_address.toLowerCase().includes(ql)
    );
  }

  const exportQs = new URLSearchParams({ type: "rides" });
  if (q) exportQs.set("q", q);
  if (statusFilter) exportQs.set("status", statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
            Ride Management
          </h1>
        </div>
        <a
          href={`/api/admin/export?${exportQs.toString()}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#181A20] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1E2329]"
        >
          <Download className="h-3.5 w-3.5 text-orange-400" />
          Export Filtered Rides CSV
        </a>
      </div>

      <SectionCard
        title={`Rides (${rides.length})`}
        action={
          <form method="GET" className="flex flex-wrap items-center gap-2">
            <TextInput
              name="q"
              defaultValue={q}
              placeholder="Search passenger, driver, route..."
              className="w-56 py-1.5 text-xs"
            />
            <SelectInput
              name="status"
              defaultValue={statusFilter}
              className="w-44 py-1.5 text-xs"
            >
              <option value="">All Statuses</option>
              <option value="requested">Requested</option>
              <option value="accepted">Accepted</option>
              <option value="driver_arrived">Driver Arrived</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled_by_passenger">Cancelled (Passenger)</option>
              <option value="cancelled_by_driver">Cancelled (Driver)</option>
            </SelectInput>
            <Button type="submit" variant="primary" size="sm">
              Filter
            </Button>
          </form>
        }
      >
        <DataTable
          columns={COLUMNS}
          rows={rides}
          rowKey={(r) => r.id}
          emptyMessage="No rides match your current search or filter."
        />
      </SectionCard>
    </div>
  );
}
