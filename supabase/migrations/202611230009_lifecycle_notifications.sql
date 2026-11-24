-- ============================================================================
-- MotoGo Migration 0009: Automatic Ride Lifecycle Notifications Trigger
-- ============================================================================
-- Automatically creates notifications for all 6 required ride events whenever
-- a row is inserted into `public.ride_status_history`:
--   1. Ride requested
--   2. Ride accepted
--   3. Driver arrived
--   4. Trip started (in_progress)
--   5. Trip completed
--   6. Ride cancelled (passenger, driver, admin, or expired)
-- ============================================================================

create or replace function public.notify_on_ride_status_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides%rowtype;
  v_driver_user_id uuid;
  v_title text;
  v_body text;
  v_notif_type text := 'ride_update';
begin
  select * into v_ride from public.rides where id = new.ride_id;
  if not found then
    return new;
  end if;

  if v_ride.driver_id is not null then
    select user_id into v_driver_user_id
    from public.drivers
    where id = v_ride.driver_id;
  end if;

  if new.new_status = 'requested' then
    v_title := 'Ride Requested';
    v_body := 'Your ride from ' || v_ride.pickup_address || ' to ' || v_ride.dropoff_address || ' is now live. Searching for an approved MotoGo driver.';
  elsif new.new_status = 'accepted' then
    v_title := 'Ride Accepted';
    v_body := 'An approved MotoGo driver has accepted your ride and is heading to your pickup location.';
  elsif new.new_status = 'driver_arrived' then
    v_title := 'Driver Arrived';
    v_body := 'Your MotoGo driver has arrived at ' || v_ride.pickup_address || '.';
  elsif new.new_status = 'in_progress' then
    v_title := 'Trip Started';
    v_body := 'Your MotoGo trip to ' || v_ride.dropoff_address || ' is now in progress.';
  elsif new.new_status = 'completed' then
    v_notif_type := 'payment';
    v_title := 'Trip Completed';
    v_body := 'You have arrived at ' || v_ride.dropoff_address || '. Final fare: PHP ' || coalesce(v_ride.final_fare, v_ride.estimated_fare)::text || '. You may now rate your driver.';
  else
    v_title := 'Ride Cancelled';
    v_body := 'Your ride (' || v_ride.pickup_address || ' -> ' || v_ride.dropoff_address || ') was cancelled.' || case when new.note is not null then ' Reason: ' || new.note else '' end;
  end if;

  -- Notify passenger
  insert into public.notifications (user_id, ride_id, type, title, body)
  values (v_ride.passenger_id, v_ride.id, v_notif_type, v_title, v_body);

  -- Also notify assigned driver on cancellation events
  if v_driver_user_id is not null and new.new_status in ('cancelled_by_passenger', 'cancelled_by_driver', 'cancelled_by_admin', 'expired') then
    insert into public.notifications (user_id, ride_id, type, title, body)
    values (v_driver_user_id, v_ride.id, 'ride_update', v_title, v_body);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ride_status_history_notify on public.ride_status_history;
create trigger trg_ride_status_history_notify
  after insert on public.ride_status_history
  for each row execute function public.notify_on_ride_status_history();
