# MotoGo — Final Presentation Outline & Technical Defense Guide (`PRESENTATION_AND_DEFENSE.md`)

---

## Part A: 19-Section Final Presentation Outline

1. **Introduction**
   - Introduce **MotoGo**: an original web-based Motorcycle Ride-Hailing & Driver Management System built with Next.js App Router, TypeScript, Tailwind CSS, Leaflet/OpenStreetMap, and Online Supabase.
2. **Problem Statement**
   - Commuters lack vetted motorcycle riders, upfront fare transparency, and live trip visibility; drivers lack structured onboarding and earnings tracking; administrators lack centralized vetting, monitoring, and audit trails.
3. **Project Objectives**
   - Deliver role-isolated Passenger, Driver, and Admin portals backed by a normalized PostgreSQL schema, atomic concurrency controls, real-time status updates, actual road routing, and defense-in-depth security.
4. **Target Users**
   - **Passengers** (commuters), **Drivers** (vetted motorcycle partners), and **Administrators** (platform operations & compliance).
5. **System Features**
   - Auth & RBAC, interactive OpenStreetMap + OSRM booking, upfront Fare Engine with immutable snapshots, private document uploads + Admin signed-URL verification, atomic dispatch, Realtime tracking, demo payment settlement, notifications, ratings, and CSV-exportable reports.
6. **Passenger Live Demonstration**
   - Register/Login → `/passenger` dashboard → `/passenger/book` (click map / GPS / demo preset → OSRM road route & itemized fare → Review & Confirm) → `/passenger/active-ride` (live Realtime updates + map) → `/passenger/history` & `/passenger/notifications`.
7. **Driver Live Demonstration**
   - Register (`/register/driver`) → `/driver/verification` (upload private license/OR-CR/photos; show Online toggle **locked** while `pending`) → once approved, toggle **Online** → `/driver/available-rides` (Realtime offer → Accept or Reject) → `/driver/active-ride` (`Arrived` → `Start` → `Complete` with `Cash`/`Demo Wallet`) → `/driver/earnings` & rating history.
8. **Admin Live Demonstration**
   - Log in as securely provisioned Admin → `/admin` (8 live Supabase KPIs) → `/admin/verification` (open 5-minute signed URLs → Approve/Reject/Suspend) → `/admin/motorcycles`, `/admin/rides`, `/admin/fares` → `/admin/reports` (Daily/Weekly/Monthly + Driver Performance + CSV download) → `/admin/activity-logs`.
9. **Next.js Architecture**
   - Next.js 15 App Router, Server Components for data fetching, Server Actions for mutations, `src/middleware.ts` for SSR session & role enforcement, nested role layouts (`AppShell`), and `next/dynamic` (`ssr: false`) for Leaflet.
10. **Supabase Integration**
    - **PostgreSQL** (12 tables, triggers, RPCs), **Auth** (`@supabase/ssr` cookies), **Realtime** (`postgres_changes` with unmount cleanup), and **Private Storage** (`driver-documents` bucket + signed URLs).
11. **Database ERD**
    - Walk through [ERD.md](./ERD.md): `profiles` → `drivers` → `vehicles`, `rides` (1 passenger, 0..1 driver, fare snapshot), `ride_locations`, `ride_status_history`, `ride_rejections`, `payments` (1:1 completed), `ratings` (1:1 completed), `notifications`, `activity_logs`.
12. **Security and RLS**
    - 3-layer defense: Middleware + `requireRole()` + PostgreSQL RLS & `BEFORE UPDATE` triggers (`SEC-01`, `SEC-02`), zero hardcoded secrets, private storage, and CSV formula-injection protection.
13. **Matt Pocock Skills Evidence**
    - Show `.agents/skills/` (39 skills) & `skills-lock.json`; highlight `domain-modeling` (Glossary & ADRs), `grill-with-docs` (edge cases), `to-spec` (27 User Stories), and `to-tickets` (vertical slices).
14. **Agentic Development Workflow**
    - Explain the 17-batch stop-and-verify workflow with Google Antigravity, clearly separating AI-generated code, Skills guidance, student decisions/credentials/verification, and actual test runs.
15. **Code Walkthrough**
    - Briefly walk through 4 high-impact files: `src/middleware.ts`, `src/lib/domain/fare.ts`, `supabase/migrations/202611230006_driver_matching_and_rejections.sql` (`accept_ride`), and `src/lib/realtime/useRealtimeSubscription.ts`.
16. **Testing Results**
    - Present actual observed results from [TESTING_REPORT.md](./TESTING_REPORT.md): `14/14` automated regression suite passed, `tsc --noEmit` 0 errors, `npm run build` 35/35 routes, 21/21 protected routes `HTTP 307`, live RLS `HTTP 401`, live OSRM `3.94 km / 147 pts`, two-session Realtime handshake & cleanup.
17. **Lessons Learned**
    - Highlight atomic DB locking vs frontend buttons, column-level RLS triggers (`SEC-01`/`SEC-02`), fare snapshotting, OSRM road routing, and batch-gated AI engineering.
18. **Limitations**
    - Honest disclosure: academic demo payments (`Cash`/`Demo Wallet`, no live payment gateway), public OSRM demo server rate limits, optional clearly-labeled simulated driver movement, and web-only (no native iOS/Android app).
19. **Q&A**
    - Open floor using the technical defense guide below.

---

## Part B: Technical Defense Questions & Student-Friendly Answers

### 1. Why did you use Next.js App Router with Server Actions instead of a separate Express backend?
**Answer:** Next.js App Router lets us run secure server-side queries, authentication checks (`requireRole`), and mutations (Server Actions & Route Handlers) inside one TypeScript codebase. That eliminates CORS headaches, keeps Supabase session cookies HTTP-only via `@supabase/ssr`, and lets us share exact TypeScript domain types between server and UI.

### 2. How do you prevent two drivers from accepting the exact same ride at the same time?
**Answer:** We do **not** rely on disabling frontend buttons. When a driver clicks **Accept Ride**, it calls our atomic PostgreSQL `accept_ride(p_ride_id)` RPC (`SECURITY DEFINER`), which locks the `rides` row with `SELECT ... FOR UPDATE`, verifies `status = 'requested' AND driver_id IS NULL`, checks that the driver is approved, online, has an active motorcycle, and has no conflicting active ride (`idx_rides_one_active_per_driver`), and assigns the ride inside one transaction. The first driver wins; the second gets a clean conflict error.

### 3. How does MotoGo stop a Passenger or Driver from promoting themselves to Admin?
**Answer:** Three layers block it: (1) Public sign-up Server Actions hardcode `role: "passenger"` or `role: "driver"`, and the DB trigger `handle_new_user()` rejects `'admin'` on signup; (2) `updateProfileAction` only updates `full_name` and `phone`; (3) Even if someone calls Supabase directly via PostgREST, our RLS policy and `trg_profiles_self_update_guard` trigger block non-admins from changing `role` or `account_status`.

### 4. Why are driver documents stored in a private Supabase Storage bucket instead of a public bucket?
**Answer:** Driver licenses, government IDs, and motorcycle OR/CR contain sensitive personal data. Making the `driver-documents` bucket private (`public = false`) means nobody can guess or share a public URL. Only the owning driver (their own `{userId}/` folder) and Administrators (via temporary 5-minute signed URLs) can view them.

### 5. What happens to past rides if an Administrator changes the Base Fare or Per-Kilometer Rate?
**Answer:** Past and in-progress rides never change. When a ride is created, MotoGo snapshots the active pricing rules (`snapshot_base_fare`, `snapshot_per_km_rate`, `snapshot_minimum_fare`, `snapshot_waiting_fee`, `snapshot_cancellation_fee`, and `fare_breakdown` JSONB) directly onto the `rides` row (`BR-07`).

### 6. Why did you use OSRM instead of calculating straight-line distance?
**Answer:** Straight-line (as-the-crow-flies) distance ignores real streets, rivers, and one-way roads, which undercharges drivers. Our `/api/route` endpoint queries OSRM's OpenStreetMap road graph to get actual street distance, travel time, and a multi-point road polyline. If the public demo server is ever unreachable, the UI clearly switches to a labeled **Fallback Estimate** instead of pretending straight-line distance is a road route.

### 7. How do you prevent memory leaks with Supabase Realtime in React?
**Answer:** All Realtime channels go through our reusable `useRealtimeSubscription` hook, which returns a `useEffect` cleanup function that calls `supabase.removeChannel(channel)` and removes the `visibilitychange` listener on component unmount. We verified `0` lingering channels in our two-session automated test.

### 8. How do you prevent duplicate trip completions or duplicate payment records?
**Answer:** Our `complete_ride_trip` RPC locks the `rides` row with `FOR UPDATE`, rejects any ride whose status is already `'completed'` or not `'in_progress'`, and inserts into `payments` which has a `UNIQUE(ride_id)` constraint plus an accounting check (`gross_amount = platform_fee + driver_net_earnings`).

### 9. Are you processing real money with Demo Wallet?
**Answer:** No—and we state that transparently in the UI, database constraints, and documentation. `Cash` and `Demo Wallet` (`unpaid` / `paid` / `cancelled`) are academic demonstration payment records designed to prove financial ledgering and driver earnings math without requiring commercial merchant KYC.

### 10. How did you use Matt Pocock's Skills and Google Antigravity responsibly?
**Answer:** We installed `mattpocock/skills` strictly in our project's `.agents/skills/` folder and used `domain-modeling`, `grill-with-docs`, `to-spec`, and `to-tickets` to establish a canonical glossary, ADRs, vertical-slice tickets, and edge-case business rules before writing code. Every batch was scoped, reviewed, built (`npm run build`), and verified with actual automated tests (`14/14` passed)—with full transparent attribution in `AI_DEVELOPMENT_LOG.md` and `SKILLS_USAGE.md`.
