"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Bike,
  FileText,
  History,
  LayoutDashboard,
  LogOut,
  MapPin,
  Navigation,
  Radio,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { MotoGoLogo } from "@/components/brand/MotoGoLogo";
import { logoutAction } from "@/lib/auth/actions";
import type { NavItem, UserRole } from "@/lib/navigation";

const ICON_MAP: Record<NavItem["icon"], React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  "map-pin": MapPin,
  navigation: Navigation,
  history: History,
  user: User,
  bell: Bell,
  "shield-check": ShieldCheck,
  radio: Radio,
  wallet: Wallet,
  users: Users,
  bike: Bike,
  route: Route,
  sliders: SlidersHorizontal,
  "bar-chart": BarChart3,
  "file-text": FileText,
};

const ROLE_LABELS: Record<UserRole, string> = {
  passenger: "Passenger Portal",
  driver: "Driver Partner Portal",
  admin: "Admin Operations",
};

interface SidebarProps {
  role: UserRole;
  items: NavItem[];
  userName: string;
  userSubtitle: string;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({
  role,
  items,
  userName,
  userSubtitle,
  mobileOpen = false,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profileHref =
    role === "passenger"
      ? "/passenger/profile"
      : role === "driver"
        ? "/driver/profile"
        : "/admin";

  const content = (
    <div className="flex h-full flex-col overflow-y-auto overscroll-contain bg-[#181A20] text-[#EAECEF]">
      <div className="flex shrink-0 items-center justify-between border-b border-[#2B3139] px-5 py-4">
        <Link href="/" onClick={onCloseMobile}>
          <MotoGoLogo variant="light" size="md" showTagline />
        </Link>
        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close navigation menu"
            className="rounded-lg p-1.5 text-[#848E9C] hover:bg-[#2B3139] hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="shrink-0 px-5 pt-4 pb-2">
        <span className="inline-flex items-center rounded-md bg-[#F0B90B]/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#F0B90B] ring-1 ring-inset ring-[#F0B90B]/30">
          {ROLE_LABELS[role]}
        </span>
      </div>

      <div className="flex-1 px-3 py-2 pb-6">
        <nav className="space-y-1" aria-label="Sidebar">
          {items.map((item) => {
            const Icon = ICON_MAP[item.icon];
            const isRoot =
              item.href === "/passenger" ||
              item.href === "/driver" ||
              item.href === "/admin";
            const isActive = isRoot
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#F0B90B] font-bold text-[#0B0E11] shadow-sm"
                    : "text-[#EAECEF] hover:bg-[#2B3139] hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? "text-[#0B0E11]"
                        : "text-[#848E9C] group-hover:text-[#F0B90B]"
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      isActive
                        ? "bg-[#0B0E11]/15 text-[#0B0E11]"
                        : "bg-[#F0B90B]/20 text-[#FCD535]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Card + Sign Out moved into sidebar */}
        <div className="mt-4 space-y-2 border-t border-[#2B3139] pt-4">
          <Link
            href={profileHref}
            onClick={onCloseMobile}
            className="flex items-center gap-3 rounded-xl bg-[#1E2329] p-2.5 ring-1 ring-[#2B3139] transition hover:ring-[#F0B90B]/50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F0B90B] text-xs font-extrabold text-[#0B0E11]">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight text-white">
                {userName}
              </p>
              <p className="truncate text-[11px] text-[#848E9C]">
                {userSubtitle}
              </p>
            </div>
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-[#F6465D] transition hover:bg-[#F6465D]/10"
            >
              <LogOut className="h-4 w-4 shrink-0 text-[#F6465D]" />
              <span>Sign Out</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sticky full-viewport sidebar (stays fixed while page scrolls) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-[#2B3139] lg:block">
        {content}
      </aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#0B0E11]/75 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-dvh w-72 max-w-[85vw] shadow-2xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
