-- Migration: PII columns on profiles for manual identity data entry
-- Phase 1.5 follow-up — since we can't auto-extract from Stripe Identity
-- (restricted key without "All Detailed Verification Results" scope to skip
-- IP whitelist), users fill these themselves in the OnboardingScreen and the
-- Settings form. Legal first/last name match the passport (distinct from
-- display_name which can be a pseudonym). Phone for contact + WhatsApp link.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS phone_number text;

COMMENT ON COLUMN public.profiles.first_name IS
  'Legal first name as on passport. Manual entry, distinct from display_name (pseudonym).';
COMMENT ON COLUMN public.profiles.last_name IS
  'Legal last name as on passport. Manual entry, distinct from display_name (pseudonym).';
COMMENT ON COLUMN public.profiles.phone_number IS
  'E.164 phone number (e.g. +33612345678). Used for trip contact + future WhatsApp link.';
