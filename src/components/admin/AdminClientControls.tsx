"use client";

import React, { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { FormField, TextInput } from "@/components/ui/FormComponents";
import type { FareSettingRule } from "@/lib/domain/fare";
import {
  reviewDriverApplicationAction,
  updateFareSettingsAction,
  type AdminActionState,
} from "@/lib/admin/actions";

const INITIAL: AdminActionState = {};

function AdminFeedback({ state }: { state: AdminActionState }) {
  if (state.error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{state.error}</span>
      </div>
    );
  }
  if (state.success) {
    return (
      <div
        role="status"
        className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700"
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{state.success}</span>
      </div>
    );
  }
  return null;
}

export function DriverReviewActions({
  driverId,
  currentStatus,
}: {
  driverId: string;
  currentStatus: "pending" | "approved" | "rejected" | "suspended";
}) {
  const [reason, setReason] = useState("");
  const [state, action, pending] = useActionState(
    reviewDriverApplicationAction,
    INITIAL
  );

  return (
    <div className="space-y-3">
      <AdminFeedback state={state} />
      <form action={action} className="space-y-3">
        <input type="hidden" name="driver_id" value={driverId} />
        <FormField
          label="Rejection / Audit Note (Required when rejecting — BR-13)"
          htmlFor={`reason-${driverId}`}
        >
          <TextInput
            id={`reason-${driverId}`}
            name="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g., Blurred license photo — please re-upload"
          />
        </FormField>
        <div className="flex flex-wrap gap-2">
          {currentStatus !== "approved" && (
            <Button
              type="submit"
              name="decision"
              value="approved"
              variant="primary"
              size="sm"
              disabled={pending}
            >
              Approve Driver
            </Button>
          )}
          {currentStatus !== "rejected" && (
            <Button
              type="submit"
              name="decision"
              value="rejected"
              variant="outline"
              size="sm"
              disabled={pending}
            >
              Reject Driver
            </Button>
          )}
          {currentStatus !== "suspended" && (
            <Button
              type="submit"
              name="decision"
              value="suspended"
              variant="danger"
              size="sm"
              disabled={pending}
            >
              Suspend Driver
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export function FareSettingsForm({
  fareSetting,
}: {
  fareSetting: FareSettingRule | null;
}) {
  const [state, action, pending] = useActionState(
    updateFareSettingsAction,
    INITIAL
  );

  return (
    <form action={action} className="grid max-w-2xl gap-4 sm:grid-cols-2">
      <input type="hidden" name="fare_id" value={fareSetting?.id ?? ""} />
      <div className="sm:col-span-2">
        <AdminFeedback state={state} />
      </div>

      <FormField label="Configuration Name" htmlFor="f-name" required>
        <TextInput
          id="f-name"
          name="name"
          required
          defaultValue={fareSetting?.name ?? "Standard SakayNa Fare"}
        />
      </FormField>
      <FormField label="Base Fare (₱)" htmlFor="f-base" required>
        <TextInput
          id="f-base"
          name="base_fare"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={fareSetting?.base_fare ?? 30}
        />
      </FormField>
      <FormField label="Minimum Fare Floor (₱)" htmlFor="f-min" required>
        <TextInput
          id="f-min"
          name="minimum_fare"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={fareSetting?.minimum_fare ?? 45}
        />
      </FormField>
      <FormField label="Per-Kilometer Rate (₱/km)" htmlFor="f-km" required>
        <TextInput
          id="f-km"
          name="per_km_rate"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={fareSetting?.per_km_rate ?? 8}
        />
      </FormField>
      <FormField label="Waiting Fee (₱)" htmlFor="f-wait" required>
        <TextInput
          id="f-wait"
          name="waiting_fee"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={fareSetting?.waiting_fee ?? 5}
        />
      </FormField>
      <FormField label="Cancellation Fee (₱)" htmlFor="f-cancel" required>
        <TextInput
          id="f-cancel"
          name="cancellation_fee"
          type="number"
          step="0.01"
          min="0"
          required
          defaultValue={fareSetting?.cancellation_fee ?? 20}
        />
      </FormField>
      <FormField
        label="Platform Commission (%)"
        htmlFor="f-comm"
        hint="0% to 50% — deducted from gross fare for net driver payout (BR-09)."
        required
      >
        <TextInput
          id="f-comm"
          name="commission_percent"
          type="number"
          step="0.1"
          min="0"
          max="50"
          required
          defaultValue={
            fareSetting ? Number((fareSetting.commission_rate * 100).toFixed(1)) : 15
          }
        />
      </FormField>

      <div className="sm:col-span-2 pt-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending ? "Saving Fare Rules..." : "Save Fare Configuration"}
        </Button>
      </div>
    </form>
  );
}
