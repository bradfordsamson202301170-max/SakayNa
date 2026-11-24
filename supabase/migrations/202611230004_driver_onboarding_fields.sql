-- ============================================================================
-- MotoGo Migration 0004: Driver Onboarding Fields & Strict Approval Guard
-- ============================================================================
-- Adds Batch 7 driver/motorcycle fields and enforces BR-01 at the DB layer:
--   - Non-admin drivers cannot self-approve or alter approval_status
--   - Drivers cannot go 'online' unless approval_status = 'approved'
--     and they have an active registered motorcycle.
-- ============================================================================

alter table public.drivers
  add column if not exists address text,
  add column if not exists profile_photo_path text;

alter table public.vehicles
  add column if not exists registration_doc_path text,
  add column if not exists photo_path text;

create or replace function public.enforce_driver_self_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_has_active_vehicle boolean;
begin
  -- Administrators bypass self-service restrictions
  if public.is_admin() then
    return new;
  end if;

  -- Drivers may NEVER change their own approval_status, approved_by, approved_at, or counters
  -- Exception: a 'rejected' driver may resubmit back to 'pending'
  if new.approval_status is distinct from old.approval_status then
    if not (old.approval_status = 'rejected' and new.approval_status = 'pending') then
      raise exception 'Drivers cannot change their own approval status.';
    end if;
  end if;

  -- Drivers cannot go online unless approved AND they have an active motorcycle (BR-01)
  if new.availability_status = 'online' then
    if new.approval_status <> 'approved' then
      raise exception 'Only approved drivers can go online (BR-01).';
    end if;

    select exists (
      select 1 from public.vehicles
      where driver_id = new.id and is_active = true
    ) into v_has_active_vehicle;

    if not v_has_active_vehicle then
      raise exception 'An active registered motorcycle is required to go online (BR-01).';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_drivers_self_update_guard on public.drivers;
create trigger trg_drivers_self_update_guard
  before update on public.drivers
  for each row execute function public.enforce_driver_self_update_guard();
