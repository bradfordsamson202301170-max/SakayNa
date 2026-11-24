# MotoGo — Motorcycle Ride-Hailing & Driver Management System

**MotoGo** is a full-stack web application built with **Next.js (App Router), React, TypeScript, Tailwind CSS**, **Leaflet + OpenStreetMap + OSRM Road Routing**, and **Online Supabase** (PostgreSQL, Authentication, Realtime, and Private Storage).

It supports three role-isolated workspaces:
- **Passenger Portal (`/passenger`)** — Interactive OpenStreetMap pickup/destination selection, OSRM actual road distance & upfront fare estimation, ride confirmation, live Supabase Realtime status & driver location tracking, ride history, ratings, and notifications.
- **Driver Partner Portal (`/driver`)** — Driver & motorcycle registration, private document uploads (`driver-documents`), approval-gated online/offline toggle, real-time ride dispatch, atomic ride acceptance / persistent rejection, sequential trip completion (`driver_arrived` → `in_progress` → `completed`), demo payment recording, earnings ledger, and rating history.
- **Administrator Console (`/admin`)** — Live Supabase KPIs, passenger management, driver verification with 5-minute signed document URLs, motorcycle management, live ride monitoring & override, fare configuration, daily/weekly/monthly & driver performance reports, CSV exports, and immutable activity logs.

---

## Tech Stack

- **Frontend & Server Actions:** Next.js 15 (App Router), React 19, TypeScript (`strict: true`), Tailwind CSS v4, Lucide React
- **Maps & Road Routing:** Leaflet, OpenStreetMap tiles, OSRM road routing (`/api/route`), permission-first Browser Geolocation API
- **Backend & Database:** Online Supabase (`@supabase/supabase-js`, `@supabase/ssr`) — PostgreSQL with Row Level Security (RLS), Supabase Auth, Supabase Realtime, and Private Storage
- **Agentic Engineering Workflow:** Google Antigravity + Matt Pocock's Skills (`mattpocock/skills` in `.agents/skills/`)

---

## Quick Start (Verified Run Instructions)

### 1. Prerequisites
- Node.js `v20+` (verified on `v24.19.0`)
- npm `10+` (verified on `11.6.2`)
- An Online Supabase project

### 2. Install Dependencies
```powershell
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env.local` and fill in your **Online Supabase URL** and **Anon / Publishable Key**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://euiifsblmwuwquershku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```
> **Security:** Never commit `.env.local` and never place a `service_role` / `sb_secret_` key in frontend code.

### 4. Apply Database Migrations & Baseline Seed
Run the SQL files in `supabase/migrations/` in exact order (`0001` → `0010`) followed by `SEED_DATA.sql` in your **Supabase Dashboard → SQL Editor**:
1. `202611230001_initial_schema.sql`
2. `202611230002_rls_and_storage.sql`
3. `202611230003_ride_rpcs_and_triggers.sql`
4. `202611230004_driver_onboarding_fields.sql`
5. `202611230005_fare_module_fields.sql`
6. `202611230006_driver_matching_and_rejections.sql`
7. `202611230007_realtime_publication.sql`
8. `202611230008_trip_completion_and_payments.sql`
9. `202611230009_lifecycle_notifications.sql`
10. `202611230010_security_hardening.sql`
11. `SEED_DATA.sql` (seeds only the baseline `fare_settings` row; zero fabricated users or rides)

### 5. Run the Development or Production Server
```powershell
# Development mode (http://localhost:3000)
npm run dev

# Or production build & start
npm run build
npm run start
```

### 6. Run Typecheck & Automated Regression Tests
```powershell
npm run typecheck
node scripts/regression-tests.mjs
```

---

## Documentation Index

| Document | Purpose |
| :--- | :--- |
| [PROJECT_SPEC.md](./PROJECT_SPEC.md) | Problem statement, canonical domain glossary, user stories, state machines |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Next.js App Router structure, layouts, modules, and API routes |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Normalized schema (12 tables), constraints, indexes, RLS, and RPCs |
| [ERD.md](./ERD.md) | Mermaid Entity Relationship Diagram and cardinality rules |
| [SECURITY.md](./SECURITY.md) & [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) | Security model, 3-layer authorization, and Batch 16 audit findings |
| [AUTHENTICATION_DOCUMENTATION.md](./AUTHENTICATION_DOCUMENTATION.md) | Supabase Auth flows, middleware, guards, and admin provisioning |
| [MAP_AND_ROUTING_DOCUMENTATION.md](./MAP_AND_ROUTING_DOCUMENTATION.md) | Leaflet/OSM, OSRM routing limits, Geolocation, and demo simulation |
| [REALTIME_DOCUMENTATION.md](./REALTIME_DOCUMENTATION.md) | Supabase Realtime channels, RLS enforcement, and unmount cleanup |
| [TESTING_REPORT.md](./TESTING_REPORT.md) & [BUG_FIX_LOG.md](./BUG_FIX_LOG.md) | Actual automated test results (14/14 passed) and bug fix history |
| [AI_DEVELOPMENT_LOG.md](./AI_DEVELOPMENT_LOG.md), [AGENT_PROMPTS.md](./AGENT_PROMPTS.md), [SKILLS_USAGE.md](./SKILLS_USAGE.md) | Transparent attribution of Antigravity, Matt Pocock Skills, and student work |
| [DECISION_LOG.md](./DECISION_LOG.md) & [LESSONS_LEARNED.md](./LESSONS_LEARNED.md) | Architectural Decision Records (ADRs) and engineering takeaways |
| [PRESENTATION_AND_DEFENSE.md](./PRESENTATION_AND_DEFENSE.md) | 19-section academic presentation outline & technical defense Q&A |

---

## Known Limitations (Honest Scope Disclosure)

- **No Real Payment Gateway:** Payment methods (`Cash`, `Demo Wallet`) are academic demonstration records only.
- **Public OSRM Demo Routing Server:** Suitable for academic demos; production deployments should point `OSRM_BASE_URL` to a self-hosted OSRM instance or commercial routing provider.
- **Simulated Driver Movement:** Optional demo simulation is explicitly labeled `SIMULATED` and intended for classroom demonstrations when physical GPS movement is impractical.
- **Migrations `0004`–`0010` Pending Manual SQL Run:** Migrations `0001`–`0003` + `SEED_DATA.sql` were applied live in Batch 4; migrations `0004`–`0010` are ready in `supabase/migrations/` for execution in Supabase SQL Editor.
