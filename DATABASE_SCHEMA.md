# MotoGo — Normalized Database Schema (`DATABASE_SCHEMA.md`)

**Target Database:** Online Supabase PostgreSQL (`https://euiifsblmwuwquershku.supabase.co`)  
**Migration Directory:** `supabase/migrations/`  
**Total Normalized Tables:** 12 (11 core Batch 4 tables + `ride_rejections` added in Batch 12)

---

## 1. Migration Files (10 Ordered Migrations)

| Order | File | Purpose |
| :---: | :--- | :--- |
| 1 | `supabase/migrations/202611230001_initial_schema.sql` | Extensions, `set_updated_at()` trigger, 11 core normalized tables, UUID keys, foreign keys, `CHECK` constraints, partial unique indexes, and `handle_new_user()` auth trigger. |
| 2 | `supabase/migrations/202611230002_rls_and_storage.sql` | Enables Row Level Security (RLS) on all tables, `SECURITY DEFINER` role helper functions, least-privilege policies, and private `driver-documents` Storage bucket. |
| 3 | `supabase/migrations/202611230003_ride_rpcs_and_triggers.sql` | Initial `accept_ride`, `transition_ride_status`, initial ride history trigger, and driver rating average recalculation trigger. |
| 4 | `supabase/migrations/202611230004_driver_onboarding_fields.sql` | Adds `drivers.address`, `drivers.profile_photo_path`, `vehicles.registration_doc_path`, `vehicles.photo_path`, and `trg_drivers_self_update_guard` (`BR-01`). |
| 5 | `supabase/migrations/202611230005_fare_module_fields.sql` | Adds `waiting_fee`, `cancellation_fee`, `snapshot_waiting_fee`, `snapshot_cancellation_fee`, and immutable `rides.fare_breakdown` (`JSONB`). |
| 6 | `supabase/migrations/202611230006_driver_matching_and_rejections.sql` | Adds `public.ride_rejections` (`UNIQUE(ride_id, driver_id)` + RLS), hardened atomic `accept_ride(uuid)` with `FOR UPDATE` locks & passenger notifications, and `reject_ride(uuid, text)`. |
| 7 | `supabase/migrations/202611230007_realtime_publication.sql` | Adds `rides`, `ride_locations`, `ride_status_history`, and `notifications` to `supabase_realtime` with `REPLICA IDENTITY FULL`. |
| 8 | `supabase/migrations/202611230008_trip_completion_and_payments.sql` | Enforces `cash` / `demo_wallet` & `unpaid` / `paid` / `cancelled`, and adds atomic `complete_ride_trip(...)` preventing duplicate completions & payments. |
| 9 | `supabase/migrations/202611230009_lifecycle_notifications.sql` | Adds `trg_ride_status_history_notify` automating all 6 lifecycle notifications. |
| 10 | `supabase/migrations/202611230010_security_hardening.sql` | Adds `trg_profiles_self_update_guard` and `trg_vehicles_self_update_guard` (`SEC-01`, `SEC-02`). |
| Seed | `SEED_DATA.sql` | Idempotent baseline `fare_settings` seed (zero fabricated production data). |

---

## 2. Table Specifications (11 Tables)

### 1. `public.profiles`
- **Purpose:** Core user profile linked 1:1 with `auth.users(id)`.
- **Key Columns:** `id (uuid PK, FK -> auth.users)`, `email`, `full_name`, `phone`, `avatar_url`, `role ('passenger' | 'driver' | 'admin')`, `account_status ('active' | 'suspended')`, `created_at`, `updated_at`.
- **Integrity:** Auto-created on signup via `on_auth_user_created`; public signups can only assign `'passenger'` or `'driver'` (`BR-12`).

### 2. `public.drivers`
- **Purpose:** Driver-specific credentials, approval status, availability status, and aggregated ratings/trip counters.
- **Key Columns:** `id (uuid PK)`, `user_id (uuid UNIQUE FK -> profiles)`, `license_number (UNIQUE)`, `license_doc_path`, `orcr_doc_path`, `gov_id_doc_path`, `approval_status ('pending' | 'approved' | 'rejected' | 'suspended')`, `rejection_reason`, `approved_by (FK -> profiles)`, `approved_at`, `availability_status ('offline' | 'online' | 'on_trip')`, `rating_average NUMERIC(3,2)`, `total_ratings`, `total_completed_rides`, `created_at`, `updated_at`.
- **Integrity:** `CHECK` constraint enforces non-empty `rejection_reason` whenever `approval_status = 'rejected'` (`BR-13`).

### 3. `public.vehicles`
- **Purpose:** Motorcycles registered by drivers.
- **Key Columns:** `id (uuid PK)`, `driver_id (FK -> drivers)`, `plate_number`, `make`, `model`, `year`, `color`, `verification_status ('pending' | 'verified' | 'rejected')`, `is_active`, `created_at`, `updated_at`.
- **Integrity:** Partial unique index on `upper(trim(plate_number)) WHERE is_active = true` (`BR-11`) and at most one active motorcycle per driver.

### 4. `public.fare_settings`
- **Purpose:** Admin-configurable pricing rules.
- **Key Columns:** `id (uuid PK)`, `name`, `currency`, `base_fare NUMERIC(10,2)`, `per_km_rate NUMERIC(10,2)`, `per_min_rate NUMERIC(10,2)`, `minimum_fare NUMERIC(10,2)`, `commission_rate NUMERIC(5,4)`, `is_active`, `updated_by (FK -> profiles)`, `created_at`, `updated_at`.
- **Integrity:** Partial unique index ensures at most one active `fare_settings` row at any time.

### 5. `public.rides`
- **Purpose:** Core trip record linking one Passenger (`NOT NULL`) and at most one assigned Driver (`NULL` until accepted), with a locked Fare Snapshot (`BR-07`).
- **Key Columns:** `id (uuid PK)`, `passenger_id (FK -> profiles)`, `driver_id (FK -> drivers)`, `vehicle_id (FK -> vehicles)`, `fare_setting_id (FK -> fare_settings)`, pickup/dropoff addresses & coordinates (`NUMERIC(9,6)`), `estimated_distance_km`, `estimated_duration_min`, `snapshot_*` fare columns (`NUMERIC(10,2)`), `estimated_fare`, `final_fare`, `status`, lifecycle timestamps (`requested_at`, `accepted_at`, `arrived_at`, `started_at`, `completed_at`, `cancelled_at`), `created_at`, `updated_at`.
- **Valid Statuses:** `requested`, `accepted`, `driver_arrived`, `in_progress`, `completed`, `cancelled_by_passenger`, `cancelled_by_driver`, `cancelled_by_admin`, `expired`.
- **Integrity:**
  - Partial unique index enforces **1 active ride per passenger** (`BR-02`).
  - Partial unique index enforces **1 active ride per driver** (`BR-03`).
  - `CHECK` prevents identical pickup and dropoff coordinates (`BR-15`).

### 6. `public.ride_locations`
- **Purpose:** Pickup/dropoff coordinates and live driver GPS pings for a ride.
- **Key Columns:** `id (uuid PK)`, `ride_id (FK -> rides ON DELETE CASCADE)`, `recorded_by (FK -> profiles)`, `location_type ('pickup' | 'dropoff' | 'driver_ping')`, `latitude NUMERIC(9,6)`, `longitude NUMERIC(9,6)`, `heading`, `speed_kph`, `recorded_at`, `created_at`, `updated_at`.

### 7. `public.ride_status_history`
- **Purpose:** Immutable chronological audit of every status transition for a ride.
- **Key Columns:** `id (uuid PK)`, `ride_id (FK -> rides ON DELETE CASCADE)`, `previous_status`, `new_status`, `changed_by (FK -> profiles)`, `note`, `created_at`, `updated_at`.

### 8. `public.payments`
- **Purpose:** 1:1 financial settlement & driver earnings breakdown created automatically when a ride reaches `completed` (`BR-09`).
- **Key Columns:** `id (uuid PK)`, `ride_id (UNIQUE FK -> rides)`, `passenger_id (FK -> profiles)`, `driver_id (FK -> drivers)`, `gross_amount NUMERIC(10,2)`, `platform_fee NUMERIC(10,2)`, `driver_net_earnings NUMERIC(10,2)`, `currency`, `payment_method ('cash' | 'ewallet' | 'card')`, `payment_status ('pending' | 'paid' | 'refunded' | 'failed')`, `paid_at`, `created_at`, `updated_at`.
- **Integrity:** Accounting `CHECK` enforces `gross_amount = platform_fee + driver_net_earnings`.

### 9. `public.ratings`
- **Purpose:** 1:1 passenger rating per completed ride (`BR-10`).
- **Key Columns:** `id (uuid PK)`, `ride_id (UNIQUE FK -> rides)`, `passenger_id (FK -> profiles)`, `driver_id (FK -> drivers)`, `score SMALLINT (1..5)`, `comment`, `created_at`, `updated_at`.
- **Integrity:** Trigger `trg_ratings_recalculate_driver` automatically updates `drivers.rating_average` and `drivers.total_ratings`.

### 10. `public.notifications`
- **Purpose:** User-facing alerts for ride milestones, approvals, and payments.
- **Key Columns:** `id (uuid PK)`, `user_id (FK -> profiles ON DELETE CASCADE)`, `ride_id (FK -> rides ON DELETE SET NULL)`, `type`, `title`, `body`, `is_read`, `read_at`, `created_at`, `updated_at`.

### 11. `public.activity_logs`
- **Purpose:** Append-only administrative & security audit trail (`BR-14`).
- **Key Columns:** `id (uuid PK)`, `actor_id (FK -> profiles)`, `action`, `entity_type`, `entity_id`, `metadata JSONB`, `created_at`, `updated_at`.

---

## 3. Row Level Security (RLS) Summary

- **Enabled on all 11 tables** (zero unprotected tables).
- **Passengers** can only view/create their own rides and ratings, and read their own profile, payments, and notifications.
- **Drivers** can only manage their own driver profile, motorcycle, and private storage folder; only **approved, active, online drivers** with an active motorcycle can read open `requested` rides or call `accept_ride`.
- **Administrators** have audited governance access across all tables and exclusive write access to `fare_settings`, driver approvals, account suspensions, and `activity_logs`.
- **Private Storage:** `driver-documents` bucket is `public = false` with 5 MB limit and `image/jpeg`, `image/png`, `application/pdf` MIME restrictions.
