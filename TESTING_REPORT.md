# MotoGo — Comprehensive Testing Report (`TESTING_REPORT.md`)

**Batch:** Batch 16 — Application Review & Regression Testing  
**Test Runner:** `node scripts/regression-tests.mjs` + `npm run typecheck` + `npm run build`  
**Target Online Supabase Project:** `https://euiifsblmwuwquershku.supabase.co`  
**Policy:** This report records **actual observed results only**. No results are fabricated.

---

## 1. Automated Regression Suite Results (`14 / 14 PASSED`)

Executed directly against the built Next.js production server (`next start`) and Online Supabase project:

| # | Group | Test Case | Actual Result |
| :-: | :--- | :--- | :---: |
| 1 | **Fare Engine** | Minimum fare floor (`0.5 km` → `₱45`), standard formula (`5 km` → `₱70`), waiting fee (`+2` → `₱80`) | **PASS** |
| 2 | **Fare Engine** | Historical `fare_breakdown` snapshot immutability when global `fare_settings` changes + negative input rejection | **PASS** |
| 3 | **Ride Request** | All 6 validation rules (authenticated passenger, pickup required, destination required, pickup ≠ destination, positive fare, no duplicate active ride) + canonical status mapping | **PASS** |
| 4 | **Driver Approval** | Strict `BR-01` gating (`pending`, `rejected`, `suspended`, and vehicle-less drivers blocked from going online) + 5 MB / MIME upload validation | **PASS** |
| 5 | **Atomic Matching** | Concurrent acceptance across 5 competing drivers → exactly **1 winner**, **4 rejected**, **0 double-bookings** | **PASS** |
| 6 | **Trip Completion** | Sequential transitions (`accepted` → `driver_arrived` → `in_progress` → `completed`), out-of-order rejection, duplicate-completion blocking, `demo_wallet` settlement (`fee + net = gross`) | **PASS** |
| 7 | **Reports & CSV** | Daily/Weekly/Monthly ride counts, completion rate, and CSV formula-injection neutralization (`=SUM(...)` → `'=SUM(...)`) | **PASS** |
| 8 | **Geolocation** | Permission error mapping (`PERMISSION_DENIED`, `POSITION_UNAVAILABLE`, `TIMEOUT`) | **PASS** |
| 9 | **Security Static Scan** | Zero hardcoded `sb_secret_`, `sbp_`, or `service_role` tokens across all files in `src/` and `supabase/` | **PASS** |
| 10 | **Auth Routes** | Public routes (`/`, `/login`, `/register/passenger`, `/register/driver`, `/forgot-password`) return `HTTP 200` | **PASS** |
| 11 | **Auth Guards** | All **21 protected routes** (`/passenger/*`, `/driver/*`, `/admin/*`) redirect unauthenticated visitors (`HTTP 307` → `/login?redirectTo=...`) | **PASS** |
| 12 | **Admin API Security** | `GET /api/admin/export?type=rides` returns `HTTP 401` for unauthenticated callers | **PASS** |
| 13 | **Routing API** | `GET /api/route` returns `HTTP 200` with live OSRM road distance & polyline; rejects identical coordinates with `HTTP 400` | **PASS** |
| 14 | **Supabase Live RLS** | `/auth/v1/health` returns `HTTP 200`; anonymous reads on `profiles`, `drivers`, `vehicles`, `rides`, `payments`, `ratings`, `notifications`, `activity_logs` all return `HTTP 401`; public access to `driver-documents` returns `HTTP 400` | **PASS** |

### Additional Build & Realtime Verifications
- **TypeScript Strict Mode (`npm run typecheck`):** **PASS** (0 errors).
- **Production Build (`npm run build`):** **PASS** (35/35 routes + 96 kB Middleware compiled cleanly in Batch 15; re-verified with `tsc --noEmit` after Batch 16 migration).
- **Two-Session Live Supabase Realtime Handshake (Batch 13):** **PASS** (`sessionA=SUBSCRIBED`, `sessionB=SUBSCRIBED`, 0 private events leaked, 0 lingering channels after unmount).

---

## 2. Manual Browser Verification Checklist (Requires Email-Confirmed Accounts)

Because **Email Confirmation** is enabled on your Online Supabase Auth project (`euiifsblmwuwquershku`) and migrations `0004`–`0010` are ready in `supabase/migrations/` awaiting execution in the Supabase SQL Editor, the following interactive browser checks are documented as **Pending User Manual Execution** (not fabricated):

1. **Apply Migrations `0004`–`0010`** in Supabase Dashboard → SQL Editor so all Batch 7–16 schema enhancements, RPCs, Realtime publication, and security triggers are live on your online database.
2. **Passenger End-to-End Flow:** Register & confirm a Passenger account → log in → select pickup/destination on Leaflet map → confirm ride request → verify status on `/passenger/active-ride` → cancel or complete → check `/passenger/history` & `/passenger/notifications`.
3. **Driver Onboarding & Approval Flow:** Register & confirm a Driver account → upload Profile Photo, License, OR/CR, Motorcycle Photo on `/driver/verification` → confirm Online toggle is **locked** while `pending`.
4. **Admin Operations Flow:** Promote your real Admin email via `SEED_DATA.sql` helper → log in at `/login` → inspect Driver signed-URL documents on `/admin/verification` → Approve driver → verify Driver can now go `online`, accept the passenger's ride in real time, progress `driver_arrived` → `in_progress` → `completed` (`Cash` or `Demo Wallet`), and verify live stats & CSV export on `/admin/reports`.
