import { NextResponse } from "next/server";
import { calculateFareEstimate, isSameLocation } from "@/lib/domain/fare";
import { getActiveFareSetting } from "@/lib/passenger/queries";
import { fetchRoadRoute } from "@/lib/routing/osrm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pickupLat = Number(searchParams.get("pickupLat"));
  const pickupLng = Number(searchParams.get("pickupLng"));
  const dropoffLat = Number(searchParams.get("dropoffLat"));
  const dropoffLng = Number(searchParams.get("dropoffLng"));
  const waitingUnits = Number(searchParams.get("waitingUnits") ?? 0);

  if (
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(pickupLng) ||
    !Number.isFinite(dropoffLat) ||
    !Number.isFinite(dropoffLng) ||
    !Number.isFinite(waitingUnits) ||
    waitingUnits < 0
  ) {
    return NextResponse.json(
      { error: "Invalid coordinates or waiting units." },
      { status: 400 }
    );
  }

  const pickup = { lat: pickupLat, lng: pickupLng };
  const dropoff = { lat: dropoffLat, lng: dropoffLng };

  if (isSameLocation(pickup, dropoff)) {
    return NextResponse.json(
      { error: "Pickup and destination cannot be identical." },
      { status: 400 }
    );
  }

  const fareSetting = await getActiveFareSetting();
  if (!fareSetting) {
    return NextResponse.json(
      { error: "No active fare settings found." },
      { status: 503 }
    );
  }

  const route = await fetchRoadRoute(pickup, dropoff);
  const estimate = calculateFareEstimate(
    route.distanceKm,
    route.durationMin,
    fareSetting,
    waitingUnits
  );

  return NextResponse.json({ route, estimate });
}
