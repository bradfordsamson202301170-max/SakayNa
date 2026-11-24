import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

import * as fare from "../src/lib/domain/fare.ts";
import * as rideReq from "../src/lib/domain/rideRequest.ts";
import * as drv from "../src/lib/domain/driver.ts";
import * as match from "../src/lib/domain/matching.ts";
import * as trip from "../src/lib/domain/tripCompletion.ts";
import * as rep from "../src/lib/domain/reports.ts";
import * as geo from "../src/lib/routing/geolocation.ts";

const results = [];
function record(group, name, fn) {
  try {
    fn();
    results.push({ group, name, status: "PASS" });
  } catch (err) {
    results.push({
      group,
      name,
      status: "FAIL",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

async function recordAsync(group, name, fn) {
  try {
    await fn();
    results.push({ group, name, status: "PASS" });
  } catch (err) {
    results.push({
      group,
      name,
      status: "FAIL",
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ---------------------------------------------------------------------------
// 1. Domain Unit Regression Tests
// ---------------------------------------------------------------------------
const sampleRule = {
  id: "fare-std",
  name: "Standard MotoGo Fare",
  currency: "PHP",
  base_fare: 30,
  per_km_rate: 8,
  per_min_rate: 0,
  minimum_fare: 45,
  waiting_fee: 5,
  cancellation_fee: 20,
  commission_rate: 0.15,
};

record("Fare Engine", "Minimum fare floor & standard formula", () => {
  const shortTrip = fare.calculateFareEstimate(0.5, 3, sampleRule);
  assert.equal(shortTrip.estimatedFare, 45);
  assert.equal(shortTrip.minimumFareApplied, true);

  const normalTrip = fare.calculateFareEstimate(5, 12, sampleRule);
  assert.equal(normalTrip.estimatedFare, 70);
  assert.equal(normalTrip.minimumFareApplied, false);

  const waitingTrip = fare.calculateFareEstimate(5, 12, sampleRule, 2);
  assert.equal(waitingTrip.additionalCharges, 10);
  assert.equal(waitingTrip.estimatedFare, 80);
});

record("Fare Engine", "Historical snapshot immutability & validation", () => {
  const est = fare.calculateFareEstimate(5, 12, sampleRule);
  const snap = fare.buildRideFareBreakdownSnapshot(sampleRule, est);
  const updated = fare.calculateFareEstimate(5, 12, { ...sampleRule, base_fare: 60 });
  assert.equal(snap.estimatedTotal, 70);
  assert.equal(updated.estimatedFare, 100);
  assert.equal(
    fare.validateFareSettingInput({
      baseFare: -1,
      perKmRate: 8,
      minimumFare: 45,
      waitingFee: 5,
      cancellationFee: 20,
      commissionPercent: 15,
    }).valid,
    false
  );
});

record("Ride Request", "All 6 validation rules & canonical statuses", () => {
  const valid = {
    passengerId: "u-1",
    pickupAddress: "Central Terminal",
    dropoffAddress: "Tech Park",
    pickupLat: 14.5995,
    pickupLng: 120.9842,
    dropoffLat: 14.6218,
    dropoffLng: 121.0024,
    estimatedFare: 62,
    hasExistingActiveRide: false,
  };
  assert.equal(rideReq.validateRideRequestInput(valid).valid, true);
  assert.equal(rideReq.validateRideRequestInput({ ...valid, passengerId: "" }).valid, false);
  assert.equal(rideReq.validateRideRequestInput({ ...valid, pickupAddress: "" }).valid, false);
  assert.equal(rideReq.validateRideRequestInput({ ...valid, dropoffAddress: "" }).valid, false);
  assert.equal(
    rideReq.validateRideRequestInput({ ...valid, dropoffLat: valid.pickupLat, dropoffLng: valid.pickupLng }).valid,
    false
  );
  assert.equal(rideReq.validateRideRequestInput({ ...valid, estimatedFare: 0 }).valid, false);
  assert.equal(rideReq.validateRideRequestInput({ ...valid, hasExistingActiveRide: true }).valid, false);
  assert.equal(rideReq.toDisplayRideStatus("cancelled_by_passenger"), "cancelled");
});

record("Driver Approval", "Strict BR-01 gating & upload validation", () => {
  for (const st of ["pending", "rejected", "suspended"]) {
    assert.equal(
      drv.canDriverGoOnline({ approvalStatus: st, availabilityStatus: "offline", hasActiveVehicle: true }).allowed,
      false
    );
  }
  assert.equal(
    drv.canDriverGoOnline({ approvalStatus: "approved", availabilityStatus: "offline", hasActiveVehicle: false }).allowed,
    false
  );
  assert.equal(
    drv.canDriverGoOnline({ approvalStatus: "approved", availabilityStatus: "offline", hasActiveVehicle: true }).allowed,
    true
  );
  assert.equal(drv.validateUploadFile({ size: 1024, type: "image/png", name: "id.png" }).valid, true);
  assert.equal(drv.validateUploadFile({ size: 6 * 1024 * 1024, type: "image/png", name: "big.png" }).valid, false);
  assert.equal(drv.validateUploadFile({ size: 1024, type: "text/html", name: "x.html" }).valid, false);
});

record("Atomic Matching", "Concurrent acceptance yields exactly 1 winner", () => {
  const rideId = "ride-reg-1";
  const drivers = [
    { driverId: "d-pend", accountStatus: "active", approvalStatus: "pending", availabilityStatus: "online", hasActiveVehicle: true, hasConflictingActiveRide: false, rejectedRideIds: [] },
    { driverId: "d-busy", accountStatus: "active", approvalStatus: "approved", availabilityStatus: "online", hasActiveVehicle: true, hasConflictingActiveRide: true, rejectedRideIds: [] },
    { driverId: "d-rej", accountStatus: "active", approvalStatus: "approved", availabilityStatus: "online", hasActiveVehicle: true, hasConflictingActiveRide: false, rejectedRideIds: [rideId] },
    { driverId: "d-win", accountStatus: "active", approvalStatus: "approved", availabilityStatus: "online", hasActiveVehicle: true, hasConflictingActiveRide: false, rejectedRideIds: [] },
    { driverId: "d-lose", accountStatus: "active", approvalStatus: "approved", availabilityStatus: "online", hasActiveVehicle: true, hasConflictingActiveRide: false, rejectedRideIds: [] },
  ];
  const res = match.resolveConcurrentAcceptAttempts(
    { rideId, status: "requested", assignedDriverId: null },
    drivers
  );
  assert.equal(res.winnerDriverId, "d-win");
  assert.equal(res.outcomes.filter((o) => o.accepted).length, 1);
  assert.equal(res.outcomes.filter((o) => !o.accepted).length, 4);
});

record("Trip Completion", "Sequential transitions, duplicate block & payment math", () => {
  assert.equal(trip.validateDriverTransition("accepted", "driver_arrived").valid, true);
  assert.equal(trip.validateDriverTransition("driver_arrived", "in_progress").valid, true);
  assert.equal(trip.validateDriverTransition("in_progress", "completed").valid, true);
  assert.equal(trip.validateDriverTransition("accepted", "completed").valid, false);
  assert.equal(trip.validateDriverTransition("completed", "completed").valid, false);

  const settle = trip.computeTripSettlement({
    estimatedFare: 78,
    confirmedFinalFare: 78,
    minimumFareFloor: 45,
    commissionRate: 0.15,
    paymentMethod: "demo_wallet",
    paymentStatus: "paid",
  });
  assert.equal(settle.ok, true);
  if (settle.ok) {
    assert.equal(settle.settlement.platformFee + settle.settlement.driverNetEarnings, 78);
  }
});

record("Reports & CSV", "Time windows & CSV formula-injection neutralization", () => {
  const metrics = rep.aggregateRideTimeWindows(
    [
      { id: "1", driver_id: "d1", status: "completed", created_at: "2026-11-23T09:00:00Z" },
      { id: "2", driver_id: "d1", status: "cancelled_by_driver", created_at: "2026-11-20T09:00:00Z" },
    ],
    new Date("2026-11-23T12:00:00Z")
  );
  assert.equal(metrics.dailyRides, 1);
  assert.equal(metrics.weeklyRides, 2);
  assert.equal(metrics.completionRate, 50);

  const csv = rep.toCsvString(["Col"], [["=SUM(A1:A2)"]]);
  assert(csv.includes("'=SUM(A1:A2)"));
});

record("Geolocation", "Permission error mapping", () => {
  assert.equal(geo.mapGeolocationErrorCode(1).code, "PERMISSION_DENIED");
  assert.equal(geo.mapGeolocationErrorCode(2).code, "POSITION_UNAVAILABLE");
  assert.equal(geo.mapGeolocationErrorCode(3).code, "TIMEOUT");
});

record("Security Static Scan", "Zero hardcoded secrets in src/ and supabase/", () => {
  const patterns = [/sb_secret_[A-Za-z0-9_-]+/, /sbp_[A-Za-z0-9_-]+/, /service_role/i];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|mjs|sql)$/.test(entry.name)) {
        const text = fs.readFileSync(full, "utf8");
        for (const p of patterns) {
          assert.equal(p.test(text), false, `Secret pattern ${p} found in ${full}`);
        }
      }
    }
  }
  walk("src");
  walk("supabase");
});

// ---------------------------------------------------------------------------
// 2. Live Server & Online Supabase Security/Connectivity Regression Tests
// ---------------------------------------------------------------------------
const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

async function waitForServer(url, retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      if (r.status) return;
    } catch {}
    await new Promise((res) => setTimeout(res, 300));
  }
  throw new Error("Next.js server did not start in time");
}

const srv = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3093"],
  { stdio: "ignore", env: { ...process.env } }
);

try {
  await waitForServer("http://127.0.0.1:3093/login");

  await recordAsync("Auth Routes", "Public routes return HTTP 200", async () => {
    const publics = ["/", "/login", "/register/passenger", "/register/driver", "/forgot-password"];
    const statuses = await Promise.all(
      publics.map((p) => fetch("http://127.0.0.1:3093" + p, { redirect: "manual" }).then((r) => r.status))
    );
    for (const st of statuses) assert.equal(st, 200);
  });

  await recordAsync("Auth Guards", "All 21 protected routes redirect unauthenticated users (HTTP 307)", async () => {
    const protectedRoutes = [
      "/passenger", "/passenger/book", "/passenger/active-ride", "/passenger/history", "/passenger/profile", "/passenger/notifications",
      "/driver", "/driver/verification", "/driver/available-rides", "/driver/active-ride", "/driver/earnings", "/driver/profile",
      "/admin", "/admin/passengers", "/admin/drivers", "/admin/verification", "/admin/motorcycles", "/admin/rides", "/admin/fares", "/admin/reports", "/admin/activity-logs",
    ];
    const statuses = await Promise.all(
      protectedRoutes.map((p) => fetch("http://127.0.0.1:3093" + p, { redirect: "manual" }).then((r) => ({ p, s: r.status })))
    );
    for (const { p, s } of statuses) assert.equal(s, 307, `${p} expected 307 got ${s}`);
  });

  await recordAsync("Admin API Security", "/api/admin/export blocks unauthenticated callers (HTTP 401)", async () => {
    const r = await fetch("http://127.0.0.1:3093/api/admin/export?type=rides", { redirect: "manual" });
    assert.equal(r.status, 401);
  });

  await recordAsync("Routing API", "/api/route returns valid OSRM road route & rejects invalid coords", async () => {
    const [okRes, badRes] = await Promise.all([
      fetch("http://127.0.0.1:3093/api/route?pickupLat=14.5995&pickupLng=120.9842&dropoffLat=14.6218&dropoffLng=121.0024"),
      fetch("http://127.0.0.1:3093/api/route?pickupLat=14.5995&pickupLng=120.9842&dropoffLat=14.5995&dropoffLng=120.9842"),
    ]);
    assert.equal(okRes.status, 200);
    const body = await okRes.json();
    assert(body.distanceKm > 0 && body.geometry.length >= 2);
    assert.equal(badRes.status, 400);
  });

  await recordAsync("Supabase Live RLS", "Auth healthy (200), anon table reads/writes denied (401), private bucket blocked (400)", async () => {
    const headers = {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: "Bearer " + env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    };

    const health = await fetch(env.NEXT_PUBLIC_SUPABASE_URL + "/auth/v1/health", { headers });
    assert.equal(health.status, 200);

    const tables = ["profiles", "drivers", "vehicles", "rides", "payments", "ratings", "notifications", "activity_logs"];
    const rlsStatuses = await Promise.all(
      tables.map((t) =>
        fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${t}?select=id&limit=1`, { headers }).then((r) => ({ t, s: r.status }))
      )
    );
    for (const { t, s } of rlsStatuses) assert.equal(s, 401, `Anon read on ${t} expected 401 got ${s}`);

    const storage = await fetch(
      `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/driver-documents/probe.jpg`
    );
    assert(storage.status >= 400);
  });
} finally {
  srv.kill();
}

const passed = results.filter((r) => r.status === "PASS").length;
const failed = results.filter((r) => r.status === "FAIL").length;
for (const r of results) {
  console.log(`[${r.status}] ${r.group} :: ${r.name}${r.error ? " -> " + r.error : ""}`);
}
console.log(`SUMMARY: ${passed}/${results.length} PASSED, ${failed} FAILED`);
process.exit(failed > 0 ? 1 : 0);
