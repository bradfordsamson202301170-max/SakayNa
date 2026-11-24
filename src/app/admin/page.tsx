import {
  BarChart3,
  Bike,
  CheckCircle2,
  Clock,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { LinkButton } from "@/components/ui/Button";
import { SectionCard, StatCard } from "@/components/ui/Cards";
import { StatusBadge, type BadgeTone } from "@/components/ui/StatusBadge";
import { requireRole } from "@/lib/auth/guards";
import { formatCurrency } from "@/lib/domain/fare";
import {
  getAdminDashboardStats,
  getAdminDrivers,
  getAdminFareSetting,
  getAdminMotorcycles,
  getAdminReportsData,
  getAdminRides,
} from "@/lib/admin/queries";

function rideTone(status: string): BadgeTone {
  if (status === "completed") return "emerald";
  if (["accepted", "driver_arrived", "in_progress"].includes(status)) return "orange";
  if (status === "requested") return "blue";
  return "slate";
}

export default async function AdminDashboardPage() {
  await requireRole("admin");

  const [stats, drivers, motorcycles, rides, fareSetting, reports] =
    await Promise.all([
      getAdminDashboardStats(),
      getAdminDrivers(false),
      getAdminMotorcycles(),
      getAdminRides(),
      getAdminFareSetting(),
      getAdminReportsData(),
    ]);

  const pendingQueue = drivers
    .filter((d) => d.approval_status === "pending")
    .slice(0, 5);
  const recentDrivers = drivers.slice(0, 5);
  const recentMotorcycles = motorcycles.slice(0, 5);
  const recentRides = rides.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#181A20]">
            Admin Operations Dashboard
          </h1>
        </div>
        <LinkButton href="/admin/verification" variant="primary">
          <ShieldCheck className="h-4 w-4" />
          Pending Verifications ({stats.pendingDrivers})
        </LinkButton>
      </div>

      {/* Live KPI Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Passengers"
          value={String(stats.totalPassengers)}
          icon={<Users className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Total Drivers"
          value={String(stats.totalDrivers)}
          icon={<Bike className="h-5 w-5" />}
          accent="navy"
        />
        <StatCard
          label="Pending Approvals"
          value={String(stats.pendingDrivers)}
          icon={<Clock className="h-5 w-5" />}
          accent="orange"
        />
        <StatCard
          label="Active Rides"
          value={String(stats.activeRides)}
          icon={<Route className="h-5 w-5" />}
          accent="orange"
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
          label="Total Gross Volume"
          value={formatCurrency(stats.recordedFareTotal)}
          icon={<Wallet className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          label="Platform Commission"
          value={formatCurrency(stats.recordedCommissionTotal)}
          icon={<Wallet className="h-5 w-5" />}
          accent="orange"
        />
      </div>

      {/* 1. Driver Management Container */}
      <SectionCard
        title={`Driver Management (${drivers.length})`}
        action={
          <LinkButton href="/admin/drivers" variant="outline" size="sm">
            Open Driver Management
          </LinkButton>
        }
      >
        {recentDrivers.length === 0 ? (
          <p className="text-sm text-slate-500">No drivers registered yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {recentDrivers.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold text-[#181A20]">{d.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {d.email} · {d.vehicleLabel ?? "No motorcycle yet"}
                    {d.plateNumber ? ` (${d.plateNumber})` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    label={d.availability_status}
                    tone={d.availability_status === "online" ? "emerald" : "slate"}
                    dot
                  />
                  <StatusBadge
                    label={d.approval_status}
                    tone={
                      d.approval_status === "approved"
                        ? "emerald"
                        : d.approval_status === "pending"
                          ? "amber"
                          : "red"
                    }
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 2. Driver Verification Container */}
      <SectionCard
        title={`Driver Verification (${pendingQueue.length} Pending)`}
        action={
          <LinkButton href="/admin/verification" variant="primary" size="sm">
            Open Verification Queue
          </LinkButton>
        }
      >
        {pendingQueue.length === 0 ? (
          <p className="text-sm text-slate-500">
            No pending driver applications right now.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {pendingQueue.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold text-[#181A20]">{d.full_name}</p>
                  <p className="text-xs text-slate-500">
                    License: {d.license_number || "Not submitted"} ·{" "}
                    {d.vehicleLabel ?? "No vehicle yet"}{" "}
                    {d.plateNumber ? `· ${d.plateNumber}` : ""}
                  </p>
                </div>
                <StatusBadge label="Pending Review" tone="amber" dot />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 3. Motorcycle Management Container */}
      <SectionCard
        title={`Motorcycle Management (${motorcycles.length})`}
        action={
          <LinkButton href="/admin/motorcycles" variant="outline" size="sm">
            Manage Motorcycles
          </LinkButton>
        }
      >
        {recentMotorcycles.length === 0 ? (
          <p className="text-sm text-slate-500">
            No motorcycles registered yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {recentMotorcycles.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold text-[#181A20]">
                    {m.make} {m.model} ({m.year}) ·{" "}
                    <span className="font-mono text-xs">{m.plate_number}</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    Driver: {m.driverName} · Color: {m.color}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge
                    label={m.verification_status}
                    tone={
                      m.verification_status === "verified"
                        ? "emerald"
                        : m.verification_status === "pending"
                          ? "amber"
                          : "red"
                    }
                    dot
                  />
                  <StatusBadge
                    label={m.is_active ? "Active" : "Inactive"}
                    tone={m.is_active ? "blue" : "slate"}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 4. Ride Management Container */}
      <SectionCard
        title={`Ride Management (${rides.length})`}
        action={
          <LinkButton href="/admin/rides" variant="outline" size="sm">
            Open Ride Management
          </LinkButton>
        }
      >
        {recentRides.length === 0 ? (
          <p className="text-sm text-slate-500">No rides recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {recentRides.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[#181A20]">
                    {r.pickup_address} → {r.dropoff_address}
                  </p>
                  <p className="text-xs text-slate-500">
                    Passenger: {r.passengerName} · Driver: {r.driverName}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-bold text-[#181A20]">
                    {formatCurrency(r.final_fare ?? r.estimated_fare)}
                  </span>
                  <StatusBadge
                    label={r.status.replaceAll("_", " ")}
                    tone={rideTone(r.status)}
                    dot
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 5. Fare Settings Container */}
      <SectionCard
        title="Fare Settings"
        action={
          <LinkButton href="/admin/fares" variant="outline" size="sm">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Configure Fares
          </LinkButton>
        }
      >
        {fareSetting ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[#EAECEF] bg-[#FAFAFA] p-3.5">
              <p className="text-xs font-medium text-[#707A8A]">Base Fare</p>
              <p className="mt-1 text-lg font-extrabold text-[#181A20]">
                {formatCurrency(fareSetting.base_fare)}
              </p>
            </div>
            <div className="rounded-xl border border-[#EAECEF] bg-[#FAFAFA] p-3.5">
              <p className="text-xs font-medium text-[#707A8A]">Per-KM Rate</p>
              <p className="mt-1 text-lg font-extrabold text-[#181A20]">
                {formatCurrency(fareSetting.per_km_rate)}
              </p>
            </div>
            <div className="rounded-xl border border-[#EAECEF] bg-[#FAFAFA] p-3.5">
              <p className="text-xs font-medium text-[#707A8A]">Minimum Fare</p>
              <p className="mt-1 text-lg font-extrabold text-[#181A20]">
                {formatCurrency(fareSetting.minimum_fare)}
              </p>
            </div>
            <div className="rounded-xl border border-[#EAECEF] bg-[#FAFAFA] p-3.5">
              <p className="text-xs font-medium text-[#707A8A]">Commission</p>
              <p className="mt-1 text-lg font-extrabold text-[#9A7100]">
                {fareSetting.commission_rate <= 1
                  ? Math.round(fareSetting.commission_rate * 100)
                  : fareSetting.commission_rate}
                %
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            No active fare rule configured yet.
          </p>
        )}
      </SectionCard>

      {/* 6. Reports Container */}
      <SectionCard
        title="Reports & Analytics"
        action={
          <LinkButton href="/admin/reports" variant="primary" size="sm">
            <BarChart3 className="h-3.5 w-3.5" />
            Open Full Reports
          </LinkButton>
        }
      >
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-[#EAECEF] bg-[#FAFAFA] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#707A8A]">
              Today&apos;s Rides
            </p>
            <p className="mt-1.5 text-xl font-extrabold text-[#181A20]">
              {reports.timeWindows.dailyRides}
            </p>
          </div>
          <div className="rounded-xl border border-[#EAECEF] bg-[#FAFAFA] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#707A8A]">
              Weekly Rides
            </p>
            <p className="mt-1.5 text-xl font-extrabold text-[#181A20]">
              {reports.timeWindows.weeklyRides}
            </p>
          </div>
          <div className="rounded-xl border border-[#EAECEF] bg-[#FAFAFA] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#707A8A]">
              Monthly Rides
            </p>
            <p className="mt-1.5 text-xl font-extrabold text-[#181A20]">
              {reports.timeWindows.monthlyRides}
            </p>
          </div>
          <div className="rounded-xl border border-[#EAECEF] bg-[#FAFAFA] p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#707A8A]">
              Completion Rate
            </p>
            <p className="mt-1.5 text-xl font-extrabold text-[#0ECB81]">
              {reports.completionRate}%
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
