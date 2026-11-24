"use client";

import React, {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  Calculator,
  Crosshair,
  MapPin,
  Navigation,
} from "lucide-react";
import { MotoGoMapDynamic } from "@/components/map/MotoGoMapDynamic";
import { Button, LinkButton } from "@/components/ui/Button";
import { SectionCard } from "@/components/ui/Cards";
import {
  FormField,
  TextInput,
} from "@/components/ui/FormComponents";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  calculateFareEstimate,
  formatCurrency,
  isSameLocation,
  PRESET_LOCATIONS,
  type Coordinates,
  type FareSettingRule,
} from "@/lib/domain/fare";
import {
  createRideRequestAction,
  type PassengerActionState,
} from "@/lib/passenger/actions";
import { requestBrowserLocation } from "@/lib/routing/geolocation";
import type { RoadRouteResult } from "@/lib/routing/osrm";

interface BookRideFormProps {
  fareSetting: FareSettingRule;
  hasActiveRide: boolean;
}

const INITIAL_STATE: PassengerActionState = {};

export function BookRideForm({
  fareSetting,
  hasActiveRide,
}: BookRideFormProps) {
  const [pickupCoords, setPickupCoords] = useState<Coordinates>({
    lat: PRESET_LOCATIONS[0].lat,
    lng: PRESET_LOCATIONS[0].lng,
  });
  const [dropoffCoords, setDropoffCoords] = useState<Coordinates>({
    lat: PRESET_LOCATIONS[1].lat,
    lng: PRESET_LOCATIONS[1].lng,
  });
  const [pickupAddress, setPickupAddress] = useState(PRESET_LOCATIONS[0].label);
  const [dropoffAddress, setDropoffAddress] = useState(
    PRESET_LOCATIONS[1].label
  );
  const [notes, setNotes] = useState("");
  const [mapMode, setMapMode] = useState<"pickup" | "dropoff">("pickup");
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  const [pickupLookupStatus, setPickupLookupStatus] = useState<string | null>(
    null
  );
  const [dropoffLookupStatus, setDropoffLookupStatus] = useState<string | null>(
    null
  );
  const pickupTypedRef = useRef(false);
  const dropoffTypedRef = useRef(false);

  const [roadRoute, setRoadRoute] = useState<RoadRouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const [state, action, pending] = useActionState(
    createRideRequestAction,
    INITIAL_STATE
  );

  const sameLocation = isSameLocation(pickupCoords, dropoffCoords);

  // Auto-move Pickup pin when the passenger types a place name
  useEffect(() => {
    if (!pickupTypedRef.current) return;
    const query = pickupAddress.trim();
    if (query.length < 3) {
      setPickupLookupStatus(null);
      return;
    }

    let cancelled = false;
    setPickupLookupStatus("Locating pickup on map...");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          found?: boolean;
          lat?: number;
          lng?: number;
          label?: string;
        };
        if (cancelled) return;
        if (data.found && typeof data.lat === "number" && typeof data.lng === "number") {
          setPickupCoords({ lat: data.lat, lng: data.lng });
          setPickupLookupStatus(`Pin moved to ${data.label ?? query}`);
        } else {
          setPickupLookupStatus("Place not found — tap the map to pin manually.");
        }
      } catch {
        if (!cancelled) setPickupLookupStatus(null);
      }
    }, 550);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pickupAddress]);

  // Auto-move Destination pin when the passenger types a place name
  useEffect(() => {
    if (!dropoffTypedRef.current) return;
    const query = dropoffAddress.trim();
    if (query.length < 3) {
      setDropoffLookupStatus(null);
      return;
    }

    let cancelled = false;
    setDropoffLookupStatus("Locating destination on map...");

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          found?: boolean;
          lat?: number;
          lng?: number;
          label?: string;
        };
        if (cancelled) return;
        if (data.found && typeof data.lat === "number" && typeof data.lng === "number") {
          setDropoffCoords({ lat: data.lat, lng: data.lng });
          setDropoffLookupStatus(`Pin moved to ${data.label ?? query}`);
        } else {
          setDropoffLookupStatus("Place not found — tap the map to pin manually.");
        }
      } catch {
        if (!cancelled) setDropoffLookupStatus(null);
      }
    }, 550);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dropoffAddress]);

  // Fetch actual road route from OSRM via /api/route whenever pins change
  useEffect(() => {
    if (sameLocation) {
      setRoadRoute(null);
      return;
    }

    let cancelled = false;
    setRouteLoading(true);

    const params = new URLSearchParams({
      pickupLat: String(pickupCoords.lat),
      pickupLng: String(pickupCoords.lng),
      dropoffLat: String(dropoffCoords.lat),
      dropoffLng: String(dropoffCoords.lng),
    });

    fetch(`/api/route?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RoadRouteResult | null) => {
        if (!cancelled && data) {
          setRoadRoute(data);
        }
      })
      .catch(() => {
        if (!cancelled) setRoadRoute(null);
      })
      .finally(() => {
        if (!cancelled) setRouteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [pickupCoords.lat, pickupCoords.lng, dropoffCoords.lat, dropoffCoords.lng, sameLocation]);

  const estimate = useMemo(() => {
    if (sameLocation || !roadRoute) return null;
    return calculateFareEstimate(
      roadRoute.distanceKm,
      roadRoute.durationMin,
      fareSetting
    );
  }, [sameLocation, roadRoute, fareSetting]);

  function handleMapClick(coords: Coordinates) {
    const coordLabel = `Pinned Location (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`;
    if (mapMode === "pickup") {
      pickupTypedRef.current = false;
      setPickupCoords(coords);
      setPickupAddress(coordLabel);
      setPickupLookupStatus(null);
    } else {
      dropoffTypedRef.current = false;
      setDropoffCoords(coords);
      setDropoffAddress(coordLabel);
      setDropoffLookupStatus(null);
    }
    setGeoStatus(null);
  }

  async function handleUseCurrentLocation() {
    setGeoLoading(true);
    setGeoStatus(null);
    const result = await requestBrowserLocation();
    setGeoLoading(false);

    if (!result.ok) {
      setGeoStatus(result.message);
      return;
    }

    pickupTypedRef.current = false;
    setPickupCoords(result.coords);
    setPickupAddress(
      `My Current Location (${result.coords.lat.toFixed(4)}, ${result.coords.lng.toFixed(4)})`
    );
    setPickupLookupStatus(null);
    setGeoStatus(
      `Pickup updated from browser GPS (accuracy ~${result.accuracyMeters}m).`
    );
  }

  return (
    <div className="space-y-6">
      {hasActiveRide && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        >
          <span>
            You already have an active ride in progress. Complete or cancel it
            before creating a new request (BR-02).
          </span>
          <LinkButton href="/passenger/active-ride" variant="navy" size="sm">
            Go to Active Ride
          </LinkButton>
        </div>
      )}

      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}

      <form action={action} className="grid gap-6 lg:grid-cols-5">
        <input type="hidden" name="pickup_lat" value={pickupCoords.lat} />
        <input type="hidden" name="pickup_lng" value={pickupCoords.lng} />
        <input type="hidden" name="dropoff_lat" value={dropoffCoords.lat} />
        <input type="hidden" name="dropoff_lng" value={dropoffCoords.lng} />

        <SectionCard
          title="Interactive OpenStreetMap & Location Selection"
          description="Click the map to place pins manually, use predefined demo landmarks, or request GPS location."
          className="lg:col-span-3"
          action={
            <StatusBadge
              label={
                routeLoading
                  ? "Calculating road route..."
                  : roadRoute?.source === "osrm"
                    ? "OSRM Road Route"
                    : "Fallback Estimate"
              }
              tone={roadRoute?.source === "osrm" ? "emerald" : "amber"}
              dot
            />
          }
        >
          <div className="space-y-4">
            {/* Mobile-friendly map interaction toolbar */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
              <Button
                variant={mapMode === "pickup" ? "primary" : "outline"}
                size="sm"
                className="min-h-10 justify-center"
                onClick={() => setMapMode("pickup")}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>Set Pickup</span>
              </Button>
              <Button
                variant={mapMode === "dropoff" ? "navy" : "outline"}
                size="sm"
                className="min-h-10 justify-center"
                onClick={() => setMapMode("dropoff")}
              >
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>Set Destination</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="col-span-2 min-h-10 justify-center sm:col-span-1"
                onClick={handleUseCurrentLocation}
                disabled={geoLoading}
              >
                <Crosshair className="h-3.5 w-3.5 shrink-0 text-orange-600" />
                <span>{geoLoading ? "Locating..." : "Use My Location (GPS)"}</span>
              </Button>
            </div>

            {geoStatus && (
              <p className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-700">
                {geoStatus}
              </p>
            )}

            <MotoGoMapDynamic
              pickup={pickupCoords}
              dropoff={dropoffCoords}
              pickupLabel={pickupAddress}
              dropoffLabel={dropoffAddress}
              routeGeometry={roadRoute?.geometry}
              routeSource={roadRoute?.source}
              interactiveMode={mapMode}
              onSelectLocation={handleMapClick}
              heightClass="h-64 sm:h-80 lg:h-96"
            />

            {roadRoute?.warning && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {roadRoute.warning}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Pickup Address"
                htmlFor="pickup-address"
                hint={pickupLookupStatus ?? "Type any Iligan place (e.g. St. Peter's College, MSU-IIT) to move the pin automatically."}
                required
              >
                <TextInput
                  id="pickup-address"
                  name="pickup_address"
                  required
                  value={pickupAddress}
                  onChange={(e) => {
                    pickupTypedRef.current = true;
                    setPickupAddress(e.target.value);
                  }}
                />
              </FormField>

              <FormField
                label="Destination Address"
                htmlFor="dropoff-address"
                hint={dropoffLookupStatus ?? "Type any Iligan destination (e.g. Tipanoy, Robinsons, Tubod) to move the pin."}
                required
              >
                <TextInput
                  id="dropoff-address"
                  name="dropoff_address"
                  required
                  value={dropoffAddress}
                  onChange={(e) => {
                    dropoffTypedRef.current = true;
                    setDropoffAddress(e.target.value);
                  }}
                />
              </FormField>
            </div>

            <FormField
              label="Notes for Driver (Optional)"
              htmlFor="passenger-notes"
            >
              <TextInput
                id="passenger-notes"
                name="passenger_notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Waiting by the east entrance"
              />
            </FormField>
          </div>
        </SectionCard>

        <SectionCard
          title="Live Road Distance & Fare Estimate"
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            <div className="rounded-xl bg-[#181A20] p-5 text-white">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <Calculator className="h-4 w-4 text-orange-400" />
                  Estimated Total Fare
                </span>
                <span>
                  {roadRoute?.source === "osrm" ? "Actual Road Route" : "Estimate"}
                </span>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-orange-400">
                {routeLoading
                  ? "Calculating..."
                  : estimate
                    ? formatCurrency(estimate.estimatedFare, estimate.currency)
                    : "—"}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {estimate
                  ? `Road distance: ${estimate.distanceKm} km · ~${estimate.durationMin} mins`
                  : "Pickup and destination must be different locations."}
              </p>
            </div>

            {estimate && (
              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Distance</dt>
                  <dd className="font-medium text-slate-800">
                    {estimate.distanceKm} km (~{estimate.durationMin} min)
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Base Fare</dt>
                  <dd className="font-medium text-slate-800">
                    {formatCurrency(estimate.baseFare, estimate.currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">
                    Distance Charge ({estimate.distanceKm} km ×{" "}
                    {formatCurrency(estimate.perKmRate, estimate.currency)})
                  </dt>
                  <dd className="font-medium text-slate-800">
                    {formatCurrency(estimate.distanceCharge, estimate.currency)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">
                    Additional Charges
                    {estimate.minimumFareApplied
                      ? " (Min. fare adjustment)"
                      : " (Waiting fee if applicable)"}
                  </dt>
                  <dd className="font-medium text-slate-800">
                    {formatCurrency(
                      estimate.additionalCharges + estimate.minimumFareAdjustment,
                      estimate.currency
                    )}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-2.5 font-bold text-[#181A20]">
                  <dt>Estimated Total</dt>
                  <dd className="text-orange-600">
                    {formatCurrency(estimate.estimatedFare, estimate.currency)}
                  </dd>
                </div>
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                  Minimum fare:{" "}
                  {formatCurrency(estimate.minimumFare, estimate.currency)} ·
                  Waiting fee:{" "}
                  {formatCurrency(estimate.waitingFeeUnit, estimate.currency)} ·
                  Cancellation fee policy:{" "}
                  {formatCurrency(
                    estimate.cancellationFeePolicy,
                    estimate.currency
                  )}
                </p>
              </dl>
            )}

            {!confirmOpen ? (
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={pending || routeLoading || sameLocation || hasActiveRide}
                onClick={() => setConfirmOpen(true)}
              >
                <Navigation className="h-4 w-4" />
                Review &amp; Confirm Ride Request
              </Button>
            ) : (
              <div className="space-y-3 rounded-xl border border-orange-200 bg-orange-50/70 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-orange-700">
                  Confirm Your SakayNa Ride
                </p>
                <p className="text-xs leading-relaxed text-slate-700">
                  From <span className="font-semibold text-[#181A20]">{pickupAddress}</span>{" "}
                  to <span className="font-semibold text-[#181A20]">{dropoffAddress}</span>{" "}
                  ({estimate?.distanceKm} km · Locked Estimate:{" "}
                  <span className="font-bold text-orange-700">
                    {estimate ? formatCurrency(estimate.estimatedFare, estimate.currency) : "—"}
                  </span>
                  ).
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    fullWidth
                    disabled={pending}
                    onClick={() => setConfirmOpen(false)}
                  >
                    Edit Route
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    fullWidth
                    disabled={pending}
                  >
                    {pending ? "Saving Request..." : "Confirm & Request"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SectionCard>
      </form>
    </div>
  );
}
