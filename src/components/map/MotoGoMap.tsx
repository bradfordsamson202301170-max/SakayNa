"use client";

import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinates } from "@/lib/domain/fare";

export interface MotoGoMapProps {
  pickup: Coordinates;
  dropoff: Coordinates;
  pickupLabel?: string;
  dropoffLabel?: string;
  routeGeometry?: [number, number][];
  routeSource?: "osrm" | "fallback_estimate";
  driverLocation?: Coordinates | null;
  driverIsSimulated?: boolean;
  interactiveMode?: "pickup" | "dropoff" | "none";
  onSelectLocation?: (coords: Coordinates) => void;
  heightClass?: string;
}

function createPinIcon(label: string, bgColor: string, borderColor = "#FFFFFF") {
  return L.divIcon({
    className: "motogo-map-pin",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      min-width:28px;height:28px;padding:0 8px;
      border-radius:9999px;background:${bgColor};color:#FFFFFF;
      font-size:11px;font-weight:700;border:2.5px solid ${borderColor};
      box-shadow:0 4px 10px rgba(11,19,43,0.35);white-space:nowrap;
    ">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

export function MotoGoMap({
  pickup,
  dropoff,
  pickupLabel = "Pickup",
  dropoffLabel = "Destination",
  routeGeometry,
  routeSource = "osrm",
  driverLocation = null,
  driverIsSimulated = false,
  interactiveMode = "none",
  onSelectLocation,
  heightClass = "h-80",
}: MotoGoMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const callbackRef = useRef(onSelectLocation);
  const modeRef = useRef(interactiveMode);

  callbackRef.current = onSelectLocation;
  modeRef.current = interactiveMode;

  // Initialize Leaflet map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [pickup.lat, pickup.lng],
      zoom: 13,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    const layers = L.layerGroup().addTo(map);
    mapRef.current = map;
    layersRef.current = layers;

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (modeRef.current !== "none" && callbackRef.current) {
        callbackRef.current({
          lat: Number(e.latlng.lat.toFixed(6)),
          lng: Number(e.latlng.lng.toFixed(6)),
        });
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers and route polyline cleanly when coordinates or route change
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;

    layers.clearLayers();

    const pickupMarker = L.marker([pickup.lat, pickup.lng], {
      icon: createPinIcon("P", "#F0B90B"),
    }).bindPopup(`<strong>Pickup</strong><br/>${pickupLabel}`);
    pickupMarker.addTo(layers);

    const dropoffMarker = L.marker([dropoff.lat, dropoff.lng], {
      icon: createPinIcon("D", "#059669"),
    }).bindPopup(`<strong>Destination</strong><br/>${dropoffLabel}`);
    dropoffMarker.addTo(layers);

    const polyPoints: [number, number][] =
      routeGeometry && routeGeometry.length >= 2
        ? routeGeometry
        : [
            [pickup.lat, pickup.lng],
            [dropoff.lat, dropoff.lng],
          ];

    const polyline = L.polyline(polyPoints, {
      color: routeSource === "osrm" ? "#F0B90B" : "#D97706",
      weight: 5,
      opacity: 0.9,
      dashArray: routeSource === "osrm" ? undefined : "8 8",
    }).addTo(layers);

    if (driverLocation) {
      const driverMarker = L.marker(
        [driverLocation.lat, driverLocation.lng],
        {
          icon: createPinIcon(
            driverIsSimulated ? "MOTO (SIM)" : "MOTO",
            "#181A20",
            "#F0B90B"
          ),
        }
      ).bindPopup(
        driverIsSimulated
          ? "<strong>SakayNa Driver (Simulated Demo)</strong><br/>Academic demonstration movement along route."
          : "<strong>SakayNa Driver</strong><br/>Live location marker."
      );
      driverMarker.addTo(layers);
    }

    const bounds = polyline.getBounds();
    bounds.extend([pickup.lat, pickup.lng]);
    bounds.extend([dropoff.lat, dropoff.lng]);
    if (driverLocation) {
      bounds.extend([driverLocation.lat, driverLocation.lng]);
    }
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [36, 36], maxZoom: 15 });
    }
  }, [
    pickup.lat,
    pickup.lng,
    dropoff.lat,
    dropoff.lng,
    pickupLabel,
    dropoffLabel,
    routeGeometry,
    routeSource,
    driverLocation,
    driverIsSimulated,
  ]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <div
        ref={containerRef}
        className={`w-full ${heightClass} ${
          interactiveMode !== "none" ? "cursor-crosshair" : ""
        }`}
        aria-label="Interactive SakayNa OpenStreetMap"
      />
      {interactiveMode !== "none" && (
        <div className="pointer-events-none absolute top-3 left-12 z-[400] rounded-lg bg-[#181A20]/90 px-3 py-1.5 text-xs font-semibold text-white shadow-md">
          Click map to set{" "}
          <span className="text-orange-400">
            {interactiveMode === "pickup" ? "Pickup Pin" : "Destination Pin"}
          </span>
        </div>
      )}
    </div>
  );
}
