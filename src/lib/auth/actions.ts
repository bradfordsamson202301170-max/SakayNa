"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoleHomePath } from "./guards";
import type { UserRole } from "@/lib/navigation";

export interface AuthActionState {
  error?: string;
  success?: string;
}

async function getOrigin(): Promise<string> {
  const headerStore = await headers();
  const origin = headerStore.get("origin");
  if (origin) return origin;
  const host = headerStore.get("host") ?? "localhost:3000";
  const proto = headerStore.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const expectedRole = String(formData.get("expected_role") ?? "").trim();

  if (!email || !password) {
    return { error: "Please enter both your email address and password." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Invalid email or password." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, account_status")
    .eq("id", data.user.id)
    .single();

  if (profileError || !profile) {
    return {
      error:
        "Your user profile could not be loaded. Please contact SakayNa support.",
    };
  }

  if (profile.account_status === "suspended") {
    await supabase.auth.signOut();
    return {
      error:
        "This account has been suspended by an Administrator. Please contact support.",
    };
  }

  // Enforce selected login mode match cleanly
  if (
    expectedRole &&
    ["passenger", "driver", "admin"].includes(expectedRole) &&
    profile.role !== expectedRole
  ) {
    await supabase.auth.signOut();
    return {
      error: `This account is registered as a ${profile.role.toUpperCase()}. Click "Log in as ${
        profile.role.charAt(0).toUpperCase() + profile.role.slice(1)
      }" below to sign in.`,
    };
  }

  // If a driver confirmed via email without callback provisioning, ensure driver + vehicle rows exist
  if (profile.role === "driver") {
    const meta = (data.user.user_metadata ?? {}) as Record<string, unknown>;
    const licenseNumber = String(meta.license_number ?? "").trim().toUpperCase();
    if (licenseNumber) {
      const { data: existingDriver } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!existingDriver) {
        const { data: createdDriver } = await supabase
          .from("drivers")
          .insert({
            user_id: data.user.id,
            license_number: licenseNumber,
            address: meta.address ? String(meta.address) : null,
            approval_status: "pending",
          })
          .select("id")
          .single();

        if (createdDriver && meta.plate_number) {
          await supabase.from("vehicles").insert({
            driver_id: createdDriver.id,
            plate_number: String(meta.plate_number).toUpperCase(),
            make: String(meta.make ?? ""),
            model: String(meta.model ?? ""),
            year: Number(meta.year ?? 2024),
            color: String(meta.color ?? ""),
            verification_status: "pending",
            is_active: true,
          });
        }
      }
    }
  }

  redirect(getRoleHomePath(profile.role as UserRole));
}

export async function registerPassengerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!fullName || !email || !phone || !password) {
    return { error: "All required fields must be filled out." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getOrigin();

  // Role is explicitly hardcoded to 'passenger' on the server — never trusted from client input
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/passenger`,
      data: {
        full_name: fullName,
        phone,
        role: "passenger",
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.session) {
    redirect("/passenger");
  }

  return {
    success:
      "Passenger account created! Please check your email to confirm your account, then sign in.",
  };
}

export async function registerDriverAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const address = String(formData.get("address") ?? "").trim();
  const licenseNumber = String(formData.get("license_number") ?? "").trim().toUpperCase();
  const plateNumber = String(formData.get("plate_number") ?? "").trim().toUpperCase();
  const make = String(formData.get("make") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();
  const yearRaw = Number(formData.get("year") ?? 0);
  const color = String(formData.get("color") ?? "").trim();

  if (
    !fullName ||
    !email ||
    !phone ||
    !password ||
    !licenseNumber ||
    !plateNumber ||
    !make ||
    !model ||
    !yearRaw ||
    !color
  ) {
    return { error: "Please complete all personal, license, and motorcycle fields." };
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }

  if (yearRaw < 1990 || yearRaw > 2100) {
    return { error: "Please enter a valid motorcycle model year (1990–2100)." };
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getOrigin();

  // Role is hardcoded to 'driver' on the server; store onboarding details in user_metadata
  // so email confirmation callback or first login can auto-provision driver + motorcycle rows cleanly.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/driver/verification`,
      data: {
        full_name: fullName,
        phone,
        role: "driver",
        address,
        license_number: licenseNumber,
        plate_number: plateNumber,
        make,
        model,
        year: yearRaw,
        color,
      },
    },
  });

  if (error || !data.user) {
    return { error: error?.message ?? "Driver registration failed." };
  }

  // If session is immediately active (email confirmation disabled), create pending driver + vehicle records now
  if (data.session) {
    const { data: driverRow, error: driverError } = await supabase
      .from("drivers")
      .insert({
        user_id: data.user.id,
        license_number: licenseNumber,
        address: address || null,
        approval_status: "pending",
      })
      .select("id")
      .single();

    if (driverError || !driverRow) {
      return {
        error:
          driverError?.message ??
          "Account created, but driver onboarding record could not be saved.",
      };
    }

    const { error: vehicleError } = await supabase.from("vehicles").insert({
      driver_id: driverRow.id,
      plate_number: plateNumber,
      make,
      model,
      year: yearRaw,
      color,
      verification_status: "pending",
      is_active: true,
    });

    if (vehicleError) {
      return {
        error: `Driver profile created (pending approval), but motorcycle registration failed: ${vehicleError.message}`,
      };
    }

    redirect("/driver/verification");
  }

  return {
    success:
      "Driver account created! Please verify your email, sign in, and complete your motorcycle & document submission for Administrator approval.",
  };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) {
    return { error: "Please enter your registered email address." };
  }

  const supabase = await createSupabaseServerClient();
  const origin = await getOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return {
    success:
      "If an account exists for that email, a password reset link has been sent.",
  };
}

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    return { error: "New password must be at least 8 characters long." };
  }
  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: "Your password reset session has expired. Please request a new link.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: error.message };
  }

  return {
    success: "Your password has been updated successfully. You may now sign in.",
  };
}

/**
 * Strictly whitelists ONLY `full_name` and `phone`.
 * Role and account_status can NEVER be modified from the frontend.
 */
export async function updateProfileAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) {
    return { error: "Full name cannot be empty." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: phone || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/passenger/profile");
  revalidatePath("/driver/profile");
  revalidatePath("/passenger");
  revalidatePath("/driver");

  return { success: "Profile updated successfully." };
}
