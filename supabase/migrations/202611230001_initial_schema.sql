-- ============================================================================
-- MotoGo Migration 0001: Initial Normalized PostgreSQL Schema (11 Tables)
-- ============================================================================
-- Target: Online Supabase PostgreSQL (Project Ref: euiifsblmwuwquershku)
-- Tables:
--   1. profiles
--   2. drivers
--   3. vehicles
--   4. rides
--   5. ride_locations
--   6. ride_status_history
--   7. fare_settings
--   8. payments
--   9. ratings
--  10. notifications
--  11. activity_logs
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Reusable updated_at trigger function
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 1. profiles (1:1 with auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  avatar_url text,
  role text not null default 'passenger'
    constraint profiles_role_check check (role in ('passenger', 'driver', 'admin')),
  account_status text not null default 'active'
    constraint profiles_account_status_check check (account_status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_profiles_email_lower on public.profiles (lower(email));
create index if not exists idx_profiles_role on public.profiles (role);
create index if not exists idx_profiles_account_status on public.profiles (account_status);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Automatically provision a profile row on Supabase Auth signup (never self-registers as admin)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data ->> 'role', 'passenger');
  if requested_role not in ('passenger', 'driver') then
    requested_role := 'passenger';
  end if;

  insert into public.profiles (id, email, full_name, phone, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'MotoGo User'),
    new.raw_user_meta_data ->> 'phone',
    requested_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. drivers (1:1 extension of profiles for role = 'driver')
-- ----------------------------------------------------------------------------
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  license_number text not null unique,
  license_doc_path text,
  orcr_doc_path text,
  gov_id_doc_path text,
  approval_status text not null default 'pending'
    constraint drivers_approval_status_check check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  rejection_reason text,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  availability_status text not null default 'offline'
    constraint drivers_availability_status_check check (availability_status in ('offline', 'online', 'on_trip')),
  rating_average numeric(3, 2) not null default 0.00
    constraint drivers_rating_average_check check (rating_average >= 0 and rating_average <= 5),
  total_ratings integer not null default 0
    constraint drivers_total_ratings_check check (total_ratings >= 0),
  total_completed_rides integer not null default 0
    constraint drivers_total_completed_rides_check check (total_completed_rides >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint drivers_rejection_reason_required check (
    approval_status <> 'rejected' or (rejection_reason is not null and length(trim(rejection_reason)) > 0)
  )
);

create index if not exists idx_drivers_approval_status on public.drivers (approval_status);
create index if not exists idx_drivers_availability_status on public.drivers (availability_status);

drop trigger if exists trg_drivers_updated_at on public.drivers;
create trigger trg_drivers_updated_at
  before update on public.drivers
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. vehicles (motorcycles registered by drivers)
-- ----------------------------------------------------------------------------
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers (id) on delete cascade,
  plate_number text not null,
  make text not null,
  model text not null,
  year integer not null
    constraint vehicles_year_check check (year >= 1990 and year <= 2100),
  color text not null,
  verification_status text not null default 'pending'
    constraint vehicles_verification_status_check check (verification_status in ('pending', 'verified', 'rejected')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Normalized unique plate number across active vehicles (BR-11)
create unique index if not exists idx_vehicles_active_plate_unique
  on public.vehicles (upper(trim(plate_number)))
  where is_active = true;

-- At most one active motorcycle per driver at a time
create unique index if not exists idx_vehicles_one_active_per_driver
  on public.vehicles (driver_id)
  where is_active = true;

create index if not exists idx_vehicles_driver_id on public.vehicles (driver_id);

drop trigger if exists trg_vehicles_updated_at on public.vehicles;
create trigger trg_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. fare_settings (admin-configurable pricing rules; max 1 active at a time)
-- ----------------------------------------------------------------------------
create table if not exists public.fare_settings (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Standard MotoGo Fare',
  currency text not null default 'PHP',
  base_fare numeric(10, 2) not null
    constraint fare_settings_base_fare_check check (base_fare >= 0),
  per_km_rate numeric(10, 2) not null
    constraint fare_settings_per_km_rate_check check (per_km_rate >= 0),
  per_min_rate numeric(10, 2) not null
    constraint fare_settings_per_min_rate_check check (per_min_rate >= 0),
  minimum_fare numeric(10, 2) not null
    constraint fare_settings_minimum_fare_check check (minimum_fare >= 0),
  commission_rate numeric(5, 4) not null default 0.1500
    constraint fare_settings_commission_rate_check check (commission_rate >= 0 and commission_rate <= 0.5000),
  is_active boolean not null default true,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_fare_settings_single_active
  on public.fare_settings (is_active)
  where is_active = true;

drop trigger if exists trg_fare_settings_updated_at on public.fare_settings;
create trigger trg_fare_settings_updated_at
  before update on public.fare_settings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. rides (core trip entity with locked Fare Snapshot)
-- ----------------------------------------------------------------------------
create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles (id) on delete restrict,
  driver_id uuid references public.drivers (id) on delete restrict,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  fare_setting_id uuid references public.fare_settings (id) on delete set null,

  pickup_address text not null,
  pickup_lat numeric(9, 6) not null
    constraint rides_pickup_lat_check check (pickup_lat >= -90 and pickup_lat <= 90),
  pickup_lng numeric(9, 6) not null
    constraint rides_pickup_lng_check check (pickup_lng >= -180 and pickup_lng <= 180),

  dropoff_address text not null,
  dropoff_lat numeric(9, 6) not null
    constraint rides_dropoff_lat_check check (dropoff_lat >= -90 and dropoff_lat <= 90),
  dropoff_lng numeric(9, 6) not null
    constraint rides_dropoff_lng_check check (dropoff_lng >= -180 and dropoff_lng <= 180),

  passenger_notes text,
  estimated_distance_km numeric(8, 2) not null
    constraint rides_distance_check check (estimated_distance_km > 0),
  estimated_duration_min integer not null
    constraint rides_duration_check check (estimated_duration_min > 0),

  -- Locked Fare Snapshot (BR-07)
  snapshot_base_fare numeric(10, 2) not null check (snapshot_base_fare >= 0),
  snapshot_per_km_rate numeric(10, 2) not null check (snapshot_per_km_rate >= 0),
  snapshot_per_min_rate numeric(10, 2) not null check (snapshot_per_min_rate >= 0),
  snapshot_minimum_fare numeric(10, 2) not null check (snapshot_minimum_fare >= 0),
  snapshot_commission_rate numeric(5, 4) not null check (snapshot_commission_rate >= 0 and snapshot_commission_rate <= 0.5000),

  estimated_fare numeric(10, 2) not null
    constraint rides_estimated_fare_check check (estimated_fare >= 0),
  final_fare numeric(10, 2)
    constraint rides_final_fare_check check (final_fare is null or final_fare >= 0),

  status text not null default 'requested'
    constraint rides_status_check check (
      status in (
        'requested',
        'accepted',
        'driver_arrived',
        'in_progress',
        'completed',
        'cancelled_by_passenger',
        'cancelled_by_driver',
        'cancelled_by_admin',
        'expired'
      )
    ),
  cancellation_reason text,

  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  arrived_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Pickup and dropoff cannot be identical (BR-15)
  constraint rides_distinct_locations_check check (
    pickup_lat <> dropoff_lat or pickup_lng <> dropoff_lng
  )
);

-- Single active ride per passenger (BR-02)
create unique index if not exists idx_rides_one_active_per_passenger
  on public.rides (passenger_id)
  where status in ('requested', 'accepted', 'driver_arrived', 'in_progress');

-- Single active ride per driver (BR-03)
create unique index if not exists idx_rides_one_active_per_driver
  on public.rides (driver_id)
  where driver_id is not null and status in ('accepted', 'driver_arrived', 'in_progress');

create index if not exists idx_rides_status on public.rides (status);
create index if not exists idx_rides_passenger_created on public.rides (passenger_id, created_at desc);
create index if not exists idx_rides_driver_created on public.rides (driver_id, created_at desc);
create index if not exists idx_rides_created_at on public.rides (created_at desc);

drop trigger if exists trg_rides_updated_at on public.rides;
create trigger trg_rides_updated_at
  before update on public.rides
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. ride_locations (GPS breadcrumbs & milestone coordinates for a ride)
-- ----------------------------------------------------------------------------
create table if not exists public.ride_locations (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  recorded_by uuid references public.profiles (id) on delete set null,
  location_type text not null default 'driver_ping'
    constraint ride_locations_type_check check (location_type in ('pickup', 'dropoff', 'driver_ping')),
  latitude numeric(9, 6) not null
    constraint ride_locations_lat_check check (latitude >= -90 and latitude <= 90),
  longitude numeric(9, 6) not null
    constraint ride_locations_lng_check check (longitude >= -180 and longitude <= 180),
  heading numeric(5, 2)
    constraint ride_locations_heading_check check (heading is null or (heading >= 0 and heading <= 360)),
  speed_kph numeric(6, 2)
    constraint ride_locations_speed_check check (speed_kph is null or speed_kph >= 0),
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ride_locations_ride_recorded
  on public.ride_locations (ride_id, recorded_at desc);

drop trigger if exists trg_ride_locations_updated_at on public.ride_locations;
create trigger trg_ride_locations_updated_at
  before update on public.ride_locations
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. ride_status_history (chronological audit log of ride status changes)
-- ----------------------------------------------------------------------------
create table if not exists public.ride_status_history (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  previous_status text,
  new_status text not null
    constraint ride_status_history_new_status_check check (
      new_status in (
        'requested',
        'accepted',
        'driver_arrived',
        'in_progress',
        'completed',
        'cancelled_by_passenger',
        'cancelled_by_driver',
        'cancelled_by_admin',
        'expired'
      )
    ),
  changed_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ride_status_history_ride_created
  on public.ride_status_history (ride_id, created_at asc);

drop trigger if exists trg_ride_status_history_updated_at on public.ride_status_history;
create trigger trg_ride_status_history_updated_at
  before update on public.ride_status_history
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. payments (1:1 financial & driver earnings record for completed rides)
-- ----------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null unique references public.rides (id) on delete restrict,
  passenger_id uuid not null references public.profiles (id) on delete restrict,
  driver_id uuid not null references public.drivers (id) on delete restrict,
  gross_amount numeric(10, 2) not null
    constraint payments_gross_amount_check check (gross_amount >= 0),
  platform_fee numeric(10, 2) not null
    constraint payments_platform_fee_check check (platform_fee >= 0),
  driver_net_earnings numeric(10, 2) not null
    constraint payments_driver_net_check check (driver_net_earnings >= 0),
  currency text not null default 'PHP',
  payment_method text not null default 'cash'
    constraint payments_method_check check (payment_method in ('cash', 'ewallet', 'card')),
  payment_status text not null default 'paid'
    constraint payments_status_check check (payment_status in ('pending', 'paid', 'refunded', 'failed')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_accounting_balance_check check (
    gross_amount = platform_fee + driver_net_earnings
  )
);

create index if not exists idx_payments_driver_created on public.payments (driver_id, created_at desc);
create index if not exists idx_payments_passenger_created on public.payments (passenger_id, created_at desc);
create index if not exists idx_payments_status on public.payments (payment_status);

drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. ratings (1:1 passenger rating per completed ride — BR-10)
-- ----------------------------------------------------------------------------
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null unique references public.rides (id) on delete cascade,
  passenger_id uuid not null references public.profiles (id) on delete restrict,
  driver_id uuid not null references public.drivers (id) on delete restrict,
  score smallint not null
    constraint ratings_score_check check (score >= 1 and score <= 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ratings_driver_created on public.ratings (driver_id, created_at desc);

drop trigger if exists trg_ratings_updated_at on public.ratings;
create trigger trg_ratings_updated_at
  before update on public.ratings
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. notifications (in-app alerts for passengers, drivers, and admins)
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  ride_id uuid references public.rides (id) on delete set null,
  type text not null default 'system'
    constraint notifications_type_check check (
      type in ('ride_update', 'driver_approval', 'payment', 'system')
    ),
  title text not null,
  body text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read, created_at desc);

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. activity_logs (append-only governance & security audit trail — BR-14)
-- ----------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_created_at on public.activity_logs (created_at desc);
create index if not exists idx_activity_logs_entity on public.activity_logs (entity_type, entity_id);
create index if not exists idx_activity_logs_actor on public.activity_logs (actor_id, created_at desc);
