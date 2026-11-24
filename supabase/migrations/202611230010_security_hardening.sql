-- ============================================================================
-- MotoGo Migration 0010: Batch 16 Security Audit Hardening
-- ============================================================================
-- Closes two defense-in-depth findings discovered during the Batch 16
-- Security Audit:
--   1. Prevents non-admin users from altering their own `profiles.account_status`
--      or `profiles.role` via direct PostgREST calls.
--   2. Prevents non-admin drivers from self-verifying `vehicles.verification_status`
--      via direct PostgREST calls.
-- ============================================================================

create or replace function public.enforce_profile_self_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role then
    raise exception 'Users cannot change their own role.';
  end if;

  if new.account_status is distinct from old.account_status then
    raise exception 'Users cannot change their own account status.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_self_update_guard on public.profiles;
create trigger trg_profiles_self_update_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_self_update_guard();

create or replace function public.enforce_vehicle_self_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if new.verification_status is distinct from old.verification_status then
    raise exception 'Only administrators can change motorcycle verification status.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_vehicles_self_update_guard on public.vehicles;
create trigger trg_vehicles_self_update_guard
  before update on public.vehicles
  for each row execute function public.enforce_vehicle_self_update_guard();
