# MotoGo — Non-Functional Requirements (`NON_FUNCTIONAL_REQUIREMENTS.md`)

This document defines the **quality attributes** (security, performance, reliability, usability, maintainability, and auditability) that MotoGo must satisfy.

---

## 1. Security & Data Privacy (`NFR-SEC`)

- **NFR-SEC-01 (Row Level Security Everywhere):** Every application table in Supabase PostgreSQL must have Row Level Security (RLS) enabled with explicit least-privilege policies:
  - Passengers can only read/create their own rides and ratings.
  - Drivers can only read open `requested` rides (when approved & online), read/update rides assigned to them, and read their own earnings/documents/motorcycles.
  - Administrators have controlled full visibility governed by role checks backed by trusted server/database claims.
- **NFR-SEC-02 (Private Document Storage):** Driver verification documents (licenses, IDs, OR/CR) must be stored in a **private** Supabase Storage bucket (`driver-documents`), never a public bucket. Files are viewed only via short-lived signed URLs (e.g., 5-minute expiry) restricted to the owning Driver and Administrators.
- **NFR-SEC-03 (Secret Hygiene):** No Supabase keys, service role secrets, or credentials may ever be hardcoded in source code or committed to Git. `.env.local` must be gitignored from day one.
- **NFR-SEC-04 (Server-Side Authorization):** Sensitive mutations (admin approvals, fare updates, atomic ride acceptance, account suspensions) must validate authentication, role, and business rules on the server/database—never trusting client-sent role flags or calculated fares.
- **NFR-SEC-05 (Input Validation):** All API routes and Server Actions must validate incoming payloads (e.g., with Zod schemas), including file type and file size limits (e.g., max 5 MB, JPEG/PNG/PDF only) for driver document uploads.

---

## 2. Performance & Real-Time Responsiveness (`NFR-PERF`)

- **NFR-PERF-01 (Real-Time Propagation):** Ride status changes and new ride offers delivered via Supabase Realtime should appear on connected Passenger, Driver, and Admin screens within **≤ 2 seconds** under normal network conditions.
- **NFR-PERF-02 (Database Indexing):** High-frequency query paths (`rides.status`, `rides.passenger_id`, `rides.driver_id`, `drivers.approval_status`, `drivers.availability_status`, `activity_logs.created_at`) must be indexed in PostgreSQL.
- **NFR-PERF-03 (Fast Fare Estimation):** Fare estimation should complete in **< 300 ms** for deterministic distance-based calculations.
- **NFR-PERF-04 (Pagination):** Lists that grow unbounded over time (Ride History, Admin Users, Admin Rides, Activity Logs, Driver Earnings) must support pagination or bounded queries.

---

## 3. Reliability & Concurrency (`NFR-REL`)

- **NFR-REL-01 (Zero Double-Booking):** Concurrent driver acceptances on the same ride must be handled atomically at the database layer (PostgreSQL row locking / conditional update in an RPC function) so exactly one driver wins and others receive a graceful "Ride already taken" notification.
- **NFR-REL-02 (Idempotent State Transitions):** Duplicate clicks (e.g., clicking "Complete Ride" or "Request Ride" twice rapidly) must not create duplicate rides or duplicate earnings ledger rows.
- **NFR-REL-03 (Realtime Recovery):** If a user's internet connection drops briefly, the UI must reconcile the latest ride state from Supabase upon reconnect or focus without leaving stale UI state.

---

## 4. Usability & Accessibility (`NFR-UX`)

- **NFR-UX-01 (Mobile-First for Passengers & Drivers):** Passenger booking/tracking and Driver dispatch/trip views must be designed mobile-first (usable cleanly on 375px-wide smartphone viewports as well as desktop).
- **NFR-UX-02 (Desktop-Optimized Admin Dashboard):** Admin panels (driver document review, live ride table, fare configuration, reports, activity logs) must be clean, scannable, and responsive on desktop and tablet screens.
- **NFR-UX-03 (Clear Status Feedback):** Every async action (requesting a ride, uploading documents, approving a driver) must show loading states, clear success confirmations, and human-readable error messages.
- **NFR-UX-04 (Accessible Controls):** Interactive controls must use semantic HTML, visible focus rings, legible contrast, and clear labels.

---

## 5. Maintainability & Testability (`NFR-MAINT`)

- **NFR-MAINT-01 (Strict TypeScript):** `strict: true` enabled in `tsconfig.json`; zero `any` types in domain models and Supabase service boundaries.
- **NFR-MAINT-02 (Clean Separation of Concerns):** Domain logic (fare calculation, state-machine validation) must be isolated from React UI components so it can be unit-tested cleanly without spinning up a browser.
- **NFR-MAINT-03 (Versioned Migrations):** All database tables, indexes, RLS policies, and RPC functions must be stored as ordered SQL migration files in the repository.
- **NFR-MAINT-04 (Workspace Isolation):** All project code, configuration, and skills remain strictly scoped inside `F:\ws semi brad` without modifying global system state or other projects.

---

## 6. Observability & Auditability (`NFR-OBS`)

- **NFR-OBS-01 (Immutable Activity Logs):** All admin governance events and critical ride overrides are recorded with `actor_id`, `action`, `entity_type`, `entity_id`, `metadata` (JSONB), and `created_at`.
- **NFR-OBS-02 (Structured Error Handling):** Server errors must log diagnostic context server-side while returning safe, non-sensitive error messages to the client.
