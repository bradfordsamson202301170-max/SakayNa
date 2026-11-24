-- ============================================================================
-- MotoGo Migration 0008: Atomic Trip Completion & Academic Payment Records
-- ============================================================================
-- Enforces Batch 14 requirements at the PostgreSQL layer:
--   - Payment methods for academic demonstration: 'cash', 'demo_wallet'
--   - Payment statuses: 'unpaid', 'paid', 'cancelled'
--   - Atomic `complete_ride_trip()` RPC preventing duplicate completion and
--     duplicate payment records (FOR UPDATE + UNIQUE(ride_id))
-- ============================================================================

alter table public.payments
  drop constraint if exists payments_method_check;

alter table public.payments
  add constraint payments_method_check
  check (payment_method in ('cash', 'demo_wallet'));

alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check
  check (payment_status in ('unpaid', 'paid', 'cancelled'));

create or replace function public.complete_ride_trip(
  p_ride_id uuid,
  p_payment_method text default 'cash',
  p_payment_status text default 'paid',
  p_final_fare numeric default null,
  p_note text default null
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride public.rides%rowtype;
  v_driver_id uuid;
  v_final_fare numeric(10, 2);
  v_platform_fee numeric(10, 2);
  v_driver_net numeric(10, 2);
  v_payment public.payments%rowtype;
begin
  if p_payment_method not in ('cash', 'demo_wallet') then
    raise exception 'Invalid payment method. Allowed: cash, demo_wallet.';
  end if;

  if p_payment_status not in ('unpaid', 'paid', 'cancelled') then
    raise exception 'Invalid payment status. Allowed: unpaid, paid, cancelled.';
  end if;

  v_driver_id := public.current_driver_id();
  if v_driver_id is null then
    raise exception 'Authenticated driver profile not found.';
  end if;

  -- Lock target ride row exclusively to prevent duplicate completion
  select * into v_ride
  from public.rides
  where id = p_ride_id
  for update;

  if not found then
    raise exception 'Ride not found.';
  end if;

  if v_ride.driver_id <> v_driver_id then
    raise exception 'Only the assigned driver can complete this trip.';
  end if;

  if v_ride.status = 'completed' then
    raise exception 'Trip has already been completed. Duplicate completion blocked.';
  end if;

  if v_ride.status <> 'in_progress' then
    raise exception 'Only an in-progress trip can be completed (current status: %).', v_ride.status;
  end if;

  -- Confirm final fare (never below snapshotted minimum fare floor)
  v_final_fare := round(
    greatest(
      v_ride.snapshot_minimum_fare,
      coalesce(p_final_fare, v_ride.estimated_fare)
    ),
    2
  );
  v_platform_fee := round(v_final_fare * v_ride.snapshot_commission_rate, 2);
  v_driver_net := round(v_final_fare - v_platform_fee, 2);

  -- 1. Update ride status, final_fare, and completion timestamp
  update public.rides
  set
    status = 'completed',
    final_fare = v_final_fare,
    completed_at = now()
  where id = p_ride_id;

  -- 2. Insert single payment record (UNIQUE(ride_id) guarantees zero duplicates)
  insert into public.payments (
    ride_id,
    passenger_id,
    driver_id,
    gross_amount,
    platform_fee,
    driver_net_earnings,
    currency,
    payment_method,
    payment_status,
    paid_at
  )
  values (
    v_ride.id,
    v_ride.passenger_id,
    v_ride.driver_id,
    v_final_fare,
    v_platform_fee,
    v_driver_net,
    'PHP',
    p_payment_method,
    p_payment_status,
    case when p_payment_status = 'paid' then now() else null end
  )
  returning * into v_payment;

  -- 3. Record status history
  insert into public.ride_status_history (ride_id, previous_status, new_status, changed_by, note)
  values (
    v_ride.id,
    'in_progress',
    'completed',
    auth.uid(),
    coalesce(p_note, 'Trip completed (' || p_payment_method || ' / ' || p_payment_status || ')')
  );

  -- 4. Update driver availability and completed ride counter
  update public.drivers
  set
    availability_status = 'online',
    total_completed_rides = total_completed_rides + 1
  where id = v_driver_id;

  -- 5. Notify passenger that trip is complete and ready for rating
  insert into public.notifications (user_id, ride_id, type, title, body)
  values (
    v_ride.passenger_id,
    v_ride.id,
    'payment',
    'Trip Completed — Final Fare PHP ' || v_final_fare::text,
    'Your MotoGo ride is complete. Payment recorded as ' || p_payment_method || ' (' || p_payment_status || '). You can now rate your driver.'
  );

  return v_payment;
end;
$$;
