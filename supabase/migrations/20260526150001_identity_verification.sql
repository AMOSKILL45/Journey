-- Migration: Stripe Identity verification tracking on profiles
-- Phase 1.5 — gate trip creation behind Stripe Identity verification.
-- Reuses existing profiles.is_verified (boolean) + profiles.verification_level (0-3).
-- Adds two tracking columns:
--   stripe_identity_session_id : last VerificationSession id (for re-query / debug / dedupe)
--   identity_verified_at       : timestamp the session reached `verified`
-- Webhook (stripe-identity-webhook) flips is_verified=true + verification_level=3
-- via service-role; no client-side write path is granted.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_identity_session_id text,
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_identity_session_id
  ON public.profiles(stripe_identity_session_id)
  WHERE stripe_identity_session_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.stripe_identity_session_id IS
  'Last Stripe Identity VerificationSession id created for this profile. Null until first attempt.';
COMMENT ON COLUMN public.profiles.identity_verified_at IS
  'Timestamp when Stripe Identity webhook delivered verification_session.verified. Null until verified.';
