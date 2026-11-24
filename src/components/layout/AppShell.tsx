"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  History,
  LayoutDashboard,
  MapPin,
  Navigation,
  User,
} from "lucide-react";
import type { NavItem, UserRole } from "@/lib/navigation";
import {
  useRealtimeSubscription,
  type RealtimeTableBinding,
} from "@/lib/realtime/useRealtimeSubscription";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

const PASSENGER_MOBILE_TABS = [
  { label: "Home", href: "/passenger", icon: LayoutDashboard, exact: true },
  { label: "Book", href: "/passenger/book", icon: MapPin, exact: false },
  { label: "Active", href: "/passenger/active-ride", icon: Navigation, exact: false },
  { label: "History", href: "/passenger/history", icon: History, exact: false },
  { label: "Profile", href: "/passenger/profile", icon: User, exact: false },
];

interface AppShellProps {
  role: UserRole;
  navItems: NavItem[];
  userName: string;
  userSubtitle: string;
  children: React.ReactNode;
}

export function AppShell({
  role,
  navItems,
  userName,
  userSubtitle,
  children,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showPassengerBottomBar = role === "passenger";

  const triggerRealtimeRefresh = useCallback(() => {
    if (refreshTimerRef.current) return;
    refreshTimerRef.current = setTimeout(() => {
      refreshTimerRef.current = null;
      router.refresh();
    }, 500);
  }, [router]);

  const realtimeTables = useMemo<RealtimeTableBinding[]>(() => {
    if (role === "admin") {
      return [
        { table: "rides", event: "*", onChange: triggerRealtimeRefresh },
        { table: "ride_status_history", event: "*", onChange: triggerRealtimeRefresh },
        { table: "notifications", event: "*", onChange: triggerRealtimeRefresh },
      ];
    }
    if (role === "driver") {
      return [
        { table: "rides", event: "*", onChange: triggerRealtimeRefresh },
        { table: "ride_status_history", event: "*", onChange: triggerRealtimeRefresh },
      ];
    }
    return [
      { table: "rides", event: "*", onChange: triggerRealtimeRefresh },
      { table: "notifications", event: "*", onChange: triggerRealtimeRefresh },
    ];
  }, [role, triggerRealtimeRefresh]);

  const realtimeStatus = useRealtimeSubscription(
    `portal-${role}-dashboard`,
    realtimeTables,
    triggerRealtimeRefresh
  );

  return (
    <div className="flex min-h-screen w-full overflow-x-clip bg-[#FAFAFA]">
      <Sidebar
        role={role}
        items={navItems}
        userName={userName}
        userSubtitle={userSubtitle}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          role={role}
          navItems={navItems}
          realtimeLive={realtimeStatus === "subscribed"}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main
          className={`mx-auto w-full max-w-7xl flex-1 space-y-5 p-3.5 sm:space-y-6 sm:p-6 lg:p-8 ${
            showPassengerBottomBar ? "pb-24 lg:pb-8" : ""
          }`}
        >
          {children}
        </main>
      </div>

      {/* Mobile-first sticky bottom tab bar for Passenger portal */}
      {showPassengerBottomBar && (
        <nav
          aria-label="Passenger mobile navigation"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[#2B3139] bg-[#181A20]/95 backdrop-blur-md lg:hidden"
        >
          <div className="grid grid-cols-5">
            {PASSENGER_MOBILE_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = tab.exact
                ? pathname === tab.href
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition ${
                    active
                      ? "text-[#F0B90B]"
                      : "text-[#848E9C] hover:text-white"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${
                      active ? "text-[#F0B90B]" : "text-[#848E9C]"
                    }`}
                  />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
