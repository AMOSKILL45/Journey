-- Phase 5A: presence shared by default, precise GPS opt-in. Panic toggle.
ALTER TABLE public.trip_members ALTER COLUMN location_sharing SET DEFAULT 'paused';
ALTER TABLE public.trip_members ADD COLUMN IF NOT EXISTS panic_until timestamptz;
