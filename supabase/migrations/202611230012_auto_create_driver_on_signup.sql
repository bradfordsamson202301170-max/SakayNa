-- ============================================================================
-- MotoGo Migration 0012: Auto-Create Driver & Vehicle Rows on Signup Trigger
-- ============================================================================
-- Ensures newly registered drivers immediately appear in Admin Verification
-- with their license number, address, and motorcycle details even while
-- awaiting email confirmation.
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
  v_license text;
  v_driver_id uuid;
  v_plate text;
  v_make text;
  v_model text;
  v_color text;
  v_year integer;
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

  if requested_role = 'driver' then
    v_license := upper(trim(coalesce(new.raw_user_meta_data ->> 'license_number', '')));
    if length(v_license) = 0 then
      v_license := 'PENDING-' || upper(substr(new.id::text, 1, 8));
    end if;

    insert into public.drivers (user_id, license_number, address, approval_status, availability_status)
    values (
      new.id,
      v_license,
      nullif(trim(coalesce(new.raw_user_meta_data ->> 'address', '')), ''),
      'pending',
      'offline'
    )
    on conflict (user_id) do nothing
    returning id into v_driver_id;

    if v_driver_id is null then
      select id into v_driver_id from public.drivers where user_id = new.id;
    end if;

    v_plate := upper(trim(coalesce(new.raw_user_meta_data ->> 'plate_number', '')));
    v_make := trim(coalesce(new.raw_user_meta_data ->> 'make', ''));
    v_model := trim(coalesce(new.raw_user_meta_data ->> 'model', ''));
    v_color := trim(coalesce(new.raw_user_meta_data ->> 'color', ''));
    v_year := coalesce(nullif(new.raw_user_meta_data ->> 'year', '')::integer, 2024);

    if v_driver_id is not null and length(v_plate) > 0 and length(v_make) > 0 and length(v_model) > 0 then
      insert into public.vehicles (driver_id, plate_number, make, model, year, color, verification_status, is_active)
      values (v_driver_id, v_plate, v_make, v_model, v_year, coalesce(nullif(v_color, ''), 'Unspecified'), 'pending', true)
      on conflict do nothing;
    end if;
  end if;

  return new;
end;
$$;
