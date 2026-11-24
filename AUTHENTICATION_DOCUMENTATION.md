# MotoGo — Authentication & Authorization Documentation (`AUTHENTICATION_DOCUMENTATION.md`)

**Batch:** Batch 5 — Supabase Auth, Session Management, Protected Routes & Role-Based Authorization  
**Auth Provider:** Online Supabase Authentication (`@supabase/ssr` cookie-based sessions)  
**Database Enforcement:** PostgreSQL Row Level Security (RLS) on all 11 tables

---

## 1. Authentication Flows Implemented

| Flow | Route / Handler | Server Action / Mechanism | Behavior |
| :--- | :--- | :--- | :--- |
| **Passenger Registration** | `/register/passenger` | `registerPassengerAction` | Creates Supabase Auth user with hardcoded `role: "passenger"`. Database trigger `on_auth_user_created` auto-provisions `public.profiles`. |
| **Driver Registration** | `/register/driver` | `registerDriverAction` | Creates Supabase Auth user with hardcoded `role: "driver"`, inserts `public.drivers` (`approval_status = 'pending'`) and `public.vehicles` (`verification_status = 'pending'`). Must await Admin approval (`BR-01`). |
| **Login** | `/login` | `loginAction` | Authenticates via `supabase.auth.signInWithPassword`, verifies `account_status !== 'suspended'`, and redirects to `/passenger`, `/driver`, or `/admin`. |
| **Logout** | Sidebar Sign Out button | `logoutAction` | Calls `supabase.auth.signOut()`, clears session cookies, and redirects to `/login`. |
| **Password Reset Request** | `/forgot-password` | `requestPasswordResetAction` | Sends a recovery link via `supabase.auth.resetPasswordForEmail` pointing to `/auth/callback?next=/reset-password`. |
| **Auth Callback** | `/auth/callback` | `GET /auth/callback/route.ts` | Exchanges Supabase PKCE `code` for a valid session cookie and safely redirects to an internal path (blocks open redirects). |
| **Set New Password** | `/reset-password` | `updatePasswordAction` | Validates authenticated recovery session and updates password via `supabase.auth.updateUser({ password })`. |
| **User Profile Update** | `/passenger/profile`, `/driver/profile` | `updateProfileAction` | Updates **only** `full_name` and `phone`. `role` and `account_status` cannot be changed from the frontend. |

---

## 2. Three-Layer Authorization (Defense in Depth)

MotoGo never relies on client-side checks alone. Every protected route and mutation is guarded at **three independent layers**:

### Layer 1 — Next.js Middleware (`src/middleware.ts`)
- Refreshes Supabase SSR session cookies on every request using `supabase.auth.getUser()` (server-verified against Supabase Auth, never trusting unsigned cookies).
- Redirects unauthenticated visitors of `/passenger/*`, `/driver/*`, and `/admin/*` to `/login?redirectTo=<path>`.
- Redirects suspended accounts to `/unauthorized?reason=suspended`.
- Blocks cross-role navigation (e.g., a `passenger` visiting `/admin` or `/driver`) to `/unauthorized?reason=forbidden`.
- Redirects already signed-in users away from `/login` and `/register/*` to their own portal.

### Layer 2 — Server-Side Role Layouts (`src/lib/auth/guards.ts`)
Three separate authenticated layouts independently verify `requireRole(...)` on the server:
- `src/app/passenger/layout.tsx` → `await requireRole("passenger")`
- `src/app/driver/layout.tsx` → `await requireRole("driver")` (also displays a persistent **Pending / Rejected Approval** notice until an Admin approves the driver)
- `src/app/admin/layout.tsx` → `await requireRole("admin")`

### Layer 3 — Supabase PostgreSQL RLS & Triggers
- **Self-Registration Protection (`handle_new_user` trigger):** Rejects any attempt to self-register with `role = 'admin'`; public signups can only become `'passenger'` or `'driver'`.
- **Self-Promotion Protection (`profiles_update_own_safe_fields` RLS policy):** Enforces `role = public.current_user_role()` so even a direct API call cannot alter a user's own role.
- **Anonymous Isolation:** Unauthenticated `anon` requests receive `HTTP 401 (42501 permission denied)` on `profiles`, `drivers`, `rides`, `activity_logs`, and writes to `fare_settings`.

---

## 3. Secure Administrator Provisioning

Administrators **cannot** self-register through `/register/passenger` or `/register/driver`. To provision an Admin securely:
1. Create the real user account via Supabase Dashboard → **Authentication → Users** (or normal sign-up).
2. Promote that specific account in the Supabase SQL Editor (also documented in `SEED_DATA.sql`):
   ```sql
   update public.profiles
   set role = 'admin', account_status = 'active'
   where lower(email) = lower('your-admin-email@example.com');
   ```
3. The next time that user logs in at `/login`, MotoGo automatically routes them to `/admin`.

---

## 4. Unauthorized Access Verification Results

Verified live against the production Next.js server (`next start`) and Online Supabase project (`euiifsblmwuwquershku`):

| Test Case | Target | Observed Result | Status |
| :--- | :--- | :--- | :---: |
| Unauthenticated Passenger Portal | `GET /passenger` | `HTTP 307` → `/login?redirectTo=%2Fpassenger` | Pass |
| Unauthenticated Driver Portal | `GET /driver` | `HTTP 307` → `/login?redirectTo=%2Fdriver` | Pass |
| Unauthenticated Admin Portal | `GET /admin` | `HTTP 307` → `/login?redirectTo=%2Fadmin` | Pass |
| Unauthenticated Admin Sub-route | `GET /admin/fares` | `HTTP 307` → `/login?redirectTo=%2Fadmin%2Ffares` | Pass |
| Public Login Route | `GET /login` | `HTTP 200` | Pass |
| Anon Direct Read: `profiles` | `GET /rest/v1/profiles` | `HTTP 401` (`42501 permission denied`) | Pass |
| Anon Direct Read: `drivers` | `GET /rest/v1/drivers` | `HTTP 401` (`42501 permission denied`) | Pass |
| Anon Direct Read: `rides` | `GET /rest/v1/rides` | `HTTP 401` (`42501 permission denied`) | Pass |
| Anon Direct Read: `activity_logs` | `GET /rest/v1/activity_logs` | `HTTP 401` (`42501 permission denied`) | Pass |
| Anon Direct Write: `fare_settings` | `POST /rest/v1/fare_settings` | `HTTP 401` (Blocked by RLS) | Pass |
| Production Build & TypeCheck | `npm run build` | Compiled 30/30 routes + Middleware with 0 errors | Pass |
