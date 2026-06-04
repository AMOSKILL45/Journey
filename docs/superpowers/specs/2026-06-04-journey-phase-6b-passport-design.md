# Phase 6B — Adventurer Passport — Design

> A collectible travel passport: every milestone you check into mints a **stamp** (place + country
> flag + date), and the set of countries you've visited fills your passport — both persisted on your
> profile (server-authoritative, ready for the Phase-9 public profile) and shown on a Passport screen
> off Profile.
>
> Date: 2026-06-04 · Status: approved design, pre-plan · Lens: architecture / ADRs
> Builds on: `profiles.passport_stamps`/`countries_visited` (Phase 1, currently **unused**),
> milestones/`checkins` (Phase 2), `trips.destination_country` (Phase 1), Achievements 6A (sibling).
> **No new native dep → OTA-shippable.**

## 1. Context

Master spec §2.1 feature #16 ("Adventurer Passport multi-trip (stamps, countries visited)"), §5
data model (`profiles.passport_stamps jsonb -- ['Vegas-USA', 'Tokyo-JP', ...]`, `countries_visited`),
§2.1 #88 (public profile shows pays visités + badges → Phase 9), §6 (Profile = passport + achievements

- settings).

`profiles.passport_stamps` (jsonb) and `profiles.countries_visited` (text[]) **exist but are
completely unused today** — this feature fills them. This is the **collectible** passport, distinct
from the Stripe Identity / MRZ passport-scan flow (that is `src/features/identity`, done in Phase 1.5)
and from `profiles.passport_country` (self-declared nationality, set at onboarding).

Phase 6B is the second of three Phase-6 sub-projects (6A Achievements ✅ → **6B Passport** → 6C Sound).
100% OTA.

**Product decisions (owner, 2026-06-04):**

1. **Stamp granularity = per checked-in milestone** (the `'Vegas-USA'` model) — rich, one tile per place.
2. **Persisted** (not compute-on-read) via a check-in trigger that writes to `profiles`, so the data
   is ready for the Phase-9 public profile.

```
checkin INSERT ──AFTER trigger──► _rebuild_passport(user_id)  [SECURITY DEFINER, in-DB]
                                     │ FULL recompute from all the user's checkins (idempotent)
                                     ▼
        profiles.passport_stamps (jsonb[])  +  profiles.countries_visited (text[])
                                     │ client reads own row (existing RLS) + catch-up rebuild on open
                                     ▼
                            PassportScreen (countries + stamps counts, stamp grid)
```

## 2. Architecture Decision Records

| ADR                                           | Decision                                                                                                                                                                 | Rationale                                                                                                                                                                   | Consequence                                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **6B-1** Stamp = milestone                    | One stamp per distinct milestone the user has checked into (`label`=milestone name, `country`=its trip's `destination_country`, `at`=check-in time).                     | Owner choice; richest view; milestones carry the place, trips carry the country.                                                                                            | Milestones have no country column → country comes from `trips.destination_country` via the milestone's trip. |
| **6B-2** Persisted, server-authoritative      | A check-in trigger writes `profiles.passport_stamps` + `countries_visited`.                                                                                              | Owner choice; ready for Phase-9 public profile; consistent with 6A's DB-authoritative model.                                                                                | Reuses the two existing empty columns; client is read-only + a catch-up rebuild.                             |
| **6B-3** Full recompute (not append)          | The trigger calls `_rebuild_passport(uid)` which recomputes the entire passport from `checkins`.                                                                         | Idempotent, no append/dedup bugs, self-healing; per-user check-in counts are small.                                                                                         | O(user's checkins) per check-in — fine at personal scale.                                                    |
| **6B-4** Backfill + catch-up                  | Migration runs `_rebuild_passport` for every user with ≥1 check-in; client calls `rebuild_my_passport()` on Passport-screen open.                                        | Existing travelers get a passport immediately; on-open rebuild self-heals any drift.                                                                                        | One `DO` loop in the migration + a thin public RPC.                                                          |
| **6B-5** Countries definition aligned with 6A | `countries_visited` = distinct non-null `destination_country` of trips the user has checked into — the **same set** as 6A's `countries_visited` metric.                  | Two features must not disagree on "countries visited".                                                                                                                      | Consistent by construction (both derive from checkins→trip.country); no coupling needed.                     |
| **6B-6** Grant hardening up-front             | Internal `_rebuild_passport(uuid)` + `_passport_after_checkins()` revoked from `anon`+`authenticated`+`public`; only `rebuild_my_passport()` granted to `authenticated`. | Apply the 6A advisor lesson (0028/0029) at write time — Supabase default privileges grant `anon`/`authenticated` explicitly, so `revoke from public` alone is insufficient. | No advisor WARN after migration; locked by a contract test.                                                  |
| **6B-7** Placeholder art                      | Stamp tiles render a rarity-neutral pixel frame + flag emoji + label; flags derived from ISO α-2 (no asset).                                                             | Real stamp / passport-cover pixel-art is an asset task (like 6A badges).                                                                                                    | `PassportStamp` has a frame fallback; flags are pure (emoji).                                                |

## 3. Data model

No new tables — fills two existing `profiles` columns. One migration: functions + trigger + backfill,
then types regen (to surface the new RPC).

### 3.1 Stamp shape (`profiles.passport_stamps` jsonb array)

```json
[
  {
    "milestone_id": "uuid",
    "trip_id": "uuid",
    "label": "Tokyo Tower",
    "country": "JP",
    "at": "2026-06-04T10:00:00Z"
  }
]
```

`country` is ISO α-2 (from `trips.destination_country`) or null; deduped by `milestone_id`; newest first.
`profiles.countries_visited` = `text[]` of distinct non-null `country`.

### 3.2 `_rebuild_passport(p_uid uuid)` — internal, SECURITY DEFINER

```sql
create or replace function public._rebuild_passport(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_stamps jsonb; v_countries text[];
begin
  if p_uid is null then return; end if;
  select coalesce(jsonb_agg(s order by s_at desc), '[]'::jsonb) into v_stamps
  from (
    select distinct on (c.milestone_id)
      jsonb_build_object(
        'milestone_id', c.milestone_id, 'trip_id', m.trip_id,
        'label', m.name, 'country', t.destination_country, 'at', c.checked_in_at
      ) as s,
      c.checked_in_at as s_at
    from checkins c
    join milestones m on m.id = c.milestone_id
    join trips t on t.id = m.trip_id
    where c.user_id = p_uid
    order by c.milestone_id, c.checked_in_at desc
  ) q;
  select coalesce(array_agg(distinct t.destination_country), '{}') into v_countries
  from checkins c
  join milestones m on m.id = c.milestone_id
  join trips t on t.id = m.trip_id
  where c.user_id = p_uid and t.destination_country is not null;
  update profiles set passport_stamps = v_stamps, countries_visited = v_countries where id = p_uid;
end $$;
revoke all on function public._rebuild_passport(uuid) from public, anon, authenticated;
```

### 3.3 `rebuild_my_passport()` — public wrapper

```sql
create or replace function public.rebuild_my_passport()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  perform public._rebuild_passport(auth.uid());
end $$;
revoke all on function public.rebuild_my_passport() from public, anon;
grant execute on function public.rebuild_my_passport() to authenticated;
```

### 3.4 Trigger + backfill

```sql
create or replace function public._passport_after_checkins() returns trigger
language plpgsql security definer set search_path = public as
$$ begin perform public._rebuild_passport(new.user_id); return null; end $$;
revoke all on function public._passport_after_checkins() from public, anon, authenticated;

create trigger trg_passport_checkins after insert on public.checkins
  for each row execute function public._passport_after_checkins();

-- backfill existing travelers
do $$ declare u uuid; begin
  for u in select distinct user_id from public.checkins loop
    perform public._rebuild_passport(u);
  end loop;
end $$;
```

Reads: the client selects `passport_stamps, countries_visited` from its own `profiles` row — covered by
the existing profiles SELECT RLS (own row). No new read policy.

## 4. Client `src/features/passport/`

| Unit             | Responsibility                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `flags.ts`       | `isoToFlag(code)` → regional-indicator emoji; `countryName(code)` from the existing country list; unknown → fallback (🏳️ + raw code) — pure |
| `passport.ts`    | `Stamp` type + `parseStamps(json)` (validate/coerce) + `sortByDateDesc` + `groupByCountry` — pure                                           |
| `api.ts`         | `fetchMyPassport()` (select 2 cols, own row) + `rebuildMyPassport()` (RPC)                                                                  |
| `usePassport`    | TanStack query of stamps+countries; calls `rebuildMyPassport()` once on mount (catch-up), then invalidates                                  |
| `PassportStamp`  | tile: flag + label + formatted date, pixel frame                                                                                            |
| `PassportScreen` | header `{n} pays · {m} tampons`, stamp grid (newest first), empty state, pull-to-refresh → rebuild                                          |

Wiring: route `src/app/(modals)/passport.tsx` → `PassportScreen`; **Profile entry** (a `PixelButton`
next to the Achievements one) → `router.push('/(modals)/passport')`.

## 5. UX

Passport-book feel: counts header, then stamps as pixel-framed tiles (flag + place + date), newest
first. Empty state: "Check in to your first milestone to earn a stamp." Pull-to-refresh (or a refresh
affordance) calls `rebuild_my_passport()`. Real stamp/cover art = **placeholder** (asset task).

## 6. i18n (`passport.*`, en + fr)

`screen.title`, `screen.counts` (`{{countries}} countries · {{stamps}} stamps`), `screen.empty`,
`screen.refresh`. Country **names** via the existing country list; **flags** via ISO→emoji (pure). Stamp
labels are user content (milestone names) — never translated.

## 7. Tests & security

- **Pure**: `flags` (ISO→emoji + name, unknown fallback); `passport` (parse/coerce bad json, sort desc,
  group-by-country, dedup by milestone_id).
- **Component**: `PassportStamp` (flag+label+date); `PassportScreen` (counts header, empty state).
- **Contract tests**: `passport.*` keys resolve en+fr; `rebuild_my_passport` ∈ generated `Functions`;
  `_rebuild_passport` + `_passport_after_checkins` revoked from anon/authenticated (6A lesson, in CI);
  `passport_stamps`+`countries_visited` columns present in types; route covered by the global
  `internal-routes-audit` (auto).
- **Security**: SECURITY DEFINER + `search_path=public`; wrapper derives `auth.uid()` (no IDOR);
  explicit revokes; `get_advisors` after migration must show no new findings beyond the known
  PostGIS/pg_net/auth baseline (+ the intentional `rebuild_my_passport` authenticated RPC WARN).

## 8. Open items finalized at plan

1. Exact path of the existing country list/picker to reuse in `flags.ts` (Phase-1 profile 50-country
   picker).
2. Confirm `trips.destination_country` is ISO α-2 (assumed; matches `passport_country`); if it holds
   country **names**, `flags.ts` maps accordingly.
3. Verify the passport `profiles` UPDATE does not cascade into the 4E `upsert_passport_reminder`
   trigger (that trigger keys on `passport_expires_at`, which we never touch — confirm at plan).

## 9. Non-goals / deviations

- **Non-goals**: world-map dot view; Trip Scrapbook (#25 → Phase 7); public-profile passport display
  (Phase 9); sharing a stamp; MRZ/Stripe passport (that's `identity`, done); sound (6C).
- **Deviation from spec §5**: stamps are structured objects `{milestone_id,trip_id,label,country,at}`
  rather than the spec's illustrative `'Vegas-USA'` strings — richer, renderable, dedup-able.
