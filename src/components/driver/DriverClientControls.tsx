"use client";

import React, { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  Navigation,
  Radio,
  UploadCloud,
} from "lucide-react";
import { MotoGoMapDynamic } from "@/components/map/MotoGoMapDynamic";
import { Button } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Cards";
import {
  FormField,
  SelectInput,
  TextInput,
} from "@/components/ui/FormComponents";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  canDriverGoOnline,
  type DriverApprovalStatus,
  type DriverAvailabilityStatus,
  type DriverDocumentKind,
} from "@/lib/domain/driver";
import { formatCurrency } from "@/lib/domain/fare";
import {
  acceptDriverRideAction,
  completeDriverTripAction,
  publishDriverLocationPingAction,
  rejectDriverRideAction,
  saveDriverOnboardingAction,
  toggleDriverAvailabilityAction,
  transitionDriverRideAction,
  uploadDriverDocumentAction,
  type DriverActionState,
} from "@/lib/driver/actions";
import type {
  DriverRecord,
  DriverRideItem,
  VehicleRecord,
} from "@/lib/driver/queries";
import { useRealtimeSubscription } from "@/lib/realtime/useRealtimeSubscription";
import { requestBrowserLocation } from "@/lib/routing/geolocation";
import type { RoadRouteResult } from "@/lib/routing/osrm";

const INITIAL: DriverActionState = {};

function ActionFeedback({ state }: { state: DriverActionState }) {
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

export function OnlineToggleControl({
  approvalStatus,
  availabilityStatus,
  hasActiveVehicle,
}: {
  approvalStatus: DriverApprovalStatus;
  availabilityStatus: DriverAvailabilityStatus;
  hasActiveVehicle: boolean;
}) {
  const [state, action, pending] = useActionState(
    toggleDriverAvailabilityAction,
    INITIAL
  );

  const isOnline = availabilityStatus === "online";
  const isOnTrip = availabilityStatus === "on_trip";
  const targetStatus = isOnline ? "offline" : "online";
  const gate = canDriverGoOnline({
    approvalStatus,
    availabilityStatus,
    hasActiveVehicle,
  });

  const disabled = pending || isOnTrip || (!isOnline && !gate.allowed);

  return (
    <div className="space-y-2">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="target_status" value={targetStatus} />
        <StatusBadge
          label={`Status: ${availabilityStatus.replaceAll("_", " ").toUpperCase()}`}
          tone={
            isOnline ? "emerald" : isOnTrip ? "orange" : "slate"
          }
          dot
        />
        <Button
          type="submit"
          variant={isOnline ? "outline" : "primary"}
          size="sm"
          disabled={disabled}
        >
          <Radio className="h-4 w-4" />
          {pending
            ? "Updating..."
            : isOnTrip
              ? "Currently On Trip"
              : isOnline
                ? "Go Offline"
                : "Go Online"}
        </Button>
      </form>
      {!isOnline && !gate.allowed && gate.reason && (
        <p className="text-xs text-amber-700">{gate.reason}</p>
      )}
      <ActionFeedback state={state} />
    </div>
  );
}

export function DriverOnboardingForm({
  driver,
  vehicle,
}: {
  driver: DriverRecord | null;
  vehicle: VehicleRecord | null;
}) {
  const [state, action, pending] = useActionState(
    saveDriverOnboardingAction,
    INITIAL
  );

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <ActionFeedback state={state} />
      </div>
      <FormField label="Residential Address" htmlFor="ob-addr" required>
        <TextInput
          id="ob-addr"
          name="address"
          required
          defaultValue={driver?.address ?? ""}
          placeholder="123 Rizal St., Metro City"
        />
      </FormField>
      <FormField label="Driver's License Number" htmlFor="ob-lic" required>
        <TextInput
          id="ob-lic"
          name="license_number"
          required
          defaultValue={driver?.license_number ?? ""}
          placeholder="N01-23-456789"
        />
      </FormField>
      <FormField label="Motorcycle Brand (Make)" htmlFor="ob-make" required>
        <TextInput
          id="ob-make"
          name="make"
          required
          defaultValue={vehicle?.make ?? ""}
          placeholder="Honda / Yamaha"
        />
      </FormField>
      <FormField label="Motorcycle Model" htmlFor="ob-model" required>
        <TextInput
          id="ob-model"
          name="model"
          required
          defaultValue={vehicle?.model ?? ""}
          placeholder="Click 125i"
        />
      </FormField>
      <FormField label="Plate Number" htmlFor="ob-plate" required>
        <TextInput
          id="ob-plate"
          name="plate_number"
          required
          defaultValue={vehicle?.plate_number ?? ""}
          placeholder="ABC-1234"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Year" htmlFor="ob-year" required>
          <TextInput
            id="ob-year"
            name="year"
            type="number"
            min={1990}
            max={2100}
            required
            defaultValue={vehicle?.year ?? 2024}
          />
        </FormField>
        <FormField label="Color" htmlFor="ob-color" required>
          <TextInput
            id="ob-color"
            name="color"
            required
            defaultValue={vehicle?.color ?? ""}
            placeholder="Matte Black"
          />
        </FormField>
      </div>
      <div className="sm:col-span-2 pt-2">
        <Button type="submit" variant="primary" disabled={pending}>
          {pending
            ? "Saving..."
            : driver?.approval_status === "rejected"
              ? "Save & Resubmit for Approval"
              : "Save Driver & Motorcycle Details"}
        </Button>
      </div>
    </form>
  );
}

export function DocumentUploadCard({
  kind,
  title,
  description,
  currentPath,
}: {
  kind: DriverDocumentKind;
  title: string;
  description: string;
  currentPath: string | null;
}) {
  const [state, action, pending] = useActionState(
    uploadDriverDocumentAction,
    INITIAL
  );

  return (
    <form
      action={action}
      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
    >
      <input type="hidden" name="doc_kind" value={kind} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#181A20]">{title}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <StatusBadge
          label={currentPath ? "Uploaded (Private)" : "Missing"}
          tone={currentPath ? "emerald" : "amber"}
          dot
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,application/pdf"
          required
          className="block w-full flex-1 text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#181A20] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#1E2329]"
        />
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          <UploadCloud className="h-3.5 w-3.5" />
          {pending ? "Uploading..." : currentPath ? "Replace" : "Upload"}
        </Button>
      </div>

      <ActionFeedback state={state} />
    </form>
  );
}

export function AvailableRidesClient({
  rides,
}: {
  rides: DriverRideItem[];
}) {
  const router = useRouter();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [acceptState, acceptAction, acceptPending] = useActionState(
    acceptDriverRideAction,
    INITIAL
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectDriverRideAction,
    INITIAL
  );

  const realtimeStatus = useRealtimeSubscription(
    "driver-available-rides",
    [
      {
        table: "rides",
        event: "*",
        onChange: () => router.refresh(),
      },
    ],
    () => router.refresh()
  );

  const visibleRides = rides.filter((r) => !dismissedIds.includes(r.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <StatusBadge
          label={
            realtimeStatus === "subscribed"
              ? "Realtime Dispatch Live"
              : realtimeStatus === "error"
                ? "Realtime Reconnecting"
                : "Connecting Realtime..."
          }
          tone={realtimeStatus === "subscribed" ? "emerald" : "slate"}
          dot
        />
      </div>
      <ActionFeedback state={acceptState} />
      <ActionFeedback state={rejectState} />

      {visibleRides.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-[#181A20]">
            No open ride requests right now
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Stay online — new passenger ride requests will appear here
            automatically.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {visibleRides.map((offer) => (
            <SectionCard
              key={offer.id}
              title={`Ride ${offer.id.slice(0, 8).toUpperCase()}`}
              description={`Requested ${new Date(offer.created_at).toLocaleTimeString()}`}
              action={
                <StatusBadge
                  label={formatCurrency(offer.estimated_fare)}
                  tone="orange"
                />
              }
            >
              <div className="space-y-3 text-sm">
                <MotoGoMapDynamic
                  pickup={{ lat: offer.pickup_lat, lng: offer.pickup_lng }}
                  dropoff={{ lat: offer.dropoff_lat, lng: offer.dropoff_lng }}
                  pickupLabel={offer.pickup_address}
                  dropoffLabel={offer.dropoff_address}
                  heightClass="h-44"
                />
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <div>
                    <p className="text-xs text-slate-500">Pickup</p>
                    <p className="font-semibold text-[#181A20]">
                      {offer.pickup_address}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Navigation className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs text-slate-500">Destination</p>
                    <p className="font-semibold text-[#181A20]">
                      {offer.dropoff_address}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-600">
                  <span>Distance: {offer.estimated_distance_km} km</span>
                  <span>Duration: ~{offer.estimated_duration_min} min</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <form
                    action={rejectAction}
                    onSubmit={() =>
                      setDismissedIds((prev) => [...prev, offer.id])
                    }
                  >
                    <input type="hidden" name="ride_id" value={offer.id} />
                    <Button
                      type="submit"
                      variant="outline"
                      fullWidth
                      disabled={rejectPending || acceptPending}
                    >
                      {rejectPending ? "Declining..." : "Reject"}
                    </Button>
                  </form>
                  <form action={acceptAction}>
                    <input type="hidden" name="ride_id" value={offer.id} />
                    <Button
                      type="submit"
                      variant="primary"
                      fullWidth
                      disabled={acceptPending || rejectPending}
                    >
                      {acceptPending ? "Claiming..." : "Accept Ride"}
                    </Button>
                  </form>
                </div>
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}

export function DriverActiveRideClient({
  ride,
  passengerLabel,
}: {
  ride: DriverRideItem;
  passengerLabel: string;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    transitionDriverRideAction,
    INITIAL
  );
  const [completeState, completeAction, completePending] = useActionState(
    completeDriverTripAction,
    INITIAL
  );
  const [locState, locAction, locPending] = useActionState(
    publishDriverLocationPingAction,
    INITIAL
  );
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number }>({
    lat: 8.228,
    lng: 124.2452,
  });
  const [roadRoute, setRoadRoute] = useState<RoadRouteResult | null>(null);

  // Fetch actual OSRM road route between passenger pickup and destination
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

  // Driver receives real-time booking updates (e.g. passenger or admin cancellation)
  const realtimeStatus = useRealtimeSubscription(
    `driver-active-ride-${ride.id}`,
    [
      {
        table: "rides",
        event: "UPDATE",
        filter: `id=eq.${ride.id}`,
        onChange: () => router.refresh(),
      },
    ],
    () => router.refresh()
  );

  async function handleCaptureGps() {
    const res = await requestBrowserLocation();
    if (!res.ok) {
      setGpsStatus(res.message);
      return;
    }
    setGpsCoords(res.coords);
    setGpsStatus(
      `Captured live GPS (${res.coords.lat.toFixed(4)}, ${res.coords.lng.toFixed(4)}). Click Broadcast Live GPS to send.`
    );
  }

  const gross = ride.final_fare ?? ride.estimated_fare;
  const estNet = Number(
    (gross - gross * ride.snapshot_commission_rate).toFixed(2)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <StatusBadge
          label={
            realtimeStatus === "subscribed"
              ? "Booking Realtime Live"
              : "Connecting..."
          }
          tone={realtimeStatus === "subscribed" ? "emerald" : "slate"}
          dot
        />
      </div>
      <ActionFeedback state={state} />
      <ActionFeedback state={completeState} />
      <ActionFeedback state={locState} />
      {gpsStatus && (
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
          {gpsStatus}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <SectionCard
          title="Assigned Trip Details"
          description={passengerLabel}
          className="lg:col-span-2"
          action={
            <StatusBadge
              label={ride.status.replaceAll("_", " ").toUpperCase()}
              tone="orange"
              dot
            />
          }
        >
          <div className="space-y-4">
            <MotoGoMapDynamic
              pickup={{ lat: ride.pickup_lat, lng: ride.pickup_lng }}
              dropoff={{ lat: ride.dropoff_lat, lng: ride.dropoff_lng }}
              pickupLabel={ride.pickup_address}
              dropoffLabel={ride.dropoff_address}
              routeGeometry={roadRoute?.geometry}
              routeSource={roadRoute?.source}
              driverLocation={gpsCoords}
              heightClass="h-64 sm:h-72"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Pickup
                </p>
                <p className="mt-1 text-sm font-semibold text-[#181A20]">
                  {ride.pickup_address}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Destination
                </p>
                <p className="mt-1 text-sm font-semibold text-[#181A20]">
                  {ride.dropoff_address}
                </p>
              </div>
            </div>

            {ride.passenger_notes && (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-xs text-slate-700">
                <span className="font-semibold text-[#181A20]">
                  Passenger Note:
                </span>{" "}
                {ride.passenger_notes}
              </p>
            )}

            <div className="flex items-center justify-between rounded-xl bg-[#181A20] px-5 py-4 text-white">
              <div>
                <p className="text-xs text-slate-300">Locked Fare</p>
                <p className="text-2xl font-bold text-orange-400">
                  {formatCurrency(gross)}
                </p>
              </div>
              <div className="text-right text-xs text-slate-300">
                <p>Est. Net Driver Payout</p>
                <p className="text-base font-bold text-emerald-400">
                  {formatCurrency(estNet)}
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Trip Progression Controls">
          <div className="space-y-3">
            {ride.status === "accepted" && (
              <form action={action}>
                <input type="hidden" name="ride_id" value={ride.id} />
                <input type="hidden" name="next_status" value="driver_arrived" />
                <Button type="submit" variant="primary" fullWidth disabled={pending}>
                  1. Mark Arrived at Pickup
                </Button>
              </form>
            )}
            {ride.status === "driver_arrived" && (
              <form action={action}>
                <input type="hidden" name="ride_id" value={ride.id} />
                <input type="hidden" name="next_status" value="in_progress" />
                <Button type="submit" variant="navy" fullWidth disabled={pending}>
                  2. Start Ride (In Progress)
                </Button>
              </form>
            )}
            {ride.status === "in_progress" && (
              <form
                action={completeAction}
                className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/60 p-3.5"
              >
                <input type="hidden" name="ride_id" value={ride.id} />
                <p className="text-xs font-bold uppercase tracking-wider text-orange-700">
                  3. Complete Trip &amp; Record Payment
                </p>
                <FormField label="Confirmed Final Fare (₱)" htmlFor="c-fare" required>
                  <TextInput
                    id="c-fare"
                    name="final_fare"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    defaultValue={gross}
                  />
                </FormField>
                <FormField label="Payment Method" htmlFor="c-method" required>
                  <SelectInput id="c-method" name="payment_method" defaultValue="cash">
                    <option value="cash">Cash</option>
                    <option value="demo_wallet">E-Wallet (GCash / Maya)</option>
                  </SelectInput>
                </FormField>
                <FormField label="Payment Status" htmlFor="c-status" required>
                  <SelectInput id="c-status" name="payment_status" defaultValue="paid">
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </SelectInput>
                </FormField>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  disabled={completePending}
                >
                  {completePending
                    ? "Completing Trip..."
                    : "Complete Trip & Credit Earnings"}
                </Button>
              </form>
            )}
            {(ride.status === "accepted" || ride.status === "driver_arrived") && (
              <form action={action} className="border-t border-slate-100 pt-3">
                <input type="hidden" name="ride_id" value={ride.id} />
                <input
                  type="hidden"
                  name="next_status"
                  value="cancelled_by_driver"
                />
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  fullWidth
                  disabled={pending}
                >
                  Cancel Before Pickup
                </Button>
              </form>
            )}

            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Realtime Location Broadcast
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                fullWidth
                onClick={handleCaptureGps}
              >
                Capture Browser GPS
              </Button>
              <form action={locAction}>
                <input type="hidden" name="ride_id" value={ride.id} />
                <input type="hidden" name="latitude" value={gpsCoords.lat} />
                <input type="hidden" name="longitude" value={gpsCoords.lng} />
                <input type="hidden" name="is_simulated" value="false" />
                <Button
                  type="submit"
                  variant="navy"
                  size="sm"
                  fullWidth
                  disabled={locPending}
                >
                  {locPending ? "Sending..." : "Broadcast Live GPS Ping"}
                </Button>
              </form>
              <form action={locAction}>
                <input type="hidden" name="ride_id" value={ride.id} />
                <input
                  type="hidden"
                  name="latitude"
                  value={(8.224 + Math.random() * 0.015).toFixed(6)}
                />
                <input
                  type="hidden"
                  name="longitude"
                  value={(124.238 + Math.random() * 0.012).toFixed(6)}
                />
                <input type="hidden" name="is_simulated" value="true" />
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  fullWidth
                  disabled={locPending}
                >
                  Send Simulated Ping (Demo)
                </Button>
              </form>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
