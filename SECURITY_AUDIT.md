# MotoGo — Security Audit Report (`SECURITY_AUDIT.md`)

**Batch:** Batch 16 — Comprehensive Security Review  
**Scope:** Next.js App Router, Middleware, Server Actions, API Routes, Supabase PostgreSQL RLS, Storage Policies, Secret Hygiene

---

## 1. Security Controls Verified

| Domain | Control | Verification Status |
| :--- | :--- | :---: |
| **Secret Protection** | `.env.local` is gitignored; zero `sb_secret_`, `sbp_`, or `service_role` keys exist in `src/` or `supabase/` (verified by static scan in `scripts/regression-tests.mjs`). Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key) are used. | **PASS** |
| **Route Protection** | `src/middleware.ts` + server-side `requireRole()` in all 3 role layouts (`passenger/layout.tsx`, `driver/layout.tsx`, `admin/layout.tsx`) enforce authentication, active account status, and role isolation. All 21 protected routes verified returning `HTTP 307` when unauthenticated. | **PASS** |
| **Admin Authorization** | Every Admin Server Action (`src/lib/admin/actions.ts`) calls `await requireRole("admin")`; `/api/admin/export` checks `role === "admin" && account_status === "active"` and returns `401`/`403` otherwise (verified `HTTP 401` unauthenticated). | **PASS** |
| **Passenger Data Isolation** | RLS policies on `rides`, `ratings`, `payments`, and `notifications` restrict `SELECT`/`INSERT` to `passenger_id = auth.uid()` / `user_id = auth.uid()`. Anonymous reads return `HTTP 401`. | **PASS** |
| **Driver Data Isolation** | RLS policies restrict `drivers`, `vehicles`, `payments`, and `ride_rejections` to `user_id = auth.uid()` / `current_driver_id()`. Only approved online drivers with an active motorcycle can read open `requested` rides or call `accept_ride`. | **PASS** |
| **Private Storage Restrictions** | `driver-documents` bucket is `public = false`, max `5 MB`, restricted to `image/jpeg`, `image/png`, `application/pdf`, partitioned by `{userId}/`, and viewed by Admins only via 5-minute signed URLs. Direct public access verified blocked (`HTTP 400`). | **PASS** |
| **Server-Side Validation** | Fares are always recomputed server-side from live `fare_settings`; ride acceptance (`accept_ride`) and trip completion (`complete_ride_trip`) execute atomically in `SECURITY DEFINER` PostgreSQL RPCs with `FOR UPDATE` row locks. | **PASS** |
| **CSV Formula Injection** | `toCsvString()` neutralizes leading `=`, `+`, `-`, `@` characters before export. | **PASS** |
| **Open Redirect Protection** | `/auth/callback` strictly rejects protocol-relative (`//`) or external redirect URLs. | **PASS** |

---

## 2. Findings Discovered & Remediated During Batch 16 Audit

| ID | Severity | Finding | Remediation Applied |
| :---: | :---: | :--- | :--- |
| **SEC-01** | **High** | `profiles_update_own_safe_fields` RLS policy prevented non-admin users from modifying `role`, but did not explicitly block a suspended user from updating their own `account_status` back to `'active'` via a direct PostgREST call. | Created `enforce_profile_self_update_guard()` trigger in [202611230010_security_hardening.sql](file:///f:/ws%20semi%20brad/supabase/migrations/202611230010_security_hardening.sql) blocking non-admin changes to both `role` and `account_status`. |
| **SEC-02** | **High** | `vehicles_update_own_driver` RLS policy allowed a driver to update their own vehicle row without explicitly blocking changes to `verification_status` (e.g. self-setting `'verified'`) via a direct PostgREST call. | Created `enforce_vehicle_self_update_guard()` trigger in [202611230010_security_hardening.sql](file:///f:/ws%20semi%20brad/supabase/migrations/202611230010_security_hardening.sql) ensuring only Administrators can change `vehicles.verification_status`. |

---

## 3. Operational Security Recommendations

1. **Apply Migrations `0004`–`0010`** on your Online Supabase project (`euiifsblmwuwquershku`) via the SQL Editor so `SEC-01` and `SEC-02` triggers are active in production.
2. **Keep Email Confirmation Enabled** in production deployments (only disable temporarily for local classroom demos if needed).
3. **Rotate Any Credentials Ever Shared in Chat** (confirm your earlier `sb_secret_` key has been rotated and your temporary `sbp_` token remains deleted).
