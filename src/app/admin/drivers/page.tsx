import { LinkButton } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Cards";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getAdminDrivers, type AdminDriverRow } from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/guards";

const COLUMNS: TableColumn<AdminDriverRow>[] = [
  {
    key: "name",
    header: "Driver",
    render: (r) => (
      <div>
        <p className="font-semibold text-[#181A20]">{r.full_name}</p>
        <p className="text-xs text-slate-500">{r.email}</p>
      </div>
    ),
  },
  {
    key: "license",
    header: "License #",
    render: (r) => <span className="font-mono text-xs">{r.license_number}</span>,
  },
  {
    key: "vehicle",
    header: "Motorcycle",
    render: (r) =>
      r.vehicleLabel ? (
        <span>
          {r.vehicleLabel}{" "}
          <span className="font-mono text-xs font-semibold text-[#181A20]">
            ({r.plateNumber})
          </span>
        </span>
      ) : (
        <span className="text-xs text-slate-400">None</span>
      ),
  },
  {
    key: "approval",
    header: "Approval",
    render: (r) => (
      <StatusBadge
        label={r.approval_status}
        tone={
          r.approval_status === "approved"
            ? "emerald"
            : r.approval_status === "pending"
              ? "amber"
              : "red"
        }
        dot
      />
    ),
  },
  {
    key: "availability",
    header: "Availability",
    render: (r) => (
      <StatusBadge
        label={r.availability_status.replaceAll("_", " ")}
        tone={
          r.availability_status === "online"
            ? "blue"
            : r.availability_status === "on_trip"
              ? "orange"
              : "slate"
        }
      />
    ),
  },
  {
    key: "rides",
    header: "Completed",
    align: "right",
    render: (r) => r.total_completed_rides,
  },
];

export default async function AdminDriversPage() {
  await requireRole("admin");
  const drivers = await getAdminDrivers(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
            Driver Management
          </h1>
        </div>
        <LinkButton href="/admin/verification" variant="primary" size="sm">
          Open Driver Verification Queue
        </LinkButton>
      </div>

      <SectionCard title={`All Drivers (${drivers.length})`}>
        <DataTable
          columns={COLUMNS}
          rows={drivers}
          rowKey={(r) => r.id}
          emptyMessage="No drivers have registered yet."
        />
      </SectionCard>
    </div>
  );
}
