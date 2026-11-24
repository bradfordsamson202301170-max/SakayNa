"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, Menu, Plus, Radio, ShieldCheck } from "lucide-react";
import type { NavItem, UserRole } from "@/lib/navigation";

interface HeaderProps {
  role: UserRole;
  navItems: NavItem[];
  realtimeLive?: boolean;
  onOpenMobileMenu: () => void;
}

const PORTAL_NAMES: Record<UserRole, string> = {
  passenger: "Passenger",
  driver: "Driver Partner",
  admin: "Operations",
};

export function Header({
  role,
  navItems,
  realtimeLive = false,
  onOpenMobileMenu,
}: HeaderProps) {
  const pathname = usePathname();

  const currentNav = navItems.find((item) => {
    const isRoot =
      item.href === "/passenger" ||
      item.href === "/driver" ||
      item.href === "/admin";
    return isRoot
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`);
  });

  const pageTitle = currentNav?.label ?? "Dashboard";

  const quickAction =
    role === "passenger"
      ? { label: "Book a Ride", href: "/passenger/book", icon: Plus }
      : role === "driver"
        ? { label: "Available Rides", href: "/driver/available-rides", icon: Radio }
        : { label: "Driver Queue", href: "/admin/verification", icon: ShieldCheck };

  const QuickIcon = quickAction.icon;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#EAECEF] bg-white/95 px-3.5 backdrop-blur-xs sm:px-6">
      {/* Left: Mobile drawer trigger + Dynamic Page Breadcrumb */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="rounded-lg p-2 text-[#474D57] hover:bg-[#F5F5F5] hover:text-[#181A20] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="hidden font-medium text-[#707A8A] sm:inline">
            {PORTAL_NAMES[role]}
          </span>
          <span className="hidden text-[#B7BDC6] sm:inline">/</span>
          <span className="truncate font-bold text-[#181A20]">{pageTitle}</span>
        </div>
      </div>

      {/* Right: Service Area Indicator + Role Quick Action */}
      <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <div className="hidden items-center gap-1.5 rounded-full bg-[#FAFAFA] px-3 py-1.5 text-xs font-semibold text-[#474D57] ring-1 ring-[#EAECEF] md:inline-flex">
          <span
            className={`h-2 w-2 rounded-full ${
              realtimeLive ? "animate-pulse bg-[#0ECB81]" : "bg-[#F0B90B]"
            }`}
          />
          <MapPin className="h-3.5 w-3.5 text-[#F0B90B]" />
          <span>Iligan City · {realtimeLive ? "Live" : "Sync"}</span>
        </div>

        <Link
          href={quickAction.href}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#F0B90B] px-3 py-1.5 text-xs font-bold text-[#0B0E11] shadow-xs transition hover:bg-[#FCD535] sm:px-3.5 sm:py-2"
        >
          <QuickIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="whitespace-nowrap">{quickAction.label}</span>
        </Link>
      </div>
    </header>
  );
}
