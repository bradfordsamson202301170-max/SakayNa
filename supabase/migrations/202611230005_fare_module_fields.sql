-- ============================================================================
-- MotoGo Migration 0005: Batch 10 Fare Calculation Module Fields
-- ============================================================================
-- Adds waiting_fee and cancellation_fee to fare_settings, plus immutable
-- fare_breakdown JSONB and fee snapshots on rides so historical fares
-- never change when global fare settings are updated.
-- ============================================================================

alter table public.fare_settings
  add column if not exists waiting_fee numeric(10, 2) not null default 5.00
    constraint fare_settings_waiting_fee_check check (waiting_fee >= 0),
  add column if not exists cancellation_fee numeric(10, 2) not null default 20.00
    constraint fare_settings_cancellation_fee_check check (cancellation_fee >= 0);

alter table public.rides
  add column if not exists snapshot_waiting_fee numeric(10, 2) not null default 0.00
    constraint rides_snapshot_waiting_fee_check check (snapshot_waiting_fee >= 0),
  add column if not exists snapshot_cancellation_fee numeric(10, 2) not null default 0.00
    constraint rides_snapshot_cancellation_fee_check check (snapshot_cancellation_fee >= 0),
  add column if not exists fare_breakdown jsonb not null default '{}'::jsonb;
