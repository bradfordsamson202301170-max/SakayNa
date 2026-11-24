export type DemoPaymentMethod = "cash" | "demo_wallet";
export type DemoPaymentStatus = "unpaid" | "paid" | "cancelled";

export const ALLOWED_DRIVER_TRANSITIONS: Record<string, string[]> = {
  accepted: ["driver_arrived", "cancelled_by_driver"],
  driver_arrived: ["in_progress", "cancelled_by_driver"],
  in_progress: ["completed"],
};

export interface TripSettlementResult {
  grossAmount: number;
  platformFee: number;
  driverNetEarnings: number;
  paymentMethod: DemoPaymentMethod;
  paymentStatus: DemoPaymentStatus;
}

function roundMoney(v: number): number {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export function validateDriverTransition(
  currentStatus: string,
  nextStatus: string
): { valid: boolean; error?: string } {
  if (currentStatus === "completed") {
    return {
      valid: false,
      error: "Trip has already been completed. Duplicate completion is blocked.",
    };
  }
  const allowed = ALLOWED_DRIVER_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    return {
      valid: false,
      error: `Invalid transition from "${currentStatus}" to "${nextStatus}".`,
    };
  }
  return { valid: true };
}

export function computeTripSettlement(params: {
  estimatedFare: number;
  confirmedFinalFare?: number | null;
  minimumFareFloor: number;
  commissionRate: number;
  paymentMethod: string;
  paymentStatus: string;
}): { ok: true; settlement: TripSettlementResult } | { ok: false; error: string } {
  if (params.paymentMethod !== "cash" && params.paymentMethod !== "demo_wallet") {
    return { ok: false, error: "Payment method must be Cash or Demo Wallet." };
  }
  if (
    params.paymentStatus !== "unpaid" &&
    params.paymentStatus !== "paid" &&
    params.paymentStatus !== "cancelled"
  ) {
    return {
      ok: false,
      error: "Payment status must be unpaid, paid, or cancelled.",
    };
  }

  const candidate =
    params.confirmedFinalFare !== null &&
    params.confirmedFinalFare !== undefined &&
    Number.isFinite(params.confirmedFinalFare)
      ? params.confirmedFinalFare
      : params.estimatedFare;

  if (!Number.isFinite(candidate) || candidate <= 0) {
    return { ok: false, error: "Final fare must be a valid positive amount." };
  }

  const grossAmount = roundMoney(Math.max(params.minimumFareFloor, candidate));
  const platformFee = roundMoney(grossAmount * params.commissionRate);
  const driverNetEarnings = roundMoney(grossAmount - platformFee);

  return {
    ok: true,
    settlement: {
      grossAmount,
      platformFee,
      driverNetEarnings,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentStatus,
    },
  };
}
