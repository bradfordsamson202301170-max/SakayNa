import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Cards";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { togglePassengerStatusAction } from "@/lib/admin/actions";
import {
  getAdminPassengers,
  type AdminPassengerRow,
} from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/guards";

const COLUMNS: TableColumn<AdminPassengerRow>[] = [
  {
    key: "name",
    header: "Passenger",
    render: (r) => (
      <span className="font-semibold text-[#181A20]">{r.full_name}</span>
    ),
  },
  { key: "email", header: "Email", render: (r) => r.email },
  { key: "phone", header: "Phone", render: (r) => r.phone ?? "—" },
  {
    key: "rides",
    header: "Total Rides",
    align: "right",
    render: (r) => r.rideCount,
  },
  {
    key: "status",
    header: "Status",
    render: (r) => (
      <StatusBadge
        label={r.account_status}
        tone={r.account_status === "active" ? "emerald" : "red"}
        dot
      />
    ),
  },
  {
    key: "actions",
    header: "Action",
    align: "right",
    render: (r) => (
      <form action={togglePassengerStatusAction}>
        <input type="hidden" name="user_id" value={r.id} />
        <input
          type="hidden"
          name="next_status"
          value={r.account_status === "active" ? "suspended" : "active"}
        />
        <Button
          type="submit"
          variant={r.account_status === "active" ? "danger" : "outline"}
          size="sm"
        >
          {r.account_status === "active" ? "Suspend" : "Reactivate"}
        </Button>
      </form>
    ),
  },
];

export default async function AdminPassengersPage() {
  await requireRole("admin");
  const passengers = await getAdminPassengers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
          Passenger Management
        </h1>
      </div>

      <SectionCard title={`Registered Passengers (${passengers.length})`}>
        <DataTable
          columns={COLUMNS}
          rows={passengers}
          rowKey={(r) => r.id}
          emptyMessage="No passengers have registered yet."
        />
      </SectionCard>
    </div>
  );
}
