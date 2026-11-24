export interface FareSettingRule {
  id: string;
  name: string;
  currency: string;
  base_fare: number;
  per_km_rate: number;
  per_min_rate: number;
  minimum_fare: number;
  waiting_fee: number;
  cancellation_fee: number;
  commission_rate: number;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface PresetLocation {
  label: string;
  lat: number;
  lng: number;
}

export interface FareEstimateResult {
  distanceKm: number;
  durationMin: number;
  baseFare: number;
  perKmRate: number;
  distanceCharge: number;
  waitingFeeUnit: number;
  waitingUnits: number;
  additionalCharges: number;
  minimumFare: number;
  minimumFareApplied: boolean;
  minimumFareAdjustment: number;
  cancellationFeePolicy: number;
  estimatedFare: number;
  currency: string;
}

export interface RideFareBreakdownSnapshot {
  fareSettingId: string;
  fareSettingName: string;
  currency: string;
  distanceKm: number;
  durationMin: number;
  baseFare: number;
  perKmRate: number;
  distanceCharge: number;
  waitingFeeUnit: number;
  additionalCharges: number;
  minimumFare: number;
  minimumFareApplied: boolean;
  minimumFareAdjustment: number;
  cancellationFeePolicy: number;
  commissionRate: number;
  estimatedTotal: number;
  capturedAt: string;
}

export const PRESET_LOCATIONS: PresetLocation[] = [
  { label: "MSU-IIT Main Gate (Tibanga, Iligan City)", lat: 8.2414, lng: 124.2439 },
  { label: "Iligan City Public Plaza (Poblacion)", lat: 8.228, lng: 124.2452 },
  { label: "Robinsons Place Iligan (Tubod)", lat: 8.2156, lng: 124.2361 },
  { label: "Gaisano Mall Iligan (Roxas Ave.)", lat: 8.2275, lng: 124.2408 },
  { label: "Iligan Integrated Bus Terminal (Tambo)", lat: 8.2504, lng: 124.2537 },
  { label: "Adventist Medical Center Iligan (San Miguel)", lat: 8.2238, lng: 124.2489 },
  { label: "Maria Cristina Falls Viewpoint (Buru-un)", lat: 8.1873, lng: 124.1942 },
];

const EARTH_RADIUS_KM = 6371;
const URBAN_ROAD_FACTOR = 1.28;
const AVG_MOTORCYCLE_SPEED_KPH = 24;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isSameLocation(a: Coordinates, b: Coordinates): boolean {
  return (
    Math.abs(a.lat - b.lat) < 0.0001 && Math.abs(a.lng - b.lng) < 0.0001
  );
}

/**
 * Fallback road-factor estimator used ONLY when OSRM road routing is unavailable.
 */
export function estimateRoute(
  pickup: Coordinates,
  dropoff: Coordinates
): { distanceKm: number; durationMin: number } {
  const dLat = toRadians(dropoff.lat - pickup.lat);
  const dLng = toRadians(dropoff.lng - pickup.lng);
  const lat1 = toRadians(pickup.lat);
  const lat2 = toRadians(dropoff.lat);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const straightKm = 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  const roadKm = Math.max(0.5, roundMoney(straightKm * URBAN_ROAD_FACTOR));
  const durationMin = Math.max(3, Math.ceil((roadKm / AVG_MOTORCYCLE_SPEED_KPH) * 60));

  return { distanceKm: roadKm, durationMin };
}

/**
 * Server-side validation for Admin Fare Settings updates.
 */
export function validateFareSettingInput(input: {
  baseFare: number;
  perKmRate: number;
  minimumFare: number;
  waitingFee: number;
  cancellationFee: number;
  commissionPercent: number;
}): { valid: boolean; error?: string } {
  const monetary = [
    ["Base fare", input.baseFare],
    ["Per-kilometer rate", input.perKmRate],
    ["Minimum fare", input.minimumFare],
    ["Waiting fee", input.waitingFee],
    ["Cancellation fee", input.cancellationFee],
  ] as const;

  for (const [label, val] of monetary) {
    if (!Number.isFinite(val) || val < 0) {
      return { valid: false, error: `${label} must be a valid non-negative number.` };
    }
  }

  if (
    !Number.isFinite(input.commissionPercent) ||
    input.commissionPercent < 0 ||
    input.commissionPercent > 50
  ) {
    return {
      valid: false,
      error: "Platform commission must be between 0% and 50%.",
    };
  }

  return { valid: true };
}

/**
 * SakayNa Fare Calculation Formula (Batch 10):
 *   Distance Charge  = Distance × Per-Kilometer Rate
 *   Additional       = Waiting Units × Waiting Fee
 *   Subtotal         = Base Fare + Distance Charge + Additional Charges
 *   Estimated Total  = max(Minimum Fare, Subtotal)
 */
export function calculateFareEstimate(
  distanceKm: number,
  durationMin: number,
  rule: FareSettingRule,
  waitingUnits = 0
): FareEstimateResult {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    throw new Error("Distance must be a positive number.");
  }
  if (!Number.isFinite(durationMin) || durationMin < 0) {
    throw new Error("Duration must be a non-negative number.");
  }
  if (!Number.isFinite(waitingUnits) || waitingUnits < 0) {
    throw new Error("Waiting units must be a non-negative number.");
  }

  const cleanDistance = roundMoney(distanceKm);
  const baseFare = roundMoney(Number(rule.base_fare));
  const perKmRate = roundMoney(Number(rule.per_km_rate));
  const minimumFare = roundMoney(Number(rule.minimum_fare));
  const waitingFeeUnit = roundMoney(Number(rule.waiting_fee ?? 0));
  const cancellationFeePolicy = roundMoney(Number(rule.cancellation_fee ?? 0));

  const distanceCharge = roundMoney(cleanDistance * perKmRate);
  const additionalCharges = roundMoney(waitingUnits * waitingFeeUnit);
  const subtotal = roundMoney(baseFare + distanceCharge + additionalCharges);
  const minimumFareApplied = subtotal < minimumFare;
  const minimumFareAdjustment = minimumFareApplied
    ? roundMoney(minimumFare - subtotal)
    : 0;
  const estimatedFare = minimumFareApplied ? minimumFare : subtotal;

  return {
    distanceKm: cleanDistance,
    durationMin: Math.max(1, Math.ceil(durationMin)),
    baseFare,
    perKmRate,
    distanceCharge,
    waitingFeeUnit,
    waitingUnits,
    additionalCharges,
    minimumFare,
    minimumFareApplied,
    minimumFareAdjustment,
    cancellationFeePolicy,
    estimatedFare,
    currency: rule.currency || "PHP",
  };
}

/**
 * Produces an immutable fare breakdown snapshot stored on each ride so
 * historical rides never change when administrators update global fare settings.
 */
export function buildRideFareBreakdownSnapshot(
  rule: FareSettingRule,
  estimate: FareEstimateResult
): RideFareBreakdownSnapshot {
  return Object.freeze({
    fareSettingId: rule.id,
    fareSettingName: rule.name,
    currency: estimate.currency,
    distanceKm: estimate.distanceKm,
    durationMin: estimate.durationMin,
    baseFare: estimate.baseFare,
    perKmRate: estimate.perKmRate,
    distanceCharge: estimate.distanceCharge,
    waitingFeeUnit: estimate.waitingFeeUnit,
    additionalCharges: estimate.additionalCharges,
    minimumFare: estimate.minimumFare,
    minimumFareApplied: estimate.minimumFareApplied,
    minimumFareAdjustment: estimate.minimumFareAdjustment,
    cancellationFeePolicy: estimate.cancellationFeePolicy,
    commissionRate: Number(rule.commission_rate),
    estimatedTotal: estimate.estimatedFare,
    capturedAt: new Date().toISOString(),
  });
}

export function formatCurrency(amount: number | string, currency = "PHP"): string {
  const num = Number(amount);
  const symbol = currency === "PHP" ? "₱" : `${currency} `;
  return `${symbol} ${Number.isFinite(num) ? num.toFixed(2) : "0.00"}`;
}
