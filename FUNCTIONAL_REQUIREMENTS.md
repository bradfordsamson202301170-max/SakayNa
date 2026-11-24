# MotoGo — Functional Requirements & Business Rules (`FUNCTIONAL_REQUIREMENTS.md`)

This document defines **what** MotoGo must do for every user role and the **business rules** that protect data integrity and fairness.

---

## 1. Authentication & Account Management (`FR-AUTH`)

| ID | Requirement | Description |
| :--- | :--- | :--- |
| **FR-AUTH-01** | User Registration | Passengers and Drivers can register using email, password, full name, and phone number. Role is captured at sign-up (`passenger` or `driver`). |
| **FR-AUTH-02** | Secure Login & Logout | Users can log in with email/password and log out cleanly, clearing session cookies. |
| **FR-AUTH-03** | Role-Based Routing | After login, users are routed to their role-specific workspace (`/passenger`, `/driver`, or `/admin`) and blocked from accessing unauthorized routes. |
| **FR-AUTH-04** | Account Suspension Enforcement | Suspended users are prevented from booking rides, going online, or accepting requests, and are shown a clear suspension notice. |

---

## 2. Passenger Functional Requirements (`FR-PASS`)

| ID | Requirement | Description |
| :--- | :--- | :--- |
| **FR-PASS-01** | Select Pickup Location | Passenger can specify a pickup address/label and coordinates (via preset/search or map/coordinate picker). |
| **FR-PASS-02** | Select Destination Location | Passenger can specify a destination address/label and coordinates distinct from the pickup location. |
| **FR-PASS-03** | Estimate Fare | Before requesting a ride, the system calculates and displays estimated distance (km), estimated duration (mins), and itemized fare estimate using the active Fare Configuration. |
| **FR-PASS-04** | Request Ride | Passenger submits a ride request, creating a Ride in `requested` status with a locked Fare Snapshot. |
| **FR-PASS-05** | Cancel Ride | Passenger can cancel a ride while it is in `requested`, `accepted`, or `driver_arrived` status, with an optional cancellation reason. |
| **FR-PASS-06** | View Assigned Driver | Once a Driver accepts, Passenger sees driver full name, average rating, phone number, and motorcycle details (make, model, color, plate number). |
| **FR-PASS-07** | Monitor Ride Status | Passenger sees real-time status updates (`requested` → `accepted` → `driver_arrived` → `in_progress` → `completed` / `cancelled`) without manual page reload. |
| **FR-PASS-08** | View Ride History | Passenger can view a chronological list of past rides (completed and cancelled) with route, date/time, driver name, status, and fare. |
| **FR-PASS-09** | Rate Driver | After a ride reaches `completed`, Passenger can submit a one-time rating (1–5 stars) and optional written feedback for the assigned Driver. |

---

## 3. Driver Functional Requirements (`FR-DRV`)

| ID | Requirement | Description |
| :--- | :--- | :--- |
| **FR-DRV-01** | Driver Registration | Driver registers an account and enters the onboarding flow with initial approval status `pending`. |
| **FR-DRV-02** | Submit Motorcycle Details | Driver submits motorcycle make, model, year, color, and unique plate number. |
| **FR-DRV-03** | Upload Required Documents | Driver uploads required verification files (Driver's License, Vehicle Registration/OR-CR, Government ID) to private Supabase Storage. |
| **FR-DRV-04** | View Approval Status | Driver sees a clear onboarding dashboard showing `pending`, `approved`, or `rejected` (with admin feedback and ability to resubmit if rejected). |
| **FR-DRV-05** | Toggle Online / Offline | Approved drivers with an active motorcycle can toggle availability between `online` and `offline`. Drivers cannot go `offline` while `on_trip`. |
| **FR-DRV-06** | Receive Ride Requests | Online drivers receive real-time incoming ride requests displaying pickup, destination, estimated distance, and estimated fare. |
| **FR-DRV-07** | Accept or Reject Request | Driver can accept an open ride request (atomically claiming it) or reject/dismiss it (hiding it from their queue while keeping it available to other drivers). |
| **FR-DRV-08** | Progress Ride Lifecycle | Assigned driver can transition the active ride sequentially: `accepted` → `driver_arrived` → `in_progress` → `completed` (or cancel prior to `in_progress`). |
| **FR-DRV-09** | View Earnings | Driver can view earnings totals (today, this week, lifetime) and a per-ride ledger showing gross fare, platform commission, and net driver payout. |

---

## 4. Administrator Functional Requirements (`FR-ADM`)

| ID | Requirement | Description |
| :--- | :--- | :--- |
| **FR-ADM-01** | Manage Users | Admin can list, search, filter by role/status, view details, and suspend or reactivate Passenger and Driver accounts. |
| **FR-ADM-02** | Approve or Reject Drivers | Admin can inspect pending driver applications, securely view uploaded documents via signed URLs, and approve or reject applications (rejection requires a reason). |
| **FR-ADM-03** | Manage Motorcycles | Admin can list, inspect, verify, or deactivate registered motorcycles. |
| **FR-ADM-04** | Monitor Rides | Admin can view a live operations board of active rides and a searchable archive of all historical rides, with the ability to perform an audited administrative cancellation if needed. |
| **FR-ADM-05** | Configure Fares | Admin can view and update the active Fare Configuration (base fare, per-km rate, per-minute rate, minimum fare, platform commission %). |
| **FR-ADM-06** | View Reports | Admin can view summary KPIs and date-range reports: total rides, completed vs. cancelled counts, gross fare volume, total platform commission, and active/approved driver counts. |
| **FR-ADM-07** | View Activity Logs | Admin can view and filter a chronological audit log of sensitive system actions (actor, action type, target entity, timestamp, metadata). |

---

## 5. Business Rules (`BR`)

These rules are non-negotiable system invariants enforced in both application logic and PostgreSQL constraints/RPCs:

| ID | Rule Name | Rule Specification |
| :--- | :--- | :--- |
| **BR-01** | **Driver Approval Gate** | A Driver **cannot** toggle `online`, view incoming ride requests, or accept a ride unless `approval_status = 'approved'` AND they have at least one `active` registered Motorcycle. |
| **BR-02** | **Single Active Ride per Passenger** | A Passenger can have **at most one** active ride (`requested`, `accepted`, `driver_arrived`, or `in_progress`) at a time. |
| **BR-03** | **Single Active Ride per Driver** | A Driver can be assigned to **at most one** active ride (`accepted`, `driver_arrived`, or `in_progress`) at a time. While assigned, their availability status is automatically `on_trip`. |
| **BR-04** | **Atomic Ride Acceptance (No Double-Booking)** | Only **one** Driver can claim a `requested` ride. Acceptance must execute atomically inside a PostgreSQL transaction/RPC (`WHERE status = 'requested' AND driver_id IS NULL`) so simultaneous accepts cleanly reject the second driver with a clear message. |
| **BR-05** | **Driver Rejection Does Not Cancel Ride** | When a Driver rejects a ride request, that ride is only dismissed for *that specific driver*; it remains `requested` for other online drivers until accepted, cancelled, or expired. |
| **BR-06** | **Strict Sequential Ride Transitions** | Ride status must follow the valid state machine (`requested` → `accepted` → `driver_arrived` → `in_progress` → `completed`). Skipping states (e.g., `requested` → `completed`) is forbidden. |
| **BR-07** | **Fare Snapshotting** | When a Ride is created, the active Fare Configuration values and estimated fare are **snapshotted** onto the ride record. Updating global fare settings later must **never** retroactively change existing or past rides. |
| **BR-08** | **Minimum Fare Floor** | Calculated fares must never fall below the active `minimum_fare`: `fare = max(minimum_fare, base_fare + (distance_km * per_km_rate) + (duration_min * per_min_rate))`. |
| **BR-09** | **Automatic Earnings Creation** | Exactly one `driver_earnings` ledger entry is created automatically when a ride transitions to `completed`: `platform_fee = round(final_fare * commission_rate)`, `net_earnings = final_fare - platform_fee`. Cancelled rides generate `0` earnings. |
| **BR-10** | **One Rating per Completed Ride** | Only the Passenger who took the ride may rate the assigned Driver, only when `status = 'completed'`, and **at most once** per ride (`UNIQUE(ride_id)`). Ratings must be integers `1..5`. |
| **BR-11** | **Unique Motorcycle Plate Number** | Every active Motorcycle must have a normalized, unique plate number to prevent duplicate or fraudulent vehicle registrations. |
| **BR-12** | **No Self-Registration as Admin** | Public sign-up can only create `passenger` or `driver` accounts. `admin` accounts are provisioned exclusively via database seed or by an existing Administrator. |
| **BR-13** | **Mandatory Rejection Reason** | An Administrator rejecting a Driver application must provide a non-empty reason so the Driver knows what to fix before resubmitting. |
| **BR-14** | **Immutable Audit Trail** | Every Admin action (driver approval/rejection, user suspension, motorcycle deactivation, fare config update, admin ride cancellation) must write an append-only row to `activity_logs`. Activity logs cannot be edited or deleted by users. |
| **BR-15** | **Pickup vs. Destination Validation** | Pickup and destination locations must both be valid and cannot be identical (minimum non-zero distance). |
