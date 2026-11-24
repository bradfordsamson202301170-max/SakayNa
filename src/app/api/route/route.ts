import { NextResponse } from "next/server";
import { isSameLocation } from "@/lib/domain/fare";
import { fetchRoadRoute } from "@/lib/routing/osrm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pickupLat = Number(searchParams.get("pickupLat"));
  const pickupLng = Number(searchParams.get("pickupLng"));
  const dropoffLat = Number(searchParams.get("dropoffLat"));
  const dropoffLng = Number(searchParams.get("dropoffLng"));

  if (
    !Number.isFinite(pickupLat) ||
    !Number.isFinite(pickupLng) ||
    !Number.isFinite(dropoffLat) ||
    !Number.isFinite(dropoffLng) ||
    pickupLat < -90 ||
    pickupLat > 90 ||
    dropoffLat < -90 ||
    dropoffLat > 90 ||
    pickupLng < -180 ||
    pickupLng > 180 ||
    dropoffLng < -180 ||
    dropoffLng > 180
  ) {
    return NextResponse.json(
      { error: "Invalid pickup or destination coordinates." },
      { status: 400 }
    );
  }

  const pickup = { lat: pickupLat, lng: pickupLng };
  const dropoff = { lat: dropoffLat, lng: dropoffLng };

  if (isSameLocation(pickup, dropoff)) {
    return NextResponse.json(
      { error: "Pickup and destination coordinates cannot be identical." },
      { status: 400 }
    );
  }

  const route = await fetchRoadRoute(pickup, dropoff);
  return NextResponse.json(route);
}
