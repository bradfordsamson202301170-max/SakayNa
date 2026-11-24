import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { SectionCard, StatCard } from "@/components/ui/Cards";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getAdminReportsData } from "@/lib/admin/queries";
import { requireRole } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/domain/fare";
import type { DriverPerformanceRow } from "@/lib/domain/reports";

interface PaymentReportRow {
  id: string;
  ride_id: string;
  gross_amount: number;
  platform_fee: number;
  driver_net_earnings: number;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

const DRIVER_PERF_COLUMNS: TableColumn<DriverPerformanceRow>[] = [
  {
    key: "name",
    header: "Driver",
    render: (r) => (
      <span className="font-semibold text-[#181A20]">{r.driverName}</span>
    ),
  },
  {
    key: "status",
    header: "Approval",
    render: (r) => (
      <StatusBadge
        label={r.approvalStatus}
        tone={r.approvalStatus === "approved" ? "emerald" : "amber"}
        dot
      />
    ),
  },
  {
    key: "completed",
    header: "Completed Rides",
    align: "right",
    render: (r) => r.completedRides,
  },
  {
    key: "rating",
    header: "Avg Rating",
    align: "right",
    render: (r) => `${r.ratingAverage.toFixed(2)} ★`,
  },
  {
    key: "gross",
    header: "Gross Revenue",
    align: "right",
    render: (r) => formatCurrency(r.grossRevenue),
  },
  {
    key: "net",
    header: "Driver Net Payout",
    align: "right",
    render: (r) => (
      <span className="font-semibold text-emerald-700">
        {formatCurrency(r.driverNetPayout)}
      </span>
    ),
  },
];

const PAYMENT_COLUMNS: TableColumn<PaymentReportRow>[] = [
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
    key: "date",
    header: "Date",
    render: (r) => (
      <span className="text-xs text-slate-500">
        {new Date(r.created_at).toLocaleString()}
      </span>
    ),
  },
  {
    key: "method",
    header: "Method",
    render: (r) => (
      <StatusBadge
        label={r.payment_method.replaceAll("_", " ").toUpperCase()}
        tone="slate"
      />
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (r) => (
      <StatusBadge
        label={r.payment_status.toUpperCase()}
        tone={r.payment_status === "paid" ? "emerald" : "amber"}
      />
    ),
  },
  {
    key: "gross",
    header: "Gross Fare",
    align: "right",
    render: (r) => formatCurrency(r.gross_amount),
  },
  {
    key: "fee",
    header: "Platform Fee",
    align: "right",
    render: (r) => (
      <span className="font-semibold text-orange-600">
        {formatCurrency(r.platform_fee)}
      </span>
    ),
  },
  {
    key: "net",
    header: "Driver Net",
    align: "right",
    render: (r) => (
      <span className="font-semibold text-emerald-700">
        {formatCurrency(r.driver_net_earnings)}
      </span>
    ),
  },
];

export default async function AdminReportsPage() {
  await requireRole("admin");
  const {
    stats,
    timeWindows,
    totalDriverNet,
    completionRate,
    driverPerformance,
    payments,
  } = await getAdminReportsData();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
            Operational &amp; Financial Reports
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/export?type=rides"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#181A20] hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 text-orange-600" />
            Rides CSV
          </a>
          <a
            href="/api/admin/export?type=payments"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#181A20] hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5 text-orange-600" />
            Revenue CSV
          </a>
          <a
            href="/api/admin/export?type=driver_performance"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#181A20] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1E2329]"
          >
            <Download className="h-3.5 w-3.5 text-orange-400" />
            Driver Performance CSV
          </a>
        </div>
      </div>

      {/* Time-Window Ride Volume & Revenue KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Daily Rides (Today)"
          value={String(timeWindows.dailyRides)}
          subtext="Last 24h calendar day"
          icon={<Calendar className="h-5 w-5" />}
          accent="orange"
        />
        <StatCard
          label="Weekly Rides (7d)"
          value={String(timeWindows.weeklyRides)}
          subtext="Rolling 7-day volume"
          icon={<BarChart3 className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          label="Monthly Rides (30d)"
          value={String(timeWindows.monthlyRides)}
          subtext="Rolling 30-day volume"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          subtext={`${stats.completedRides} completed · ${stats.cancelledRides} cancelled`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          label="Completed Rides"
          value={String(stats.completedRides)}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          label="Cancelled Rides"
          value={String(stats.cancelledRides)}
          icon={<XCircle className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          label="Recorded Gross Revenue"
          value={formatCurrency(stats.recordedFareTotal)}
          subtext={`Driver net: ${formatCurrency(totalDriverNet)}`}
          icon={<Wallet className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Platform Commission"
          value={formatCurrency(stats.recordedCommissionTotal)}
          subtext="Recorded platform fees"
          icon={<Wallet className="h-5 w-5" />}
          accent="orange"
        />
      </div>

      <SectionCard title={`Driver Performance (${driverPerformance.length})`}>
        <DataTable
          columns={DRIVER_PERF_COLUMNS}
          rows={driverPerformance}
          rowKey={(r) => r.driverId}
          emptyMessage="No driver performance data yet."
        />
      </SectionCard>

      <SectionCard title={`Settled Payments Ledger (${payments.length})`}>
        <DataTable
          columns={PAYMENT_COLUMNS}
          rows={payments}
          rowKey={(r) => r.id}
          emptyMessage="No completed ride payments recorded yet."
        />
      </SectionCard>
    </div>
  );
}
