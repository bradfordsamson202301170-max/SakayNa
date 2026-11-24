import type {
  DriverApprovalStatus,
  DriverAvailabilityStatus,
} from "./driver";

export interface MatchCandidateDriver {
  driverId: string;
  accountStatus: "active" | "suspended";
  approvalStatus: DriverApprovalStatus;
  availabilityStatus: DriverAvailabilityStatus;
  hasActiveVehicle: boolean;
  hasConflictingActiveRide: boolean;
  rejectedRideIds: string[];
}

export interface AtomicRideState {
  rideId: string;
  status: "requested" | "accepted" | "driver_arrived" | "in_progress" | "completed" | "cancelled";
  assignedDriverId: string | null;
}

export interface AtomicAcceptOutcome {
  driverId: string;
  accepted: boolean;
  reason?: string;
}

/**
 * Pure domain filter matching Batch 12 requirement #1 & #2:
 * Returns only active, approved, online drivers with an active vehicle,
 * no conflicting active ride, and who have not rejected this ride.
 */
export function filterEligibleDriversForRide(
  drivers: MatchCandidateDriver[],
  rideId: string
): MatchCandidateDriver[] {
  return drivers.filter(
    (d) =>
      d.accountStatus === "active" &&
      d.approvalStatus === "approved" &&
      d.availabilityStatus === "online" &&
      d.hasActiveVehicle &&
      !d.hasConflictingActiveRide &&
      !d.rejectedRideIds.includes(rideId)
  );
}

/**
 * Models the exact serialized row-lock semantics of PostgreSQL `accept_ride(uuid)`:
 * Given N concurrent driver accept attempts against a single ride, strictly
 * guarantees AT MOST ONE winner and rejects all conflicting or losing drivers.
 */
export function resolveConcurrentAcceptAttempts(
  ride: AtomicRideState,
  attemptingDrivers: MatchCandidateDriver[]
): {
  finalRide: AtomicRideState;
  winnerDriverId: string | null;
  outcomes: AtomicAcceptOutcome[];
} {
  let currentRide: AtomicRideState = { ...ride };
  let winnerDriverId: string | null = null;
  const outcomes: AtomicAcceptOutcome[] = [];

  for (const driver of attemptingDrivers) {
    if (
      driver.accountStatus !== "active" ||
      driver.approvalStatus !== "approved" ||
      driver.availabilityStatus !== "online" ||
      !driver.hasActiveVehicle
    ) {
      outcomes.push({
        driverId: driver.driverId,
        accepted: false,
        reason: "Driver is not eligible (must be active, approved, online, with active motorcycle).",
      });
      continue;
    }

    if (driver.hasConflictingActiveRide) {
      outcomes.push({
        driverId: driver.driverId,
        accepted: false,
        reason: "Driver already has a conflicting active ride (BR-03).",
      });
      continue;
    }

    if (driver.rejectedRideIds.includes(currentRide.rideId)) {
      outcomes.push({
        driverId: driver.driverId,
        accepted: false,
        reason: "Driver previously rejected this ride request (BR-05).",
      });
      continue;
    }

    if (
      currentRide.status !== "requested" ||
      currentRide.assignedDriverId !== null
    ) {
      outcomes.push({
        driverId: driver.driverId,
        accepted: false,
        reason: "Ride has already been accepted by another driver (BR-04).",
      });
      continue;
    }

    // Atomic assignment — first eligible driver wins the row lock
    currentRide = {
      ...currentRide,
      status: "accepted",
      assignedDriverId: driver.driverId,
    };
    winnerDriverId = driver.driverId;
    outcomes.push({ driverId: driver.driverId, accepted: true });
  }

  return { finalRide: currentRide, winnerDriverId, outcomes };
}
