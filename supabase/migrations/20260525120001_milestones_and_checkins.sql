-- Migration: milestones + checkins + PostGIS + RLS
-- Phase 2 Task 1 — applied 2026-05-25

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS public.milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  order_index decimal NOT NULL,
  type text NOT NULL CHECK (type IN ('city','hotel','activity','transport','food','landmark','custom')),
  custom_type_label text,
  name text NOT NULL,
  description text,
  location geography(Point, 4326),
  address text,
  arrival_at timestamptz,
  departure_at timestamptz,
  is_boss boolean DEFAULT false,
  sprite_id text,
  color text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_by uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (arrival_at IS NULL OR departure_at IS NULL OR departure_at >= arrival_at)
);

CREATE INDEX IF NOT EXISTS idx_milestones_trip_order ON public.milestones(trip_id, order_index);
CREATE INDEX IF NOT EXISTS idx_milestones_location ON public.milestones USING GIST (location);

DROP TRIGGER IF EXISTS milestones_updated_at ON public.milestones;
CREATE TRIGGER milestones_updated_at BEFORE UPDATE ON public.milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can SELECT milestones for their trips"
  ON public.milestones FOR SELECT USING (public.is_trip_member(trip_id, auth.uid()));
CREATE POLICY "Editors can INSERT milestones"
  ON public.milestones FOR INSERT WITH CHECK (
    public.is_trip_editor(trip_id, auth.uid()) AND created_by = auth.uid()
  );
CREATE POLICY "Editors can UPDATE milestones"
  ON public.milestones FOR UPDATE USING (public.is_trip_editor(trip_id, auth.uid()));
CREATE POLICY "Editors can DELETE milestones"
  ON public.milestones FOR DELETE USING (public.is_trip_editor(trip_id, auth.uid()));

CREATE TABLE IF NOT EXISTS public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_id uuid NOT NULL REFERENCES public.milestones(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checked_in_at timestamptz DEFAULT now(),
  location_actual geography(Point, 4326),
  note text,
  UNIQUE (milestone_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_checkins_milestone ON public.checkins(milestone_id);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.checkins(user_id);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can SELECT checkins for their trips"
  ON public.checkins FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.milestones m
      WHERE m.id = milestone_id AND public.is_trip_member(m.trip_id, auth.uid())
    )
  );
CREATE POLICY "Users can INSERT own checkins for trip milestones"
  ON public.checkins FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.milestones m
      WHERE m.id = milestone_id AND public.is_trip_member(m.trip_id, auth.uid())
    )
  );
CREATE POLICY "Users can DELETE own checkins"
  ON public.checkins FOR DELETE USING (user_id = auth.uid());
