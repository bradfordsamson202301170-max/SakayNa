import React from "react";
import { AppShell } from "@/components/layout/AppShell";
import { requireRole } from "@/lib/auth/guards";
import { ADMIN_NAV } from "@/lib/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireRole("admin");

  return (
    <AppShell
      role="admin"
      navItems={ADMIN_NAV}
      userName={profile.full_name}
      userSubtitle="Administrator"
    >
      {children}
    </AppShell>
  );
}
