import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/navigation";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  account_status: "active" | "suspended";
}

export interface DriverStatusSummary {
  id: string;
  approval_status: "pending" | "approved" | "rejected" | "suspended";
  availability_status: "offline" | "online" | "on_trip";
  rejection_reason: string | null;
  license_number: string;
}

export interface AuthenticatedContext {
  userId: string;
  profile: UserProfile;
  driver: DriverStatusSummary | null;
}

export function getRoleHomePath(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "driver":
      return "/driver";
    case "passenger":
    default:
      return "/passenger";
  }
}

/**
 * Per-request memoized user context via React cache() so layout.tsx and page.tsx
 * share a single Supabase auth + profile lookup instead of making duplicate network calls.
 */
export const getCurrentUserContext = cache(
  async (): Promise<AuthenticatedContext | null> => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, role, account_status")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    let driver: DriverStatusSummary | null = null;
    if (profile.role === "driver") {
      const { data: driverRow } = await supabase
        .from("drivers")
        .select("id, approval_status, availability_status, rejection_reason, license_number")
        .eq("user_id", user.id)
        .maybeSingle();

      if (driverRow) {
        driver = driverRow as DriverStatusSummary;
      }
    }

    return {
      userId: user.id,
      profile: profile as UserProfile,
      driver,
    };
  }
);

/**
 * Server-side authorization guard for protected layouts and pages.
 * Verifies:
 *  1. Valid authenticated Supabase session (via getUser(), not spoofable cookies)
 *  2. Account is active (not suspended)
 *  3. Exact role match
 */
export async function requireRole(
  expectedRole: UserRole
): Promise<AuthenticatedContext> {
  const context = await getCurrentUserContext();

  if (!context) {
    redirect("/login");
  }

  if (context.profile.account_status === "suspended") {
    redirect("/unauthorized?reason=suspended");
  }

  if (context.profile.role !== expectedRole) {
    redirect(
      `/unauthorized?reason=forbidden&expected=${expectedRole}&actual=${context.profile.role}`
    );
  }

  return context;
}
