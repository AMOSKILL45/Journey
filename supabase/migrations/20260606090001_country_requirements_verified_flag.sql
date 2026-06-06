-- Phase 4D KB hardening: `verified` display gate on country_requirements.
-- Rows are only surfaced to users (smart_reminders_cron) when verified = true.
-- AI/draft inserts use verified = false (the default); a human flips to true after
-- official-source verification.
-- See docs/superpowers/specs/2026-06-06-journey-kb-reminders-pilot-design.md (ADR-1).
ALTER TABLE public.country_requirements
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

-- Backfill the existing curated launch set as approved-for-display.
-- Ordering guarantee: this migration (…090001) runs before any verified=false seed
-- (…090002+), so this only ever touches the pre-existing curated rows.
UPDATE public.country_requirements SET verified = true WHERE verified = false;
