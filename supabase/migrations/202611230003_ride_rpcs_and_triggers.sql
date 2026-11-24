-- ============================================================================
-- MotoGo Migration 0003: Atomic Ride RPCs, History & Earnings Triggers
-- ============================================================================
-- Enforces:
--   - BR-01: Approved driver + active motorcycle gate
--   - BR-04: Atomic ride acceptance (zero double-booking)
--   - BR-06: Strict sequential ride status transitions
--   - BR-09: Automatic payment & driver earnings ledger creation on completion
--   - BR-10: Automatic driver rating average recalculation
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Automatically record initial 'requested' entry in ride_status_history
-- ----------------------------------------------------------------------------
create or replace function public.log_initial_ride_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ride_status_history (ride_id, previous_status, new_status, changed_by, note)
  values (new.id, null, new.status, new.passenger_id, 'Ride requested by passenger');
  return new;
end;
$$;

drop trigger if exists trg_rides_initial_history on public.rides;
create trigger trg_rides_initial_history
  after insert on public.rides
  for each row execute function public.log_initial_ride_status();

-- ----------------------------------------------------------------------------
-- Automatically recalculate driver average rating on rating insert (BR-10)
-- ----------------------------------------------------------------------------
create or replace function public.recalculate_driver_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.drivers
  set
    rating_average = coalesce((
      select round(avg(score)::numeric, 2)
      from public.ratings
      where driver_id = new.driver_id
    ), 0.00),
    total_ratings = (
      select count(*)::integer
      from public.ratings
      where driver_id = new.driver_id
    )
  where id = new.driver_id;
  return new;
end;
$$;

drop trigger if exists trg_ratings_recalculate_driver on public.ratings;
create trigger trg_ratings_recalculate_driver
  after insert on public.ratings
  for each row execute function public.recalculate_driver_rating();

-- ----------------------------------------------------------------------------
-- Atomic Ride Acceptance RPC (BR-01, BR-03, BR-04)
-- ----------------------------------------------------------------------------
create or replace function public.accept_ride(p_ride_id uuid)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver public.drivers%rowtype;
  v_vehicle_id uuid;
  v_ride public.rides%rowtype;
begin
  -- Verify caller is an active, approved, online driver
  select d.*
  into v_driver
  from public.drivers d
  join public.profiles p on p.id = d.user_id
  where d.user_id = auth.uid()
    and p.account_status = 'active'
    and d.approval_status = 'approved'
    and d.availability_status = 'online'
  for update;

  if not found then
    raise exception 'Driver must be active, approved, and online to accept rides.';
  end if;

  -- Verify active motorcycle exists
  select v.id into v_vehicle_id
  from public.vehicles v
  where v.driver_id = v_driver.id and v.is_active = true
  limit 1;

  if v_vehicle_id is null then
    raise exception 'Driver must have an active registered motorcycle.';
  end if;

  -- Atomically claim the ride only if still requested and unassigned
  update public.rides
  set
    driver_id = v_driver.id,
    vehicle_id = v_vehicle_id,
    status = 'accepted',
    accepted_at = now()
  where id = p_ride_id
    and status = 'requested'
    and driver_id is null
  returning * into v_ride;

  if not found then
    raise exception 'Ride is no longer available or has already been accepted.';
  end if;

  -- Mark driver as on_trip
  update public.drivers
  set availability_status = 'on_trip'
  where id = v_driver.id;

  -- Append status history
  insert into public.ride_status_history (ride_id, previous_status, new_status, changed_by, note)
  values (v_ride.id, 'requested', 'accepted', auth.uid(), 'Accepted by driver');

  return v_ride;
end;
$$;

-- ----------------------------------------------------------------------------
-- Validated Ride Status Transition RPC (BR-06, BR-09)
-- ----------------------------------------------------------------------------
create or replace function public.transition_ride_status(
  p_ride_id uuid,
  p_next_status text,
  p_note text default null
)
returns public.rides
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides%rowtype;
  v_prev_status text;
  v_driver_id uuid;
  v_is_admin boolean;
  v_final_fare numeric(10, 2);
  v_platform_fee numeric(10, 2);
  v_driver_net numeric(10, 2);
begin
  select * into v_ride
  from public.rides
  where id = p_ride_id
  for update;

  if not found then
    raise exception 'Ride not found.';
  end if;

  v_prev_status := v_ride.status;
  v_driver_id := public.current_driver_id();
  v_is_admin := public.is_admin();

  -- Validate allowed transitions & actor permissions
  if p_next_status = 'driver_arrived' then
    if v_ride.status <> 'accepted' or v_ride.driver_id <> v_driver_id then
      raise exception 'Only the assigned driver can mark an accepted ride as arrived.';
    end if;
    update public.rides
    set status = 'driver_arrived', arrived_at = now()
    where id = p_ride_id
    returning * into v_ride;

  elsif p_next_status = 'in_progress' then
    if v_ride.status <> 'driver_arrived' or v_ride.driver_id <> v_driver_id then
      raise exception 'Only the assigned driver can start a ride after arrival.';
    end if;
    update public.rides
    set status = 'in_progress', started_at = now()
    where id = p_ride_id
    returning * into v_ride;

  elsif p_next_status = 'completed' then
    if v_ride.status <> 'in_progress' or v_ride.driver_id <> v_driver_id then
      raise exception 'Only the assigned driver can complete an in-progress ride.';
    end if;

    v_final_fare := coalesce(v_ride.final_fare, v_ride.estimated_fare);
    v_platform_fee := round(v_final_fare * v_ride.snapshot_commission_rate, 2);
    v_driver_net := v_final_fare - v_platform_fee;

    update public.rides
    set status = 'completed', final_fare = v_final_fare, completed_at = now()
    where id = p_ride_id
    returning * into v_ride;

    -- Auto-create single payment & driver earnings record (BR-09)
    insert into public.payments (
      ride_id, passenger_id, driver_id, gross_amount, platform_fee,
      driver_net_earnings, payment_method, payment_status, paid_at
    )
    values (
      v_ride.id, v_ride.passenger_id, v_ride.driver_id, v_final_fare,
      v_platform_fee, v_driver_net, 'cash', 'paid', now()
    )
    on conflict (ride_id) do nothing;

    -- Return driver to online and increment completed count
    update public.drivers
    set availability_status = 'online',
        total_completed_rides = total_completed_rides + 1
    where id = v_ride.driver_id;

  elsif p_next_status = 'cancelled_by_passenger' then
    if v_ride.passenger_id <> auth.uid() or v_ride.status not in ('requested', 'accepted', 'driver_arrived') then
      raise exception 'Passenger can only cancel their own ride prior to trip start.';
    end if;
    update public.rides
    set status = 'cancelled_by_passenger', cancellation_reason = p_note, cancelled_at = now()
    where id = p_ride_id
    returning * into v_ride;

    if v_ride.driver_id is not null then
      update public.drivers set availability_status = 'online' where id = v_ride.driver_id;
    end if;

  elsif p_next_status = 'cancelled_by_driver' then
    if v_ride.driver_id <> v_driver_id or v_ride.status not in ('accepted', 'driver_arrived') then
      raise exception 'Driver can only cancel an assigned ride prior to trip start.';
    end if;
    update public.rides
    set status = 'cancelled_by_driver', cancellation_reason = p_note, cancelled_at = now()
    where id = p_ride_id
    returning * into v_ride;

    update public.drivers set availability_status = 'online' where id = v_driver_id;

  elsif p_next_status = 'cancelled_by_admin' then
    if not v_is_admin or v_ride.status in ('completed', 'cancelled_by_passenger', 'cancelled_by_driver', 'cancelled_by_admin', 'expired') then
      raise exception 'Only an active admin can override an open ride.';
    end if;
    update public.rides
    set status = 'cancelled_by_admin', cancellation_reason = p_note, cancelled_at = now()
    where id = p_ride_id
    returning * into v_ride;

    if v_ride.driver_id is not null then
      update public.drivers set availability_status = 'online' where id = v_ride.driver_id;
    end if;

    insert into public.activity_logs (actor_id, action, entity_type, entity_id, metadata)
    values (auth.uid(), 'RIDE_CANCELLED_BY_ADMIN', 'rides', v_ride.id, jsonb_build_object('reason', coalesce(p_note, 'Admin override')));

  else
    raise exception 'Unsupported ride status transition: %', p_next_status;
  end if;

  -- Append status history row with accurate prior status
  insert into public.ride_status_history (ride_id, previous_status, new_status, changed_by, note)
  values (v_ride.id, v_prev_status, p_next_status, auth.uid(), p_note);

  return v_ride;
end;
$$;
