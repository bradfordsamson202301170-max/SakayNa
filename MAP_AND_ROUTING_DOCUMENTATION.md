# MotoGo — Map, Geolocation & Road Routing Documentation (`MAP_AND_ROUTING_DOCUMENTATION.md`)

**Batch:** Batch 9 — Leaflet, OpenStreetMap, OSRM Road Routing & Browser Geolocation  
**Map Engine:** Leaflet (`leaflet`) + OpenStreetMap Tiles (client-only via `next/dynamic` with `ssr: false`)  
**Routing Service:** OSRM (Open Source Routing Machine) via server-side proxy `/api/route`

---

## 1. Implemented Map Features

- **Interactive OpenStreetMap (`src/components/map/MotoGoMap.tsx`):** Renders OSM raster tiles (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`) with required `© OpenStreetMap contributors` attribution.
- **Custom MotoGo Markers (`L.divIcon`):**
  - **Pickup Marker (`P`):** MotoGo Orange (`#F97316`) pin with popup label.
  - **Destination Marker (`D`):** Emerald (`#059669`) pin with popup label.
  - **Driver Marker (`MOTO` / `MOTO (SIM)`):** Dark Navy (`#0B132B`) + Orange ring marker.
- **Manual Location Selection:** Passengers toggle **"Click Map: Set Pickup"** or **"Click Map: Set Destination"** and click anywhere on the map to place pins manually.
- **Predefined Academic Demo Coordinates:** Dropdowns provide 6 predefined city landmarks (`PRESET_LOCATIONS` in `src/lib/domain/fare.ts`) so instructors and students can test rides immediately without needing physical GPS movement.
- **Permission-First Browser Geolocation (`src/lib/routing/geolocation.ts`):** `navigator.geolocation.getCurrentPosition()` is invoked **only** when the user explicitly clicks **"Use My Location (GPS)"**—never silently on page load. `PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, `TIMEOUT`, and unsupported browsers are handled with clear user-friendly fallback guidance.
- **Route Visualization & Actual Road Distance:** Calls `/api/route` → OSRM road graph to draw the real street polyline and compute road distance (`km`) and road duration (`min`). Straight-line distance is **never** presented as actual road distance; if OSRM is unreachable, the UI explicitly displays a **Fallback Estimate** badge and amber dashed line.
- **Simulated Driver Movement (Academic Demo):** On `/passenger/active-ride`, an explicit **"Simulate Driver (Demo)"** button steps the driver marker along the OSRM road polyline and displays an unmistakable **`SIMULATED DRIVER MOVEMENT`** badge and `MOTO (SIM)` marker label.

---

## 2. Routing API Requirements & Limits

### OpenStreetMap Tile Server Policy
- **Attribution Required:** `© OpenStreetMap contributors` is always displayed on the Leaflet map.
- **Usage Policy:** The public `tile.openstreetmap.org` server is suitable for development and academic demonstrations. High-traffic production deployments must switch to a commercial/self-hosted tile provider (e.g., MapTiler, Stadia Maps, Mapbox, or self-hosted Protomaps).

### OSRM Public Demo API (`router.project-osrm.org`)
- **Endpoint Used:** `GET /route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=full&geometries=geojson`
- **API Key Required:** None for the public demo server.
- **Rate Limits & Production Considerations:**
  - The public OSRM demo server is **best-effort, rate-limited, and not guaranteed for high-volume production SLA**.
  - MotoGo routes all requests through `src/app/api/route/route.ts` with a 7-second timeout and clean fallback handling.
  - To switch to a self-hosted OSRM instance in production, set `OSRM_BASE_URL=https://your-osrm-server.example.com` in `.env.local` (zero code changes needed).
  - Commercial alternatives with motorcycle/two-wheeler profiles include **OpenRouteService**, **Mapbox Directions API**, and **Google Routes API**.
