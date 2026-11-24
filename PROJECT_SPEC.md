# MotoGo — Project Specification (`PROJECT_SPEC.md`)

> **Skills Applied:** Structured using Matt Pocock's `to-spec` template and `domain-modeling` canonical vocabulary discipline, adapted for Google Antigravity local documentation.

---

## 1. Problem Statement

Commuters in dense urban and semi-urban areas need fast, affordable, point-to-point motorcycle transport, while independent motorcycle drivers need a reliable way to receive verified ride requests and track their daily income. Without a centralized platform:
- **Passengers** struggle to find vetted motorcycle drivers, have no upfront fare transparency, cannot track ride status in real time, and have no structured way to review ride history or rate drivers.
- **Drivers** rely on street hailing with unpredictable demand, lack a structured onboarding/verification path, and have no automated record of completed rides or earnings.
- **Administrators** lack visibility into driver credentials, motorcycle registrations, live ride operations, fare policies, platform revenue reports, and security audit trails.

---

## 2. Solution

**MotoGo** is a web-based **Motorcycle Ride-Hailing and Driver Management System** built with **Next.js (App Router), React, TypeScript, Tailwind CSS**, and **Online Supabase** (PostgreSQL, Authentication, Realtime, and Storage).

MotoGo connects three distinct user roles on a single unified platform:
1. **Passengers** estimate fares upfront, request rides, view their assigned driver and motorcycle details, monitor live ride status updates, review ride history, and rate drivers after completion.
2. **Drivers** apply online with their motorcycle details and verification documents, await Administrator approval, toggle online/offline availability, receive and accept/reject incoming ride requests in real time, progress rides from pickup to completion, and track their earnings.
3. **Administrators** manage user accounts, review and approve/reject driver applications and documents, manage registered motorcycles, monitor live rides, configure platform fare rules, view operational/financial reports, and inspect immutable activity logs.

---

## 3. Canonical Domain Glossary (Domain Modeling)

To avoid ambiguous terminology across specs, database schemas, and UI, MotoGo uses these exact terms:

| Term | Canonical Definition |
| :--- | :--- |
| **User Account** | An authenticated identity managed by Supabase Auth (`auth.users`) paired with a public profile record holding role and account status. |
| **Passenger** | A User Account with the `passenger` role who can estimate fares, request rides, monitor active rides, view ride history, and submit ratings. |
| **Driver** | A User Account with the `driver` role who operates a registered Motorcycle. A Driver has an **Approval Status** (`pending`, `approved`, `rejected`, `suspended`) and an **Availability Status** (`offline`, `online`, `on_trip`). |
| **Administrator** | A User Account with the `admin` role with governance, approval, fare configuration, monitoring, reporting, and audit capabilities. |
| **Motorcycle** | A specific vehicle registered to a Driver (plate number, make, model, year, color, registration status). A Driver must have an active, verified Motorcycle to go online. |
| **Verification Document** | A file uploaded by a Driver to private Supabase Storage (e.g., driver's license, vehicle registration/OR-CR, government ID, profile photo) for Administrator review. |
| **Fare Configuration** | An active pricing rule set managed by Administrators (base fare, per-kilometer rate, per-minute rate, minimum fare, platform commission percentage). |
| **Fare Estimate** | A calculated upfront price breakdown generated from pickup/destination distance & estimated duration using the active Fare Configuration. |
| **Ride** | A single end-to-end passenger trip from request to completion or cancellation. Captures a **Fare Snapshot** at request time so later fare config changes never alter an existing ride. |
| **Ride Offer / Dispatch** | A real-time notification of a `requested` Ride broadcast or targeted to eligible `online` Drivers so one Driver can atomically accept it. |
| **Driver Earnings** | The net payout recorded for a Driver upon ride completion (`final_fare - platform_commission`), viewable in the Driver's earnings ledger. |
| **Rating** | A 1–5 star score (with optional comment) submitted once by a Passenger for the assigned Driver after a Ride reaches `completed`. |
| **Activity Log** | An append-only audit record capturing sensitive or administrative actions (driver approvals, suspensions, fare updates, role changes, ride overrides). |

---

## 4. User Stories

### Passenger User Stories
1. As a Passenger, I want to register an account with my email, password, full name, and phone number, so that I can use MotoGo securely.
2. As a Passenger, I want to log in and log out of my account, so that my personal ride data stays protected.
3. As a Passenger, I want to select a pickup location (address/landmark and coordinates), so that my assigned driver knows exactly where to pick me up.
4. As a Passenger, I want to select a destination location, so that MotoGo can calculate the route distance and fare.
5. As a Passenger, I want to view a clear fare estimate before booking, so that I know the expected cost upfront with no surprises.
6. As a Passenger, I want to submit a ride request, so that nearby available MotoGo drivers can accept my trip.
7. As a Passenger, I want to cancel my ride request before pickup begins, so that I am not locked into a trip if my plans change.
8. As a Passenger, I want to view my assigned driver's name, rating, phone number, and motorcycle details (model, color, plate number), so that I can verify I am boarding the right motorcycle.
9. As a Passenger, I want to monitor my ride status in real time (`requested` → `accepted` → `driver_arrived` → `in_progress` → `completed`), so that I always know what is happening without refreshing the page.
10. As a Passenger, I want to view my past ride history with dates, routes, drivers, and final fares, so that I can track my travel expenses.
11. As a Passenger, I want to rate my driver (1–5 stars + optional feedback) after a completed ride, so that good drivers are recognized and service quality stays high.

### Driver User Stories
12. As a Driver, I want to register a driver account, so that I can apply to drive on MotoGo.
13. As a Driver, I want to submit my motorcycle details (plate number, make, model, year, color), so that MotoGo has accurate vehicle records for passengers and admins.
14. As a Driver, I want to upload required verification documents (driver's license, vehicle registration, valid ID), so that Administrators can verify my eligibility.
15. As a Driver, I want to see my current approval status (`pending`, `approved`, `rejected`, plus rejection reason if applicable), so that I know when I am allowed to start accepting rides.
16. As a Driver, I want to toggle my availability between Online and Offline once approved, so that I control when I receive ride requests.
17. As a Driver, I want to receive incoming ride requests in real time with pickup, destination, distance, and estimated fare, so that I can decide whether to take the trip.
18. As a Driver, I want to accept or reject an incoming ride request, so that I only commit to rides I can fulfill.
19. As a Driver, I want to update the ride status through arrival, trip start, and trip completion, so that the passenger and system stay synchronized.
20. As a Driver, I want to view my earnings summary (today, this week, total) and per-ride earnings breakdown, so that I can track my income clearly.

### Administrator User Stories
21. As an Administrator, I want to view, search, filter, and suspend/reactivate user accounts, so that I can keep the platform safe and compliant.
22. As an Administrator, I want to review pending driver applications alongside their uploaded documents and motorcycle details, so that I can approve or reject them with a recorded reason.
23. As an Administrator, I want to manage registered motorcycles (view, verify, deactivate), so that unverified or unsafe vehicles cannot be used for rides.
24. As an Administrator, I want to monitor active and recent rides in real time, so that I can oversee operations and intervene if an issue occurs.
25. As an Administrator, I want to configure fare rules (base fare, per-km rate, per-minute rate, minimum fare, commission rate), so that pricing stays aligned with market conditions.
26. As an Administrator, I want to view operational and financial reports (total rides, completion rate, gross revenue, platform commission, active drivers), so that I can evaluate business health.
27. As an Administrator, I want to view a searchable, chronological activity log of critical system actions, so that all administrative and security events are auditable.

---

## 5. Implementation Decisions (Architecture & Contracts)

### Technology Stack
- **Frontend & BFF:** Next.js (App Router) + React + TypeScript (strict mode) + Tailwind CSS.
- **Database:** Online Supabase PostgreSQL with Row Level Security (RLS) enforced on every table.
- **Authentication:** Supabase Authentication (email/password) with `@supabase/ssr` cookie-based sessions and Next.js middleware for route protection.
- **Realtime:** Supabase Realtime (Postgres Changes / Channels) for live ride status updates, incoming driver ride requests, and live admin monitoring.
- **File Storage:** Supabase Storage (private bucket `driver-documents`) accessed via time-limited signed URLs for driver document review.

### Core Modules (Deep Module Boundaries)
1. **Auth & Access Module:** Handles registration, login, session refresh, role resolution (`passenger`, `driver`, `admin`), and route/RLS guards.
2. **Driver Onboarding & Verification Module:** Manages driver profile submission, motorcycle registration, private document uploads, and admin approval/rejection transitions.
3. **Fare Engine Module:** Pure, deterministic calculation of fare estimates and final earnings breakdown from the active `FareConfiguration`.
4. **Ride Lifecycle & Dispatch Module:** Manages ride creation, real-time offer broadcasting, atomic driver acceptance (via PostgreSQL RPC/transaction to prevent double-booking), status transitions, and cancellations.
5. **Ratings & Earnings Module:** Records one-time passenger ratings, recalculates driver average rating, and creates driver earnings ledger entries upon ride completion.
6. **Admin Operations & Audit Module:** Provides user management, motorcycle management, live ride monitoring, fare configuration, aggregate reports, and immutable activity logging.

### Canonical State Machines

**Driver Approval Status:**
`pending` → `approved` | `rejected`  
`rejected` → `pending` (after resubmitting documents)  
`approved` → `suspended` → `approved`

**Ride Status:**
`requested` → `accepted` → `driver_arrived` → `in_progress` → `completed`  
Cancellation transitions:
- `requested` → `cancelled_by_passenger` | `cancelled_by_admin` | `expired`
- `accepted` → `cancelled_by_passenger` | `cancelled_by_driver` | `cancelled_by_admin`
- `driver_arrived` → `cancelled_by_passenger` | `cancelled_by_driver` | `cancelled_by_admin`

*(Once a ride is `in_progress`, normal self-service cancellation is blocked; only `completed` or an audited `cancelled_by_admin` override is allowed.)*

---

## 6. Testing Decisions

Following Matt Pocock's testing philosophy (test **external behavior** at the highest practical seam, not internal implementation details):
- **Pure Domain Logic Tests (Unit):** Fare calculation engine, state transition validators (ride lifecycle & driver approval), and commission/earnings calculators.
- **Integration / Contract Tests:** Database RLS policy verification (Passenger cannot read another Passenger's rides; unapproved Driver cannot accept rides; non-Admin cannot update Fare Configuration) and atomic ride acceptance concurrency tests.
- **End-to-End Smoke Tests (High Seam):** Passenger registration → fare estimate → ride request → Driver acceptance → ride completion → earnings & rating verification.

---

## 7. Out of Scope (Current MVP Release)

To keep MotoGo focused, reliable, and deliverable in structured batches, the following are explicitly **out of scope** for the initial release:
- Real third-party payment gateway integration (GCash, Maya, Stripe) — MVP tracks cash/recorded fare and platform commission ledger.
- Native iOS/Android mobile apps — MotoGo is delivered as a mobile-responsive Next.js web application.
- Turn-by-turn GPS voice navigation — MVP uses structured pickup/destination selection and distance calculation (with clean abstraction to plug in Mapbox/Google Maps later).
- Surge pricing algorithms, promo codes, and multi-stop rides.
- In-app VoIP calling or real-time chat (drivers and passengers see contact phone numbers once a ride is accepted).

---

## 8. Further Notes

- All Supabase secrets remain strictly in `.env.local` (never committed to Git).
- All database schema changes will be tracked as versioned SQL migrations so the Online Supabase project (`euiifsblmwuwquershku`) remains reproducible.
