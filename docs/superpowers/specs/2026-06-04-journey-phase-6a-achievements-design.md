# Phase 6A — Achievements — Design

> Gamified badges: ~20 unlockable achievements evaluated server-side from data the user already
> generates (trips, milestones, check-ins, docs, checklists, countries), surfaced with a tiered
> unlock UX — a light coin-burst toast for common, a Mario "World Clear" cinematic for rare+.
>
> Date: 2026-06-04 · Status: approved design, pre-plan · Lens: architecture / ADRs
> Builds on: profiles.`badges`/`countries_visited` (Phase 1), milestones/`checkins` + boss flag
> (Phase 2), documents (4A), checklists/`checklist_item_completions` (4B), Realtime (Phase 5),
> Stripe Identity / `identity` (Phase 1.5), Skia + Reanimated (Phase 3). **No new native dep → OTA-shippable.**

## 1. Context

Master spec §5 (data model: `achievement_definitions` / `user_achievements`), §6.7 ("Achievement
unlock : Mario 'World Clear' cinematic 2.5s"), §6.8 (2.5s skippable, `prefers-reduced-motion`), §2.1
feature #15 ("Achievements / badges ~20 base, Mario world clear animation"), §11.5 onboarding
("Unlock first achievement after first milestone created"), §2.1 #88 (public profile shows badges).

Phase 6A is the first of three Phase-6 sub-projects (**6A Achievements** → 6B Adventurer Passport →
6C Sound + Haptics). 6A is **100% OTA**: it needs only DB objects + React/Skia/Reanimated, all
already in the stack. Sound for the unlock is left as a muted hook, wired in 6C.

**Product decisions (owner, 2026-06-04):**

1. **Evaluation runs DB-side** (server-authoritative, anti-cheat). The client never writes an unlock.
2. **Tiered unlock UX**: `common` → light toast; `rare`/`epic`/`legendary` → full-screen "World
   Clear" cinematic (2.5s, skippable).
3. Starter set of **20 achievements**, all keyed off data already tracked in Phases 0–5.

```
action (check-in / milestone / trip / invite / doc / checklist item)
  │  INSERT
  ▼
AFTER INSERT trigger ──PERFORM──► evaluate_achievements(uid)  [SECURITY DEFINER, in-DB]
                                        │ computes metrics from existing tables
                                        │ upserts user_achievements (idempotent)
                                        ▼
                                  user_achievements (INSERT)
                                        │ Realtime postgres_changes (my user_id)
                                        ▼
client: AchievementUnlockPresenter ──► toast (common) | WorldClearCinematic (rare+)
                                        (local seen-set dedupes; catch-up evaluate() on app open)
```

## 2. Architecture Decision Records

| ADR                             | Decision                                                                                                                                                                                                                                      | Rationale                                                                                                                                | Consequence                                                                         |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **6A-1** Eval location          | Rule logic lives **only** in a SECURITY DEFINER RPC `evaluate_achievements()`; client is read-only.                                                                                                                                           | Anti-cheat: unlocks must reflect real DB data, never client claims. Matches §5 "trigger achievement evaluation".                         | Client can't fabricate badges; one place for rule logic.                            |
| **6A-2** Invocation             | **AFTER INSERT triggers** on source tables `PERFORM evaluate_achievements(NEW.<user>)` (in-DB, no pg_net) **+** a client **catch-up** `evaluate_achievements()` on app/profile open.                                                          | Triggers cover live unlocks going forward; catch-up covers pre-existing data, offline, multi-device, and newly added definitions.        | Idempotent RPC tolerates being called from both paths.                              |
| **6A-3** Unlock detection       | Client subscribes **Realtime `postgres_changes`** (INSERT on `user_achievements`, filtered to `user_id=auth.uid()`) → enqueue to presenter. A **persisted local seen-set** dedupes the cinematic.                                             | Reuse the Phase-5 realtime stack; INSERT events are inherently new; seen-set prevents replay after catch-up refetch.                     | No new realtime infra; `useAchievementUnlocks` hook.                                |
| **6A-4** Tiered UX              | `common` → coin-burst **toast** (~1.2s); `rare`/`epic`/`legendary` → **`WorldClearCinematic`** (Skia/Reanimated, 2.5s, skippable, `prefers-reduced-motion` snaps to static).                                                                  | Spec wants the cinematic; reserving it for rare+ avoids fatigue when several commons fire at once. Uses the `rarity` field meaningfully. | Two presenters behind one queue; reduced-motion path.                               |
| **6A-5** i18n-keyed definitions | `achievement_definitions` stores `name_key`/`description_key` (i18n keys), **not** raw `name`/`description`.                                                                                                                                  | Commandment #12 — zero hardcoded strings; FR+EN day one.                                                                                 | Spec literal schema adjusted; contract test asserts every active def resolves keys. |
| **6A-6** Definitions in DB      | The 20 definitions are **seeded rows** (not a client config).                                                                                                                                                                                 | The RPC must read rules to evaluate; client reads the same table (public read) for display. New badges shippable via DB, no app update.  | Precedent: 18 KB rules (4D), 4 checklist templates (4B) are seeded too.             |
| **6A-7** DSL shape              | Primary rule form `{ "type":"count", "metric":"<name>", "gte":N }`, plus a trivial `{ "type":"boolean", "metric":"<name>", "value":true }` for status flags (e.g. `identity_verified`). RPC computes a fixed metric vocabulary then compares. | YAGNI — two evaluable shapes cover all 20; extend the metric list, not the engine.                                                       | Adding a metric = one SQL fragment; adding a badge = one seed row.                  |
| **6A-8** Badge art              | Wire `sprite_id`; ship **placeholder** rarity-framed badges (reuse existing sprites / colored frames).                                                                                                                                        | Real badge pixel-art is an asset task (human / later), like Phase-3 placeholder world backgrounds.                                       | `AchievementBadge` renders from sprite_id with a rarity frame fallback.             |

## 3. Data model

Two tables + one RPC + triggers. Migration applied to `ewsoupkfkachxidmuwoi`, then types regen.

### 3.1 `achievement_definitions`

```sql
CREATE TABLE public.achievement_definitions (
  id            text PRIMARY KEY,                       -- 'first_trip', 'countries_10', ...
  name_key      text NOT NULL,                          -- i18n key 'achievements.defs.first_trip.name'
  description_key text NOT NULL,                         -- i18n key '...first_trip.description'
  sprite_id     text NOT NULL,                          -- badge sprite id (placeholder for now)
  rarity        text NOT NULL CHECK (rarity IN ('common','rare','epic','legendary')),
  trigger_rule  jsonb NOT NULL,                         -- { type:'count', metric:'checkins', gte:10 }
  sort_order    int  NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY ad_select ON public.achievement_definitions
  FOR SELECT TO authenticated USING (is_active);     -- read-only catalog, no user write
```

### 3.2 `user_achievements`

```sql
CREATE TABLE public.user_achievements (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id text NOT NULL REFERENCES public.achievement_definitions(id),
  unlocked_at    timestamptz NOT NULL DEFAULT now(),
  trip_id        uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, achievement_id)
);
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ua_select_own ON public.user_achievements
  FOR SELECT TO authenticated USING (user_id = auth.uid());
-- NO INSERT/UPDATE/DELETE policy → only the SECURITY DEFINER RPC writes. Anti-cheat.
```

Realtime: add `user_achievements` to the `supabase_realtime` publication so the client receives INSERTs.

### 3.3 RPC `evaluate_achievements()`

```sql
CREATE OR REPLACE FUNCTION public.evaluate_achievements()
RETURNS SETOF public.user_achievements
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();           -- derived from session, NEVER a param → no IDOR
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  -- 1. compute metric vocabulary for uid (see §4) into a temp/CTE
  -- 2. INSERT unlocks for every active def whose rule passes and isn't already unlocked
  RETURN QUERY
  INSERT INTO public.user_achievements (user_id, achievement_id)
  SELECT uid, d.id FROM public.achievement_definitions d
  WHERE d.is_active
    AND rule_passes(d.trigger_rule, /* metrics for uid */)
    AND NOT EXISTS (SELECT 1 FROM public.user_achievements ua
                    WHERE ua.user_id = uid AND ua.achievement_id = d.id)
  ON CONFLICT (user_id, achievement_id) DO NOTHING
  RETURNING *;
END $$;
REVOKE ALL ON FUNCTION public.evaluate_achievements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_achievements() TO authenticated;
```

An internal `_evaluate_achievements(p_uid uuid)` variant (same body, param-driven, **not** granted to
`authenticated`) is what the triggers `PERFORM`, since triggers run without `auth.uid()`.

### 3.4 Triggers

`AFTER INSERT` on `checkins`, `milestones`, `trips`, `invitations`, `documents`,
`checklist_item_completions` → `PERFORM _evaluate_achievements(<row's owning user>)`. Each trigger
maps the inserted row to the user whose achievements may change. Trigger functions are SECURITY
DEFINER, REVOKEd from PUBLIC.

## 4. Metric vocabulary (computed in the RPC, all scoped to the user)

| metric                      | Source (to confirm against real columns at plan)                              | Confidence             |
| --------------------------- | ----------------------------------------------------------------------------- | ---------------------- |
| `trips_created`             | `trips` owned by user                                                         | high                   |
| `milestones_created`        | `milestones` in user's trips (or `created_by`)                                | **verify column**      |
| `checkins`                  | `checkins.user_id = uid`                                                      | high                   |
| `companions_invited`        | `invitations` sent by user                                                    | **verify column**      |
| `documents_uploaded`        | `documents` uploaded by user                                                  | **verify column**      |
| `checklist_items_completed` | `checklist_item_completions.user_id = uid`                                    | high                   |
| `checklists_completed`      | checklists where all items completed by user                                  | **complex — finalize** |
| `countries_visited`         | distinct country of checked-in milestones **or** `profiles.countries_visited` | **pick source**        |
| `max_trip_members`          | max member count across user's trips                                          | high                   |
| `boss_checkins`             | check-ins on `is_boss` milestones                                             | **verify boss column** |
| `completed_trips`           | trip past `end_date` with all milestones checked                              | **complex — finalize** |
| `identity_verified`         | Stripe Identity status (`profiles`/`identity`)                                | **verify source**      |

Metrics flagged **verify/complex** are finalized in the plan with `/architecture`; any whose data
isn't cleanly queryable will be simplified or its achievement deferred (logged, not silently dropped).

## 5. Starter achievements (20)

| rarity    | id                  | rule (`gte`)                  |
| --------- | ------------------- | ----------------------------- |
| common    | `first_trip`        | trips_created ≥ 1             |
| common    | `first_milestone`   | milestones_created ≥ 1        |
| common    | `first_checkin`     | checkins ≥ 1                  |
| common    | `squad_up`          | companions_invited ≥ 1        |
| common    | `first_doc`         | documents_uploaded ≥ 1        |
| common    | `checklist_starter` | checklist_items_completed ≥ 1 |
| rare      | `trip_planner_5`    | trips_created ≥ 5             |
| rare      | `pathfinder_25`     | milestones_created ≥ 25       |
| rare      | `explorer_10`       | checkins ≥ 10                 |
| rare      | `party_of_4`        | max_trip_members ≥ 4          |
| rare      | `archivist_10`      | documents_uploaded ≥ 10       |
| rare      | `fully_packed`      | checklists_completed ≥ 1      |
| rare      | `countries_3`       | countries_visited ≥ 3         |
| rare      | `boss_slayer`       | boss_checkins ≥ 1             |
| epic      | `globetrotter_25`   | checkins ≥ 25                 |
| epic      | `countries_5`       | countries_visited ≥ 5         |
| epic      | `journey_complete`  | completed_trips ≥ 1           |
| epic      | `verified_traveler` | identity_verified = true      |
| legendary | `countries_10`      | countries_visited ≥ 10        |
| legendary | `legend_10_trips`   | trips_created ≥ 10            |

(`verified_traveler` is a `{type:'boolean', metric:'identity_verified', value:true}` rule — the one
non-count rule; the DSL allows `type:'boolean'` as a trivial extension.)

## 6. Client feature `src/features/achievements/`

| Unit                         | Responsibility                                                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `api.ts`                     | fetch active definitions (public read), fetch my unlocks, call `evaluate_achievements` RPC                                         |
| `useAchievementDefinitions`  | TanStack query of the catalog                                                                                                      |
| `useMyAchievements`          | TanStack query of my unlocks (+ derived X/N, locked/unlocked sets)                                                                 |
| `useAchievementUnlocks`      | Realtime subscription on `user_achievements` → enqueue new unlocks; runs catch-up `evaluate()` on mount; persisted seen-set dedupe |
| `AchievementUnlockPresenter` | queue + overlay host; routes `common`→toast, `rare+`→cinematic                                                                     |
| `WorldClearCinematic`        | Skia/Reanimated 2.5s skippable; rarity-tinted; reduced-motion → static card; muted sound hook (6C)                                 |
| `AchievementToast`           | coin-burst toast (~1.2s) — reuse the Phase-2 `CheckinAnim` coin-burst idiom                                                        |
| `AchievementBadge`           | sprite + rarity frame; locked = silhouette/greyed                                                                                  |
| `AchievementsScreen`         | grid of all defs, locked vs unlocked (+date), rarity styling, header `X / N`                                                       |

Wiring: `AchievementUnlockPresenter` mounts once near the root (post-auth, like the Phase-4C
notification registration); `AchievementsScreen` is reachable from the **Profile** tab.

## 7. Unlock UX

- **common** → `AchievementToast`: coin-burst + badge + name, ~1.2s, non-blocking, stacks/queues.
- **rare/epic/legendary** → `WorldClearCinematic`: 2.5s, **skippable** (tap), rarity-tinted burst,
  badge reveal, name + description. `prefers-reduced-motion` → instant static reveal card.
- Multiple simultaneous unlocks queue; the catch-up sweep that finds many at once still respects the
  seen-set so already-celebrated badges don't replay.
- Sound: a `playUnlockSfx(rarity)` hook is called but **no-op until 6C**.

## 8. i18n (`achievements.*`, en + fr)

`title`, `unlockedCount` (`{count}/{total}`), `locked`, `unlockedOn` (`{date}`), `rarity.{common…legendary}`,
`cinematic.unlocked`, `toast.unlocked`, `skip`, `empty`, plus `defs.<id>.name` / `defs.<id>.description`
for all 20. Contract test asserts every **active** definition's `name_key`/`description_key` resolve in
both locales.

## 9. Assets

Badge art = **placeholder**: `AchievementBadge` renders the `sprite_id` if present in the sprite
manifest, else a rarity-colored frame with the achievement initial. A `achievements/manifest`
declares the 20 sprite_ids so real art can drop in later without code change. Real pixel-art badges
are a tracked asset task (not blocking 6A).

## 10. Tests & security

**Contract tests** (skill `auditing-runtime-contracts`):

- every active definition resolves `name_key` + `description_key` in en + fr;
- `rarity` values ↔ DB `CHECK` constraint;
- `trigger_rule.metric` ∈ the known metric vocabulary;
- `sprite_id` resolves in the achievements manifest;
- RLS: `authenticated` cannot `INSERT`/`UPDATE`/`DELETE` `user_achievements` (RPC-only).

**Unit/component**: rule-shape guard, `AchievementBadge` locked/unlocked, presenter queue routing
(common→toast, rare+→cinematic), reduced-motion path, `AchievementsScreen` render + X/N.

**RPC tests** (SQL, via execute_sql in a scratch assertion): idempotency (second call inserts 0),
threshold correctness (metric just below vs at `gte`), `evaluate_achievements()` uses `auth.uid()`
(cannot unlock for another user).

**Security**: RPC SECURITY DEFINER + `search_path=public`, `auth.uid()` internal (no IDOR), REVOKE
PUBLIC / GRANT authenticated; internal `_evaluate_achievements(uid)` not granted to authenticated;
`user_achievements` has no user-write policy; advisors run after migration.

## 11. Open items finalized at plan (with `/architecture`)

1. Exact SQL for each metric in §4 (column names; `checklists_completed`, `completed_trips`,
   `countries_visited` source, `identity_verified` source).
2. Which source tables actually need triggers (only those that can move a metric), and whether a
   trigger evaluates just the acting user or all trip members (e.g. `party_of_4` affects every
   member — others can settle on their next catch-up sweep rather than via the trigger).
3. Profile-tab entry point (new screen vs section) — confirm against the Phase-1 profile layout.
4. `/ui-ux-pro-max` drives the `AchievementsScreen` + `WorldClearCinematic` visuals at implementation.

## 12. Non-goals / deviations

- **Non-goals (6A)**: real badge pixel-art; sound (6C); passport stamps screen (6B); public-profile
  badge display (Phase 9); community/custom achievements; XP/levels.
- **Deviations from master spec §5**: `name`/`description` → `name_key`/`description_key` (ADR 6A-5);
  cinematic gated by rarity rather than fired for every unlock (ADR 6A-4) — both intentional.
