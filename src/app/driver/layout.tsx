import React from "react";
import { Clock, ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth/guards";
import { DRIVER_NAV } from "@/lib/navigation";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, driver } = await requireRole("driver");
  const approval = driver?.approval_status ?? "pending";

  return (
    <AppShell
      role="driver"
      navItems={DRIVER_NAV}
      userName={profile.full_name}
      userSubtitle={`Driver · ${approval.toUpperCase()}`}
    >
      {approval !== "approved" && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-xs ${
            approval === "rejected"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {approval === "rejected" ? (
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
          ) : (
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          )}
          <p className="leading-relaxed">
            <span className="font-semibold">
              Driver Approval Status: {approval.toUpperCase()} —
            </span>{" "}
            {approval === "rejected"
              ? `Your application was rejected${
                  driver?.rejection_reason
                    ? `: "${driver.rejection_reason}"`
                    : "."
                } Please update your verification details to resubmit.`
              : "Your driver account is awaiting Administrator approval. Going online and accepting rides are locked until approved (BR-01)."}
          </p>
        </div>
      )}
      {children}
    </AppShell>
  );
}
