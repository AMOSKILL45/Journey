-- Migration: profiles + RLS + triggers
-- Created 2026-05-25 for Phase 1 (Auth + Trips foundation)

-- Extension: profiles tied 1:1 to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  avatar_sprite_id text DEFAULT 'avatars/adventurer_1',
  avatar_color text DEFAULT '#E63946',
  bio text,
  passport_country text, -- ISO 3166-1 alpha-2
  passport_expires_at date,
  gender text, -- 'woman' | 'man' | 'non_binary' | 'prefer_not_to_say'
  gender_visible_in_public boolean DEFAULT false,
  age_range text,
  show_age_in_public boolean DEFAULT false,
  countries_visited text[] DEFAULT ARRAY[]::text[],
  travel_style text[] DEFAULT ARRAY[]::text[],
  languages text[] DEFAULT ARRAY[]::text[],
  socials jsonb DEFAULT '{}'::jsonb,
  visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'friends_only', 'discoverable')),
  is_verified boolean DEFAULT false,
  verification_level int DEFAULT 0 CHECK (verification_level BETWEEN 0 AND 3),
  reputation_score int DEFAULT 0,
  passport_stamps jsonb DEFAULT '[]'::jsonb,
  badges jsonb DEFAULT '[]'::jsonb,
  smart_reminders_enabled boolean DEFAULT true,
  reminder_categories_muted text[] DEFAULT ARRAY[]::text[],
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_visibility ON public.profiles(visibility);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone (limited fields)"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup via trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at trigger helper (reused by trips later)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
