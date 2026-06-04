# Phase 6A — Achievements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship ~20 server-evaluated achievements with a tiered unlock UX (toast for `common`, a Skia "World Clear" cinematic for `rare`+), 100% OTA.

**Architecture:** Rule logic lives only in a SECURITY DEFINER RPC `evaluate_achievements()` (anti-cheat); AFTER INSERT triggers + a client catch-up call invoke it; the client is read-only and learns of unlocks via Realtime `postgres_changes` on `user_achievements`, deduped by a persisted seen-set, then routes them to a toast or cinematic by rarity.

**Tech Stack:** Supabase Postgres (RLS, plpgsql, Realtime), TypeScript strict, TanStack Query v5, Reanimated v3 + Skia, NativeWind v4, i18n-js (FR+EN), Jest + RNTL.

**Spec:** `docs/superpowers/specs/2026-06-04-journey-phase-6a-achievements-design.md`

**Workflow execution map** (dependencies):

- **Phase A (sequential, prod DDL on `ewsoupkfkachxidmuwoi`):** Tasks 1→4 (migrations + types regen).
- **Phase B (parallel after A):** Tasks 5, 6, 7, 8, 17 (pure utils, api, manifest, i18n).
- **Phase C (parallel after B):** Tasks 9, 10, 11, 12, 13, 15.
- **Phase D (sequential after C):** Task 14 (presenter), 16 (wiring), 18 (contracts + validation + docs).

**Conventions to mirror:** api → `src/features/smart-reminders/api/smartReminders.ts`; hooks/query-keys → `src/features/smart-reminders/hooks/useSmartReminders.ts`; realtime → `src/features/realtime/hooks/useTripChannel.ts`; component → `src/features/smart-reminders/components/SmartTipCard.tsx`; contract test → `src/features/realtime/__tests__/contracts.test.ts`; modal route → `src/app/(modals)/reminders.tsx`. Run validation inline (no code-validator subagent — user preference): `npm run typecheck && npm run lint && npm test`.

---

## File structure

```
supabase/migrations/
  20260604_achievements_schema.sql        # tables + RLS + realtime publication
  20260604_achievements_eval.sql          # _evaluate_achievements(uuid) + evaluate_achievements()
  20260604_achievements_triggers.sql      # 7 AFTER INSERT triggers
  20260604_achievements_seed.sql          # 20 definitions
src/core/supabase/types.ts                # regenerated (Modify)
src/features/achievements/
  types.ts                                # row types + Rarity + AchievementWithStatus
  rarity.ts                               # rarity vocab, isCinematicRarity, frames
  achievementStatus.ts                    # mergeStatus, unlockedCount (pure)
  seenSet.ts                              # AsyncStorage seen-set + filterUnseen (pure)
  metrics.ts                              # METRIC_VOCAB (single source for contract tests)
  badges.ts                               # BADGE_IDS manifest (placeholder art)
  api.ts                                  # fetchDefinitions / fetchMyAchievements / evaluateAchievements
  hooks/useAchievements.ts                # useAchievementDefinitions, useMyAchievements
  hooks/useAchievementUnlocks.ts          # realtime + catch-up + queue
  components/AchievementBadge.tsx
  components/AchievementToast.tsx
  components/WorldClearCinematic.tsx
  components/AchievementUnlockPresenter.tsx
  screens/AchievementsScreen.tsx
  index.ts                                # barrel
  __tests__/{rarity,achievementStatus,seenSet,AchievementBadge,presenter,contracts}.test.ts(x)
src/app/(modals)/achievements.tsx         # route (Create)
src/app/(tabs)/profile.tsx                # add entry row (Modify)
src/app/_layout.tsx                       # mount presenter post-session (Modify)
src/core/i18n/locales/{en,fr}.json        # achievements.* (Modify)
```

---

## Task 1: Migration — tables + RLS + Realtime

**Files:** Create `supabase/migrations/20260604_achievements_schema.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- achievement_definitions: read-only catalog (seeded), authenticated read of active rows.
create table if not exists public.achievement_definitions (
  id              text primary key,
  name_key        text not null,
  description_key text not null,
  sprite_id       text not null,
  rarity          text not null check (rarity in ('common','rare','epic','legendary')),
  trigger_rule    jsonb not null,
  sort_order      int  not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
alter table public.achievement_definitions enable row level security;
create policy ad_select_active on public.achievement_definitions
  for select to authenticated using (is_active);

-- user_achievements: per-user unlocks. SELECT own only; NO write policy (RPC-only = anti-cheat).
create table if not exists public.user_achievements (
  user_id        uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievement_definitions(id),
  unlocked_at    timestamptz not null default now(),
  trip_id        uuid references public.trips(id) on delete set null,
  primary key (user_id, achievement_id)
);
alter table public.user_achievements enable row level security;
create policy ua_select_own on public.user_achievements
  for select to authenticated using (user_id = auth.uid());

-- Realtime: client subscribes to INSERTs on user_achievements (RLS still filters to own rows).
alter publication supabase_realtime add table public.user_achievements;
```

- [ ] **Step 2: Apply to prod** — `mcp__472a285c-8015-423f-bab3-4c3f82a99890__apply_migration` with name `achievements_schema` and the SQL above. ⚠️ Prod DDL on `ewsoupkfkachxidmuwoi` — surface to the user before applying.

- [ ] **Step 3: Verify** — `mcp__472a285c-...__list_tables` (schema `public`) shows `achievement_definitions` + `user_achievements`; confirm `user_achievements` has exactly one policy (`ua_select_own`, SELECT).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260604_achievements_schema.sql
git commit -m "feat(achievements): tables + RLS + realtime publication (6A)"
git push origin main
```

---

## Task 2: Migration — evaluation RPC

**Files:** Create `supabase/migrations/20260604_achievements_eval.sql`

- [ ] **Step 1: Write the RPC SQL** (metric SQL resolved against real columns — see spec §4)

```sql
-- Internal evaluator: param-driven, SECURITY DEFINER, NOT granted to clients.
create or replace function public._evaluate_achievements(p_uid uuid)
returns setof public.user_achievements
language plpgsql security definer set search_path = public as $$
begin
  if p_uid is null then return; end if;
  return query
  with m as (
    select jsonb_build_object(
      'trips_created',            (select count(*) from trips where owner_id = p_uid),
      'milestones_created',       (select count(*) from milestones where created_by = p_uid),
      'checkins',                 (select count(*) from checkins where user_id = p_uid),
      'companions_invited',       (select count(*) from trip_invitations where invited_by = p_uid),
      'documents_uploaded',       (select count(*) from documents where uploaded_by = p_uid),
      'checklist_items_completed',(select count(*) from checklist_item_completions where user_id = p_uid),
      'boss_checkins',            (select count(*) from checkins c
                                     join milestones mi on mi.id = c.milestone_id
                                    where c.user_id = p_uid and mi.is_boss is true),
      'max_trip_members',         (select coalesce(max(cnt),0) from (
                                     select count(*) cnt from trip_members tm2
                                     where tm2.trip_id in (select trip_id from trip_members where user_id = p_uid)
                                     group by tm2.trip_id) s),
      'countries_visited',        (select count(distinct t.destination_country)
                                    from trips t
                                    join trip_members tm on tm.trip_id = t.id and tm.user_id = p_uid
                                    where t.destination_country is not null
                                      and exists (select 1 from checkins c
                                                  join milestones mi on mi.id = c.milestone_id
                                                  where mi.trip_id = t.id and c.user_id = p_uid)),
      'completed_trips',          (select count(*) from trips t
                                    join trip_members tm on tm.trip_id = t.id and tm.user_id = p_uid
                                    where t.end_date is not null and t.end_date < now()
                                      and exists (select 1 from milestones mi where mi.trip_id = t.id)
                                      and not exists (select 1 from milestones mi where mi.trip_id = t.id
                                          and not exists (select 1 from checkins c where c.milestone_id = mi.id))),
      'checklists_completed',     (select count(*) from trip_checklists tc
                                    join trip_members tm on tm.trip_id = tc.trip_id and tm.user_id = p_uid
                                    where exists (select 1 from checklist_items ci where ci.checklist_id = tc.id)
                                      and not exists (
                                        select 1 from checklist_items ci where ci.checklist_id = tc.id
                                        and not (
                                          (ci.scope = 'shared' and ci.is_done is true)
                                          or (ci.scope <> 'shared' and exists (
                                                select 1 from checklist_item_completions cc
                                                where cc.item_id = ci.id and cc.user_id = p_uid))
                                        ))),
      'identity_verified',        (select (is_verified is true or identity_verified_at is not null)
                                    from profiles where id = p_uid)
    ) as metrics
  )
  insert into public.user_achievements (user_id, achievement_id)
  select p_uid, d.id
  from public.achievement_definitions d, m
  where d.is_active
    and (
      (d.trigger_rule->>'type' = 'count'
        and (m.metrics->>(d.trigger_rule->>'metric'))::numeric >= (d.trigger_rule->>'gte')::numeric)
      or
      (d.trigger_rule->>'type' = 'boolean'
        and coalesce((m.metrics->>(d.trigger_rule->>'metric'))::boolean, false)
            = (d.trigger_rule->>'value')::boolean)
    )
    and not exists (select 1 from public.user_achievements ua
                    where ua.user_id = p_uid and ua.achievement_id = d.id)
  on conflict (user_id, achievement_id) do nothing
  returning *;
end $$;
revoke all on function public._evaluate_achievements(uuid) from public;

-- Public wrapper: derives the user from the session (no IDOR), the only client-callable entry.
create or replace function public.evaluate_achievements()
returns setof public.user_achievements
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  return query select * from public._evaluate_achievements(auth.uid());
end $$;
revoke all on function public.evaluate_achievements() from public;
grant execute on function public.evaluate_achievements() to authenticated;
```

- [ ] **Step 2: Apply** via `apply_migration` name `achievements_eval`.
- [ ] **Step 3: Verify** — `mcp__472a285c-...__execute_sql`: `select public.evaluate_achievements();` as an authenticated context returns 0 rows without error (no definitions yet → no-op). Confirm `_evaluate_achievements` is **not** executable by `authenticated` (`select has_function_privilege('authenticated','public._evaluate_achievements(uuid)','execute')` = false).
- [ ] **Step 4: Commit** `feat(achievements): server-authoritative evaluate RPC (6A)` + push.

---

## Task 3: Migration — triggers

**Files:** Create `supabase/migrations/20260604_achievements_triggers.sql`

- [ ] **Step 1: Write trigger fns + triggers** (one fn per source table; maps the row to its owning user)

```sql
-- helper macro pattern: each fn perform-calls the evaluator for the row's user, returns null (AFTER).
create or replace function public._ach_after_checkins() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.user_id); return null; end $$;
create or replace function public._ach_after_milestones() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.created_by); return null; end $$;
create or replace function public._ach_after_trips() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.owner_id); return null; end $$;
create or replace function public._ach_after_invitations() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.invited_by); return null; end $$;
create or replace function public._ach_after_documents() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.uploaded_by); return null; end $$;
create or replace function public._ach_after_completions() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.user_id); return null; end $$;
create or replace function public._ach_after_members() returns trigger
  language plpgsql security definer set search_path = public as
  $$ begin perform public._evaluate_achievements(new.user_id); return null; end $$;

revoke all on function public._ach_after_checkins() from public;
revoke all on function public._ach_after_milestones() from public;
revoke all on function public._ach_after_trips() from public;
revoke all on function public._ach_after_invitations() from public;
revoke all on function public._ach_after_documents() from public;
revoke all on function public._ach_after_completions() from public;
revoke all on function public._ach_after_members() from public;

create trigger trg_ach_checkins    after insert on public.checkins
  for each row execute function public._ach_after_checkins();
create trigger trg_ach_milestones  after insert on public.milestones
  for each row execute function public._ach_after_milestones();
create trigger trg_ach_trips       after insert on public.trips
  for each row execute function public._ach_after_trips();
create trigger trg_ach_invitations after insert on public.trip_invitations
  for each row execute function public._ach_after_invitations();
create trigger trg_ach_documents   after insert on public.documents
  for each row execute function public._ach_after_documents();
create trigger trg_ach_completions after insert on public.checklist_item_completions
  for each row execute function public._ach_after_completions();
create trigger trg_ach_members     after insert on public.trip_members
  for each row execute function public._ach_after_members();
```

> Note: `party_of_4` (max_trip_members) and `verified_traveler` (a `profiles` UPDATE) for _other_ users settle on their next client catch-up rather than via these INSERT triggers — acceptable per spec ADR 6A-2.

- [ ] **Step 2: Apply** via `apply_migration` name `achievements_triggers`.
- [ ] **Step 3: Verify** — `execute_sql`: `select count(*) from pg_trigger where tgname like 'trg_ach_%';` returns 7.
- [ ] **Step 4: Commit** `feat(achievements): AFTER INSERT triggers wire evaluator (6A)` + push.

---

## Task 4: Migration — seed 20 definitions + regen types

**Files:** Create `supabase/migrations/20260604_achievements_seed.sql`; Modify `src/core/supabase/types.ts`

- [ ] **Step 1: Write the seed** (ids/rarities/rules must match spec §5 exactly)

```sql
insert into public.achievement_definitions (id, name_key, description_key, sprite_id, rarity, trigger_rule, sort_order) values
('first_trip',        'achievements.defs.first_trip.name','achievements.defs.first_trip.description','badge_first_trip','common','{"type":"count","metric":"trips_created","gte":1}'::jsonb, 10),
('first_milestone',   'achievements.defs.first_milestone.name','achievements.defs.first_milestone.description','badge_first_milestone','common','{"type":"count","metric":"milestones_created","gte":1}'::jsonb, 20),
('first_checkin',     'achievements.defs.first_checkin.name','achievements.defs.first_checkin.description','badge_first_checkin','common','{"type":"count","metric":"checkins","gte":1}'::jsonb, 30),
('squad_up',          'achievements.defs.squad_up.name','achievements.defs.squad_up.description','badge_squad_up','common','{"type":"count","metric":"companions_invited","gte":1}'::jsonb, 40),
('first_doc',         'achievements.defs.first_doc.name','achievements.defs.first_doc.description','badge_first_doc','common','{"type":"count","metric":"documents_uploaded","gte":1}'::jsonb, 50),
('checklist_starter', 'achievements.defs.checklist_starter.name','achievements.defs.checklist_starter.description','badge_checklist_starter','common','{"type":"count","metric":"checklist_items_completed","gte":1}'::jsonb, 60),
('trip_planner_5',    'achievements.defs.trip_planner_5.name','achievements.defs.trip_planner_5.description','badge_trip_planner_5','rare','{"type":"count","metric":"trips_created","gte":5}'::jsonb, 70),
('pathfinder_25',     'achievements.defs.pathfinder_25.name','achievements.defs.pathfinder_25.description','badge_pathfinder_25','rare','{"type":"count","metric":"milestones_created","gte":25}'::jsonb, 80),
('explorer_10',       'achievements.defs.explorer_10.name','achievements.defs.explorer_10.description','badge_explorer_10','rare','{"type":"count","metric":"checkins","gte":10}'::jsonb, 90),
('party_of_4',        'achievements.defs.party_of_4.name','achievements.defs.party_of_4.description','badge_party_of_4','rare','{"type":"count","metric":"max_trip_members","gte":4}'::jsonb, 100),
('archivist_10',      'achievements.defs.archivist_10.name','achievements.defs.archivist_10.description','badge_archivist_10','rare','{"type":"count","metric":"documents_uploaded","gte":10}'::jsonb, 110),
('fully_packed',      'achievements.defs.fully_packed.name','achievements.defs.fully_packed.description','badge_fully_packed','rare','{"type":"count","metric":"checklists_completed","gte":1}'::jsonb, 120),
('countries_3',       'achievements.defs.countries_3.name','achievements.defs.countries_3.description','badge_countries_3','rare','{"type":"count","metric":"countries_visited","gte":3}'::jsonb, 130),
('boss_slayer',       'achievements.defs.boss_slayer.name','achievements.defs.boss_slayer.description','badge_boss_slayer','rare','{"type":"count","metric":"boss_checkins","gte":1}'::jsonb, 140),
('globetrotter_25',   'achievements.defs.globetrotter_25.name','achievements.defs.globetrotter_25.description','badge_globetrotter_25','epic','{"type":"count","metric":"checkins","gte":25}'::jsonb, 150),
('countries_5',       'achievements.defs.countries_5.name','achievements.defs.countries_5.description','badge_countries_5','epic','{"type":"count","metric":"countries_visited","gte":5}'::jsonb, 160),
('journey_complete',  'achievements.defs.journey_complete.name','achievements.defs.journey_complete.description','badge_journey_complete','epic','{"type":"count","metric":"completed_trips","gte":1}'::jsonb, 170),
('verified_traveler', 'achievements.defs.verified_traveler.name','achievements.defs.verified_traveler.description','badge_verified_traveler','epic','{"type":"boolean","metric":"identity_verified","value":true}'::jsonb, 180),
('countries_10',      'achievements.defs.countries_10.name','achievements.defs.countries_10.description','badge_countries_10','legendary','{"type":"count","metric":"countries_visited","gte":10}'::jsonb, 190),
('legend_10_trips',   'achievements.defs.legend_10_trips.name','achievements.defs.legend_10_trips.description','badge_legend_10_trips','legendary','{"type":"count","metric":"trips_created","gte":10}'::jsonb, 200)
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply** via `apply_migration` name `achievements_seed`.
- [ ] **Step 3: Verify** — `execute_sql`: `select count(*) from achievement_definitions;` = 20; `select count(distinct rarity) ...` = 4.
- [ ] **Step 4: Regen types** — `mcp__472a285c-...__generate_typescript_types`, write output to `src/core/supabase/types.ts` (overwrite). Confirm `achievement_definitions` + `user_achievements` now appear and `evaluate_achievements` is in the `Functions` block.
- [ ] **Step 5: Commit** `feat(achievements): seed 20 definitions + regen types (6A)` + push.

---

## Task 5: `types.ts` + `rarity.ts` (pure) + tests

**Files:** Create `src/features/achievements/types.ts`, `src/features/achievements/rarity.ts`, `src/features/achievements/__tests__/rarity.test.ts`

- [ ] **Step 1: Write the failing test** (`__tests__/rarity.test.ts`)

```ts
import { isCinematicRarity, rarityRank, RARITY_FRAME } from '../rarity';

describe('rarity', () => {
  it('treats rare/epic/legendary as cinematic, common + unknown as not', () => {
    expect(isCinematicRarity('rare')).toBe(true);
    expect(isCinematicRarity('epic')).toBe(true);
    expect(isCinematicRarity('legendary')).toBe(true);
    expect(isCinematicRarity('common')).toBe(false);
    expect(isCinematicRarity('mythic')).toBe(false);
  });
  it('ranks rarities ascending and clamps unknown to 0', () => {
    expect(rarityRank('common')).toBe(0);
    expect(rarityRank('legendary')).toBe(3);
    expect(rarityRank('nope')).toBe(0);
  });
  it('has a frame class for every rarity', () => {
    (['common', 'rare', 'epic', 'legendary'] as const).forEach((r) =>
      expect(typeof RARITY_FRAME[r]).toBe('string'),
    );
  });
});
```

- [ ] **Step 2: Run → fail** `npm test -- rarity` → FAIL (module not found).
- [ ] **Step 3: Implement** `types.ts`:

```ts
import type { Database } from '@core/supabase/types';

export type AchievementDefinition = Database['public']['Tables']['achievement_definitions']['Row'];
export type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface AchievementWithStatus extends AchievementDefinition {
  unlocked: boolean;
  unlockedAt: string | null;
}
```

`rarity.ts`:

```ts
import type { Rarity } from './types';

export const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'] as const;
const CINEMATIC = new Set<string>(['rare', 'epic', 'legendary']);

export function isCinematicRarity(rarity: string): boolean {
  return CINEMATIC.has(rarity);
}
export function rarityRank(rarity: string): number {
  const i = RARITIES.indexOf(rarity as Rarity);
  return i < 0 ? 0 : i;
}
export const RARITY_FRAME: Record<Rarity, string> = {
  common: 'border-border bg-surface-alt',
  rare: 'border-sky-700 bg-sky-500',
  epic: 'border-secondary-700 bg-secondary-500',
  legendary: 'border-accent-700 bg-accent-500',
};
```

- [ ] **Step 4: Run → pass** `npm test -- rarity` → PASS.
- [ ] **Step 5: Commit** `feat(achievements): rarity vocab + types (6A)` + push.

---

## Task 6: `achievementStatus.ts` (pure) + tests

**Files:** Create `src/features/achievements/achievementStatus.ts`, `__tests__/achievementStatus.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { mergeStatus, unlockedCount } from '../achievementStatus';
import type { AchievementDefinition, UserAchievement } from '../types';

const def = (id: string, sort_order: number): AchievementDefinition => ({
  id,
  name_key: `n.${id}`,
  description_key: `d.${id}`,
  sprite_id: `s.${id}`,
  rarity: 'common',
  trigger_rule: { type: 'count', metric: 'checkins', gte: 1 },
  sort_order,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
});
const unlock = (achievement_id: string): UserAchievement => ({
  user_id: 'u1',
  achievement_id,
  unlocked_at: '2026-02-02T00:00:00Z',
  trip_id: null,
});

describe('achievementStatus', () => {
  it('merges by sort_order and flags unlocked + date', () => {
    const out = mergeStatus([def('b', 20), def('a', 10)], [unlock('a')]);
    expect(out.map((o) => o.id)).toEqual(['a', 'b']);
    expect(out[0]).toMatchObject({ unlocked: true, unlockedAt: '2026-02-02T00:00:00Z' });
    expect(out[1]).toMatchObject({ unlocked: false, unlockedAt: null });
  });
  it('counts unlocked', () => {
    expect(unlockedCount(mergeStatus([def('a', 1), def('b', 2)], [unlock('a')]))).toBe(1);
  });
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

```ts
import type { AchievementDefinition, AchievementWithStatus, UserAchievement } from './types';

export function mergeStatus(
  defs: AchievementDefinition[],
  unlocks: UserAchievement[],
): AchievementWithStatus[] {
  const byId = new Map(unlocks.map((u) => [u.achievement_id, u]));
  return [...defs]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((d) => ({
      ...d,
      unlocked: byId.has(d.id),
      unlockedAt: byId.get(d.id)?.unlocked_at ?? null,
    }));
}
export function unlockedCount(list: AchievementWithStatus[]): number {
  return list.filter((x) => x.unlocked).length;
}
```

- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit** `feat(achievements): status merge util (6A)` + push.

---

## Task 7: `seenSet.ts` + `metrics.ts` + `badges.ts` + tests

**Files:** Create `src/features/achievements/seenSet.ts`, `metrics.ts`, `badges.ts`, `__tests__/seenSet.test.ts`

> AsyncStorage is already a dependency (used by `documents/offlineCache`). Mirror that import.

- [ ] **Step 1: Failing test** (`seenSet.test.ts` — the pure `filterUnseen`)

```ts
import { filterUnseen } from '../seenSet';

describe('filterUnseen', () => {
  it('keeps only ids not in the seen set', () => {
    expect(filterUnseen(['a', 'b', 'c'], new Set(['b']))).toEqual(['a', 'c']);
    expect(filterUnseen(['a'], new Set(['a']))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** `seenSet.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'achievements.seen.v1';

export function filterUnseen(ids: string[], seen: Set<string>): string[] {
  return ids.filter((id) => !seen.has(id));
}
export async function loadSeen(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}
export async function markSeen(seen: Set<string>, ids: string[]): Promise<Set<string>> {
  const next = new Set(seen);
  ids.forEach((id) => next.add(id));
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify([...next]));
  } catch {
    /* best-effort */
  }
  return next;
}
```

`metrics.ts` (single source of truth for the contract test — must equal the keys in the eval migration):

```ts
export const METRIC_VOCAB = [
  'trips_created',
  'milestones_created',
  'checkins',
  'companions_invited',
  'documents_uploaded',
  'checklist_items_completed',
  'boss_checkins',
  'max_trip_members',
  'countries_visited',
  'completed_trips',
  'checklists_completed',
  'identity_verified',
] as const;
export type Metric = (typeof METRIC_VOCAB)[number];
```

`badges.ts` (placeholder manifest — 20 sprite ids the seed references):

```ts
// Placeholder badge manifest. Real pixel-art drops in later keyed by these ids (spec ADR 6A-8).
export const BADGE_IDS = [
  'badge_first_trip',
  'badge_first_milestone',
  'badge_first_checkin',
  'badge_squad_up',
  'badge_first_doc',
  'badge_checklist_starter',
  'badge_trip_planner_5',
  'badge_pathfinder_25',
  'badge_explorer_10',
  'badge_party_of_4',
  'badge_archivist_10',
  'badge_fully_packed',
  'badge_countries_3',
  'badge_boss_slayer',
  'badge_globetrotter_25',
  'badge_countries_5',
  'badge_journey_complete',
  'badge_verified_traveler',
  'badge_countries_10',
  'badge_legend_10_trips',
] as const;
```

- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit** `feat(achievements): seen-set + metric vocab + badge manifest (6A)` + push.

---

## Task 8: `api.ts`

**Files:** Create `src/features/achievements/api.ts` (mirror `smart-reminders/api`)

- [ ] **Step 1: Implement** (thin wrappers; throw on error)

```ts
import { supabase } from '@core/supabase/client';

import type { AchievementDefinition, UserAchievement } from './types';

export async function fetchDefinitions(): Promise<AchievementDefinition[]> {
  const { data, error } = await supabase
    .from('achievement_definitions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data ?? [];
}
export async function fetchMyAchievements(): Promise<UserAchievement[]> {
  const { data, error } = await supabase.from('user_achievements').select('*');
  if (error) throw error;
  return data ?? [];
}
export async function evaluateAchievements(): Promise<UserAchievement[]> {
  const { data, error } = await supabase.rpc('evaluate_achievements');
  if (error) throw error;
  return (data ?? []) as UserAchievement[];
}
```

- [ ] **Step 2: Typecheck** `npm run typecheck` → PASS (confirms regen types include the RPC + tables).
- [ ] **Step 3: Commit** `feat(achievements): api (defs/unlocks/evaluate) (6A)` + push.

---

## Task 9: query hooks

**Files:** Create `src/features/achievements/hooks/useAchievements.ts` (mirror `useSmartReminders`)

- [ ] **Step 1: Implement**

```ts
import { useQuery } from '@tanstack/react-query';

import { fetchDefinitions, fetchMyAchievements } from '../api';

export const achievementDefsKey = ['achievements', 'defs'] as const;
export const myAchievementsKey = ['achievements', 'mine'] as const;

export function useAchievementDefinitions() {
  return useQuery({ queryKey: achievementDefsKey, queryFn: fetchDefinitions, staleTime: Infinity });
}
export function useMyAchievements() {
  return useQuery({ queryKey: myAchievementsKey, queryFn: fetchMyAchievements });
}
```

- [ ] **Step 2: Typecheck → PASS.**
- [ ] **Step 3: Commit** `feat(achievements): query hooks (6A)` + push.

---

## Task 10: `useAchievementUnlocks` (realtime + catch-up + queue)

**Files:** Create `src/features/achievements/hooks/useAchievementUnlocks.ts` (mirror realtime idiom from `useTripChannel`)

- [ ] **Step 1: Implement**

```ts
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@core/supabase/client';

import { evaluateAchievements } from '../api';
import { filterUnseen, loadSeen, markSeen } from '../seenSet';
import { myAchievementsKey, useAchievementDefinitions } from './useAchievements';

export interface UnlockEvent {
  id: string;
  rarity: string;
}

/** Detects newly-unlocked achievements (catch-up RPC on mount + Realtime INSERTs),
 *  dedupes via a persisted seen-set, and exposes them one at a time. */
export function useAchievementUnlocks(userId: string | null) {
  const qc = useQueryClient();
  const { data: defs = [] } = useAchievementDefinitions();
  const [queue, setQueue] = useState<UnlockEvent[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const rarityById = useRef<Map<string, string>>(new Map());

  rarityById.current = new Map(defs.map((d) => [d.id, d.rarity]));

  const enqueue = useCallback(async (ids: string[]) => {
    const fresh = filterUnseen(ids, seenRef.current);
    if (fresh.length === 0) return;
    seenRef.current = await markSeen(seenRef.current, fresh);
    setQueue((q) => [
      ...q,
      ...fresh.map((id) => ({ id, rarity: rarityById.current.get(id) ?? 'common' })),
    ]);
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    (async () => {
      seenRef.current = await loadSeen();
      const unlocked = await evaluateAchievements().catch(() => []);
      void qc.invalidateQueries({ queryKey: myAchievementsKey });
      if (!cancelled && unlocked.length) await enqueue(unlocked.map((u) => u.achievement_id));
    })();

    const channel = supabase
      .channel(`achievements:${userId}`, { config: { private: true } })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { achievement_id?: string };
          if (row?.achievement_id) {
            void enqueue([row.achievement_id]);
            void qc.invalidateQueries({ queryKey: myAchievementsKey });
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId, qc, enqueue]);

  const dequeue = useCallback(() => setQueue((q) => q.slice(1)), []);
  return { current: queue[0] ?? null, dequeue };
}
```

- [ ] **Step 2: Typecheck → PASS.**
- [ ] **Step 3: Commit** `feat(achievements): unlock detection hook (realtime + catch-up) (6A)` + push.

---

## Task 11: `AchievementBadge` + test

**Files:** Create `src/features/achievements/components/AchievementBadge.tsx`, `__tests__/AchievementBadge.test.tsx` (mirror `SmartTipCard` idiom: NativeWind + PixelText + PixelCard)

- [ ] **Step 1: Failing test**

```tsx
import { render } from '@testing-library/react-native';

import { AchievementBadge } from '../components/AchievementBadge';
import type { AchievementWithStatus } from '../types';

const base: AchievementWithStatus = {
  id: 'first_trip',
  name_key: 'achievements.defs.first_trip.name',
  description_key: 'achievements.defs.first_trip.description',
  sprite_id: 'badge_first_trip',
  rarity: 'common',
  trigger_rule: {},
  sort_order: 10,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  unlocked: false,
  unlockedAt: null,
};

describe('AchievementBadge', () => {
  it('renders locked vs unlocked testIDs', () => {
    const locked = render(<AchievementBadge def={base} />);
    expect(locked.getByTestId('badge-first_trip-locked')).toBeTruthy();
    const unlocked = render(<AchievementBadge def={{ ...base, unlocked: true }} />);
    expect(unlocked.getByTestId('badge-first_trip-unlocked')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** — a square tile: rarity frame (`RARITY_FRAME[rarity]`), placeholder glyph = first letter of the translated name, name caption; locked → `opacity-40` + lock affordance. `testID={`badge-${def.id}-${def.unlocked ? 'unlocked' : 'locked'}`}`.

```tsx
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import { RARITY_FRAME } from '../rarity';
import type { AchievementWithStatus, Rarity } from '../types';

export function AchievementBadge({ def }: { def: AchievementWithStatus }) {
  const { t } = useTranslation();
  const name = t(def.name_key);
  const frame = RARITY_FRAME[def.rarity as Rarity] ?? RARITY_FRAME.common;
  return (
    <View
      testID={`badge-${def.id}-${def.unlocked ? 'unlocked' : 'locked'}`}
      className={`w-24 items-center ${def.unlocked ? '' : 'opacity-40'}`}
    >
      <View className={`h-16 w-16 items-center justify-center rounded-lg border-2 ${frame}`}>
        <PixelText size="h2">{def.unlocked ? name.slice(0, 1).toUpperCase() : '?'}</PixelText>
      </View>
      <PixelText size="caption" className="mt-1 text-center" numberOfLines={2}>
        {name}
      </PixelText>
    </View>
  );
}
```

- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit** `feat(achievements): AchievementBadge (6A)` + push.

---

## Task 12: `AchievementToast` (common unlock)

**Files:** Create `src/features/achievements/components/AchievementToast.tsx`

- [ ] **Step 1: Implement** — a Reanimated fade/slide-in card pinned bottom; auto-calls `onDone` after `durationMs` (default 1200, injectable for test); reuse the coin-burst idiom from `features/milestones` `CheckinAnim` (import if exported, else a simple accent badge). Props `{ name: string; onDone: () => void; durationMs?: number }`. Calls `playUnlockSfx('common')` (Task 13 stub). `testID="achievement-toast"`.
- [ ] **Step 2: Test** — render with `durationMs={10}`, fake timers, assert `onDone` called after advancing timers.
- [ ] **Step 3: Run → pass; Commit** `feat(achievements): AchievementToast (6A)` + push.

---

## Task 13: `WorldClearCinematic` (rare+ unlock) + sound stub

**Files:** Create `src/features/achievements/components/WorldClearCinematic.tsx`, `src/features/achievements/sound.ts`

- [ ] **Step 1: Sound stub** `sound.ts`:

```ts
// 6C wires real audio (expo-av). Until then this is intentionally a no-op.
export function playUnlockSfx(_rarity: string): void {
  /* no-op until Phase 6C */
}
```

- [ ] **Step 2: Implement cinematic** — full-screen `Modal`/absolute overlay, 2.5s auto-dismiss (injectable `durationMs`), **tap anywhere → skip → onDone**. Skia radial burst tinted by `RARITY_FRAME`/rarity; badge + `t(name_key)` + `t(description_key)`. On mount: read `AccessibilityInfo.isReduceMotionEnabled()`; if true → render a static reveal card (no animation) but same content + auto-dismiss. Calls `playUnlockSfx(rarity)` once on mount. Props `{ id: string; nameKey: string; descriptionKey: string; rarity: string; onDone: () => void; durationMs?: number }`. `testID="worldclear-cinematic"`, skip button `testID="worldclear-skip"`.
- [ ] **Step 3: Test** — render with `durationMs={10}`, fake timers → `onDone` fires; press `worldclear-skip` → `onDone` fires immediately. Mock `AccessibilityInfo.isReduceMotionEnabled` both branches render `worldclear-cinematic`.
- [ ] **Step 4: Run → pass; Commit** `feat(achievements): WorldClearCinematic + muted sound hook (6A)` + push.

---

## Task 14: `AchievementUnlockPresenter` + test

**Files:** Create `src/features/achievements/components/AchievementUnlockPresenter.tsx`, `__tests__/presenter.test.tsx`

- [ ] **Step 1: Failing test** — mock `useAchievementUnlocks` to return a `current` common event then null; assert toast renders; mock a `rare` event → assert cinematic renders; assert `dequeue` called on `onDone`.

```tsx
import { fireEvent, render } from '@testing-library/react-native';

import { AchievementUnlockPresenter } from '../components/AchievementUnlockPresenter';

const dequeue = jest.fn();
jest.mock('../hooks/useAchievementUnlocks', () => ({
  useAchievementUnlocks: () => mockState,
}));
let mockState: { current: { id: string; rarity: string } | null; dequeue: () => void };

describe('AchievementUnlockPresenter', () => {
  beforeEach(() => dequeue.mockClear());
  it('routes common → toast, rare → cinematic', () => {
    mockState = { current: { id: 'first_trip', rarity: 'common' }, dequeue };
    const a = render(<AchievementUnlockPresenter userId="u1" />);
    expect(a.getByTestId('achievement-toast')).toBeTruthy();

    mockState = { current: { id: 'countries_5', rarity: 'epic' }, dequeue };
    const b = render(<AchievementUnlockPresenter userId="u1" />);
    expect(b.getByTestId('worldclear-cinematic')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement** — derive `name_key`/`description_key` for `current.id` from `useAchievementDefinitions`; `isCinematicRarity(current.rarity)` → `WorldClearCinematic`, else `AchievementToast`; both `onDone={dequeue}`. Render null when `!current`.

```tsx
import { useAchievementDefinitions } from '../hooks/useAchievements';
import { useAchievementUnlocks } from '../hooks/useAchievementUnlocks';
import { isCinematicRarity } from '../rarity';
import { AchievementToast } from './AchievementToast';
import { WorldClearCinematic } from './WorldClearCinematic';

export function AchievementUnlockPresenter({ userId }: { userId: string | null }) {
  const { current, dequeue } = useAchievementUnlocks(userId);
  const { data: defs = [] } = useAchievementDefinitions();
  if (!current) return null;
  const def = defs.find((d) => d.id === current.id);
  if (isCinematicRarity(current.rarity)) {
    return (
      <WorldClearCinematic
        id={current.id}
        nameKey={def?.name_key ?? ''}
        descriptionKey={def?.description_key ?? ''}
        rarity={current.rarity}
        onDone={dequeue}
      />
    );
  }
  return <AchievementToast name={def?.name_key ?? ''} onDone={dequeue} />;
}
```

> Note: pass the **translated** name into the toast — adjust to `t(def?.name_key)` inside the toast or here; keep one approach (translate in the leaf component, consistent with `SmartTipCard`).

- [ ] **Step 4: Run → pass; Commit** `feat(achievements): unlock presenter (6A)` + push.

---

## Task 15: `AchievementsScreen` + barrel

**Files:** Create `src/features/achievements/screens/AchievementsScreen.tsx`, `src/features/achievements/index.ts`

- [ ] **Step 1: Implement screen** — `useAchievementDefinitions()` + `useMyAchievements()` → `mergeStatus`; header `PixelText h1` title + `unlockedCount/total` via `t('achievements.screen.count', { count, total })`; `FlatList numColumns={3}` of `AchievementBadge`; loading + `ListEmptyComponent` (`achievements.screen.empty`). Mirror `(modals)/reminders.tsx` layout (safe-area, `SCREEN_PADDING`, `bg-cream`).
- [ ] **Step 2: Barrel** `index.ts`:

```ts
export { AchievementsScreen } from './screens/AchievementsScreen';
export { AchievementUnlockPresenter } from './components/AchievementUnlockPresenter';
export { AchievementBadge } from './components/AchievementBadge';
export { useAchievementDefinitions, useMyAchievements } from './hooks/useAchievements';
export type { AchievementWithStatus, Rarity } from './types';
```

- [ ] **Step 3: Test** — render `AchievementsScreen` inside a `QueryClientProvider` with mocked hooks; assert header + a known badge testID present.
- [ ] **Step 4: Run → pass; Commit** `feat(achievements): AchievementsScreen + barrel (6A)` + push.

---

## Task 16: Wiring — route, profile entry, root presenter

**Files:** Create `src/app/(modals)/achievements.tsx`; Modify `src/app/(tabs)/profile.tsx`, `src/app/_layout.tsx`

- [ ] **Step 1: Route** `(modals)/achievements.tsx`:

```tsx
import { AchievementsScreen } from '@features/achievements';

export default function AchievementsRoute() {
  return <AchievementsScreen />;
}
```

- [ ] **Step 2: Profile entry** — add a Pressable row in `profile.tsx` (mirror existing rows there) → `router.push('/achievements')`, label `t('achievements.screen.title')`, testID `profile-achievements-entry`.
- [ ] **Step 3: Mount presenter** — in `_layout.tsx`, where the session/user id is already available (same spot as Phase-4C notification registration), render `<AchievementUnlockPresenter userId={session?.user?.id ?? null} />` so unlocks surface app-wide. Confirm the existing session source variable name before wiring.
- [ ] **Step 4: Verify route registered** — `npm run typecheck`; manually confirm `/achievements` is a valid Expo Router path (file exists under `(modals)`).
- [ ] **Step 5: Commit** `feat(achievements): route + profile entry + root presenter (6A)` + push.

---

## Task 17: i18n keys (`achievements.*`, en + fr)

**Files:** Modify `src/core/i18n/locales/en.json`, `src/core/i18n/locales/fr.json`

- [ ] **Step 1: Add the `achievements` namespace** to both files. Structure:

```jsonc
"achievements": {
  "screen": { "title": "...", "count": "{{count}}/{{total}} unlocked", "empty": "..." },
  "locked": "Locked",
  "unlockedOn": "Unlocked {{date}}",
  "rarity": { "common": "...", "rare": "...", "epic": "...", "legendary": "..." },
  "cinematic": { "unlocked": "Achievement Unlocked!", "skip": "Tap to skip" },
  "toast": { "unlocked": "Unlocked!" },
  "defs": {
    "first_trip": { "name": "Bon Voyage", "description": "Create your first trip" },
    /* ...all 20 ids: first_milestone, first_checkin, squad_up, first_doc, checklist_starter,
       trip_planner_5, pathfinder_25, explorer_10, party_of_4, archivist_10, fully_packed,
       countries_3, boss_slayer, globetrotter_25, countries_5, journey_complete,
       verified_traveler, countries_10, legend_10_trips */
  }
}
```

Write real FR + EN copy for every key (no placeholders). Keys must match the seed `name_key`/`description_key` exactly (`achievements.defs.<id>.name|description`).

- [ ] **Step 2: Validate JSON** `npm test -- i18n` (existing i18n test must still pass — parity en/fr).
- [ ] **Step 3: Commit** `feat(achievements): i18n en+fr incl. 20 defs (6A)` + push.

---

## Task 18: Contract tests + final validation + docs

**Files:** Create `src/features/achievements/__tests__/contracts.test.ts`; Modify `CLAUDE.md`

- [ ] **Step 1: Write contract tests** (mirror `realtime/__tests__/contracts.test.ts`)

```ts
import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { BADGE_IDS } from '../badges';
import { METRIC_VOCAB } from '../metrics';

const FEATURE_DIR = path.join(__dirname, '..');
const MIGRATIONS = path.join(__dirname, '../../../../supabase/migrations');
const SEED = fs.readFileSync(path.join(MIGRATIONS, '20260604_achievements_seed.sql'), 'utf8');
const SCHEMA = fs.readFileSync(path.join(MIGRATIONS, '20260604_achievements_schema.sql'), 'utf8');
const EVAL = fs.readFileSync(path.join(MIGRATIONS, '20260604_achievements_eval.sql'), 'utf8');

function resolveKey(obj: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (a, p) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined),
      obj,
    );
}
// parse seed rows: ('id','name_key','desc_key','sprite_id','rarity','{json}', order)
const rows = [
  ...SEED.matchAll(
    /\('([a-z0-9_]+)',\s*'([^']+)',\s*'([^']+)',\s*'([a-z0-9_]+)',\s*'(common|rare|epic|legendary)',\s*'(\{[^']+\})'/g,
  ),
];

describe('achievements contracts', () => {
  it('seed has 20 rows', () => expect(rows.length).toBe(20));

  it('every def name_key + description_key resolves in en + fr', () => {
    for (const [, , nameKey, descKey] of rows) {
      for (const k of [nameKey, descKey]) {
        expect(typeof resolveKey(en, k)).toBe('string');
        expect(typeof resolveKey(fr, k)).toBe('string');
      }
    }
  });

  it('every def sprite_id is in BADGE_IDS', () => {
    for (const [, , , , spriteId] of rows)
      expect(BADGE_IDS as readonly string[]).toContain(spriteId);
  });

  it('every def trigger_rule.metric is in METRIC_VOCAB', () => {
    for (const [, , , , , , json] of rows) {
      const metric = (JSON.parse(json) as { metric: string }).metric;
      expect(METRIC_VOCAB as readonly string[]).toContain(metric);
    }
  });

  it('METRIC_VOCAB matches the jsonb keys defined in the eval migration', () => {
    const inEval = [...EVAL.matchAll(/'([a-z_]+)',\s*\(select/g)].map((m) => m[1]).sort();
    expect([...METRIC_VOCAB].sort()).toEqual(inEval);
  });

  it('rarities used in seed match the DB CHECK constraint', () => {
    const check = SCHEMA.match(/rarity\s+text\s+not null\s+check \(rarity in \(([^)]+)\)\)/i);
    const dbVals = [...check![1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
    const used = [...new Set(rows.map((r) => r[5]))].sort();
    used.forEach((r) => expect(dbVals).toContain(r));
  });

  it('user_achievements has no client write policy (RPC-only)', () => {
    expect(SCHEMA).not.toMatch(/on public\.user_achievements\s+for (insert|update|delete)/i);
    expect(SCHEMA).toMatch(/ua_select_own/);
  });

  it('every static t("achievements.*") key resolves in en + fr', () => {
    const keys = new Set<string>();
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const full = path.join(d, e.name);
        if (e.isDirectory()) {
          if (e.name !== '__tests__') walk(full);
        } else if (/\.(ts|tsx)$/.test(e.name)) {
          for (const m of fs
            .readFileSync(full, 'utf8')
            .matchAll(/t\(\s*[`'"]achievements\.([a-zA-Z0-9_.]+)[`'"]/g))
            keys.add(`achievements.${m[1]}`);
        }
      }
    };
    walk(FEATURE_DIR);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run all checks** `npm run typecheck && npm run lint && npm test` → all PASS. Fix any failures before continuing.
- [ ] **Step 3: Run Supabase advisors** — `mcp__472a285c-...__get_advisors` (security + performance); confirm no new ERROR/WARN beyond the known PostGIS/pg_net/auth baseline. Address any new SECURITY DEFINER / RLS finding.
- [ ] **Step 4: Update `CLAUDE.md`** — add a "Phase 6A (Achievements) done" line under Active phase (mirror the 5A/5B entries): tables + RLS + RPC + 7 triggers + 20 seed defs, tiered unlock UX, OTA-shippable, test count.
- [ ] **Step 5: Commit** `feat(achievements): contract tests + docs — Phase 6A complete` + push.

---

## Self-Review

**Spec coverage:** §2 ADRs → Tasks 1-4 (DB), 10 (detection), 14 (tiered UX), 5/7 (i18n keys, metric vocab), 11 (badge placeholder). §3 schema → Tasks 1-2. §4 metrics → Task 2 (all resolved to real columns). §5 twenty badges → Task 4 seed + Task 17 copy. §6 client units → Tasks 5-15. §7 UX → 12/13/14. §8 i18n → 17. §9 assets → 7 (badges manifest) + 11. §10 tests/security → 5-15 unit, 18 contracts, RLS in 1, advisors in 18. §11 open items → resolved in Task 2 SQL. §12 non-goals respected (no sound impl beyond stub, no passport/public-profile).

**Placeholder scan:** No "TBD/TODO" left as work. "Placeholder badge art" is a deliberate, documented design choice (ADR 6A-8) with a real fallback renderer (Task 11) — not an unfinished step. Task 16 Step 3 says "confirm the session source variable name" — that is a verify-before-edit instruction, not a code gap.

**Type consistency:** `evaluate_achievements()` (no-arg public) vs `_evaluate_achievements(uuid)` (internal) used consistently in Tasks 2/3/8/10. `UnlockEvent {id,rarity}` from Task 10 consumed unchanged in Task 14. `mergeStatus`/`unlockedCount` (Task 6) used in Task 15. `BADGE_IDS`/`METRIC_VOCAB` (Task 7) referenced in Task 18. Query keys `achievementDefsKey`/`myAchievementsKey` defined in Task 9, reused in Task 10.
