import React from "react";
import Link from "next/link";
import { MotoGoLogo } from "@/components/brand/MotoGoLogo";
import { LinkButton } from "@/components/ui/Button";

export function PublicNavbar() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#2B3139] bg-[#181A20]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0">
          <MotoGoLogo variant="light" size="sm" />
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[#EAECEF] md:flex">
          <Link href="/#how-it-works" className="transition hover:text-[#F0B90B]">
            How It Works
          </Link>
          <Link href="/#portals" className="transition hover:text-[#F0B90B]">
            Platform Portals
          </Link>
          <Link href="/register/driver" className="transition hover:text-[#F0B90B]">
            Drive with SakayNa
          </Link>
        </nav>

        <div className="flex shrink-0 items-center">
          <LinkButton
            href="/login"
            variant="primary"
            size="sm"
            className="whitespace-nowrap px-3.5 py-2 text-xs sm:px-4 sm:text-sm"
          >
            Get Started
          </LinkButton>
        </div>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-[#2B3139] bg-[#0B0E11] text-[#848E9C]">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="space-y-3 md:col-span-2">
          <MotoGoLogo variant="light" size="md" showTagline />
          <p className="max-w-sm text-sm leading-relaxed text-[#848E9C]">
            SakayNa is an original motorcycle ride-hailing and driver management
            platform designed for transparent fares, verified riders, and real-time
            trip safety.
          </p>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
            Accounts
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/login" className="hover:text-[#F0B90B]">
                Sign In
              </Link>
            </li>
            <li>
              <Link href="/register/passenger" className="hover:text-[#F0B90B]">
                Passenger Registration
              </Link>
            </li>
            <li>
              <Link href="/register/driver" className="hover:text-[#F0B90B]">
                Driver Registration
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white">
            Platform Portals
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href="/passenger" className="hover:text-[#F0B90B]">
                Passenger Portal
              </Link>
            </li>
            <li>
              <Link href="/driver" className="hover:text-[#F0B90B]">
                Driver Portal
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-[#F0B90B]">
                Admin Operations
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#2B3139] py-5 text-center text-xs text-[#848E9C]">
        © {new Date().getFullYear()} SakayNa Transportation Platform. Original brand
        &amp; UI foundation.
      </div>
    </footer>
  );
}
