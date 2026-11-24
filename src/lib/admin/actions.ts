"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { validateFareSettingInput } from "@/lib/domain/fare";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AdminActionState {
  error?: string;
  success?: string;
}

async function logAdminActivity(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown>
) {
  const supabase = await createSupabaseServerClient();
  await supabase.from("activity_logs").insert({
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

export async function togglePassengerStatusAction(
  formData: FormData
): Promise<void> {
  const { userId: adminId } = await requireRole("admin");
  const targetUserId = String(formData.get("user_id") ?? "").trim();
  const nextStatus = String(formData.get("next_status") ?? "").trim();

  if (!targetUserId || (nextStatus !== "active" && nextStatus !== "suspended")) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({ account_status: nextStatus })
    .eq("id", targetUserId)
    .eq("role", "passenger");

  if (!error) {
    await logAdminActivity(
      adminId,
      nextStatus === "suspended" ? "USER_SUSPENDED" : "USER_REACTIVATED",
      "profiles",
      targetUserId,
      { account_status: nextStatus }
    );
  }

  revalidatePath("/admin");
  revalidatePath("/admin/passengers");
  revalidatePath("/admin/activity-logs");
}

export async function reviewDriverApplicationAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const { userId: adminId } = await requireRole("admin");
  const driverId = String(formData.get("driver_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!driverId || !["approved", "rejected", "suspended"].includes(decision)) {
    return { error: "Invalid driver review decision." };
  }

  if (decision === "rejected" && !reason) {
    return {
      error: "A rejection reason is required when rejecting a driver (BR-13).",
    };
  }

  const supabase = await createSupabaseServerClient();

  // If this driver registered via email confirmation and hasn't had a `drivers` row created yet,
  // auto-create their `drivers` row now so the Admin can approve/reject/suspend immediately.
  let resolvedDriverId = driverId;
  if (driverId.startsWith("profile-")) {
    const userId = driverId.replace("profile-", "");
    const { data: existing } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      resolvedDriverId = existing.id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from("drivers")
        .insert({
          user_id: userId,
          license_number: `PENDING-${userId.slice(0, 8).toUpperCase()}`,
          approval_status: "pending",
        })
        .select("id")
        .single();
      if (createErr || !created) {
        return {
          error:
            createErr?.message ??
            "Could not initialize driver record for review.",
        };
      }
      resolvedDriverId = created.id;
    }
  }

  const updatePayload: Record<string, unknown> = {
    approval_status: decision,
    rejection_reason: decision === "rejected" ? reason : null,
  };

  if (decision === "approved") {
    updatePayload.approved_by = adminId;
    updatePayload.approved_at = new Date().toISOString();
  } else {
    updatePayload.availability_status = "offline";
  }

  const { error } = await supabase
    .from("drivers")
    .update(updatePayload)
    .eq("id", resolvedDriverId);

  if (error) {
    return { error: error.message };
  }

  // Also verify active motorcycle when approving a driver
  if (decision === "approved") {
    await supabase
      .from("vehicles")
      .update({ verification_status: "verified" })
      .eq("driver_id", resolvedDriverId)
      .eq("is_active", true);
  }

  await logAdminActivity(
    adminId,
    `DRIVER_${decision.toUpperCase()}`,
    "drivers",
    resolvedDriverId,
    { decision, reason: reason || null }
  );

  revalidatePath("/admin");
  revalidatePath("/admin/drivers");
  revalidatePath("/admin/verification");
  revalidatePath("/admin/motorcycles");
  revalidatePath("/admin/activity-logs");

  return { success: `Driver status updated to ${decision.toUpperCase()}.` };
}

export async function updateMotorcycleStatusAction(
  formData: FormData
): Promise<void> {
  const { userId: adminId } = await requireRole("admin");
  const vehicleId = String(formData.get("vehicle_id") ?? "").trim();
  const verificationStatus = String(formData.get("verification_status") ?? "").trim();
  const isActiveStr = formData.get("is_active");

  if (!vehicleId) return;

  const updates: Record<string, unknown> = {};
  if (["pending", "verified", "rejected"].includes(verificationStatus)) {
    updates.verification_status = verificationStatus;
  }
  if (isActiveStr === "true" || isActiveStr === "false") {
    updates.is_active = isActiveStr === "true";
  }

  if (Object.keys(updates).length === 0) return;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("vehicles")
    .update(updates)
    .eq("id", vehicleId);

  if (!error) {
    await logAdminActivity(
      adminId,
      "VEHICLE_UPDATED",
      "vehicles",
      vehicleId,
      updates
    );
  }

  revalidatePath("/admin/motorcycles");
  revalidatePath("/admin/drivers");
  revalidatePath("/admin/activity-logs");
}

export async function updateFareSettingsAction(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  const { userId: adminId } = await requireRole("admin");

  const fareId = String(formData.get("fare_id") ?? "").trim();
  const name = String(formData.get("name") ?? "Standard SakayNa Fare").trim();
  const baseFare = Number(formData.get("base_fare"));
  const perKmRate = Number(formData.get("per_km_rate"));
  const minimumFare = Number(formData.get("minimum_fare"));
  const waitingFee = Number(formData.get("waiting_fee") ?? 0);
  const cancellationFee = Number(formData.get("cancellation_fee") ?? 0);
  const commissionPercent = Number(formData.get("commission_percent"));

  const validation = validateFareSettingInput({
    baseFare,
    perKmRate,
    minimumFare,
    waitingFee,
    cancellationFee,
    commissionPercent,
  });

  if (!validation.valid) {
    return { error: validation.error };
  }

  const commissionRate = Number((commissionPercent / 100).toFixed(4));
  const supabase = await createSupabaseServerClient();

  let targetId = fareId;
  if (fareId) {
    const { error } = await supabase
      .from("fare_settings")
      .update({
        name,
        base_fare: baseFare,
        per_km_rate: perKmRate,
        minimum_fare: minimumFare,
        waiting_fee: waitingFee,
        cancellation_fee: cancellationFee,
        commission_rate: commissionRate,
        updated_by: adminId,
      })
      .eq("id", fareId);
    if (error) return { error: error.message };
  } else {
    const { data, error } = await supabase
      .from("fare_settings")
      .insert({
        name,
        base_fare: baseFare,
        per_km_rate: perKmRate,
        per_min_rate: 0,
        minimum_fare: minimumFare,
        waiting_fee: waitingFee,
        cancellation_fee: cancellationFee,
        commission_rate: commissionRate,
        is_active: true,
        updated_by: adminId,
      })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Failed to save fare settings." };
    targetId = data.id;
  }

  await logAdminActivity(adminId, "FARE_CONFIG_UPDATED", "fare_settings", targetId, {
    base_fare: baseFare,
    per_km_rate: perKmRate,
    minimum_fare: minimumFare,
    waiting_fee: waitingFee,
    cancellation_fee: cancellationFee,
    commission_rate: commissionRate,
  });

  revalidatePath("/admin/fares");
  revalidatePath("/admin/activity-logs");
  revalidatePath("/passenger/book");

  return {
    success:
      "Fare settings updated and recorded in Activity Logs. Changes apply to all future rides (BR-07).",
  };
}
