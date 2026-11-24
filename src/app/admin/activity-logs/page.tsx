import { Download } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Cards";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { TextInput } from "@/components/ui/FormComponents";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getAdminActivityLogs,
  type AdminActivityLogRow,
} from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/guards";

const COLUMNS: TableColumn<AdminActivityLogRow>[] = [
  {
    key: "timestamp",
    header: "Timestamp",
    render: (r) => (
      <span className="text-xs text-slate-500">
        {new Date(r.created_at).toLocaleString()}
      </span>
    ),
  },
  {
    key: "actor",
    header: "Actor",
    render: (r) => (
      <span className="font-semibold text-[#181A20]">{r.actorName}</span>
    ),
  },
  {
    key: "action",
    header: "Action",
    render: (r) => <StatusBadge label={r.action} tone="navy" />,
  },
  {
    key: "entity",
    header: "Entity",
    render: (r) => (
      <span className="font-mono text-xs">
        {r.entity_type}
        {r.entity_id ? `#${r.entity_id.slice(0, 8)}` : ""}
      </span>
    ),
  },
  {
    key: "metadata",
    header: "Details",
    render: (r) => (
      <span className="font-mono text-xs text-slate-600">
        {JSON.stringify(r.metadata)}
      </span>
    ),
  },
];

export default async function AdminActivityLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const q = (params.q ?? "").trim();

  let logs = await getAdminActivityLogs();
  if (q) {
    const ql = q.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.action.toLowerCase().includes(ql) ||
        l.actorName.toLowerCase().includes(ql) ||
        l.entity_type.toLowerCase().includes(ql)
    );
  }

  const exportQs = new URLSearchParams({ type: "activity_logs" });
  if (q) exportQs.set("q", q);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
            Activity Logs
          </h1>
        </div>
        <a
          href={`/api/admin/export?${exportQs.toString()}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#181A20] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#1E2329]"
        >
          <Download className="h-3.5 w-3.5 text-orange-400" />
          Export Audit Logs CSV
        </a>
      </div>

      <SectionCard
        title={`Audit Events (${logs.length})`}
        action={
          <form method="GET" className="flex items-center gap-2">
            <TextInput
              name="q"
              defaultValue={q}
              placeholder="Filter by action, actor, entity..."
              className="w-56 py-1.5 text-xs"
            />
            <Button type="submit" variant="primary" size="sm">
              Search
            </Button>
          </form>
        }
      >
        <DataTable
          columns={COLUMNS}
          rows={logs}
          rowKey={(r) => r.id}
          emptyMessage="No activity log events match your filter."
        />
      </SectionCard>
    </div>
  );
}
