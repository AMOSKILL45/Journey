# Phase 9 — Social Foundation — Design

> **Date**: 2026-06-05 · **Status**: approved (brainstorming) · **Codename**: `journey`
> v1.0 "schema in place, minimal UI" social foundation (spec §2.1 #32–35, §10, timeline §12.1).
> Single source of truth for Phase 9. Spec → Plan → ADR → UI → Workflow build → audits.

## 1. Overview

Phase 9 lays the **social foundation**: opt-in public visibility for trips and profiles, a
read-only public trip view reached by deep link, and the (UI-less) v1.1 schema for
discovery/join/reports/blocks. It is the **most security-sensitive phase so far** — it
intentionally opens private data to public read — so the governing rule is **private by
default, public is a strict, scoped, opt-in**.

Key facts discovered up front (shape the scope):

- **The social columns already exist.** `trips` already has `visibility`, `max_joiners`,
  `open_to_genders`, `joiner_note`, … and `profiles` already has `visibility`, `bio`,
  `countries_visited`, `badges`, `is_verified`, `reputation_score`, … (Phase 1 data model).
- **`trips` SELECT RLS already allows public read** — the policy already includes
  `visibility = ANY('unlisted','public_view','open_to_join')`. So 9A's trip-level read is
  done; what's missing is making the **path (milestones)** readable for a public trip.
- **`profiles` SELECT is `true`** — a pre-existing **PII leak**: every authenticated user
  can read every column of every profile (phone, passport, legal name,
  `stripe_identity_session_id`, …). The policy name says "limited fields" but RLS is
  row-level and does not filter columns. **Phase 9 fixes this** (9C) — it is the security
  foundation, and "public profile opt-in" is meaningless until it's fixed.

### 1.1 Decomposition (4 sub-modules under one spec)

| Sub    | What                                                           | New DB                                                                 | Reuses                                            |
| ------ | -------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------- |
| **9A** | Trip visibility — path public-read RLS + visibility control UI | `milestones` public SELECT policy                                      | trips RLS (already public), trip detail           |
| **9B** | Public trip view (read-only) via deep link                     | —                                                                      | `share_token`, deep-link handler, PathView        |
| **9C** | Public profile + **profiles PII hardening**                    | profiles SELECT tighten + 3 RPCs                                       | 8C SECURITY-DEFINER-RPC pattern, profile/settings |
| **9D** | v1.1 schema (empty tables + RLS, no UI)                        | `trip_join_requests`, `reports`, `user_blocks`, `trip_discovery_index` | —                                                 |

Build order: **9D (schema) → 9A → 9C (security core) → 9B**. The security-critical RLS
(9A/9C) is applied + advisor-verified by the orchestrator before client work.

### 1.2 Public-link rendering decision (accepted)

The public trip link is a **deep link into the app** (`journey://t/{token}`, reusing the
existing `share_token` + deep-link infra) opening a read-only view; App Store fallback if
not installed. The viewer must be a signed-in app user (the app is auth-gated). A true
**anonymous web page** (server-rendered HTML at a domain) is **v1.1** when discovery
launches. This keeps Phase 9 **100% OTA** (existing custom scheme; universal `https://`
links + `apple-app-site-association` are a v1.1 native enhancement).

## 2. Security model (the core of this phase)

1. **Private by default.** A trip is readable publicly only when its owner sets
   `visibility <> 'private'`. A profile's extended fields are public only when its owner
   sets `visibility = 'public'`.
2. **Safe subset only.** Public reads never expose PII. Public trip view = trip basics +
   milestones path **only** (no documents, checklists, time capsules, check-ins, realtime
   locations, member list, or member PII). Public profile = display_name, avatar,
   bio, countries_visited, badges, verification — **never** phone, passport, legal name,
   stripe/identity, and gender/age only if the user opted in
   (`gender_visible_in_public` / `show_age_in_public`).
3. **Child tables gated individually.** Making a trip public adds a public SELECT policy
   **only** to `milestones`. Every other child table keeps its members-only RLS untouched.
4. **Column-limiting via RPC, not row policy.** Because RLS cannot mask columns, the safe
   subset is served by `SECURITY DEFINER` RPCs (the proven 8C pattern), grant-hardened
   (revoke from `PUBLIC`, grant `authenticated`).

## 3. 9A — Trip visibility

### 3.1 RLS

`trips` SELECT already permits public read. Add **one** policy so the path renders:

```sql
create policy milestones_public_select on public.milestones for select
  using (exists (select 1 from public.trips t
                 where t.id = milestones.trip_id and t.visibility <> 'private'));
```

This is OR'd with the existing members-only policy — members still read their private
trips; anyone reads a non-private trip's milestones. No other table changes in 9A.

### 3.2 Control UI

A visibility selector on the trip (owner/editor only): **Private · Unlisted · Public view**
(`open_to_join` shown disabled = v1.1). Plus a **Copy public link** action
(`buildPublicTripLink(share_token)`), shown only when `visibility <> 'private'`. A short
explainer ("anyone with the link can view your path — no docs, checklists, or locations").

## 4. 9B — Public trip view

A read-only screen reached via `journey://t/{token}` (the trip's `share_token`).

- **Route** `src/app/(public)/trip/[token].tsx`; the deep-link handler routes the scheme to
  it. `fetchPublicTrip(token)` reads the trip by `share_token` (RLS lets it through when
  `visibility <> 'private'`) + its milestones (the 9A policy).
- **Shows**: name, dates, destination, cover, and the **milestones path** (reuse `PathView`
  in a read-only mode — no check-in, no FAB, no edit). A "view-only" badge and an
  **Ask to join** button that is a disabled placeholder (v1.1).
- **Never shows**: member list, documents, checklists, capsules, check-ins, locations.
- **Owner attribution** (optional): the owner's public display name via `get_public_profile`
  **only if** the owner opted public; otherwise anonymous ("A traveler").
- Not-found / private → a friendly "this trip isn't public" empty state.

## 5. 9C — Public profile + profiles PII hardening

### 5.1 Fix the PII leak

```sql
drop policy "Profiles are viewable by everyone (limited fields)" on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);
```

Now the base table exposes a full row **only to its owner**. All cross-user reads go
through column-limited RPCs below. (The 3 existing own-profile reads — `profile/api`,
`passport/api` — are unaffected; they read `where id = auth.uid()`.)

### 5.2 Safe-subset RPCs (SECURITY DEFINER, grant-hardened)

```sql
-- Co-member display: safe fields for every member of a trip the caller belongs to.
create function public.get_trip_member_profiles(p_trip_id uuid)
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

-- Public profile screen: safe subset, only if the target opted public.
create function public.get_public_profile(p_user_id uuid)
returns table (id uuid, username text, display_name text, avatar_sprite_id text,
               avatar_color text, bio text, countries_visited text[], badges jsonb,
               is_verified boolean, verification_level int,
               gender text, age_range text)
language sql stable security definer set search_path = public as $$
  select p.id, p.username, p.display_name, p.avatar_sprite_id, p.avatar_color, p.bio,
         p.countries_visited, p.badges, p.is_verified, p.verification_level,
         case when p.gender_visible_in_public then p.gender end,
         case when p.show_age_in_public then p.age_range end
  from public.profiles p
  where p.id = p_user_id and p.visibility = 'public';
$$;
```

`revoke execute … from public`; `grant execute … to authenticated` for both; the function
bodies derive `auth.uid()` / gate on membership / gate on `visibility='public'`.

### 5.3 Repoint the one cross-user read

`src/features/trips/api/members.ts` `listMembers` currently nests
`profile:profiles(display_name, avatar_sprite_id, avatar_color)` — which breaks under
own-only RLS. Switch it: read `trip_members` rows, then merge safe profiles from
`get_trip_member_profiles(trip_id)` (keeps `TripMemberWithProfile` shape). Update its test.

### 5.4 UI

- **Public profile screen** (`get_public_profile`): sprite, display name, bio, countries
  grid, badges, verified tick. "This profile is private" empty state when not public.
- **Settings toggle** "Make my profile public" (writes `profiles.visibility`), private by
  default, with a one-line note on what becomes visible. Optional sub-toggles for
  gender/age (`gender_visible_in_public` / `show_age_in_public`).

## 6. 9D — v1.1 social schema (empty tables + RLS, no UI)

Create the foundation tables per the spec data model, with RLS (§ spec 7.x), **no client
code** — v1.1 builds on them. Grant-hardened.

- `trip_join_requests` — INSERT by requester (`requester_id = auth.uid()`); SELECT by
  requester or the target trip's owner; UPDATE by the target trip's owner.
- `reports` — INSERT by any authenticated user (`reporter_id = auth.uid()`); SELECT self
  only (admin tooling is out of scope / dashboard).
- `user_blocks` (PK `(blocker_id, blocked_id)`) — INSERT/SELECT/DELETE self
  (`blocker_id = auth.uid()`).
- `trip_discovery_index` (`trip_id` PK, `geo_bbox`, `date_range`, `countries`) — SELECT for
  trips with `visibility IN ('public_view','open_to_join')`; writes service-role only.

`trip_member_reviews` is **v1.2** (spec §2.4) — out of scope.

## 7. Cross-cutting

- **Migrations** (Supabase MCP, grant-hardened from `PUBLIC`, types regen): `milestones`
  public SELECT policy; `profiles` SELECT tighten + `get_trip_member_profiles` +
  `get_public_profile`; the 4 empty tables + RLS. Advisor-verified baseline-clean.
- **Deep link**: `(public)/trip/[token]` route + handler wiring + `buildPublicTripLink`.
- **Client**: visibility control (`@features/trips`), public trip view (`@features/trips` or
  a small `@features/public-view`), public profile screen + settings toggle
  (`@features/profile`), `members.ts` repoint.
- **i18n** `social.*` (en + fr).
- **Native deps**: **none** — OTA (existing scheme).

## 8. Build sequencing (for the workflow)

1. **Orchestrator (MCP first)**: apply 9D tables, 9A milestones policy, 9C profiles tighten
   - RPCs (grant-hardened); regen types; `get_advisors` baseline-clean.
2. **Workflow parallel client**: 9A control UI · 9B public view · 9C public-profile UI +
   `members.ts` repoint (these touch some shared files — seed/integrate phases as in Phase 8
   to avoid contention). 9D has no client code.
3. **Integrate + harden inline**: wire routes/settings; contract tests; code-validator;
   advisors; **security review (the priority)** on the PII hardening + public-read scoping.

## 9. Out of scope (YAGNI)

- Discovery feed, 7-step publish flow, join request UI, match score (all v1.1).
- Reports/blocks UI, T&S workflow (v1.1).
- `trip_member_reviews` (v1.2).
- Anonymous web page / universal links (v1.1 native).
- Public photos in the public trip view (v1.1 — keep v1.0 to trip + path).

## 10. Testing & verification

- RLS tests (synthetic SQL): a private trip's milestones unreadable publicly; a non-private
  trip's milestones readable; `profiles` base returns only own row;
  `get_public_profile` empty unless `visibility='public'`; `get_trip_member_profiles`
  refuses non-members.
- Contract tests: RPCs present in generated types; the 4 new tables present; `social.*`
  i18n keys; the deep-link route/scheme.
- `code-validator` (typecheck + lint + full suite); `get_advisors` baseline-clean;
  `/auditing-runtime-contracts`; **`/security-review`** focused on the PII hardening.
- Device verification (EAS build) for the deep-link open + public view; backends live.

## 11. Pipeline after this spec

spec → `writing-plans` → `/architecture` (ADR: profiles column-security via RPC vs view;
public-read child-table scoping; deep-link public-view model) → `/ui-ux-pro-max` (visibility
control, public trip view, public profile, settings toggle) → **Workflow** build →
`/auditing-runtime-contracts` + `code-validator` + `/security-review`.
