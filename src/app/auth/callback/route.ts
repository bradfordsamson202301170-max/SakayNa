import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function ensureDriverRecordsFromMetadata(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: { id: string; user_metadata?: Record<string, unknown> }
) {
  const meta = user.user_metadata ?? {};
  if (meta.role !== "driver") return;

  const licenseNumber = String(meta.license_number ?? "").trim().toUpperCase();
  if (!licenseNumber) return;

  const { data: existingDriver } = await supabase
    .from("drivers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let driverId = existingDriver?.id;
  if (!driverId) {
    const { data: inserted } = await supabase
      .from("drivers")
      .insert({
        user_id: user.id,
        license_number: licenseNumber,
        address: meta.address ? String(meta.address) : null,
        approval_status: "pending",
      })
      .select("id")
      .single();
    driverId = inserted?.id;
  }

  if (!driverId) return;

  const plateNumber = String(meta.plate_number ?? "").trim().toUpperCase();
  const make = String(meta.make ?? "").trim();
  const model = String(meta.model ?? "").trim();
  const color = String(meta.color ?? "").trim();
  const year = Number(meta.year ?? 0);

  if (plateNumber && make && model && color && year >= 1990) {
    const { data: existingVehicle } = await supabase
      .from("vehicles")
      .select("id")
      .eq("driver_id", driverId)
      .eq("is_active", true)
      .maybeSingle();

    if (!existingVehicle) {
      await supabase.from("vehicles").insert({
        driver_id: driverId,
        plate_number: plateNumber,
        make,
        model,
        year,
        color,
        verification_status: "pending",
        is_active: true,
      });
    }
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/";

  // Prevent open redirects by allowing only relative internal paths
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await createSupabaseServerClient();
  let authSuccess = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) authSuccess = true;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error) authSuccess = true;
  }

  if (authSuccess) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await ensureDriverRecordsFromMetadata(supabase, user);

      // Route cleanly to the user's real role portal if next is root
      if (safeNext === "/") {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.role === "driver") {
          return NextResponse.redirect(`${origin}/driver/verification`);
        }
        if (profile?.role === "admin") {
          return NextResponse.redirect(`${origin}/admin`);
        }
        return NextResponse.redirect(`${origin}/passenger`);
      }
    }

    return NextResponse.redirect(`${origin}${safeNext}`);
  }

  return NextResponse.redirect(
    `${origin}/login?error=Email+confirmation+link+expired+or+invalid.+Please+sign+in+or+request+a+new+link.`
  );
}
