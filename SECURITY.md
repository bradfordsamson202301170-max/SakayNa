# MotoGo — Security Policy & Architecture (`SECURITY.md`)

MotoGo implements **defense in depth** across Next.js Middleware, Server Actions, API Routes, Supabase PostgreSQL Row Level Security (RLS), and Private Storage.

---

## 1. Three-Layer Authorization Model

1. **Edge / Middleware (`src/middleware.ts`):** Refreshes Supabase SSR session cookies via `supabase.auth.getUser()`, redirects unauthenticated visitors of `/passenger/*`, `/driver/*`, and `/admin/*` to `/login`, blocks suspended accounts, and prevents cross-role navigation.
2. **Server-Side Guards (`src/lib/auth/guards.ts`):** Every role layout (`passenger/layout.tsx`, `driver/layout.tsx`, `admin/layout.tsx`), Server Action, and Admin API route (`/api/admin/export`) independently calls `requireRole(...)` or `getCurrentUserContext()` on the server.
3. **Database RLS & Triggers (`supabase/migrations/`):**
   - Row Level Security is enabled on every application table.
   - `handle_new_user()` blocks public self-registration as `admin`.
   - `enforce_profile_self_update_guard()` blocks non-admin self-modification of `role` or `account_status`.
   - `enforce_driver_self_update_guard()` blocks drivers from self-approving or going online without `approval_status = 'approved'` and an active motorcycle (`BR-01`).
   - `enforce_vehicle_self_update_guard()` blocks drivers from self-verifying `vehicles.verification_status`.
   - Atomic `SECURITY DEFINER` RPCs (`accept_ride`, `reject_ride`, `transition_ride_status`, `complete_ride_trip`) use `FOR UPDATE` row locks to prevent race conditions, double-booking, and duplicate payments.

---

## 2. Sensitive Document & Secret Protection

- **Private Storage Bucket:** Driver documents (profile photo, license, OR/CR, motorcycle photo) are stored in the private `driver-documents` bucket (`public = false`, 5 MB max, JPEG/PNG/PDF only), partitioned by `{userId}/`, and viewed by Admins only through short-lived 5-minute signed URLs.
- **Secret Hygiene:** `.env.local` is gitignored. Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key) are configured in `.env.local`. No `service_role` or Personal Access Token is ever committed or stored in source code.
- **CSV Injection Defense:** Admin CSV exports neutralize leading `=`, `+`, `-`, and `@` cells (`src/lib/domain/reports.ts`).

For detailed audit findings and verification results, see [SECURITY_AUDIT.md](./SECURITY_AUDIT.md).
