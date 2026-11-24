# MotoGo — Architecture & Product Decision Log (`DECISION_LOG.md`)

> **Skills Applied:** Follows Matt Pocock's `domain-modeling` ADR criteria (recording decisions that are **hard to reverse**, **non-obvious without context**, and **driven by real trade-offs**) combined with edge-case stress-testing from `grill-with-docs`.

---

## ADR-001: Single Primary Role per User Account (`passenger` | `driver` | `admin`)
- **Status:** Accepted
- **Context:** A motorcycle ride-hailing system serves Passengers, Drivers, and Administrators. We had to decide whether one User Account can hold multiple roles simultaneously (e.g., a Driver who also books rides as a Passenger) or a single primary role per account.
- **Decision:** Use a **single primary role** stored on `profiles.role` (`passenger`, `driver`, `admin`) for MVP, with public self-registration restricted strictly to `passenger` and `driver`.
- **Trade-offs:**
  - *Pros:* Dramatically simplifies Next.js route guards, RLS policies, active-ride invariants (`BR-02`, `BR-03`), and UI navigation—making the system easier to reason about, audit, and test.
  - *Cons:* Someone who wants to both drive and book rides needs two separate accounts for now.
- **Reversibility:** Can be expanded later to a `user_roles` join table without breaking existing tables.

---

## ADR-002: Atomic Ride Acceptance via PostgreSQL RPC Function
- **Status:** Accepted
- **Context:** When a Passenger requests a ride, multiple online Drivers receive the offer via Supabase Realtime at the same time. If two Drivers tap **Accept** within milliseconds of each other, naive client-side `UPDATE` calls can cause a race condition (double-booking).
- **Decision:** Implement ride acceptance as a **PostgreSQL RPC function** (`accept_ride(p_ride_id uuid)`) using a conditional atomic update (`WHERE id = p_ride_id AND status = 'requested' AND driver_id IS NULL`) inside a single database transaction that also validates driver approval, online status, and active motorcycle, and sets driver availability to `on_trip`.
- **Trade-offs:**
  - *Pros:* Guarantees zero double-booking at the database level regardless of network latency or client concurrency (`BR-04`).
  - *Cons:* Moves acceptance orchestration into SQL rather than pure TypeScript.

---

## ADR-003: Fare Snapshotting at Ride Request Time
- **Status:** Accepted
- **Context:** Administrators can update Fare Configuration (base fare, per-km rate, commission rate) at any time. If rides only referenced the current `fare_configs` row dynamically, updating prices would retroactively alter in-progress rides and historical receipts.
- **Decision:** Copy (`snapshot`) the active pricing parameters (`base_fare`, `per_km_rate`, `per_min_rate`, `minimum_fare`, `commission_rate`, `estimated_fare`) directly onto each `rides` row at creation time (`BR-07`).
- **Trade-offs:**
  - *Pros:* Historical accuracy, dispute-proof receipts, and predictable earnings calculations.
  - *Cons:* Slight intentional data denormalization on the `rides` table.

---

## ADR-004: Private Supabase Storage Bucket + Short-Lived Signed URLs for Driver Documents
- **Status:** Accepted
- **Context:** Drivers upload sensitive personally identifiable information (driver's license, government ID, motorcycle OR/CR). Making the bucket public would expose sensitive identity documents to anyone who guesses a URL.
- **Decision:** Store all verification files in a **private** Supabase Storage bucket (`driver-documents`) partitioned by `driver_id/`. Drivers can only upload/read their own folder; Administrators view documents through server-generated, short-lived signed URLs (5-minute TTL).
- **Trade-offs:**
  - *Pros:* Strong privacy and compliance posture (`NFR-SEC-02`).
  - *Cons:* Requires a lightweight server call to generate signed URLs before rendering document previews in the Admin panel.

---

## ADR-005: Map & Location Provider Abstraction for MVP
- **Status:** Accepted
- **Context:** Paid mapping APIs (Google Maps Directions/Places) require billing accounts and API keys that can block local student development, while MotoGo still needs structured pickup/destination selection and reliable distance/duration estimates.
- **Decision:** Store pickup and destination as structured `{ label, lat, lng }` fields and compute distance/duration through a clean `RouteEstimator` interface. MVP ships with a deterministic Haversine + road-factor estimator and structured location picker (with optional OpenStreetMap/Leaflet UI), allowing a zero-schema drop-in swap to Google Maps or Mapbox later.
- **Trade-offs:**
  - *Pros:* Zero paid API blockers, instant deterministic tests, and clean upgrade path.
  - *Cons:* Straight-line-adjusted distance is an approximation compared to live turn-by-turn road routing.

---

## ADR-006: Cash / Recorded-Fare MVP with Automated Commission Ledger
- **Status:** Accepted
- **Context:** Integrating live third-party payment gateways (Stripe, GCash, Maya) requires merchant KYC, webhook infrastructure, and payout licensing—far beyond initial MVP scope.
- **Decision:** Record fares and automatically generate `driver_earnings` entries (`final_fare`, `platform_fee`, `net_earnings`) upon ride completion, assuming cash settlement between Passenger and Driver for MVP while keeping the schema ready for a future `payment_method` / `payment_status` integration.
- **Trade-offs:**
  - *Pros:* Delivers complete earnings tracking and financial reporting immediately without external payment sandbox blockers.
  - *Cons:* No automated online card/wallet capture in v1.

---

## ADR-007: Adapting Matt Pocock Skills (`to-spec`, `to-tickets`) for Local Antigravity Workflow
- **Status:** Accepted
- **Context:** Matt Pocock's `to-spec` and `to-tickets` skills expect an external issue tracker configured via `/setup-matt-pocock-skills` (e.g., GitHub Issues or Linear). In Batch 2, the MotoGo repository is local-first with no remote GitHub issue tracker configured yet.
- **Decision:** Apply the exact structural discipline of `domain-modeling` (canonical glossary + ADR criteria), `grill-with-docs` (edge-case stress-testing), `to-spec` (spec sections + user stories + high-seam testing), and `to-tickets` (vertical tracer-bullet slices + explicit blocking edges) directly into the 7 requested local markdown documents in `F:\ws semi brad\`.
- **Trade-offs:**
  - *Pros:* Full architectural rigor with zero external tracker friction; ready to sync to GitHub Issues later if desired.
  - *Cons:* Tickets live in `IMPLEMENTATION_PLAN.md` rather than an external tracker until a remote repo is connected.
