import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Cards";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { updateMotorcycleStatusAction } from "@/lib/admin/actions";
import {
  getAdminMotorcycles,
  type AdminMotorcycleRow,
} from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/guards";

const COLUMNS: TableColumn<AdminMotorcycleRow>[] = [
  {
    key: "plate",
    header: "Plate #",
    render: (r) => (
      <span className="font-mono text-xs font-bold text-[#181A20]">
        {r.plate_number}
      </span>
    ),
  },
  {
    key: "model",
    header: "Motorcycle",
    render: (r) => `${r.make} ${r.model} (${r.year}) · ${r.color}`,
  },
  { key: "driver", header: "Driver", render: (r) => r.driverName },
  {
    key: "verification",
    header: "Verification",
    render: (r) => (
      <StatusBadge
        label={r.verification_status}
        tone={
          r.verification_status === "verified"
            ? "emerald"
            : r.verification_status === "pending"
              ? "amber"
              : "red"
        }
        dot
      />
    ),
  },
  {
    key: "active",
    header: "Active",
    render: (r) => (
      <StatusBadge
        label={r.is_active ? "Active" : "Inactive"}
        tone={r.is_active ? "blue" : "slate"}
      />
    ),
  },
  {
    key: "actions",
    header: "Actions",
    align: "right",
    render: (r) => (
      <div className="inline-flex gap-2">
        {r.verification_status !== "verified" && (
          <form action={updateMotorcycleStatusAction}>
            <input type="hidden" name="vehicle_id" value={r.id} />
            <input type="hidden" name="verification_status" value="verified" />
            <Button type="submit" variant="primary" size="sm">
              Verify
            </Button>
          </form>
        )}
        <form action={updateMotorcycleStatusAction}>
          <input type="hidden" name="vehicle_id" value={r.id} />
          <input
            type="hidden"
            name="is_active"
            value={r.is_active ? "false" : "true"}
          />
          <Button type="submit" variant="outline" size="sm">
            {r.is_active ? "Deactivate" : "Activate"}
          </Button>
        </form>
      </div>
    ),
  },
];

export default async function AdminMotorcyclesPage() {
  await requireRole("admin");
  const motorcycles = await getAdminMotorcycles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
          Motorcycle Management
        </h1>
      </div>

      <SectionCard title={`Registered Motorcycles (${motorcycles.length})`}>
        <DataTable
          columns={COLUMNS}
          rows={motorcycles}
          rowKey={(r) => r.id}
          emptyMessage="No motorcycles have been registered yet."
        />
      </SectionCard>
    </div>
  );
}
