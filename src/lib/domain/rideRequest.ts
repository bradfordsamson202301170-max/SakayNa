export type CanonicalRideDisplayStatus =
  | "requested"
  | "accepted"
  | "driver_arrived"
  | "in_progress"
  | "completed"
  | "cancelled";

export function toDisplayRideStatus(dbStatus: string): CanonicalRideDisplayStatus {
  switch (dbStatus) {
    case "requested":
    case "accepted":
    case "driver_arrived":
    case "in_progress":
    case "completed":
      return dbStatus;
    default:
      return "cancelled";
  }
}

export interface RideRequestValidationInput {
  passengerId: string | null | undefined;
  pickupAddress: string;
  dropoffAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  estimatedFare: number;
  hasExistingActiveRide: boolean;
}

export function validateRideRequestInput(
  input: RideRequestValidationInput
): { valid: boolean; error?: string } {
  if (!input.passengerId || !input.passengerId.trim()) {
    return { valid: false, error: "Passenger must be authenticated to request a ride." };
  }

  if (!input.pickupAddress || !input.pickupAddress.trim()) {
    return { valid: false, error: "Pickup location is required." };
  }

  if (!input.dropoffAddress || !input.dropoffAddress.trim()) {
    return { valid: false, error: "Destination location is required." };
  }

  if (
    !Number.isFinite(input.pickupLat) ||
    !Number.isFinite(input.pickupLng) ||
    !Number.isFinite(input.dropoffLat) ||
    !Number.isFinite(input.dropoffLng) ||
    input.pickupLat < -90 ||
    input.pickupLat > 90 ||
    input.dropoffLat < -90 ||
    input.dropoffLat > 90 ||
    input.pickupLng < -180 ||
    input.pickupLng > 180 ||
    input.dropoffLng < -180 ||
    input.dropoffLng > 180
  ) {
    return { valid: false, error: "Pickup and destination coordinates must be valid." };
  }

  if (
    Math.abs(input.pickupLat - input.dropoffLat) < 0.0001 &&
    Math.abs(input.pickupLng - input.dropoffLng) < 0.0001
  ) {
    return {
      valid: false,
      error: "Pickup and destination must be different locations.",
    };
  }

  if (!Number.isFinite(input.estimatedFare) || input.estimatedFare <= 0) {
    return { valid: false, error: "Calculated fare must be a valid positive amount." };
  }

  if (input.hasExistingActiveRide) {
    return {
      valid: false,
      error:
        "You already have an active ride request. Complete or cancel it before creating another.",
    };
  }

  return { valid: true };
}
