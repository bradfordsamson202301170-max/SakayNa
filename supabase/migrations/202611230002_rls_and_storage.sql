-- ============================================================================
-- MotoGo Migration 0002: Row Level Security (RLS) & Private Storage Policies
-- ============================================================================
-- Enforces least-privilege access across all 11 tables and the private
-- `driver-documents` Supabase Storage bucket.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER to avoid recursive RLS lookups)
-- ----------------------------------------------------------------------------
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and account_status = 'active'
  );
$$;

create or replace function public.current_driver_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.drivers where user_id = auth.uid();
$$;

create or replace function public.is_approved_online_driver()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.drivers d
    join public.profiles p on p.id = d.user_id
    join public.vehicles v on v.driver_id = d.id and v.is_active = true
    where d.user_id = auth.uid()
      and p.account_status = 'active'
      and d.approval_status = 'approved'
      and d.availability_status = 'online'
  );
$$;

-- ----------------------------------------------------------------------------
-- Enable RLS on all 11 tables
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.drivers enable row level security;
alter table public.vehicles enable row level security;
alter table public.fare_settings enable row level security;
alter table public.rides enable row level security;
alter table public.ride_locations enable row level security;
alter table public.ride_status_history enable row level security;
alter table public.payments enable row level security;
alter table public.ratings enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- ----------------------------------------------------------------------------
-- 1. profiles policies
-- ----------------------------------------------------------------------------
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_safe_fields"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = public.current_user_role()
  );

create policy "profiles_admin_update_all"
  on public.profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 2. drivers policies
-- ----------------------------------------------------------------------------
create policy "drivers_select_own_assigned_or_admin"
  on public.drivers for select
  to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.rides r
      where r.driver_id = drivers.id
        and r.passenger_id = auth.uid()
    )
  );

create policy "drivers_insert_own"
  on public.drivers for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.current_user_role() = 'driver'
    and approval_status = 'pending'
  );

create policy "drivers_update_own"
  on public.drivers for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "drivers_admin_all"
  on public.drivers for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 3. vehicles policies
-- ----------------------------------------------------------------------------
create policy "vehicles_select_own_assigned_or_admin"
  on public.vehicles for select
  to authenticated
  using (
    driver_id = public.current_driver_id()
    or public.is_admin()
    or exists (
      select 1 from public.rides r
      where r.vehicle_id = vehicles.id
        and r.passenger_id = auth.uid()
    )
  );

create policy "vehicles_insert_own_driver"
  on public.vehicles for insert
  to authenticated
  with check (driver_id = public.current_driver_id());

create policy "vehicles_update_own_driver"
  on public.vehicles for update
  to authenticated
  using (driver_id = public.current_driver_id())
  with check (driver_id = public.current_driver_id());

create policy "vehicles_admin_all"
  on public.vehicles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. fare_settings policies
-- ----------------------------------------------------------------------------
create policy "fare_settings_select_active_for_authenticated"
  on public.fare_settings for select
  to authenticated
  using (is_active = true or public.is_admin());

create policy "fare_settings_admin_manage"
  on public.fare_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. rides policies
-- ----------------------------------------------------------------------------
create policy "rides_select_passenger_driver_or_admin"
  on public.rides for select
  to authenticated
  using (
    passenger_id = auth.uid()
    or driver_id = public.current_driver_id()
    or public.is_admin()
    or (status = 'requested' and driver_id is null and public.is_approved_online_driver())
  );

create policy "rides_insert_passenger"
  on public.rides for insert
  to authenticated
  with check (
    passenger_id = auth.uid()
    and public.current_user_role() = 'passenger'
    and status = 'requested'
    and driver_id is null
  );

create policy "rides_update_admin"
  on public.rides for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Note: Passenger cancellations, driver acceptances, and sequential ride transitions
-- execute through validated SECURITY DEFINER RPCs in migration 0003.

-- ----------------------------------------------------------------------------
-- 6. ride_locations policies
-- ----------------------------------------------------------------------------
create policy "ride_locations_select_participants_or_admin"
  on public.ride_locations for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.rides r
      where r.id = ride_locations.ride_id
        and (r.passenger_id = auth.uid() or r.driver_id = public.current_driver_id())
    )
  );

create policy "ride_locations_insert_assigned_driver"
  on public.ride_locations for insert
  to authenticated
  with check (
    recorded_by = auth.uid()
    and exists (
      select 1 from public.rides r
      where r.id = ride_locations.ride_id
        and r.driver_id = public.current_driver_id()
        and r.status in ('accepted', 'driver_arrived', 'in_progress')
    )
  );

-- ----------------------------------------------------------------------------
-- 7. ride_status_history policies
-- ----------------------------------------------------------------------------
create policy "ride_status_history_select_participants_or_admin"
  on public.ride_status_history for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.rides r
      where r.id = ride_status_history.ride_id
        and (r.passenger_id = auth.uid() or r.driver_id = public.current_driver_id())
    )
  );

-- ----------------------------------------------------------------------------
-- 8. payments policies
-- ----------------------------------------------------------------------------
create policy "payments_select_participants_or_admin"
  on public.payments for select
  to authenticated
  using (
    passenger_id = auth.uid()
    or driver_id = public.current_driver_id()
    or public.is_admin()
  );

create policy "payments_admin_manage"
  on public.payments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. ratings policies
-- ----------------------------------------------------------------------------
create policy "ratings_select_participants_or_admin"
  on public.ratings for select
  to authenticated
  using (
    passenger_id = auth.uid()
    or driver_id = public.current_driver_id()
    or public.is_admin()
  );

create policy "ratings_insert_passenger_completed_ride"
  on public.ratings for insert
  to authenticated
  with check (
    passenger_id = auth.uid()
    and exists (
      select 1 from public.rides r
      where r.id = ratings.ride_id
        and r.passenger_id = auth.uid()
        and r.driver_id = ratings.driver_id
        and r.status = 'completed'
    )
  );

-- ----------------------------------------------------------------------------
-- 10. notifications policies
-- ----------------------------------------------------------------------------
create policy "notifications_select_own_or_admin"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "notifications_update_own_read_state"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- 11. activity_logs policies (append-only for admins; no updates/deletes)
-- ----------------------------------------------------------------------------
create policy "activity_logs_select_admin_only"
  on public.activity_logs for select
  to authenticated
  using (public.is_admin());

create policy "activity_logs_insert_admin_only"
  on public.activity_logs for insert
  to authenticated
  with check (public.is_admin() and actor_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Private Supabase Storage bucket for driver verification documents (ADR-004)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'driver-documents',
  'driver-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do nothing;

create policy "driver_docs_upload_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "driver_docs_select_own_or_admin"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'driver-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
