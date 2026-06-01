-- Phase 5B: 60s GPS backup so an offline member still shows a last-known dot.
ALTER TABLE public.trip_members
  ADD COLUMN IF NOT EXISTS last_lat numeric,
  ADD COLUMN IF NOT EXISTS last_lng numeric,
  ADD COLUMN IF NOT EXISTS last_position_at timestamptz;
