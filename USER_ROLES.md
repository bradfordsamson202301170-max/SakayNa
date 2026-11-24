# MotoGo — User Roles & Access Control (`USER_ROLES.md`)

MotoGo defines **three distinct user roles**. Every authenticated User Account in Supabase Auth is linked to a `profiles` row with a single primary role (`passenger`, `driver`, or `admin`) and an `account_status` (`active` or `suspended`).

---

## 1. Role Definitions

### 1.1 Passenger (`passenger`)
- **Who they are:** Everyday commuters requesting point-to-point motorcycle rides.
- **How they join:** Public self-registration (`/register`). Immediately `active` upon sign-up.
- **Primary Workspace:** `/passenger`
- **Core Capabilities:**
  - Register, log in, log out, and manage basic profile info (name, phone).
  - Select pickup and destination locations.
  - View upfront fare estimates based on the active Fare Configuration.
  - Request a ride and cancel before trip start (`in_progress`).
  - View assigned driver profile and motorcycle details once matched.
  - Monitor real-time ride status updates.
  - View past ride history.
  - Submit a 1–5 star rating and optional feedback after a completed ride.

### 1.2 Driver (`driver`)
- **Who they are:** Motorcycle riders who fulfill passenger ride requests and earn per-trip income.
- **How they join:** Public driver registration (`/register?role=driver`), followed by a mandatory onboarding checklist (submit motorcycle details + upload verification documents) and **Administrator approval**.
- **Primary Workspace:** `/driver`
- **Sub-States:**
  - **Approval Status:** `pending` | `approved` | `rejected` | `suspended`
  - **Availability Status:** `offline` | `online` | `on_trip`
- **Core Capabilities:**
  - Register as a driver and submit motorcycle details.
  - Upload required verification documents to private Supabase Storage.
  - Monitor approval status and resubmit if rejected.
  - Toggle `online` / `offline` (strictly gated on `approval_status = 'approved'` + active motorcycle).
  - Receive real-time ride requests while `online`.
  - Accept (atomically) or reject incoming requests.
  - Progress assigned rides (`driver_arrived` → `in_progress` → `completed`).
  - View earnings summary and per-ride payout history.

### 1.3 Administrator (`admin`)
- **Who they are:** Platform operators responsible for safety, driver vetting, pricing, live oversight, and auditing.
- **How they join:** **Cannot self-register.** Provisioned only via secure initial seed or promoted by an existing Administrator.
- **Primary Workspace:** `/admin`
- **Core Capabilities:**
  - Manage all users (view, search, filter, suspend, reactivate).
  - Review driver applications, inspect private documents via signed URLs, and approve or reject drivers (with mandatory rejection reason).
  - Manage registered motorcycles (view, verify, deactivate).
  - Monitor active and historical rides in real time (with audited emergency cancellation capability).
  - Configure platform fare rules (base fare, per-km, per-min, minimum fare, commission rate).
  - View operational and financial reports.
  - View immutable activity logs.

---

## 2. Role-Based Access Control (RBAC) Permission Matrix

| Domain Entity / Action | Passenger | Driver (Pending/Rejected) | Driver (Approved) | Administrator |
| :--- | :---: | :---: | :---: | :---: |
| **Register & Login** | Yes | Yes | Yes | Login only (seeded) |
| **Own Profile (Read/Update)** | Yes | Yes | Yes | Yes |
| **All Users (Read / Suspend)** | No | No | No | Yes |
| **Submit Motorcycle & Docs** | No | Yes (own) | Yes (own) | Manage all |
| **Approve / Reject Drivers** | No | No | No | Yes |
| **Go Online / Offline** | No | **Blocked (BR-01)** | Yes (if not `on_trip`) | View status |
| **Estimate Fare** | Yes | No | No | Configure rules |
| **Request Ride** | Yes (1 active max) | No | No | No |
| **View Open Ride Requests** | No | **Blocked (BR-01)** | Yes (when `online`) | Yes (all rides) |
| **Accept / Reject Ride** | No | **Blocked (BR-01)** | Yes (when `online`) | No |
| **Progress Assigned Ride** | No | No | Yes (own active ride) | Emergency cancel |
| **Cancel Active Ride** | Yes (before `in_progress`) | No | Yes (before `in_progress`) | Yes (audited) |
| **View Ride History** | Own rides only | Own rides only | Own rides only | All rides |
| **Rate Driver** | Yes (once per completed ride) | Read own ratings | Read own ratings | Read all ratings |
| **View Driver Earnings** | No | Own earnings (0) | Own earnings | Aggregate reports |
| **Configure Fare Rules** | Read active estimate only | Read active estimate only | Read active estimate only | Yes (Create/Update) |
| **View Reports** | No | No | No | Yes |
| **View Activity Logs** | No | No | No | Yes (Read-only) |

---

## 3. Enforcement Layers

Access control is enforced at **three independent layers** (defense in depth):
1. **Next.js Middleware & Route Layouts:** Redirects unauthenticated users to `/login` and prevents role cross-navigation (e.g., a Passenger visiting `/admin`).
2. **Server Actions / API Route Handlers:** Re-verifies the authenticated user session and role from Supabase before executing any mutation.
3. **Supabase PostgreSQL RLS & Storage Policies:** Enforces row-level and bucket-level isolation directly in the database so unauthorized reads or writes are impossible even if a client attempts direct API calls.
