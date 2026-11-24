# MotoGo — Structured Agent Prompts Log (`AGENT_PROMPTS.md`)

This document records the **incremental, batch-gated prompt engineering strategy** used by the student to direct Google Antigravity safely from an empty directory to a complete full-stack system without losing architectural control.

---

## Prompting Strategy Principles Used

1. **Batch Isolation (`THIS IS BATCH N ONLY` / `STOP after Batch N`):** Prevented runaway code generation by forcing clear review checkpoints after every architectural layer.
2. **Workspace Safety Constraints:** Explicitly instructed the agent from Batch 1 not to affect other projects, not to overwrite existing files, and never to expose service role credentials.
3. **Honesty & Anti-Fabrication Constraints:** Explicitly prohibited fake database operations in Batch 3, fabricated production seed data in Batch 4, fake real-payment claims in Batch 14, and fabricated test results in Batches 16–17.
4. **Skill-Guided Engineering:** Explicitly instructed the agent in Batches 1–2 to verify, install, and apply `mattpocock/skills` (`domain-modeling`, `grill-with-docs`, `to-spec`, `to-tickets`).

---

## Summary of Batches 1–17 Prompts

- **Batch 1:** Inspect empty workspace, verify Node/npm/Supabase status, verify & install Matt Pocock Skills with authorization, produce student-friendly `BATCH_01_REPORT.md`.
- **Batch 2:** Define Passenger, Driver, and Admin roles, business rules, Mermaid workflows, and 7 core planning documents (`PROJECT_SPEC.md`, `FUNCTIONAL_REQUIREMENTS.md`, `NON_FUNCTIONAL_REQUIREMENTS.md`, `USER_ROLES.md`, `USER_WORKFLOWS.md`, `IMPLEMENTATION_PLAN.md`, `DECISION_LOG.md`).
- **Batch 3:** Build original MotoGo UI/UX foundation (dark navy, white, orange), reusable layouts/components, 23 design-only pages, `ARCHITECTURE.md`, and `UI_DESIGN_GUIDE.md`.
- **Batch 4:** Design 11 normalized PostgreSQL tables, SQL migrations in `supabase/migrations/`, RLS policies, `DATABASE_SCHEMA.md`, `ERD.md`, and non-fabricated `SEED_DATA.sql`; verify online Supabase connectivity.
- **Batch 5:** Implement Supabase Auth (Passenger/Driver signup, login, logout, password reset, session middleware, role layouts, profile updates), test unauthorized access, and write `AUTHENTICATION_DOCUMENTATION.md`.
- **Batch 6:** Implement live Passenger module (Dashboard, Profile, Book a Ride, Active Ride, Ride History, Notifications) connected to authenticated Supabase records.
- **Batch 7:** Implement live Driver module (registration with address/license/motorcycle, private Storage document uploads, strict approval gating, Dashboard, Available Rides, Active Ride, Earnings).
- **Batch 8:** Implement live Admin module (9 screens, zero hardcoded statistics, signed-URL document verification, motorcycle management, live ride monitoring, fare settings, reports, activity logs).
- **Batch 9:** Integrate Leaflet + OpenStreetMap + OSRM road routing, permission-first Browser Geolocation, manual pin selection, academic demo coordinates, and clearly labeled simulated driver movement.
- **Batch 10:** Implement server-validated Fare Calculation module (`Base Fare + Distance × Per-Km Rate`, minimum fare, waiting fee, cancellation fee, immutable ride breakdown snapshot) and test edge cases.
- **Batch 11:** Complete 7-step Passenger Ride Request system with confirmation step, 6 server-side validations, foreign keys, `ride_status_history`, and database verification.
- **Batch 12:** Implement atomic Driver Matching & Ride Acceptance (`FOR UPDATE` row locks, conflicting active ride checks, persistent rejections) and test concurrent acceptance race conditions.
- **Batch 13:** Implement secure RLS-enforced Supabase Realtime across Passenger/Driver active rides and location pings, with strict unmount cleanup and two-session verification.
- **Batch 14:** Implement atomic Trip Completion (`driver_arrived` → `in_progress` → `completed`) and academic demo Payment Records (`Cash` / `Demo Wallet`; `unpaid` / `paid` / `cancelled`) preventing duplicate completion/payments.
- **Batch 15:** Implement 6-event lifecycle notifications, rating history, Daily/Weekly/Monthly & Driver Performance Admin Reports, search/filters, and role-protected CSV exports.
- **Batch 16:** Conduct comprehensive review, security audit, bug fixes, and automated regression testing (`TESTING_REPORT.md`, `SECURITY_AUDIT.md`, `BUG_FIX_LOG.md`).
- **Batch 17:** Prepare final academic documentation, 19-section presentation outline, technical defense Q&A, honest attribution, and README verification.
