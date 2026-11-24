import type { Coordinates } from "@/lib/domain/fare";

export type GeolocationResult =
  | { ok: true; coords: Coordinates; accuracyMeters: number }
  | {
      ok: false;
      code: "UNSUPPORTED" | "PERMISSION_DENIED" | "POSITION_UNAVAILABLE" | "TIMEOUT";
      message: string;
    };

export function mapGeolocationErrorCode(code: number): {
  code: "PERMISSION_DENIED" | "POSITION_UNAVAILABLE" | "TIMEOUT";
  message: string;
} {
  switch (code) {
    case 1:
      return {
        code: "PERMISSION_DENIED",
        message:
          "Location permission was denied. You can still click on the map or pick a predefined location.",
      };
    case 2:
      return {
        code: "POSITION_UNAVAILABLE",
        message:
          "Your device could not determine a GPS location right now. Please select a location manually on the map.",
      };
    case 3:
    default:
      return {
        code: "TIMEOUT",
        message:
          "Location request timed out. Please try again or pick your location manually on the map.",
      };
  }
}

/**
 * Invokes the Browser Geolocation API ONLY when explicitly triggered by the user.
 */
export function requestBrowserLocation(): Promise<GeolocationResult> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) {
    return Promise.resolve({
      ok: false,
      code: "UNSUPPORTED",
      message:
        "Geolocation is not supported by this browser. Please select your location manually on the map.",
    });
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          coords: {
            lat: Number(position.coords.latitude.toFixed(6)),
            lng: Number(position.coords.longitude.toFixed(6)),
          },
          accuracyMeters: Math.round(position.coords.accuracy),
        });
      },
      (err) => {
        const mapped = mapGeolocationErrorCode(err.code);
        resolve({ ok: false, ...mapped });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}
