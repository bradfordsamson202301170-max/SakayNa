-- ============================================================================
-- MotoGo Migration 0006: Driver Matching, Ride Rejections & Hardened Atomic Accept
-- ============================================================================
-- Enforces Batch 12 requirements at the PostgreSQL layer:
--   1. Persistent per-driver ride rejections (ride_rejections + RLS)
--   2. Hardened atomic accept_ride() RPC with explicit row-level locking,
--      conflicting-active-ride check, approval/vehicle verification,
--      assignment history logging, and passenger notification creation.
--   3. Server-side reject_ride() RPC so rejections persist across reloads
--      without cancelling the ride for other online approved drivers.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Per-driver ride rejections table (BR-05)
-- ----------------------------------------------------------------------------
create table if not exists public.ride_rejections (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides (id) on delete cascade,
  driver_id uuid not null references public.drivers (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ride_rejections_unique_driver_ride unique (ride_id, driver_id)
);

create index if not exists idx_ride_rejections_driver_id
  on public.ride_rejections (driver_id, created_at desc);

drop trigger if exists trg_ride_rejections_updated_at on public.ride_rejections;
create trigger trg_ride_rejections_updated_at
  before update on public.ride_rejections
  for each row execute function public.set_updated_at();

alter table public.ride_rejections enable row level security;

drop policy if exists "ride_rejections_select_own_or_admin" on public.ride_rejections;
create policy "ride_rejections_select_own_or_admin"
  on public.ride_rejections for select
  to authenticated
  using (
    driver_id = public.current_driver_id()
    or public.is_admin()
  );

drop policy if exists "ride_rejections_insert_own_driver" on public.ride_rejections;
create policy "ride_rejections_insert_own_driver"
  on public.ride_rejections for insert
  to authenticated
  with check (
    driver_id = public.current_driver_id()
    and public.is_approved_online_driver()
  );

-- ----------------------------------------------------------------------------
-- Hardened Atomic accept_ride() RPC (Prevents Race Conditions & Double-Booking)
-- ----------------------------------------------------------------------------
create or replace function public.accept_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver public.drivers%rowtype;
  v_driver_name text;
  v_vehicle public.vehicles%rowtype;
  v_ride public.rides%rowtype;
  v_has_conflict boolean;
begin
  -- 1. Lock and verify caller is an active, approved, online driver
  select d.*
  into v_driver
  from public.drivers d
  join public.profiles p on p.id = d.user_id
  where d.user_id = auth.uid()
    and p.account_status = 'active'
    and d.approval_status = 'approved'
    and d.availability_status = 'online'
  for update of d;

  if not found then
    raise exception 'Only active, approved, online drivers can accept rides (BR-01).';
  end if;

  select full_name into v_driver_name
  from public.profiles
  where id = auth.uid();

  -- 2. Prevent accepting conflicting active rides (BR-03)
  select exists (
    select 1 from public.rides
    where driver_id = v_driver.id
      and status in ('accepted', 'driver_arrived', 'in_progress')
  ) into v_has_conflict;

  if v_has_conflict then
    raise exception 'Driver already has a conflicting active ride (BR-03).';
  end if;

  -- 3. Verify active registered motorcycle exists
  select * into v_vehicle
  from public.vehicles
  where driver_id = v_driver.id and is_active = true
  limit 1;

  if not found then
    raise exception 'An active registered motorcycle is required to accept rides (BR-01).';
  end if;

  -- 4. Lock the target ride row exclusively to prevent concurrent double-booking (BR-04)
  select * into v_ride
  from public.rides
  where id = p_ride_id
  for update;

  if not found then
    raise exception 'Ride request not found.';
  end if;

  if v_ride.status <> 'requested' or v_ride.driver_id is not null then
    raise exception 'Ride has already been accepted by another driver or is no longer open (BR-04).';
  end if;

  -- 5. Assign ride atomically to this single driver
  update public.rides
  set
    driver_id = v_driver.id,
    vehicle_id = v_vehicle.id,
    status = 'accepted',
    accepted_at = now()
  where id = p_ride_id
    and status = 'requested'
    and driver_id is null
  returning * into v_ride;

  -- 6. Mark driver as on_trip
  update public.drivers
  set availability_status = 'on_trip'
  where id = v_driver.id;

  -- 7. Record assignment history
  insert into public.ride_status_history (ride_id, previous_status, new_status, changed_by, note)
  values (
    v_ride.id,
    'requested',
    'accepted',
    auth.uid(),
    'Assigned atomically to driver ' || coalesce(v_driver_name, v_driver.id::text)
  );

  -- 8. Notify passenger immediately
  insert into public.notifications (user_id, ride_id, type, title, body)
  values (
    v_ride.passenger_id,
    v_ride.id,
    'ride_update',
    'Driver Assigned — ' || coalesce(v_driver_name, 'MotoGo Driver'),
    'Your ride has been accepted. Motorcycle: ' || v_vehicle.make || ' ' || v_vehicle.model || ' (' || v_vehicle.plate_number || ').'
  );

  return v_ride;
end;
$$;

-- ----------------------------------------------------------------------------
-- Server-side reject_ride() RPC (Hides offer for this driver only — BR-05)
-- ----------------------------------------------------------------------------
create or replace function public.reject_ride(
  p_ride_id uuid,
  p_reason text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
begin
  if not public.is_approved_online_driver() then
    raise exception 'Only approved online drivers can reject ride requests.';
  end if;

  v_driver_id := public.current_driver_id();

  insert into public.ride_rejections (ride_id, driver_id, reason)
  values (p_ride_id, v_driver_id, p_reason)
  on conflict (ride_id, driver_id) do nothing;

  return true;
end;
$$;
