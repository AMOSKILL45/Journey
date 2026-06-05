-- Phase 9C — profiles PII hardening + safe-subset RPCs (ADR-007).
-- Mirrors what was applied to ewsoupkfkachxidmuwoi via MCP (migration phase_9c_profiles_hardening).
-- BEFORE: `profiles` SELECT was `true` — every authenticated user could read every column of
-- every profile (phone, passport, legal name, stripe session). AFTER: the base table is readable
-- only by its owner; all cross-user reads go through column-limited SECURITY DEFINER RPCs.
-- Verified via synthetic RLS simulation: a stranger sees 0 profile rows.

drop policy "Profiles are viewable by everyone (limited fields)" on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);

-- Co-member display: safe fields for members of a trip the caller belongs to.
create or replace function public.get_trip_member_profiles(p_trip_id uuid)
returns table (id uuid, display_name text, avatar_sprite_id text, avatar_color text)
language plpgsql security definer set search_path = public as $$
begin
  if not is_trip_member(p_trip_id, auth.uid()) then raise exception 'not a member'; end if;
  return query
    select p.id, p.display_name, p.avatar_sprite_id, p.avatar_color
    from public.profiles p
    join public.trip_members tm on tm.user_id = p.id
    where tm.trip_id = p_trip_id;
end; $$;

-- Public profile: safe subset, only when the target opted public; gender/age only per the
-- user's own gender_visible_in_public / show_age_in_public flags.
create or replace function public.get_public_profile(p_user_id uuid)
returns table (id uuid, username text, display_name text, avatar_sprite_id text,
               avatar_color text, bio text, countries_visited text[], badges jsonb,
               is_verified boolean, verification_level int, gender text, age_range text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar_sprite_id, p.avatar_color, p.bio,
         p.countries_visited, p.badges, p.is_verified, p.verification_level,
         case when p.gender_visible_in_public then p.gender end,
         case when p.show_age_in_public then p.age_range end
  from public.profiles p
  where p.id = p_user_id and p.visibility = 'public';
$$;

-- Grant hardening (revoke implicit PUBLIC execute; grant authenticated only).
revoke execute on function public.get_trip_member_profiles(uuid) from public, anon;
grant execute on function public.get_trip_member_profiles(uuid) to authenticated;
revoke execute on function public.get_public_profile(uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;
