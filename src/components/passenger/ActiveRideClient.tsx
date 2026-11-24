"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  Clock,
  Phone,
  Play,
  Square,
  Star,
} from "lucide-react";
import { MotoGoMapDynamic } from "@/components/map/MotoGoMapDynamic";
import { Button } from "@/components/ui/Button";
import type { Coordinates } from "@/lib/domain/fare";
import type { RoadRouteResult } from "@/lib/routing/osrm";
import { SectionCard } from "@/components/ui/Cards";
import {
  FormField,
  SelectInput,
  TextareaInput,
} from "@/components/ui/FormComponents";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatCurrency } from "@/lib/domain/fare";
import {
  cancelPassengerRideAction,
  submitDriverRatingAction,
  type PassengerActionState,
} from "@/lib/passenger/actions";
import type {
  AssignedDriverDetails,
  PassengerRideRecord,
} from "@/lib/passenger/queries";
import { useRealtimeSubscription } from "@/lib/realtime/useRealtimeSubscription";

const TIMELINE = [
  { key: "requested", label: "Requested" },
  { key: "accepted", label: "Accepted" },
  { key: "driver_arrived", label: "Driver Arrived" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

const STATUS_INDEX: Record<string, number> = {
  requested: 0,
  accepted: 1,
  driver_arrived: 2,
  in_progress: 3,
  completed: 4,
};

interface ActiveRideClientProps {
  ride: PassengerRideRecord;
  assignedDriver: AssignedDriverDetails | null;
  history: Array<{
    id: string;
    previous_status: string | null;
    new_status: string;
    note: string | null;
    created_at: string;
  }>;
  existingRating: { id: string; score: number; comment: string | null } | null;
}

const INITIAL_STATE: PassengerActionState = {};

export function ActiveRideClient({
  ride,
  assignedDriver,
  history,
  existingRating,
}: ActiveRideClientProps) {
  const router = useRouter();
  const [roadRoute, setRoadRoute] = useState<RoadRouteResult | null>(null);
  const [liveDriverCoords, setLiveDriverCoords] = useState<Coordinates | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [cancelState, cancelAction, cancelPending] = useActionState(
    cancelPassengerRideAction,
    INITIAL_STATE
  );
  const [ratingState, ratingAction, ratingPending] = useActionState(
    submitDriverRatingAction,
    INITIAL_STATE
  );

  // Secure RLS-enforced Realtime subscriptions (cleaned up automatically on unmount)
  const realtimeStatus = useRealtimeSubscription(
    `passenger-ride-${ride.id}`,
    [
      {
        table: "rides",
        event: "UPDATE",
        filter: `id=eq.${ride.id}`,
        onChange: () => router.refresh(),
      },
      {
        table: "ride_status_history",
        event: "INSERT",
        filter: `ride_id=eq.${ride.id}`,
        onChange: () => router.refresh(),
      },
      {
        table: "ride_locations",
        event: "INSERT",
        filter: `ride_id=eq.${ride.id}`,
        onChange: (payload) => {
          const row = payload.new as { latitude?: number; longitude?: number };
          if (typeof row.latitude === "number" && typeof row.longitude === "number") {
            setLiveDriverCoords({ lat: row.latitude, lng: row.longitude });
          }
        },
      },
    ],
    () => router.refresh()
  );

  // Fetch road geometry for map visualization
  useEffect(() => {
    const params = new URLSearchParams({
      pickupLat: String(ride.pickup_lat),
      pickupLng: String(ride.pickup_lng),
      dropoffLat: String(ride.dropoff_lat),
      dropoffLng: String(ride.dropoff_lng),
    });
    fetch(`/api/route?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RoadRouteResult | null) => {
        if (data) setRoadRoute(data);
      })
      .catch(() => {});
  }, [ride.pickup_lat, ride.pickup_lng, ride.dropoff_lat, ride.dropoff_lng]);

  // Clearly labeled academic demo driver movement simulation along road geometry
  useEffect(() => {
    if (!simRunning || !roadRoute || roadRoute.geometry.length < 2) return;
    const interval = setInterval(() => {
      setSimStep((prev) =>
        prev + 1 >= roadRoute.geometry.length ? 0 : prev + 1
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [simRunning, roadRoute]);

  const driverMarkerCoords: Coordinates | null =
    simRunning && roadRoute && roadRoute.geometry[simStep]
      ? {
          lat: roadRoute.geometry[simStep][0],
          lng: roadRoute.geometry[simStep][1],
        }
      : liveDriverCoords
        ? liveDriverCoords
        : assignedDriver
          ? { lat: Number(ride.pickup_lat), lng: Number(ride.pickup_lng) }
          : null;

  const currentIdx = STATUS_INDEX[ride.status] ?? 0;
  const canCancel = ["requested", "accepted", "driver_arrived"].includes(
    ride.status
  );

  return (
    <div className="space-y-6">
      {(cancelState.error || ratingState.error) && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{cancelState.error || ratingState.error}</span>
        </div>
      )}

      {(cancelState.success || ratingState.success) && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{cancelState.success || ratingState.success}</span>
        </div>
      )}

      <SectionCard
        title="Live Ride Status Timeline"
        action={
          <div className="flex items-center gap-2">
            <StatusBadge
              label={
                realtimeStatus === "subscribed"
                  ? "Realtime Live"
                  : realtimeStatus === "error"
                    ? "Realtime Offline"
                    : "Connecting..."
              }
              tone={
                realtimeStatus === "subscribed"
                  ? "emerald"
                  : realtimeStatus === "error"
                    ? "red"
                    : "slate"
              }
              dot
            />
            <StatusBadge
              label={ride.status.replaceAll("_", " ").toUpperCase()}
              tone={ride.status === "completed" ? "emerald" : "orange"}
              dot
            />
          </div>
        }
      >
        <ol className="grid grid-cols-2 gap-2.5 sm:grid-cols-5 sm:gap-3">
          {TIMELINE.map((step, index) => {
            const isCurrent = index === currentIdx;
            const isDone = index < currentIdx || ride.status === "completed";
            return (
              <li
                key={step.key}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-xs font-semibold ${
                  isCurrent
                    ? "border-orange-400 bg-orange-50 text-orange-700"
                    : isDone
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                }`}
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{step.label}</span>
              </li>
            );
          })}
        </ol>
      </SectionCard>

      <SectionCard
        title="Live Route & Driver Location Map"
        action={
          <div className="flex items-center gap-2">
            {simRunning && (
              <StatusBadge label="SIMULATED DRIVER MOVEMENT" tone="amber" dot />
            )}
            <Button
              variant={simRunning ? "outline" : "navy"}
              size="sm"
              onClick={() => setSimRunning((v) => !v)}
            >
              {simRunning ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  Stop Simulation
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5" />
                  Simulate Driver (Demo)
                </>
              )}
            </Button>
          </div>
        }
      >
        <MotoGoMapDynamic
          pickup={{ lat: Number(ride.pickup_lat), lng: Number(ride.pickup_lng) }}
          dropoff={{
            lat: Number(ride.dropoff_lat),
            lng: Number(ride.dropoff_lng),
          }}
          pickupLabel={ride.pickup_address}
          dropoffLabel={ride.dropoff_address}
          routeGeometry={roadRoute?.geometry}
          routeSource={roadRoute?.source}
          driverLocation={driverMarkerCoords}
          driverIsSimulated={simRunning}
          heightClass="h-60 sm:h-72"
        />
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title="Assigned Driver & Motorcycle"
          description="Always verify the motorcycle plate number before boarding."
        >
          {assignedDriver ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#181A20] text-sm font-bold text-white">
                    {assignedDriver.fullName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-base font-bold text-[#181A20]">
                      {assignedDriver.fullName}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-slate-600">
                      <Star className="h-3.5 w-3.5 fill-orange-400 text-orange-400" />
                      {assignedDriver.ratingAverage.toFixed(2)} rating ·{" "}
                      {assignedDriver.totalCompletedRides} completed trips
                    </p>
                  </div>
                </div>
                <StatusBadge label="Verified Driver" tone="emerald" />
              </div>

              <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2.5">
                  <Bike className="h-4 w-4 text-orange-500" />
                  <div>
                    <p className="text-xs text-slate-500">Motorcycle</p>
                    <p className="font-semibold text-[#181A20]">
                      {assignedDriver.vehicleLabel ?? "Registered Motorcycle"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Plate Number</p>
                  <p className="font-mono font-bold text-[#181A20]">
                    {assignedDriver.plateNumber ?? "Pending"}
                  </p>
                </div>
                {assignedDriver.phone && (
                  <div className="flex items-center gap-2.5 sm:col-span-2">
                    <Phone className="h-4 w-4 text-orange-500" />
                    <div>
                      <p className="text-xs text-slate-500">Driver Contact</p>
                      <p className="font-semibold text-[#181A20]">
                        {assignedDriver.phone}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <Clock className="h-8 w-8 animate-pulse text-orange-500" />
              <p className="mt-3 text-sm font-semibold text-[#181A20]">
                Searching for an approved SakayNa driver...
              </p>
              <p className="mt-1 max-w-sm text-xs text-slate-500">
                Your ride request is live. Once a nearby driver accepts, their
                name, rating, and motorcycle plate will appear here
                automatically.
              </p>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Trip Summary & Actions">
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Pickup
              </p>
              <p className="font-medium text-[#181A20]">{ride.pickup_address}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Destination
              </p>
              <p className="font-medium text-[#181A20]">
                {ride.dropoff_address}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Distance: {Number(ride.estimated_distance_km)} km</span>
              <span>Est. Duration: {ride.estimated_duration_min} min</span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-slate-600">Locked Fare</span>
              <span className="text-lg font-bold text-orange-600">
                {formatCurrency(ride.final_fare ?? ride.estimated_fare)}
              </span>
            </div>
          </div>

          {canCancel && (
            <form action={cancelAction} className="mt-5 border-t border-slate-100 pt-4">
              <input type="hidden" name="ride_id" value={ride.id} />
              <Button
                type="submit"
                variant="danger"
                size="sm"
                disabled={cancelPending}
              >
                {cancelPending ? "Cancelling..." : "Cancel Ride Request"}
              </Button>
            </form>
          )}

          {ride.status === "completed" && assignedDriver && !existingRating && (
            <form
              action={ratingAction}
              className="mt-5 space-y-3 border-t border-slate-100 pt-4"
            >
              <input type="hidden" name="ride_id" value={ride.id} />
              <input
                type="hidden"
                name="driver_id"
                value={assignedDriver.driverId}
              />
              <FormField label="Rate Your Driver (1–5 Stars)" htmlFor="r-score" required>
                <SelectInput id="r-score" name="score" defaultValue="5">
                  <option value="5">5 — Excellent</option>
                  <option value="4">4 — Good</option>
                  <option value="3">3 — Average</option>
                  <option value="2">2 — Fair</option>
                  <option value="1">1 — Poor</option>
                </SelectInput>
              </FormField>
              <FormField label="Feedback (Optional)" htmlFor="r-comment">
                <TextareaInput
                  id="r-comment"
                  name="comment"
                  placeholder="How was your ride?"
                />
              </FormField>
              <Button type="submit" variant="primary" size="sm" disabled={ratingPending}>
                {ratingPending ? "Submitting..." : "Submit Rating"}
              </Button>
            </form>
          )}
        </SectionCard>
      </div>

      {history.length > 0 && (
        <SectionCard title="Status History">
          <ul className="space-y-2 text-xs text-slate-600">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"
              >
                <span className="font-semibold text-[#181A20]">
                  {item.new_status.replaceAll("_", " ").toUpperCase()}
                  {item.note ? ` — ${item.note}` : ""}
                </span>
                <span className="text-slate-400">
                  {new Date(item.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
