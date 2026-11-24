# MotoGo — Engineering & Academic Lessons Learned (`LESSONS_LEARNED.md`)

These lessons come directly from real design trade-offs, bugs caught during testing, and security findings encountered while building MotoGo across 17 batches.

---

## 1. Never Rely Only on Frontend Button States for Concurrency or Security
Disabling an "Accept Ride" button in React does not stop two drivers from clicking it within the same millisecond or stop a curious user from calling PostgREST directly. Enforcing atomic `FOR UPDATE` row locks inside PostgreSQL RPCs (`accept_ride`, `complete_ride_trip`) and `BEFORE UPDATE` triggers (`SEC-01`, `SEC-02`) proved why the database must be the final source of truth.

## 2. Row Level Security Requires Column-Level Self-Update Thinking
Our Batch 16 security audit revealed that even when RLS restricts `UPDATE` to `id = auth.uid()`, a user can still attempt to update sensitive columns (`account_status`, `verification_status`) unless guarded explicitly by `WITH CHECK` or a `BEFORE UPDATE` trigger. Catching and fixing `SEC-01` and `SEC-02` in migration `0010` reinforced defense in depth.

## 3. Snapshot Financial & Pricing Data at Booking Time
If rides merely joined against the current `fare_settings` row, any Admin price update would silently rewrite historical receipts and driver earnings. Storing immutable `snapshot_*` columns and `fare_breakdown` JSONB on each ride guarantees audit-proof history.

## 4. Straight-Line Distance Is Not Road Distance
Using Haversine straight-line distance alone underestimates urban motorcycle routes. Integrating OSRM (`/api/route`) gave real street-following polylines (`147` road points, `3.94 km` vs straight-line) while keeping an honestly labeled fallback if the public demo server is unavailable.

## 5. Pure Domain Modules Make Regression Testing Fast and Reliable
Keeping pure TypeScript modules (`src/lib/domain/*`) free of Next.js/React/Supabase imports allowed us to run 14 end-to-end regression groups in seconds and immediately catch a real bug (`BUG-04`: rejected drivers needed explicit filtering inside `resolveConcurrentAcceptAttempts`).

## 6. Credential & Workspace Hygiene Matters Every Day
Installing Matt Pocock's Skills strictly into `.agents/skills/` protected other projects on the machine, `.env.local` stayed gitignored from day one, and deleting temporary Supabase Personal Access Tokens (`sbp_...`) immediately after applying migrations minimized credential exposure.

## 7. Incremental Batch-Gated AI Development Beats "One-Shot" Generation
Breaking MotoGo into 17 explicit batches with stop-and-verify checkpoints prevented architectural drift, kept TypeScript strict mode (`0` errors) green at every milestone, and produced cleaner code than asking an AI agent to generate the entire app in one prompt.
