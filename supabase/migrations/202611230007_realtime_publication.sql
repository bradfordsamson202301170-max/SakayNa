-- ============================================================================
-- MotoGo Migration 0007: Supabase Realtime Publication & Replica Identity
-- ============================================================================
-- Enables secure RLS-enforced Supabase Realtime (postgres_changes) on:
--   - public.rides
--   - public.ride_locations
--   - public.ride_status_history
--   - public.notifications
--
-- Security Note:
--   Supabase Realtime enforces PostgreSQL Row Level Security (RLS) for every
--   authenticated subscriber. Unauthorized or anonymous clients cannot receive
--   private ride, location, or notification events.
-- ============================================================================

alter table public.rides replica identity full;
alter table public.ride_locations replica identity full;
alter table public.ride_status_history replica identity full;
alter table public.notifications replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.rides;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.ride_locations;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.ride_status_history;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object then null;
  end;
end;
$$;
