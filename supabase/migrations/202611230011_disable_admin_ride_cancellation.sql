-- ============================================================================
-- MotoGo Migration 0011: Restrict Ride Cancellation / Rejection to Drivers
-- ============================================================================
-- Administrators may monitor rides (SELECT only) and cannot cancel or reject
-- rides via RLS or the transition_ride_status RPC.
-- ============================================================================

drop policy if exists "rides_update_admin" on public.rides;

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

  if p_next_status = 'cancelled_by_admin' then
    raise exception 'Administrators can monitor rides only; only drivers can decide on rides.';

  elsif p_next_status = 'driver_arrived' then
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

    insert into public.payments (
      ride_id, passenger_id, driver_id, gross_amount, platform_fee,
      driver_net_earnings, payment_method, payment_status, paid_at
    )
    values (
      v_ride.id, v_ride.passenger_id, v_ride.driver_id, v_final_fare,
      v_platform_fee, v_driver_net, 'cash', 'paid', now()
    )
    on conflict (ride_id) do nothing;

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

  else
    raise exception 'Unsupported ride status transition: %', p_next_status;
  end if;

  insert into public.ride_status_history (ride_id, previous_status, new_status, changed_by, note)
  values (v_ride.id, v_prev_status, p_next_status, auth.uid(), p_note);

  return v_ride;
end;
$$;
