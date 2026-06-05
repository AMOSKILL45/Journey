# Phase 8 — Bold Gambits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the five Phase 8 "bold gambits" — 3 world themes, boss-clear cutscene, time capsules, caravan mode, random encounters — all OTA with zero new native dependency.

**Architecture:** Five independent sub-modules (8A–8E) under one spec. Backend first (8C + 8E migrations + edge functions, applied by the orchestrator via Supabase MCP, grant-hardened up-front); then client modules — 8A/8B/8D are client-only and parallelizable, 8C/8E follow their backend. Reuses the Phase 5 realtime channel, the Phase 7 edge-proxy + cache pattern, the 6C sound manager, and the 4C/4E notification chain.

**Tech Stack:** Expo SDK 54 + TS strict · Supabase (Postgres + RLS + Edge Functions Deno) · TanStack Query v5 · Zustand · Reanimated v3 + Skia · Jest + RNTL · i18n-js.

**Spec:** `docs/superpowers/specs/2026-06-05-journey-phase-8-bold-gambits-design.md`

---

## File Structure

**8A — World themes** (extend existing)

- Modify: `src/features/map/utils/worldThemes.ts` — add 3 themes + country overrides
- Create: `src/assets/worldThemes/{europe-forest,asia-sakura,tropical-beach}/background.png` — placeholder gradients (copied)
- Test: `src/features/map/__tests__/worldThemes.test.ts` (extend)

**8B — Boss cutscene** (new component in milestones)

- Modify: `src/features/feedback/soundManifest.ts` — add `boss_cleared`
- Create: `src/features/milestones/components/BossClearCinematic.tsx`, `src/features/milestones/components/BossClearPresenter.tsx`, `src/features/milestones/hooks/useBossCutscene.ts`
- Modify: `src/features/trips/screens/TripDetailScreen.tsx` — mount presenter
- i18n: `boss.*` in `en.json` + `fr.json`
- Test: `src/features/milestones/__tests__/BossClearCinematic.test.tsx`, `.../useBossCutscene.test.ts`

**8C — Time capsules** (new feature + migration + edge fn)

- Create migration (MCP): `time_capsules` table, `_capsule_is_open`, `list_trip_capsules`, `open_time_capsule`, checkin trigger, pg_cron schedule
- Create edge fn: `supabase/functions/time_capsules_cron/index.ts`
- Modify: `src/features/notifications/utils/categories.ts` — add `time_capsule`
- Create: `src/features/time-capsules/{api.ts,index.ts}`, `.../utils/openability.ts`, `.../hooks/useTimeCapsules.ts`, `.../components/{CreateCapsuleSheet,SealedCapsuleCard,CapsuleReveal,TimeCapsulesSection}.tsx`
- Modify: `src/features/trips/screens/TripDetailScreen.tsx` — add section
- i18n: `timeCapsules.*`
- Test: `src/features/time-capsules/__tests__/{openability,api,contracts}.test.ts`

**8D — Caravan mode** (new feature, reuses realtime)

- Create: `src/features/caravan/{index.ts}`, `.../store/caravanStore.ts`, `.../utils/caravanProtocol.ts`, `.../hooks/useCaravan.ts`, `.../components/CaravanControls.tsx`
- Modify: `src/features/map/components/TripMapView.tsx` — broadcast/apply camera
- i18n: `caravan.*`
- Test: `src/features/caravan/__tests__/{caravanStore,caravanProtocol,contracts}.test.ts`

**8E — Random encounters** (new feature + cache table + edge fn)

- Create migration (MCP): `encounter_cache` table (service-role only)
- Create edge fn: `supabase/functions/random_encounter/index.ts` (+ `providers/overpass.ts`, `providers/types.ts`)
- Create: `src/features/encounters/{api.ts,index.ts}`, `.../utils/encounterMilestone.ts`, `.../hooks/useEncounters.ts`, `.../components/{EncounterCard,SurpriseButton}.tsx`
- Modify: `src/features/trips/screens/TripDetailScreen.tsx` — surprise affordance
- i18n: `encounters.*`
- Test: `src/features/encounters/__tests__/{encounterMilestone,api,contracts}.test.ts`

---

## Part 0 — Backend foundation (orchestrator, via Supabase MCP — do BEFORE the client workflow)

These run on the live project `ewsoupkfkachxidmuwoi` via the `472a285c…` MCP, then `generate_typescript_types` regenerates `src/core/supabase/types.ts`. Migrations are grant-hardened up-front (revoke internal/`SECURITY DEFINER` fns from `anon`/`authenticated` where not a public RPC). After each, run `get_advisors` (security + perf) and confirm baseline-clean. Full SQL lives in Tasks 8C.1 and 8E.1 below.

---

## 8A — Three new world themes

### Task 8A.1: Extend world themes with 3 new entries + country overrides

**Files:**

- Modify: `src/features/map/utils/worldThemes.ts`
- Test: `src/features/map/__tests__/worldThemes.test.ts`
- Create: `src/assets/worldThemes/{europe-forest,asia-sakura,tropical-beach}/background.png`

- [ ] **Step 1: Write the failing tests** (append to the existing test file)

```ts
import { WORLD_THEME_IDS, WORLD_THEMES, pickWorldTheme } from '@features/map/utils/worldThemes';

describe('phase 8 world themes', () => {
  it('exposes all five themes', () => {
    expect(WORLD_THEME_IDS).toHaveLength(5);
    expect(WORLD_THEME_IDS).toEqual(
      expect.arrayContaining(['europe-forest', 'asia-sakura', 'tropical-beach']),
    );
  });

  it('every theme exposes the required fields', () => {
    for (const id of WORLD_THEME_IDS) {
      const t = WORLD_THEMES[id];
      expect(t.id).toBe(id);
      expect(typeof t.label).toBe('string');
      expect(typeof t.background).toBe('number'); // Metro-resolved require()
      expect(t.skyTopColor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(t.accentColors.length).toBeGreaterThan(0);
    }
  });

  it('maps destination countries to the right theme', () => {
    expect(pickWorldTheme('JP')).toBe('asia-sakura');
    expect(pickWorldTheme('th')).toBe('tropical-beach'); // case-insensitive
    expect(pickWorldTheme('FR')).toBe('europe-forest');
    expect(pickWorldTheme('US')).toBe('usa-desert');
    expect(pickWorldTheme('ZZ')).toBe('adventure-generic'); // fallback
    expect(pickWorldTheme(null)).toBe('adventure-generic');
  });
});
```

- [ ] **Step 2: Run → expect FAIL**

Run: `npm test -- worldThemes`
Expected: FAIL (`WORLD_THEME_IDS` has length 2; `pickWorldTheme('JP')` returns `adventure-generic`).

- [ ] **Step 3: Copy placeholder backgrounds**

Real pixel-art is an asset task; reuse the existing placeholder gradient so Metro bundles a real file.

```bash
for t in europe-forest asia-sakura tropical-beach; do
  mkdir -p "src/assets/worldThemes/$t"
  cp src/assets/worldThemes/adventure-generic/background.png "src/assets/worldThemes/$t/background.png"
done
```

- [ ] **Step 4: Implement** — edit `worldThemes.ts`

Extend the union, add 3 entries to `WORLD_THEMES`, and extend `COUNTRY_THEME_OVERRIDES`:

```ts
export type WorldThemeId =
  | 'adventure-generic'
  | 'usa-desert'
  | 'europe-forest'
  | 'asia-sakura'
  | 'tropical-beach';

// …inside WORLD_THEMES, after 'usa-desert':
  'europe-forest': {
    id: 'europe-forest',
    label: 'Forest',
    background: require('../../../assets/worldThemes/europe-forest/background.png'),
    skyTopColor: '#A8D6FF',
    skyBottomColor: '#D8ECFF',
    groundColor: '#86A86E',
    accentColors: ['#D1654A', '#6E4628', '#9CA8B0'],
  },
  'asia-sakura': {
    id: 'asia-sakura',
    label: 'Sakura',
    background: require('../../../assets/worldThemes/asia-sakura/background.png'),
    skyTopColor: '#FFD6E0',
    skyBottomColor: '#FFEAF1',
    groundColor: '#9FCFA0',
    accentColors: ['#5B3B7F', '#FFCB05', '#B82838'],
  },
  'tropical-beach': {
    id: 'tropical-beach',
    label: 'Beach',
    background: require('../../../assets/worldThemes/tropical-beach/background.png'),
    skyTopColor: '#5FCFE6',
    skyBottomColor: '#BDEEF6',
    groundColor: '#FFF1B8',
    accentColors: ['#FF7A4A', '#FF4592', '#3FBA9A'],
  },

// …extend COUNTRY_THEME_OVERRIDES (alpha-2; existing US/USA stay):
const EUROPE_FOREST = ['FR','DE','IT','AT','CH','BE','NL','LU','PL','CZ','SK','SI','HU','RO','SE','NO','FI','DK','IE','GB','PT','HR'];
const ASIA_SAKURA = ['JP','KR','CN','TW'];
const TROPICAL_BEACH = ['TH','ID','PH','MV','VN','MY','LK','FJ','PF','MU','SC','DO','BS','JM','BB','CR','BZ'];
// build the record: { ...US/USA, ...EUROPE_FOREST→'europe-forest', ... }
```

- [ ] **Step 5: Run → expect PASS, then typecheck + commit**

Run: `npm test -- worldThemes && npm run typecheck`
Expected: PASS.

```bash
git add src/features/map/utils/worldThemes.ts src/features/map/__tests__/worldThemes.test.ts src/assets/worldThemes
git commit -m "feat(phase-8): 3 new world themes (europe-forest, asia-sakura, tropical-beach) [8A]"
```

---

## 8B — Boss milestones + clear cutscene

### Task 8B.1: Register the `boss_cleared` sound + boss i18n keys

**Files:**

- Modify: `src/features/feedback/soundManifest.ts`
- Modify: `src/core/i18n/locales/en.json`, `src/core/i18n/locales/fr.json`
- Test: `src/features/feedback/__tests__/soundManifest.test.ts` (or the existing contract test)

- [ ] **Step 1: Write the failing test**

```ts
import { SOUND_IDS, SOUND_CATEGORY } from '@features/feedback/soundManifest';

it('registers the boss_cleared event sound', () => {
  expect(SOUND_IDS).toContain('boss_cleared');
  expect(SOUND_CATEGORY.boss_cleared).toBe('event');
});
```

- [ ] **Step 2: Run → expect FAIL** — `npm test -- soundManifest`

- [ ] **Step 3: Implement** — add `'boss_cleared'` to `SOUND_IDS` and `boss_cleared: 'event'` to `SOUND_CATEGORY`. Add i18n keys to both locales:

```json
"boss": {
  "cleared": "BOSS CLEARED!",
  "subtitle": "You conquered {{milestone}}",
  "skip": "Tap to continue"
}
```

(fr: `"BOSS VAINCU !"`, `"Tu as conquis {{milestone}}"`, `"Touche pour continuer"`)

- [ ] **Step 4: Run → expect PASS** — `npm test -- soundManifest`

- [ ] **Step 5: Commit**

```bash
git add src/features/feedback/soundManifest.ts src/core/i18n/locales
git commit -m "feat(phase-8): register boss_cleared sound + boss i18n [8B]"
```

### Task 8B.2: BossClearCinematic component

**Files:**

- Create: `src/features/milestones/components/BossClearCinematic.tsx`
- Test: `src/features/milestones/__tests__/BossClearCinematic.test.tsx`

Mirror `src/features/achievements/components/WorldClearCinematic.tsx` (Skia, ≈2.5 s, skippable, reduced-motion static). Read it first for the exact Skia/animation idiom and reuse it.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { BossClearCinematic } from '@features/milestones/components/BossClearCinematic';

it('renders the milestone name and calls onDone when skipped', () => {
  const onDone = jest.fn();
  const { getByText, getByLabelText } = render(
    <BossClearCinematic milestoneName="Mount Doom" onDone={onDone} />,
  );
  expect(getByText(/Mount Doom/)).toBeTruthy();
  fireEvent.press(getByLabelText('boss.skip'));
  expect(onDone).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run → expect FAIL** — `npm test -- BossClearCinematic`

- [ ] **Step 3: Implement** — props `{ milestoneName: string; onDone: () => void }`. Render the Skia "boss cleared" frame with `t('boss.cleared')` + `t('boss.subtitle', { milestone: milestoneName })`, a skippable Pressable (`accessibilityLabel="boss.skip"`), auto-`onDone` after ≈2.5 s, and a static frame when `useReducedMotion()` (the feedback `osReduceMotion` flag) is set. Call `playSfx('boss_cleared')` + `haptics.success()` on mount.

- [ ] **Step 4: Run → expect PASS** — `npm test -- BossClearCinematic`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-8): BossClearCinematic Skia cutscene [8B]"`

### Task 8B.3: useBossCutscene + presenter, wired into TripDetailScreen

**Files:**

- Create: `src/features/milestones/hooks/useBossCutscene.ts`, `src/features/milestones/components/BossClearPresenter.tsx`
- Modify: `src/features/trips/screens/TripDetailScreen.tsx`
- Test: `src/features/milestones/__tests__/useBossCutscene.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { renderHook, act } from '@testing-library/react-native';
import { useBossCutscene } from '@features/milestones/hooks/useBossCutscene';

it('queues a cutscene only for boss check-ins', () => {
  const { result } = renderHook(() => useBossCutscene());
  act(() => result.current.onCheckin({ id: 'm1', name: 'Castle', is_boss: false }));
  expect(result.current.active).toBeNull();
  act(() => result.current.onCheckin({ id: 'm2', name: 'Bowser', is_boss: true }));
  expect(result.current.active?.name).toBe('Bowser');
  act(() => result.current.dismiss());
  expect(result.current.active).toBeNull();
});
```

- [ ] **Step 2: Run → expect FAIL** — `npm test -- useBossCutscene`

- [ ] **Step 3: Implement** — `useBossCutscene()` returns `{ active: {id,name} | null, onCheckin(m), dismiss() }`. `onCheckin` sets `active` only when `m.is_boss`. `BossClearPresenter` consumes it and renders `<BossClearCinematic … onDone={dismiss} />`. In `TripDetailScreen`, call `onCheckin(milestone)` from the existing check-in success path and mount `<BossClearPresenter … />`.

- [ ] **Step 4: Run → expect PASS** — `npm test -- useBossCutscene`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-8): boss cutscene presenter wired into trip detail [8B]"`

---

## 8C — Time capsules

### Task 8C.1: Migration — table, openability, RLS, RPCs, trigger, cron (orchestrator via MCP)

**Files:**

- Apply via `mcp__472a285c…__apply_migration` (name `phase_8c_time_capsules`), then `generate_typescript_types`.
- Test (contract): `src/features/time-capsules/__tests__/contracts.test.ts` (Task 8C.4 asserts the regenerated types).

> **Confirmed `notifications` INSERT shape** (from `personal_reminders_cron`): columns are `user_id`, `category`, `title`, `body`, `data` (jsonb, camelCase keys; title/body are resolved client-side from `data`). The trigger + cron below use exactly these.

- [ ] **Step 1: Apply the migration SQL**

```sql
create table public.time_capsules (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  author_id uuid not null references auth.users(id),
  recipient_id uuid references auth.users(id),
  message text not null,
  open_after timestamptz,
  open_at_milestone uuid references public.milestones(id) on delete set null,
  opened_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint time_capsules_has_trigger check (open_after is not null or open_at_milestone is not null)
);
create index time_capsules_trip on public.time_capsules (trip_id, created_at desc);
alter table public.time_capsules enable row level security;

create or replace function public._capsule_is_open(p_open_after timestamptz, p_open_at_milestone uuid)
returns boolean language sql stable as $$
  select (p_open_after is not null and now() >= p_open_after)
      or (p_open_at_milestone is not null
          and exists (select 1 from public.checkins c where c.milestone_id = p_open_at_milestone));
$$;

create policy capsules_insert on public.time_capsules for insert
  with check (author_id = auth.uid() and is_trip_member(trip_id, auth.uid()));
create policy capsules_select on public.time_capsules for select
  using (
    is_trip_member(trip_id, auth.uid())
    and (recipient_id is null or recipient_id = auth.uid())
    and public._capsule_is_open(open_after, open_at_milestone)
  );
create policy capsules_delete on public.time_capsules for delete
  using (author_id = auth.uid() or is_trip_editor(trip_id, auth.uid()));

-- Metadata list: message returned ONLY when openable AND caller is recipient/group.
create or replace function public.list_trip_capsules(p_trip_id uuid)
returns table (
  id uuid, author_id uuid, recipient_id uuid, open_after timestamptz,
  open_at_milestone uuid, opened_at timestamptz, created_at timestamptz,
  is_open boolean, message text
) language plpgsql security definer set search_path = public as $$
begin
  if not is_trip_member(p_trip_id, auth.uid()) then
    raise exception 'not a trip member';
  end if;
  return query
    select c.id, c.author_id, c.recipient_id, c.open_after, c.open_at_milestone,
           c.opened_at, c.created_at,
           public._capsule_is_open(c.open_after, c.open_at_milestone) as is_open,
           case when public._capsule_is_open(c.open_after, c.open_at_milestone)
                 and (c.recipient_id is null or c.recipient_id = auth.uid())
                then c.message else null end as message
    from public.time_capsules c
    where c.trip_id = p_trip_id
      and (c.recipient_id is null or c.recipient_id = auth.uid() or c.author_id = auth.uid());
end;
$$;

-- Open: stamp opened_at once, return the message (re-checks all gates).
create or replace function public.open_time_capsule(p_capsule_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare c public.time_capsules;
begin
  select * into c from public.time_capsules where id = p_capsule_id;
  if c.id is null then raise exception 'not found'; end if;
  if not is_trip_member(c.trip_id, auth.uid()) then raise exception 'not a member'; end if;
  if not (c.recipient_id is null or c.recipient_id = auth.uid()) then raise exception 'not recipient'; end if;
  if not public._capsule_is_open(c.open_after, c.open_at_milestone) then raise exception 'sealed'; end if;
  if c.opened_at is null then update public.time_capsules set opened_at = now() where id = p_capsule_id; end if;
  return c.message;
end;
$$;

-- Notify when a milestone-anchored capsule becomes openable (mirror the cron's notifications INSERT shape).
create or replace function public._capsule_after_checkin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, category, title, body, data)
  select coalesce(tc.recipient_id, tm.user_id), 'time_capsule', 'time_capsule', 'time_capsule',
         jsonb_build_object('tripId', tc.trip_id, 'capsuleId', tc.id, 'kind', 'time_capsule')
  from public.time_capsules tc
  join public.trip_members tm on tm.trip_id = tc.trip_id
  where tc.open_at_milestone = new.milestone_id and tc.notified_at is null
    and (tc.recipient_id is null or tc.recipient_id = tm.user_id);
  update public.time_capsules set notified_at = now()
    where open_at_milestone = new.milestone_id and notified_at is null;
  return new;
end;
$$;
create trigger trg_capsule_after_checkin after insert on public.checkins
  for each row execute function public._capsule_after_checkin();

revoke execute on function public._capsule_is_open(timestamptz, uuid) from anon, authenticated;
revoke execute on function public._capsule_after_checkin() from anon, authenticated;
revoke execute on function public.open_time_capsule(uuid) from anon;
revoke execute on function public.list_trip_capsules(uuid) from anon;
```

- [ ] **Step 2: Regenerate types + advisors**

Run `generate_typescript_types` → overwrite `src/core/supabase/types.ts`. Run `get_advisors` (security) and confirm only the pre-existing PostGIS/pg_net/auth baseline + the intentional `list_trip_capsules`/`open_time_capsule` authenticated-RPC WARNs.

- [ ] **Step 3: Verify RLS with synthetic SQL** (via `execute_sql`)

Insert a future-dated capsule as a member; confirm a `select * from time_capsules` returns **0 rows** (sealed) while `list_trip_capsules(trip)` returns 1 row with `message IS NULL`. Document the result.

- [ ] **Step 4: Commit the mirrored migration file**

Write the same SQL to `supabase/migrations/20260605_8c_time_capsules.sql`, then:

```bash
git add supabase/migrations/20260605_8c_time_capsules.sql src/core/supabase/types.ts
git commit -m "feat(phase-8): time_capsules table + sealed RLS + RPCs + checkin trigger [8C]"
```

### Task 8C.2: `time_capsules_cron` edge function

**Files:**

- Create: `supabase/functions/time_capsules_cron/index.ts`
- Deploy via `mcp__472a285c…__deploy_edge_function` (verify_jwt=false), then `pg_cron` daily schedule (Vault `time_capsules_cron_url`/secret) — mirror `personal_reminders_cron`.

- [ ] **Step 1: Implement** — secret-gated (`verify_webhook_secret` RPC like the other crons). Select capsules where `open_after <= now()` AND `notified_at IS NULL`; for each, INSERT a `time_capsule` notification to `recipient_id` (or every `trip_members.user_id` if group); set `notified_at = now()`. Reuse the exact `notifications` INSERT shape from `personal_reminders_cron`.

- [ ] **Step 2: Deploy + schedule** — deploy; add the pg_cron daily job pointing at the Vault URL; provision the Vault secret.

- [ ] **Step 3: Smoke-test** — `execute_sql` to insert a capsule with `open_after = now() - interval '1 minute'`, invoke the function, confirm a notification row appears and `notified_at` is set.

- [ ] **Step 4: Commit** — `git add supabase/functions/time_capsules_cron && git commit -m "feat(phase-8): time_capsules_cron edge fn + daily schedule [8C]"`

### Task 8C.3: Client openability util + api + hook + notification category

**Files:**

- Modify: `src/features/notifications/utils/categories.ts` — add `'time_capsule'`
- Create: `src/features/time-capsules/utils/openability.ts`, `src/features/time-capsules/api.ts`, `src/features/time-capsules/hooks/useTimeCapsules.ts`, `src/features/time-capsules/index.ts`
- Test: `src/features/time-capsules/__tests__/openability.test.ts`

- [ ] **Step 1: Write the failing test** (pure util — mirrors the SQL helper for client-side countdowns)

```ts
import { isCapsuleOpen, countdownLabel } from '@features/time-capsules/utils/openability';

it('is open once open_after has passed', () => {
  const past = new Date(Date.now() - 1000).toISOString();
  const future = new Date(Date.now() + 60_000).toISOString();
  expect(isCapsuleOpen({ open_after: past, is_open: false })).toBe(true);
  expect(isCapsuleOpen({ open_after: future, is_open: false })).toBe(false);
  // server-computed milestone openness wins
  expect(isCapsuleOpen({ open_after: null, is_open: true })).toBe(true);
});

it('formats a countdown for a sealed capsule', () => {
  const future = new Date(Date.now() + 2 * 86_400_000).toISOString();
  expect(countdownLabel(future)).toMatch(/2/);
});
```

- [ ] **Step 2: Run → expect FAIL** — `npm test -- openability`

- [ ] **Step 3: Implement** `openability.ts`:

```ts
export interface CapsuleOpenState {
  open_after: string | null;
  is_open: boolean;
}

/** Client mirror of `_capsule_is_open`: server `is_open` (covers milestone triggers) OR time passed. */
export function isCapsuleOpen(c: CapsuleOpenState): boolean {
  if (c.is_open) return true;
  return c.open_after != null && Date.parse(c.open_after) <= Date.now();
}

/** Whole-day countdown label, e.g. "2 days". Caller wraps with i18n pluralization. */
export function countdownLabel(openAfter: string): string {
  const days = Math.max(0, Math.ceil((Date.parse(openAfter) - Date.now()) / 86_400_000));
  return `${days}`;
}
```

Then `api.ts`: `listTripCapsules(tripId)` → `supabase.rpc('list_trip_capsules', { p_trip_id })`; `createCapsule(input)` → insert; `openCapsule(id)` → `supabase.rpc('open_time_capsule', { p_capsule_id })`. `useTimeCapsules(tripId)` follows the `usePolls` TanStack pattern. Add `'time_capsule'` to `NOTIFICATION_CATEGORIES`.

- [ ] **Step 4: Run → expect PASS + typecheck** — `npm test -- openability && npm run typecheck`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-8): time-capsules api + openability util + notif category [8C]"`

### Task 8C.4: Components + section + i18n + contract tests

**Files:**

- Create: `.../components/{CreateCapsuleSheet,SealedCapsuleCard,CapsuleReveal,TimeCapsulesSection}.tsx`
- Modify: `src/features/trips/screens/TripDetailScreen.tsx`
- Modify: `src/core/i18n/locales/{en,fr}.json` — `timeCapsules.*`
- Test: `src/features/time-capsules/__tests__/contracts.test.ts`

- [ ] **Step 1: Write the contract test**

```ts
import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';
import { NOTIFICATION_CATEGORIES } from '@features/notifications/utils/categories';

it('time_capsule is a registered notification category', () => {
  expect(NOTIFICATION_CATEGORIES).toContain('time_capsule');
});
it('timeCapsules i18n keys exist in both locales', () => {
  for (const loc of [en, fr]) {
    expect(loc.timeCapsules?.notif?.title).toBeTruthy();
    expect(loc.timeCapsules?.create?.title).toBeTruthy();
    expect(loc.timeCapsules?.sealed).toBeTruthy();
  }
});
```

- [ ] **Step 2: Run → expect FAIL** — `npm test -- time-capsules/__tests__/contracts`

- [ ] **Step 3: Implement** — `CreateCapsuleSheet` (PixelBottomSheet: message input + trigger toggle time/milestone + date or milestone picker + recipient picker group/member), `SealedCapsuleCard` (lock icon + `countdownLabel`), `CapsuleReveal` (Reanimated unwrap → calls `openCapsule`, plays `playSfx('capsule_open')`), `TimeCapsulesSection` (list via `useTimeCapsules`). Add `timeCapsules.*` keys (en + fr). Render `<TimeCapsulesSection tripId=… />` in `TripDetailScreen`.

- [ ] **Step 4: Run → expect PASS + typecheck** — `npm test -- time-capsules && npm run typecheck`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-8): time capsules UI + section + i18n [8C]"`

---

## 8D — Caravan mode

### Task 8D.1: caravanStore + role reducer

**Files:**

- Create: `src/features/caravan/store/caravanStore.ts`, `src/features/caravan/utils/caravanProtocol.ts`
- Test: `src/features/caravan/__tests__/caravanStore.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { caravanReducer, initialCaravan } from '@features/caravan/utils/caravanProtocol';

it('transitions roles correctly', () => {
  let s = initialCaravan();
  expect(s.role).toBe('off');
  s = caravanReducer(s, { type: 'lead', selfId: 'u1' });
  expect(s).toEqual({ role: 'leading', leaderId: 'u1' });
  s = caravanReducer(s, { type: 'follow', leaderId: 'u2' });
  expect(s).toEqual({ role: 'following', leaderId: 'u2' });
  s = caravanReducer(s, { type: 'leave' });
  expect(s.role).toBe('off');
});

it('resets followers when the leader they follow leaves', () => {
  const following = { role: 'following' as const, leaderId: 'u2' };
  expect(caravanReducer(following, { type: 'leaderGone', leaderId: 'u2' }).role).toBe('off');
  // a different leader leaving does not affect us
  expect(caravanReducer(following, { type: 'leaderGone', leaderId: 'u9' })).toEqual(following);
});
```

- [ ] **Step 2: Run → expect FAIL** — `npm test -- caravanStore`

- [ ] **Step 3: Implement** `caravanProtocol.ts` (pure):

```ts
export const CARAVAN_EVENT = 'caravan' as const;
export type MapMode = 'overworld' | 'real';
export interface CaravanCamera {
  center: [number, number];
  zoom: number;
  mapMode: MapMode;
}
export interface CaravanBroadcast extends CaravanCamera {
  leaderId: string;
}

export type CaravanRole = 'off' | 'leading' | 'following';
export interface CaravanState {
  role: CaravanRole;
  leaderId: string | null;
}
export const initialCaravan = (): CaravanState => ({ role: 'off', leaderId: null });

export type CaravanAction =
  | { type: 'lead'; selfId: string }
  | { type: 'follow'; leaderId: string }
  | { type: 'leave' }
  | { type: 'leaderGone'; leaderId: string };

export function caravanReducer(s: CaravanState, a: CaravanAction): CaravanState {
  switch (a.type) {
    case 'lead':
      return { role: 'leading', leaderId: a.selfId };
    case 'follow':
      return { role: 'following', leaderId: a.leaderId };
    case 'leave':
      return initialCaravan();
    case 'leaderGone':
      return s.role === 'following' && s.leaderId === a.leaderId ? initialCaravan() : s;
  }
}
```

Then `caravanStore.ts`: a Zustand store wrapping `CaravanState` + a `dispatch(action)` that applies `caravanReducer`.

- [ ] **Step 4: Run → expect PASS** — `npm test -- caravanStore`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-8): caravan store + role reducer + protocol [8D]"`

### Task 8D.2: caravan broadcast throttle + useCaravan hook

**Files:**

- Create: `src/features/caravan/hooks/useCaravan.ts`
- Modify: `src/features/caravan/utils/caravanProtocol.ts` — add `throttle`
- Test: `src/features/caravan/__tests__/caravanProtocol.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { throttle, CARAVAN_EVENT } from '@features/caravan/utils/caravanProtocol';

jest.useFakeTimers();
it('throttles trailing calls to one per window', () => {
  const fn = jest.fn();
  const t = throttle(fn, 250);
  t(1);
  t(2);
  t(3);
  expect(fn).toHaveBeenCalledTimes(1);
  expect(fn).toHaveBeenLastCalledWith(1);
  jest.advanceTimersByTime(250);
  expect(fn).toHaveBeenCalledTimes(2);
  expect(fn).toHaveBeenLastCalledWith(3); // trailing edge uses latest args
});
it('exposes a stable event name', () => {
  expect(CARAVAN_EVENT).toBe('caravan');
});
```

- [ ] **Step 2: Run → expect FAIL** — `npm test -- caravanProtocol`

- [ ] **Step 3: Implement** leading+trailing `throttle(fn, ms)` in `caravanProtocol.ts`. Then `useCaravan(channel)`:
  - subscribes to `channel` broadcast `{ event: CARAVAN_EVENT }`; on receive, if `payload.leaderId === state.leaderId && role==='following'`, expose `incomingCamera`.
  - `lead()` dispatches `{type:'lead'}` + starts broadcasting (throttled) `broadcastCamera(cam)` via `channel.send({ type:'broadcast', event: CARAVAN_EVENT, payload })`.
  - `follow(leaderId)` / `leave()` dispatch accordingly. Returns `{ role, leaderId, incomingCamera, lead, follow, leave, broadcastCamera }`.

- [ ] **Step 4: Run → expect PASS** — `npm test -- caravanProtocol`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-8): useCaravan broadcast hook + throttle [8D]"`

### Task 8D.3: CaravanControls + TripMapView integration + i18n + contract

**Files:**

- Create: `src/features/caravan/components/CaravanControls.tsx`, `src/features/caravan/index.ts`
- Modify: `src/features/map/components/TripMapView.tsx`
- Modify: `src/core/i18n/locales/{en,fr}.json` — `caravan.*`
- Test: `src/features/caravan/__tests__/contracts.test.ts`

- [ ] **Step 1: Write the contract test**

```ts
import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';
import { CARAVAN_EVENT } from '@features/caravan/utils/caravanProtocol';

it('caravan event name is the wire constant', () => {
  expect(CARAVAN_EVENT).toBe('caravan');
});
it('caravan i18n keys exist in both locales', () => {
  for (const loc of [en, fr]) {
    expect(loc.caravan?.lead).toBeTruthy();
    expect(loc.caravan?.following).toBeTruthy();
    expect(loc.caravan?.break).toBeTruthy();
  }
});
```

- [ ] **Step 2: Run → expect FAIL** — `npm test -- caravan/__tests__/contracts`

- [ ] **Step 3: Implement** — `CaravanControls` (overlay: "Lead" / "Join {name}" / "Leave" + a "Following {name} — tap to break" banner). In `TripMapView`: pass the trip channel to `useCaravan`; when `leading`, call the throttled `broadcastCamera` from the existing camera-change handler; when `following`, apply `incomingCamera` to the `useMapCamera` shared values via `runOnUI` (same JS-bridge approach as `MapCrossfade`) and suppress local pan/zoom until the user taps break. Add `caravan.*` keys (en + fr).

- [ ] **Step 4: Run → expect PASS + typecheck** — `npm test -- caravan && npm run typecheck`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-8): caravan controls + map sync integration [8D]"`

---

## 8E — Random encounters

### Task 8E.1: `encounter_cache` table (orchestrator via MCP)

**Files:**

- Apply via `apply_migration` (name `phase_8e_encounter_cache`), then `generate_typescript_types`.

- [ ] **Step 1: Apply the migration SQL**

```sql
create table public.encounter_cache (
  cache_key text primary key,                 -- rounded lat,lng,radius bucket
  results jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.encounter_cache enable row level security;
-- No client policies: service-role only (the edge fn reads/writes; clients go through it).
revoke all on public.encounter_cache from anon, authenticated;
```

- [ ] **Step 2: Regenerate types + advisors** — `generate_typescript_types`; `get_advisors` must show only the baseline (the no-policy table is intentional — service-role only, like `weather_cache`).

- [ ] **Step 3: Mirror migration file + commit**

```bash
# write the same SQL to supabase/migrations/20260605_8e_encounter_cache.sql
git add supabase/migrations/20260605_8e_encounter_cache.sql src/core/supabase/types.ts
git commit -m "feat(phase-8): encounter_cache table (service-role only) [8E]"
```

### Task 8E.2: `random_encounter` edge function (Overpass provider)

**Files:**

- Create: `supabase/functions/random_encounter/index.ts`, `.../providers/types.ts`, `.../providers/overpass.ts`
- Deploy via `deploy_edge_function` (**verify_jwt=true**).

Model on `supabase/functions/enrich_milestone/index.ts` (verify_jwt=true, authorize caller as trip member before service-role work).

- [ ] **Step 1: Implement the provider interface** `providers/types.ts`

```ts
export interface Encounter {
  name: string;
  category: string;
  lat: number;
  lng: number;
  distance_m: number;
  tags: Record<string, string>;
}
export interface EncounterProvider {
  findNearby(lat: number, lng: number, radiusM: number): Promise<Encounter[]>;
}
```

- [ ] **Step 2: Implement `providers/overpass.ts`** — `OverpassProvider implements EncounterProvider`. Build the curated Overpass QL query, POST to `https://overpass-api.de/api/interpreter`, map nodes → `Encounter[]`, compute `distance_m` (haversine), rank by distance, cap ~30.

```ts
const INTERESTING = `
  node["tourism"~"viewpoint|artwork|attraction"](around:R,LAT,LNG);
  node["amenity"~"cafe|ice_cream"](around:R,LAT,LNG);
  node["historic"](around:R,LAT,LNG);
  node["natural"~"peak|waterfall|beach"](around:R,LAT,LNG);`;
// query = `[out:json][timeout:25];(${INTERESTING});out body 30;` with R/LAT/LNG substituted
```

- [ ] **Step 3: Implement `index.ts`** — verify_jwt=true; derive the caller from the JWT, confirm `trip_members` membership for `trip_id`; compute `cache_key` (lat/lng rounded to ~3 decimals + radius bucket); read `encounter_cache` (return if `expires_at > now()`); else call `OverpassProvider`, upsert cache (`expires_at = now()+24h`), return `{ encounters }`. A `provider` switch leaves room for `GooglePlacesProvider` later.

- [ ] **Step 4: Deploy + smoke-test** — deploy verify_jwt=true; invoke with a real member JWT + a known coord; confirm a non-empty `encounters` array and a cache row.

- [ ] **Step 5: Commit** — `git add supabase/functions/random_encounter && git commit -m "feat(phase-8): random_encounter edge fn + Overpass provider [8E]"`

### Task 8E.3: Client api + encounter→milestone util + hook

**Files:**

- Create: `src/features/encounters/api.ts`, `.../utils/encounterMilestone.ts`, `.../hooks/useEncounters.ts`, `.../index.ts`
- Test: `src/features/encounters/__tests__/encounterMilestone.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { encounterToMilestoneInput } from '@features/encounters/utils/encounterMilestone';

it('maps an encounter to a milestone creation input', () => {
  const input = encounterToMilestoneInput(
    { name: 'Sunset Point', category: 'viewpoint', lat: 1.5, lng: 2.5, distance_m: 180, tags: {} },
    'trip-1',
  );
  expect(input).toMatchObject({
    tripId: 'trip-1',
    name: 'Sunset Point',
    type: 'landmark',
    lat: 1.5,
    lng: 2.5,
  });
});
```

- [ ] **Step 2: Run → expect FAIL** — `npm test -- encounterMilestone`

- [ ] **Step 3: Implement** `encounterMilestone.ts` (map `category` → milestone `type`, defaulting to `'landmark'`); `api.ts` `fetchEncounters({tripId,lat,lng,radius})` → `supabase.functions.invoke('random_encounter', { body })`; `addEncounterAsMilestone(enc, tripId)` reuses the milestones API. `useEncounters` follows the TanStack pattern (manual `fetch` trigger, not auto — it is "surprise me").

- [ ] **Step 4: Run → expect PASS + typecheck** — `npm test -- encounterMilestone && npm run typecheck`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-8): encounters api + encounter→milestone util + hook [8E]"`

### Task 8E.4: EncounterCard + Surprise affordance + i18n + contract

**Files:**

- Create: `.../components/EncounterCard.tsx`, `.../components/SurpriseButton.tsx`
- Modify: `src/features/trips/screens/TripDetailScreen.tsx`
- Modify: `src/core/i18n/locales/{en,fr}.json` — `encounters.*`
- Test: `src/features/encounters/__tests__/contracts.test.ts`

- [ ] **Step 1: Write the contract test**

```ts
import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

it('encounters i18n keys exist in both locales', () => {
  for (const loc of [en, fr]) {
    expect(loc.encounters?.title).toBeTruthy(); // "Random Encounter!"
    expect(loc.encounters?.surprise).toBeTruthy(); // "Surprise me"
    expect(loc.encounters?.add).toBeTruthy();
    expect(loc.encounters?.dismiss).toBeTruthy();
  }
});
```

- [ ] **Step 2: Run → expect FAIL** — `npm test -- encounters/__tests__/contracts`

- [ ] **Step 3: Implement** — `SurpriseButton` (triggers `fetchEncounters` at the trip's current/last milestone coord), `EncounterCard` (pixel "Random Encounter!" + name/distance + **Add** → `addEncounterAsMilestone`, plays `playSfx('encounter')`, + **Dismiss**; never auto-adds). Add `encounters.*` keys (en + fr). Wire the affordance into `TripDetailScreen`. Also register `'encounter'` in `SOUND_IDS` (event) if not already (Task 8B added `boss_cleared`; add `encounter` + `capsule_open` here or in 8B — ensure all three exist before contract tests run).

- [ ] **Step 4: Run → expect PASS + typecheck** — `npm test -- encounters && npm run typecheck`

- [ ] **Step 5: Commit** — `git commit -m "feat(phase-8): encounter card + surprise affordance + i18n [8E]"`

---

## Cross-cutting close-out (after all sub-modules)

- [ ] **Sound ids complete** — confirm `SOUND_IDS` contains `boss_cleared`, `capsule_open`, `encounter` (all `event`); the feedback contract test (every `playSfx` id ∈ `SOUND_IDS`) passes.
- [ ] **Full test suite** — `npm test` green (target: 1162 → ~1230+).
- [ ] **Typecheck + lint** — `npm run typecheck && npm run lint` clean.
- [ ] **`/auditing-runtime-contracts`** — generate/refresh contract tests for the new static→runtime boundaries: edge-fn names (`random_encounter`, `time_capsules_cron`), cron Vault secrets, the `CARAVAN_EVENT` channel event, the `time_capsule` notification category, the two new RPCs, and all new i18n key namespaces.
- [ ] **`code-validator` agent** — run on the full Phase 8 diff.
- [ ] **`/security-review`** — review the diff; focus on the time-capsule RLS gating (no sealed-message leak), the `random_encounter` membership check, and `encounter_cache` non-client-access.
- [ ] **`get_advisors` (security + perf)** — baseline-clean (only the documented intentional WARNs).
- [ ] **Update `CLAUDE.md`** — add the Phase 8 done-line; fix the stale "Apple/Google Sign-In deferred" note; update `memory/remaining-work.md` (tick Phase 8).

## Self-Review notes (filled during writing)

- **Spec coverage:** 8A (themes) ✓, 8B (boss cutscene) ✓, 8C (time capsules: table/RLS/RPC/cron/trigger/client) ✓, 8D (caravan: store/protocol/hook/integration) ✓, 8E (encounters: cache/edge-fn/provider/client) ✓. Cross-cutting (sounds/i18n/notif category/types) ✓.
- **Type consistency:** `CARAVAN_EVENT='caravan'`, `Encounter`, `CaravanBroadcast`, `list_trip_capsules`/`open_time_capsule`, `_capsule_is_open` used identically across tasks.
- **Resolved:** `notifications` INSERT columns confirmed as `user_id, category, title, body, data` (from `personal_reminders_cron`) and baked into the 8C.1 trigger + 8C.2 cron — no guessed column names remain.
- **Placeholder scan:** no TBD/TODO; "placeholder" appears only for the intentional asset-task art/audio. Every code step shows real code.
