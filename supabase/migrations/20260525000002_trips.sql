-- Migration: trips + trip_members + trip_invitations + RLS + triggers
-- Created 2026-05-25 for Phase 1 (Auth + Trips foundation)

CREATE TABLE IF NOT EXISTS public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_date date,
  end_date date,
  destination_country text,
  destination_countries text[] DEFAULT ARRAY[]::text[],
  world_theme text DEFAULT 'auto' CHECK (world_theme IN ('auto','generic','desert','forest','sakura','tropical','polar')),
  cover_image_url text,
  status text DEFAULT 'planning' CHECK (status IN ('planning','in_progress','completed','archived')),
  share_token text UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  visibility text DEFAULT 'private' CHECK (visibility IN ('private','unlisted','public_view','open_to_join')),
  max_joiners int DEFAULT 1,
  current_joiners_count int DEFAULT 0,
  open_to_genders text[] DEFAULT ARRAY['woman','man','non_binary']::text[],
  open_age_min int,
  open_age_max int,
  open_vibes text[],
  open_budget_level text,
  open_languages text[],
  joiner_note text,
  joinable_segments jsonb DEFAULT '[]'::jsonb,
  requires_verified_joiners boolean DEFAULT false,
  is_women_only boolean GENERATED ALWAYS AS (open_to_genders = ARRAY['woman']::text[]) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CHECK (open_age_min IS NULL OR open_age_min >= 18)
);

CREATE INDEX IF NOT EXISTS idx_trips_owner ON public.trips(owner_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON public.trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_visibility ON public.trips(visibility);
CREATE INDEX IF NOT EXISTS idx_trips_dates ON public.trips(start_date, end_date);

CREATE TABLE IF NOT EXISTS public.trip_members (
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner','editor','viewer')),
  location_sharing text DEFAULT 'precise' CHECK (location_sharing IN ('precise','city_only','paused','never')),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_trip_members_user ON public.trip_members(user_id);

CREATE TABLE IF NOT EXISTS public.trip_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  email text,
  invited_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role text DEFAULT 'editor' CHECK (role IN ('editor','viewer')),
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at timestamptz NOT NULL DEFAULT (now() + INTERVAL '14 days'),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.trip_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_trip ON public.trip_invitations(trip_id);

-- updated_at trigger
DROP TRIGGER IF EXISTS trips_updated_at ON public.trips;
CREATE TRIGGER trips_updated_at BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-add owner as a member on trip creation
CREATE OR REPLACE FUNCTION public.handle_new_trip()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.trip_members (trip_id, user_id, role)
  VALUES (new.id, new.owner_id, 'owner');
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_trip_created ON public.trips;
CREATE TRIGGER on_trip_created
  AFTER INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_trip();

-- RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_invitations ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS (SECURITY DEFINER to bypass recursion)
CREATE OR REPLACE FUNCTION public.is_trip_member(trip uuid, uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip AND user_id = uid);
$$;

CREATE OR REPLACE FUNCTION public.is_trip_editor(trip uuid, uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.trip_members WHERE trip_id = trip AND user_id = uid AND role IN ('owner','editor'));
$$;

-- trips policies
CREATE POLICY "Members can SELECT their trips"
  ON public.trips FOR SELECT USING (
    auth.uid() = owner_id OR public.is_trip_member(id, auth.uid())
    OR visibility IN ('unlisted','public_view','open_to_join')
  );

CREATE POLICY "Authenticated users can INSERT trips they own"
  ON public.trips FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Editors can UPDATE trip"
  ON public.trips FOR UPDATE USING (public.is_trip_editor(id, auth.uid()));

CREATE POLICY "Owner can DELETE trip"
  ON public.trips FOR DELETE USING (auth.uid() = owner_id);

-- trip_members policies
CREATE POLICY "Members can SELECT trip_members for their trips"
  ON public.trip_members FOR SELECT USING (
    public.is_trip_member(trip_id, auth.uid())
  );

CREATE POLICY "Owner can INSERT trip_members; or self via invitation"
  ON public.trip_members FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND owner_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Members can UPDATE own membership"
  ON public.trip_members FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Owner can DELETE members; users can leave"
  ON public.trip_members FOR DELETE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND owner_id = auth.uid())
  );

-- trip_invitations policies
CREATE POLICY "Editors can manage invitations for their trips"
  ON public.trip_invitations FOR ALL USING (
    public.is_trip_editor(trip_id, auth.uid())
  );

CREATE POLICY "Anyone authenticated can SELECT an invitation by token"
  ON public.trip_invitations FOR SELECT USING (true);
