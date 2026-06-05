# Phase 9 — Social Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the v1.0 social foundation — opt-in trip/profile public visibility, a read-only public trip view via deep link, and the empty v1.1 social schema — while fixing the pre-existing `profiles` PII leak.

**Architecture:** Four sub-modules (9A–9D) under one spec. Security-critical RLS/RPCs (9D tables, 9A milestones policy, 9C profiles tighten + safe-subset RPCs) are applied FIRST by the orchestrator via the Journey Supabase MCP (`472a285c…`, project `ewsoupkfkachxidmuwoi`), grant-hardened from `PUBLIC`, advisor-verified; then client modules build. 100% OTA (existing `journey://` scheme).

**Tech Stack:** Expo SDK 54 + TS strict · Supabase (Postgres + RLS + SECURITY DEFINER RPCs) · TanStack Query v5 · Jest + RNTL · i18n-js · Expo Router v4.

**Spec:** `docs/superpowers/specs/2026-06-05-journey-phase-9-social-foundation-design.md`

---

## File Structure

**Part 0 — Backend (orchestrator, Journey MCP)**

- 9D: `trip_join_requests`, `reports`, `user_blocks`, `trip_discovery_index` tables + RLS
- 9A: `milestones` public SELECT policy
- 9C: drop `profiles` SELECT=true → own-only; `get_trip_member_profiles` + `get_public_profile` RPCs (grant-hardened)
- Mirror migration files to `supabase/migrations/`; regen `src/core/supabase/types.ts`

**9A — Visibility control** (client)

- Create: `src/features/trips/components/VisibilityControl.tsx`, `src/features/trips/utils/publicLink.ts`
- Modify: `src/features/trips/api/trips.ts` (set visibility), `src/features/trips/screens/TripDetailScreen.tsx` (mount control)
- Test: `src/features/trips/__tests__/publicLink.test.ts`, `.../VisibilityControl.test.tsx`

**9B — Public trip view** (client)

- Create: `src/app/(public)/trip/[token].tsx`, `src/features/trips/api/publicTrip.ts`, `src/features/trips/screens/PublicTripScreen.tsx`
- Modify: the deep-link handler (mirror `src/app/invite/[token].tsx`)
- Test: `src/features/trips/__tests__/publicTrip.test.ts`

**9C — Public profile + PII repoint** (client)

- Modify: `src/features/trips/api/members.ts` (repoint to `get_trip_member_profiles`)
- Create: `src/features/profile/api/publicProfile.ts`, `src/features/profile/screens/PublicProfileScreen.tsx`, `src/features/profile/components/ProfileVisibilityToggle.tsx`, `src/app/(modals)/profile/[id].tsx`
- Modify: `src/features/profile/screens/` settings entry
- Test: `src/features/trips/__tests__/members.test.ts` (update), `src/features/profile/__tests__/publicProfile.test.ts`

**Cross-cutting**

- i18n: `social.*` in `en.json` + `fr.json`
- Test: `src/__tests__/runtime-contracts.test.ts` (extend with the new RPCs/tables/route)

---

## Part 0 — Backend foundation (orchestrator, Journey MCP — do FIRST)

Apply via `mcp__472a285c…__apply_migration`, then `generate_typescript_types`, then
`get_advisors(security)` — confirm only the documented intentional WARNs + baseline. Each
function is grant-hardened by **revoking from `PUBLIC`** (the 6A/8C lesson) and granting
`authenticated` only where it is a real RPC.

- [ ] **Step 1: 9D — empty v1.1 social tables** (migration `phase_9d_social_schema`)

```sql
create table public.trip_join_requests (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  message text, proposed_segment_start date, proposed_segment_end date,
  proposed_milestones uuid[], status text not null default 'pending',
  responded_at timestamptz, responded_by uuid references auth.users(id),
  response_message text, contact_exchanged_at timestamptz,
  match_score int, expires_at timestamptz, created_at timestamptz not null default now()
);
alter table public.trip_join_requests enable row level security;
create policy jr_insert on public.trip_join_requests for insert
  with check (requester_id = auth.uid());
create policy jr_select on public.trip_join_requests for select
  using (requester_id = auth.uid()
         or exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));
create policy jr_update on public.trip_join_requests for update
  using (exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid()));

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null, target_id uuid not null, reason text not null,
  details text, status text not null default 'pending',
  resolved_at timestamptz, resolved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy reports_insert on public.reports for insert with check (reporter_id = auth.uid());
create policy reports_select on public.reports for select using (reporter_id = auth.uid());

create table public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  reason text, created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.user_blocks enable row level security;
create policy blocks_all on public.user_blocks for all
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

create table public.trip_discovery_index (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  geo_bbox geography(Polygon, 4326), date_range tstzrange, countries text[]
);
alter table public.trip_discovery_index enable row level security;
create policy discovery_select on public.trip_discovery_index for select
  using (exists (select 1 from public.trips t where t.id = trip_id
                 and t.visibility = any(array['public_view','open_to_join'])));
-- writes are service-role only (no client INSERT/UPDATE policy).
```

- [ ] **Step 2: 9A — milestones public-read policy** (migration `phase_9a_milestones_public`)

```sql
create policy milestones_public_select on public.milestones for select
  using (exists (select 1 from public.trips t
                 where t.id = milestones.trip_id and t.visibility <> 'private'));
```

- [ ] **Step 3: 9C — profiles PII hardening** (migration `phase_9c_profiles_hardening`)

```sql
drop policy "Profiles are viewable by everyone (limited fields)" on public.profiles;
create policy profiles_select_own on public.profiles for select using (auth.uid() = id);

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

create function public.get_public_profile(p_user_id uuid)
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

revoke execute on function public.get_trip_member_profiles(uuid) from public, anon;
grant execute on function public.get_trip_member_profiles(uuid) to authenticated;
revoke execute on function public.get_public_profile(uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;
```

- [ ] **Step 4: Regen types + advisors + verify**

`generate_typescript_types` → write `src/core/supabase/types.ts`. `get_advisors(security)` → baseline-clean (the 2 new RPCs as intentional authenticated WARNs). Synthetic SQL: confirm `select * from profiles where id <> auth.uid()` returns 0 rows (simulate via `set local request.jwt.claims`), and a non-private trip's milestones are readable.

- [ ] **Step 5: Mirror migration files + commit**

Write the 3 migrations to `supabase/migrations/20260605_9{d,a,c}_*.sql`; commit with `src/core/supabase/types.ts`.

```bash
git add supabase/migrations/20260605_9*.sql src/core/supabase/types.ts
git commit -m "feat(phase-9): backend — social schema + milestones public-read + profiles PII hardening [9A/9C/9D]"
```

---

## 9A — Visibility control (client)

### Task 9A.1: publicLink util

**Files:** Create `src/features/trips/utils/publicLink.ts`; Test `src/features/trips/__tests__/publicLink.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { buildPublicTripLink } from '@features/trips/utils/publicLink';

it('builds a journey:// deep link from a share token', () => {
  expect(buildPublicTripLink('abc123')).toBe('journey://t/abc123');
});
```

- [ ] **Step 2: Run → FAIL** — `npm test -- publicLink`

- [ ] **Step 3: Implement** (mirror the scheme used by `src/features/trips/api/members.ts` `buildInvitationLink` — read it for the exact scheme constant)

```ts
const SCHEME = 'journey';
export function buildPublicTripLink(shareToken: string): string {
  return `${SCHEME}://t/${shareToken}`;
}
```

- [ ] **Step 4: Run → PASS** — `npm test -- publicLink`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-9): public trip link builder [9A]"`

### Task 9A.2: setVisibility api + VisibilityControl + wire

**Files:** Modify `src/features/trips/api/trips.ts`; Create `src/features/trips/components/VisibilityControl.tsx`; Modify `src/features/trips/screens/TripDetailScreen.tsx`; Test `src/features/trips/__tests__/VisibilityControl.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { VisibilityControl } from '@features/trips/components/VisibilityControl';

it('shows the copy-link action only when not private', () => {
  const onChange = jest.fn();
  const priv = render(
    <VisibilityControl visibility="private" shareToken="t1" onChange={onChange} />,
  );
  expect(priv.queryByLabelText('social.visibility.copyLink')).toBeNull();
  const pub = render(
    <VisibilityControl visibility="public_view" shareToken="t1" onChange={onChange} />,
  );
  expect(pub.getByLabelText('social.visibility.copyLink')).toBeTruthy();
});
```

- [ ] **Step 2: Run → FAIL** — `npm test -- VisibilityControl`

- [ ] **Step 3: Implement** — `setTripVisibility(tripId, visibility)` in `trips.ts` (`update({ visibility })`). `VisibilityControl` props `{ visibility, shareToken, onChange }`: segmented Private/Unlisted/Public view (`open_to_join` disabled), and a Copy-link button (`Clipboard.setStringAsync(buildPublicTripLink(shareToken))`, `accessibilityLabel="social.visibility.copyLink"`) shown only when `visibility !== 'private'`. i18n `social.visibility.*` (seeded). Mount in `TripDetailScreen` for owner/editor.

- [ ] **Step 4: Run → PASS + typecheck** — `npm test -- VisibilityControl && npm run typecheck`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-9): trip visibility control + copy link [9A]"`

---

## 9B — Public trip view (client)

### Task 9B.1: publicTrip api

**Files:** Create `src/features/trips/api/publicTrip.ts`; Test `src/features/trips/__tests__/publicTrip.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { fetchPublicTripByToken } from '@features/trips/api/publicTrip';
import { supabase } from '@core/supabase/client';

jest.mock('@core/supabase/client');

it('fetches a trip by share token (RLS gates non-private)', async () => {
  const single = jest.fn().mockResolvedValue({ data: { id: 't1', name: 'Roadtrip' }, error: null });
  const eq = jest.fn(() => ({ maybeSingle: single }));
  const select = jest.fn(() => ({ eq }));
  (supabase.from as jest.Mock).mockReturnValue({ select });
  const trip = await fetchPublicTripByToken('abc');
  expect(supabase.from).toHaveBeenCalledWith('trips');
  expect(eq).toHaveBeenCalledWith('share_token', 'abc');
  expect(trip?.name).toBe('Roadtrip');
});
```

- [ ] **Step 2: Run → FAIL** — `npm test -- publicTrip`

- [ ] **Step 3: Implement** — `fetchPublicTripByToken(token)` selects from `trips` by `share_token` `.maybeSingle()` (RLS returns it only when `visibility <> 'private'`); `fetchPublicMilestones(tripId)` selects from `milestones` (the 9A policy). Return null when not found/private.

- [ ] **Step 4: Run → PASS** — `npm test -- publicTrip`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-9): public trip read api [9B]"`

### Task 9B.2: PublicTripScreen + route

**Files:** Create `src/features/trips/screens/PublicTripScreen.tsx`, `src/app/(public)/trip/[token].tsx`; Modify the deep-link handler (mirror `src/app/invite/[token].tsx`)

- [ ] **Step 1: Implement screen** — read-only: trip name/dates/destination/cover + `PathView` in a read-only mode (no FAB, no check-in — pass a `readOnly` prop or render nodes without the check-in handler). "view-only" badge + disabled "Ask to join" (`social.public.askToJoin`). Owner attribution via `get_public_profile(owner_id)` → display name or `social.public.anonymous`. Empty state `social.public.notPublic` when null.

- [ ] **Step 2: Add the route** `src/app/(public)/trip/[token].tsx` renders `<PublicTripScreen token={token} />` from the route param. Ensure the deep-link handler maps `journey://t/:token` to this route (mirror the invite route registration). The `(public)` group must not be behind the auth gate redirect loop — read `src/app/invite/[token].tsx` for how it handles an authed viewer.

- [ ] **Step 3: Verify** — `npm test -- publicTrip && npm run typecheck` (screen smoke via RNTL if a test is added).

- [ ] **Step 4: Commit** — `git commit -m "feat(phase-9): public trip view screen + deep-link route [9B]"`

---

## 9C — Public profile + PII repoint (client)

### Task 9C.1: Repoint `listMembers` to the safe RPC

The base `profiles` SELECT is now own-only, so the nested embed `profile:profiles(...)`
returns null for other members. Switch to `get_trip_member_profiles`.

**Files:** Modify `src/features/trips/api/members.ts`; Update `src/features/trips/__tests__/members.test.ts` (if present)

- [ ] **Step 1: Write/Update the failing test**

```ts
import { listMembers } from '@features/trips/api/members';
import { supabase } from '@core/supabase/client';
jest.mock('@core/supabase/client');

it('merges trip_members with safe profiles from the RPC (not a profiles embed)', async () => {
  const eq = jest
    .fn()
    .mockResolvedValue({ data: [{ trip_id: 't1', user_id: 'u1', role: 'editor' }], error: null });
  (supabase.from as jest.Mock).mockReturnValue({ select: () => ({ eq }) });
  (supabase.rpc as jest.Mock).mockResolvedValue({
    data: [{ id: 'u1', display_name: 'Ana', avatar_sprite_id: 's1', avatar_color: '#fff' }],
    error: null,
  });
  const members = await listMembers('t1');
  expect(supabase.rpc).toHaveBeenCalledWith('get_trip_member_profiles', { p_trip_id: 't1' });
  expect(members[0].profile?.display_name).toBe('Ana');
});
```

- [ ] **Step 2: Run → FAIL** — `npm test -- members`

- [ ] **Step 3: Implement** — `listMembers(tripId)`: (1) select `trip_members` rows (no profiles embed); (2) `supabase.rpc('get_trip_member_profiles', { p_trip_id: tripId })`; (3) merge by `user_id === profile.id` into the existing `TripMemberWithProfile` shape (`profile` null if absent). Keep the exported type unchanged.

- [ ] **Step 4: Run → PASS + typecheck** — `npm test -- members && npm run typecheck`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-9): repoint listMembers to safe member-profiles RPC [9C]"`

### Task 9C.2: publicProfile api + PublicProfileScreen + route

**Files:** Create `src/features/profile/api/publicProfile.ts`, `src/features/profile/screens/PublicProfileScreen.tsx`, `src/app/(modals)/profile/[id].tsx`; Test `src/features/profile/__tests__/publicProfile.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { fetchPublicProfile } from '@features/profile/api/publicProfile';
import { supabase } from '@core/supabase/client';
jest.mock('@core/supabase/client');

it('returns the safe public subset (null when not public)', async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({
    data: [{ id: 'u1', display_name: 'Ana', bio: 'hi' }],
    error: null,
  });
  const p = await fetchPublicProfile('u1');
  expect(supabase.rpc).toHaveBeenCalledWith('get_public_profile', { p_user_id: 'u1' });
  expect(p?.display_name).toBe('Ana');
});
```

- [ ] **Step 2: Run → FAIL** — `npm test -- publicProfile`

- [ ] **Step 3: Implement** — `fetchPublicProfile(userId)` → `supabase.rpc('get_public_profile', { p_user_id: userId })` → first row or null. `PublicProfileScreen` renders sprite/display name/bio/countries grid/badges/verified tick; empty state `social.profile.private` when null. Route `(modals)/profile/[id].tsx`.

- [ ] **Step 4: Run → PASS + typecheck** — `npm test -- publicProfile && npm run typecheck`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-9): public profile read api + screen + route [9C]"`

### Task 9C.3: ProfileVisibilityToggle in settings

**Files:** Create `src/features/profile/components/ProfileVisibilityToggle.tsx`; Modify the profile settings screen; Test `src/features/profile/__tests__/publicProfile.test.ts` (extend)

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ProfileVisibilityToggle } from '@features/profile/components/ProfileVisibilityToggle';

it('toggles visibility private <-> public', () => {
  const onChange = jest.fn();
  const { getByLabelText } = render(
    <ProfileVisibilityToggle visibility="private" onChange={onChange} />,
  );
  fireEvent.press(getByLabelText('social.profile.makePublic'));
  expect(onChange).toHaveBeenCalledWith('public');
});
```

- [ ] **Step 2: Run → FAIL** — `npm test -- publicProfile`

- [ ] **Step 3: Implement** — a toggle writing `profiles.visibility` ('public'|'private') via the profile update api, default private, with a one-line note (`social.profile.publicNote`) listing what becomes visible. Optional sub-toggles for `gender_visible_in_public` / `show_age_in_public`. Mount in the profile settings screen.

- [ ] **Step 4: Run → PASS + typecheck** — `npm test -- publicProfile && npm run typecheck`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-9): profile public opt-in toggle [9C]"`

---

## Cross-cutting close-out

- [ ] **Seed i18n** — add `social.*` keys to `en.json` + `fr.json`: `visibility.{private,unlisted,publicView,copyLink,explainer}`, `public.{viewOnly,askToJoin,anonymous,notPublic}`, `profile.{makePublic,publicNote,private}`. (Do this as the workflow's seed phase, before the client modules, to avoid contention — same pattern as Phase 8.)
- [ ] **Extend runtime-contracts** — in `src/__tests__/runtime-contracts.test.ts` assert: the 2 new RPCs (`get_trip_member_profiles`, `get_public_profile`) typecheck via `Database['public']['Functions']`; the 4 new tables exist in `Tables`; the `(public)/trip/[token]` route file exists; `social.*` i18n keys resolve in both locales.
- [ ] **Full suite** — `npm test` green (target 1267 → ~1290+); `npm run typecheck && npm run lint` clean.
- [ ] **`/auditing-runtime-contracts`** — boundaries: deep-link scheme `journey://t/:token` ↔ the route; the RPC names; the new tables.
- [ ] **`code-validator`** inline (typecheck + lint + tests).
- [ ] **`/security-review`** — PRIORITY: confirm the PII hardening (no `select * from profiles` cross-user path remains), public-read scoped to milestones only, RPCs column-limited + membership/visibility-gated, 9D RLS correct.
- [ ] **`get_advisors`** baseline-clean.
- [ ] **Update `CLAUDE.md`** (Phase 9 done line) + `memory/remaining-work.md`.

## Self-Review notes

- **Spec coverage:** 9A (milestones policy ✓ + control UI ✓), 9B (public api ✓ + screen/route ✓), 9C (profiles tighten ✓ + 2 RPCs ✓ + members repoint ✓ + public profile UI + toggle ✓), 9D (4 tables + RLS ✓). Cross-cutting (i18n, contracts, audits) ✓.
- **Type consistency:** RPC names `get_trip_member_profiles(p_trip_id)` / `get_public_profile(p_user_id)`, `buildPublicTripLink`, `setTripVisibility`, `fetchPublicTripByToken`, `fetchPublicProfile` used identically across tasks.
- **Security note:** Part 0 (RLS/RPCs) MUST land + advisor-verify before any client task — the client repoint (9C.1) depends on the own-only policy + the member RPC existing.
- **Open verification:** before applying 9C, re-confirm the exact `profiles` SELECT policy name to DROP (`"Profiles are viewable by everyone (limited fields)"`) — it must match exactly or the DROP fails.
