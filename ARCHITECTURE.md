# MotoGo — Application Architecture (`ARCHITECTURE.md`)

This document describes the Next.js App Router folder structure, layout hierarchy, component boundaries, and backend integration seams established in **Batch 3**.

---

## 1. Technology Foundation

| Layer | Technology | Role in MotoGo |
| :--- | :--- | :--- |
| **Framework** | Next.js 15 (App Router) | Server Components, nested role layouts, streaming loading/error boundaries |
| **UI Library** | React 19 | Interactive client shells (responsive mobile drawer, future realtime listeners) |
| **Language** | TypeScript (`strict: true`) | Compile-time safety across navigation, tables, and domain contracts |
| **Styling** | Tailwind CSS v4 | Design tokens (Dark Navy, White, Orange), mobile-first responsive layouts |
| **Icons** | Lucide React | Crisp, consistent transportation & operations iconography |
| **Backend (Batch 4+)** | Online Supabase | PostgreSQL + RLS, Auth (`@supabase/ssr`), Realtime, Private Storage |

---

## 2. Directory Structure

```text
F:\ws semi brad\
├── .agents\skills\             # Workspace-local Matt Pocock Skills (39 skills)
├── src\
│   ├── app\
│   │   ├── globals.css         # Tailwind v4 + MotoGo brand color tokens
│   │   ├── layout.tsx          # Root HTML shell + Inter font + metadata
│   │   ├── loading.tsx         # Global loading boundary
│   │   ├── error.tsx           # Global error boundary
│   │   ├── not-found.tsx       # Branded 404 screen
│   │   ├── page.tsx            # Public Landing Page
│   │   ├── login\page.tsx      # Public Login
│   │   ├── register\
│   │   │   ├── passenger\page.tsx
│   │   │   └── driver\page.tsx
│   │   ├── passenger\          # Nested PassengerLayout + 6 screens
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        # Dashboard
│   │   │   ├── book\page.tsx
│   │   │   ├── active-ride\page.tsx
│   │   │   ├── history\page.tsx
│   │   │   ├── profile\page.tsx
│   │   │   └── notifications\page.tsx
│   │   ├── driver\             # Nested DriverLayout + 6 screens
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx        # Dashboard
│   │   │   ├── verification\page.tsx
│   │   │   ├── available-rides\page.tsx
│   │   │   ├── active-ride\page.tsx
│   │   │   ├── earnings\page.tsx
│   │   │   └── profile\page.tsx
│   │   └── admin\              # Nested AdminLayout + 7 screens
│   │       ├── layout.tsx
│   │       ├── page.tsx        # Dashboard
│   │       ├── passengers\page.tsx
│   │       ├── drivers\page.tsx
│   │       ├── rides\page.tsx
│   │       ├── fares\page.tsx
│   │       ├── reports\page.tsx
│   │       └── activity-logs\page.tsx
│   ├── components\
│   │   ├── brand\MotoGoLogo.tsx
│   │   ├── layout\
│   │   │   ├── AppShell.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── PublicChrome.tsx
│   │   └── ui\
│   │       ├── Button.tsx
│   │       ├── Cards.tsx       # StatCard & SectionCard
│   │       ├── DataTable.tsx
│   │       ├── DesignModeBanner.tsx
│   │       ├── ErrorStates.tsx # ErrorState & EmptyState
│   │       ├── FormComponents.tsx
│   │       ├── LoadingStates.tsx
│   │       └── StatusBadge.tsx
│   └── lib\
│       └── navigation.ts       # Role-specific navigation config (PASSENGER_NAV, DRIVER_NAV, ADMIN_NAV)
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

---

## 3. Final Implemented Architecture (Batches 3–17)

1. **Nested Role Layouts & Middleware (`src/middleware.ts` + `src/lib/auth/guards.ts`):**
   - `/passenger/*` (6 screens), `/driver/*` (6 screens), and `/admin/*` (9 screens) are protected at both the Edge Middleware layer and Server Component layout layer via `requireRole(...)`.
2. **Pure Domain Layer (`src/lib/domain/`):**
   - `fare.ts`, `rideRequest.ts`, `driver.ts`, `matching.ts`, `tripCompletion.ts`, and `reports.ts` isolate core business rules from React UI for fast, deterministic unit & regression testing (`scripts/regression-tests.mjs`).
3. **API Route Handlers (`src/app/api/`):**
   - `/api/route` — OSRM actual road distance, duration, and street polyline proxy.
   - `/api/fare-estimate` — Server-side fare estimation backed by live Supabase `fare_settings`.
   - `/api/admin/export` — Role-protected Admin CSV export (`rides`, `payments`, `driver_performance`, `activity_logs`).
4. **Realtime & Interactive Maps:**
   - `src/components/map/MotoGoMap.tsx` + `MotoGoMapDynamic.tsx` (`ssr: false`) render Leaflet + OpenStreetMap tiles with custom MotoGo markers and OSRM road polylines.
   - `src/lib/realtime/useRealtimeSubscription.ts` manages RLS-enforced Supabase Realtime channels with automatic unmount cleanup.
