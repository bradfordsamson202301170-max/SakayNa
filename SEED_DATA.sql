-- ============================================================================
-- MotoGo — Baseline Seed Configuration (SEED_DATA.sql)
-- ============================================================================
-- IMPORTANT:
--   This file intentionally contains ZERO fabricated production users,
--   drivers, vehicles, rides, or payments.
--   It seeds ONLY the required initial active Fare Configuration so the
--   MotoGo Fare Engine has valid default pricing rules out of the box.
-- ============================================================================

insert into public.fare_settings (
  name,
  currency,
  base_fare,
  per_km_rate,
  per_min_rate,
  minimum_fare,
  commission_rate,
  is_active
)
select
  'Standard MotoGo Fare',
  'PHP',
  30.00,
  8.00,
  0.80,
  45.00,
  0.1500,
  true
where not exists (
  select 1 from public.fare_settings where is_active = true
);

-- ============================================================================
-- Admin Promotion Helper (Manual — Run Only for Your Real Admin Account)
-- ============================================================================
-- After creating your real admin user via Supabase Auth Dashboard or Sign Up,
-- run the statement below in the Supabase SQL Editor with your real email:
--
--   update public.profiles
--   set role = 'admin', account_status = 'active'
--   where lower(email) = lower('your-real-admin-email@example.com');
-- ============================================================================
