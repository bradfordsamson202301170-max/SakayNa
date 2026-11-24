import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth/guards";
import { PASSENGER_NAV } from "@/lib/navigation";

export default async function PassengerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole("passenger");

  return (
    <AppShell
      role="passenger"
      navItems={PASSENGER_NAV}
      userName={profile.full_name}
      userSubtitle={profile.email}
    >
      {children}
    </AppShell>
  );
}
