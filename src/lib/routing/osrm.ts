import { estimateRoute, type Coordinates } from "@/lib/domain/fare";

export interface RoadRouteResult {
  distanceKm: number;
  durationMin: number;
  /** Polyline coordinates in Leaflet [lat, lng] order */
  geometry: [number, number][];
  source: "osrm" | "fallback_estimate";
  warning?: string;
}

/**
 * Fetches actual road distance, duration, and road polyline geometry from OSRM
 * (OpenStreetMap road graph). Never presents straight-line distance as actual road distance:
 * if OSRM is unreachable, returns a clearly labeled fallback_estimate.
 */
export async function fetchRoadRoute(
  pickup: Coordinates,
  dropoff: Coordinates
): Promise<RoadRouteResult> {
  const osrmBase =
    process.env.OSRM_BASE_URL || "https://router.project-osrm.org";
  const url = `${osrmBase}/route/v1/driving/${pickup.lng},${pickup.lat};${dropoff.lng},${dropoff.lat}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`OSRM returned HTTP ${res.status}`);
    }

    const json = (await res.json()) as {
      code?: string;
      routes?: Array<{
        distance: number;
        duration: number;
        geometry?: { coordinates?: [number, number][] };
      }>;
    };

    const first = json.routes?.[0];
    if (json.code !== "Ok" || !first) {
      throw new Error("No road route found between selected points.");
    }

    const distanceKm = Math.max(0.3, Number((first.distance / 1000).toFixed(2)));
    const durationMin = Math.max(2, Math.ceil(first.duration / 60));
    const coords: [number, number][] = (
      first.geometry?.coordinates ?? [
        [pickup.lng, pickup.lat],
        [dropoff.lng, dropoff.lat],
      ]
    ).map(([lng, lat]) => [lat, lng]);

    return {
      distanceKm,
      durationMin,
      geometry: coords,
      source: "osrm",
    };
  } catch (err) {
    const fallback = estimateRoute(pickup, dropoff);
    return {
      distanceKm: fallback.distanceKm,
      durationMin: fallback.durationMin,
      geometry: [
        [pickup.lat, pickup.lng],
        [dropoff.lat, dropoff.lng],
      ],
      source: "fallback_estimate",
      warning:
        err instanceof Error
          ? `Road routing service unavailable (${err.message}). Showing fallback road-factor estimate.`
          : "Road routing service unavailable. Showing fallback road-factor estimate.",
    };
  }
}
