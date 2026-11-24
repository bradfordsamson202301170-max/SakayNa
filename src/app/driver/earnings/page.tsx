import { Calendar, TrendingUp, Wallet } from "lucide-react";
import { SectionCard, StatCard } from "@/components/ui/Cards";
import { DataTable, type TableColumn } from "@/components/ui/DataTable";
import { requireRole } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/domain/fare";
import {
  getDriverAndVehicle,
  getDriverEarningsData,
  type DriverPaymentRow,
} from "@/lib/driver/queries";

const COLUMNS: TableColumn<DriverPaymentRow>[] = [
  {
    key: "ride_id",
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
      <span className="text-slate-500">- {formatCurrency(r.platform_fee)}</span>
    ),
  },
  {
    key: "net",
    header: "Net Payout",
    align: "right",
    render: (r) => (
      <span className="font-bold text-emerald-700">
        {formatCurrency(r.driver_net_earnings)}
      </span>
    ),
  },
];

export default async function DriverEarningsPage() {
  const { userId } = await requireRole("driver");
  const { driver } = await getDriverAndVehicle(userId);
  const earnings = driver
    ? await getDriverEarningsData(driver.id)
    : { todayNet: 0, weekNet: 0, lifetimeNet: 0, payments: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
          Driver Earnings
        </h1>
        <p className="mt-0.5 text-sm text-slate-600">
          Automatic per-ride net payouts generated when trips complete (BR-09).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Today's Net"
          value={formatCurrency(earnings.todayNet)}
          subtext="Net after platform commission"
          icon={<Wallet className="h-5 w-5" />}
          accent="orange"
        />
        <StatCard
          label="Last 7 Days"
          value={formatCurrency(earnings.weekNet)}
          subtext="Rolling 7-day net earnings"
          icon={<Calendar className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          label="Lifetime Net"
          value={formatCurrency(earnings.lifetimeNet)}
          subtext={`${earnings.payments.length} settled rides`}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      <SectionCard title="Per-Ride Earnings Ledger">
        <DataTable
          columns={COLUMNS}
          rows={earnings.payments}
          rowKey={(r) => r.id}
          emptyMessage="No completed ride payouts yet. Complete a ride to see your earnings breakdown here."
        />
      </SectionCard>
    </div>
  );
}
