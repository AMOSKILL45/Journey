# Phase 7 — Cherry-on-top Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development (or
> executing-plans). Steps use checkbox (`- [ ]`) syntax. Each sub-project section (7A–7E) is
> self-contained and produces working, testable software on its own — one workflow unit each.
> After EVERY code task run the inline validator (typecheck + lint + test), then commit.

**Goal:** Ship the seven "trip vivant" features — photos+reactions, polls, distance+weather,
.ics export, scrapbook — decomposed into five OTA-shippable sub-projects.

**Architecture:** Mirror 4A/6x patterns. Supabase tables + RLS (reuse `is_trip_member` /
`is_trip_editor` helpers), private Storage buckets with signed URLs, two secret-gated edge
functions (`enrich_milestone`, `generate_scrapbook`), Realtime publications for live
counts/votes, feature-scoped client modules with pure-util + TanStack hooks + components +
i18n + contract tests. See ADRs in `…phase-7-architecture-adr.md`.

**Tech Stack:** Expo SDK 54, TS strict, Supabase (Postgres+RLS+Storage+Realtime+Edge/Deno),
Zustand+TanStack v5, Skia (scrapbook PNG), `pdf-lib` (scrapbook PDF, Deno), reused 4A deps
(`expo-image-picker/-manipulator/-file-system/-sharing`). **No new native dep → 100% OTA.**

**Spec:** `docs/superpowers/specs/2026-06-05-journey-phase-7-cherry-on-top-design.md`.

---

## Build order & workflow orchestration

1. **7A Photos+Reactions** and **7C Distance+Weather** — independent → build in parallel.
2. **7B Polls** and **7D .ics** — independent → build in parallel.
3. **7E Scrapbook** — LAST (needs 7A photos + 7C stats).

Migrations apply sequentially to the shared DB (`ewsoupkfkachxidmuwoi`) in this order; client
modules are file-isolated per feature (worktree isolation if fanned out). Regenerate
`src/core/supabase/types` after each sub-project's migration. Reuse existing helpers — do NOT
re-create `is_trip_member`/`is_trip_editor` (defined in 4A migrations).

## Global file structure

```
supabase/migrations/
  20260605_7a_photos_reactions.sql        # tables + RLS + bucket + reaction_target_trip()
  20260605_7b_polls.sql                   # tables + RLS + realtime
  20260605_7c_enrichment.sql              # weather_cache + milestone_legs + RLS
  20260605_7e_scrapbook.sql               # scrapbooks + bucket + RLS
supabase/functions/
  enrich_milestone/index.ts               # 7C proxy (Open-Meteo + OSRM → caches)
  generate_scrapbook/index.ts             # 7E PDF (pdf-lib) + scrapbooks row
src/features/photos/                       # 7A
src/features/polls/                        # 7B
src/features/enrichment/                   # 7C
src/features/calendar-export/              # 7D
src/features/scrapbook/                     # 7E
src/core/i18n/locales/{en,fr}.json         # +photos.* reactions.* polls.* weather.*
                                           #  distance.* calendarExport.* scrapbook.*
```

Each feature module: `data/` (vocab), `utils/` (pure + `__tests__/`), `api.ts`, `hooks/`,
`components/`, `index.ts` (barrel), `__tests__/contracts.test.ts`.

---

## 7A — Photos + Reactions

**Migration `20260605_7a_photos_reactions.sql`**

```sql
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  caption text,
  taken_at timestamptz,
  width int, height int,
  size_bytes int not null default 0,
  created_at timestamptz not null default now()
);
create index photos_trip_created on public.photos(trip_id, created_at desc);
create index photos_milestone on public.photos(milestone_id);
alter table public.photos enable row level security;
create policy photos_select on public.photos for select using (public.is_trip_member(trip_id));
create policy photos_insert on public.photos for insert with check (public.is_trip_editor(trip_id) and user_id = auth.uid());
create policy photos_update on public.photos for update using (user_id = auth.uid() or public.is_trip_editor(trip_id));
create policy photos_delete on public.photos for delete using (user_id = auth.uid() or public.is_trip_editor(trip_id));

-- resolve a reaction target to its trip for membership checks
create or replace function public.reaction_target_trip(p_type text, p_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case p_type
    when 'photo' then (select trip_id from public.photos where id = p_id)
    when 'milestone' then (select trip_id from public.milestones where id = p_id)
    when 'checkin' then (select m.trip_id from public.checkins c join public.milestones m on m.id = c.milestone_id where c.id = p_id)
  end
$$;
revoke execute on function public.reaction_target_trip(text, uuid) from anon, authenticated;

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  target_type text not null check (target_type in ('photo','milestone','checkin')),
  target_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (emoji in ('heart','fire','laugh','wow','clap','star')),
  created_at timestamptz not null default now(),
  unique (target_type, target_id, user_id, emoji)
);
alter table public.reactions enable row level security;
create policy reactions_select on public.reactions for select using (public.is_trip_member(public.reaction_target_trip(target_type, target_id)));
create policy reactions_insert on public.reactions for insert with check (user_id = auth.uid() and public.is_trip_member(public.reaction_target_trip(target_type, target_id)));
create policy reactions_delete on public.reactions for delete using (user_id = auth.uid());
alter publication supabase_realtime add table public.reactions;

-- private bucket + path-scoped policies (mirror trip-documents from 4A)
insert into storage.buckets (id, name, public) values ('trip-photos','trip-photos',false) on conflict do nothing;
create policy "trip-photos read" on storage.objects for select using (bucket_id='trip-photos' and public.is_trip_member((split_part(name,'/',1))::uuid));
create policy "trip-photos write" on storage.objects for insert with check (bucket_id='trip-photos' and public.is_trip_editor((split_part(name,'/',1))::uuid));
create policy "trip-photos delete" on storage.objects for delete using (bucket_id='trip-photos' and public.is_trip_editor((split_part(name,'/',1))::uuid));

-- notification on photo insert → category 'friends_photo' (reuse 4C insert-trigger shape)
-- (one notifications row per OTHER trip member; see 4C trip_members/checkins trigger as template)
```

**Tasks**

- [ ] **7A.1** Apply migration via Supabase MCP (`apply_migration`), regen types. Verify
      advisors: no new SECURITY DEFINER exposure (helper revoked from anon/authenticated).
- [ ] **7A.2** `data/reactionSet.ts`: `export const REACTION_IDS = ['heart','fire','laugh','wow','clap','star'] as const;` + `reactionAssets` empty map (pattern 6C `soundManifest`). Test: `REACTION_IDS` length 6 + all strings.
- [ ] **7A.3** `utils/reactions.ts`: `tallyReactions(rows) → Record<emoji,{count,mine}>`. Test: empty, multi-user, mine-flag, unknown emoji ignored.
- [ ] **7A.4** `api.ts`: `uploadPhoto` (compress via `expo-image-manipulator` to ≤1600px/0.8, ≤25 MB guard reusing 4A util; path `<trip>/<uuid>.jpg`; insert row), `listTripPhotos` (signed URLs), `deletePhoto`, `toggleReaction(target_type,target_id,emoji)` (insert or delete on unique conflict). Tests: mocked supabase client — path shape, size-cap rejection, toggle insert/delete branch.
- [ ] **7A.5** `hooks/useTripPhotos.ts` + `hooks/usePhotoReactions.ts` (TanStack query keys `['photos',tripId]` / `['reactions',type,id]`; reactions subscribe to Realtime postgres_changes → invalidate). Test: query-key shape + optimistic toggle.
- [ ] **7A.6** Components: `ReactionBar` (6 pixel buttons + counts, on press → `toggleReaction` + `haptics.selection()` from 6C), `PhotoGrid`, `PhotoUploadButton` (camera+library via 4A picker), `PhotoViewer` (full-screen + caption edit + `ReactionBar`), `PhotoSection` (trip-level + per-milestone). RNTL render tests (no hardcoded strings — all `t()`).
- [ ] **7A.7** Route `src/app/(modals)/photos/[tripId].tsx` + entry button in `TripDetailScreen`. Surface `ReactionBar` on `MilestoneNode` (target_type='milestone').
- [ ] **7A.8** i18n `photos.*` + `reactions.*` (en+fr).
- [ ] **7A.9** `__tests__/contracts.test.ts`: every `photos.*`/`reactions.*` key ∈ en+fr; `REACTION_IDS` === DB emoji CHECK set (parse from migration text); bucket name `trip-photos` used in api === migration; route registered.
- [ ] **7A.10** Inline validator (typecheck+lint+test) → commit `feat(photos): trip photos + pixel reactions (7A)`.

---

## 7B — Polls

**Migration `20260605_7b_polls.sql`**

```sql
create table public.polls (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  milestone_id uuid references public.milestones(id) on delete set null,
  question text not null,
  options jsonb not null,                         -- [{"id":"a","label":"Pizza"}]
  created_by uuid not null references auth.users(id),
  expires_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index polls_trip on public.polls(trip_id, created_at desc);
alter table public.polls enable row level security;
create policy polls_select on public.polls for select using (public.is_trip_member(trip_id));
create policy polls_insert on public.polls for insert with check (public.is_trip_editor(trip_id) and created_by = auth.uid());
create policy polls_update on public.polls for update using (created_by = auth.uid() or public.is_trip_editor(trip_id));

create table public.poll_votes (
  poll_id uuid not null references public.polls(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  option_id text not null,
  voted_at timestamptz not null default now(),
  primary key (poll_id, user_id)
);
alter table public.poll_votes enable row level security;
create policy votes_select on public.poll_votes for select using (public.is_trip_member((select trip_id from public.polls where id = poll_id)));
create policy votes_upsert on public.poll_votes for insert with check (user_id = auth.uid());
create policy votes_update on public.poll_votes for update using (user_id = auth.uid());
alter publication supabase_realtime add table public.poll_votes;
-- notification on poll insert → category 'polls'
```

**Tasks**

- [ ] **7B.1** Apply migration + regen types + advisors.
- [ ] **7B.2** `utils/pollResults.ts`: `tally(poll, votes) → {byOption:{id,label,count,pct}[], total, winnerId, myVote, isOpen}`; `isOpen` respects `expires_at`/`closed_at`. Tests: zero votes (pct 0, no winner), tie, expired→closed, my-vote highlight.
- [ ] **7B.3** `api.ts`: `createPoll`, `castVote(pollId, optionId)` (upsert on PK), `closePoll`. `hooks/useTripPolls` + `hooks/usePollVote` (optimistic + Realtime invalidate). Tests: upsert branch, optimistic rollback.
- [ ] **7B.4** Components: `PollCard` (question + live % bars + 1-tap vote + open/closed state), `CreatePollSheet` (question + 2–N option inputs + optional expiry + optional milestone; validate ≥2 non-empty options), `PollsSection`. RNTL tests + all `t()`.
- [ ] **7B.5** Entry in `TripDetailScreen`. i18n `polls.*` (en+fr).
- [ ] **7B.6** `__tests__/contracts.test.ts`: i18n keys; notif category `polls` ∈ categories util; realtime publication assertion (table in migration).
- [ ] **7B.7** Validator → commit `feat(polls): create/vote/live-results (7B)`.

---

## 7C — Distance + Weather

**Migration `20260605_7c_enrichment.sql`**

```sql
create table public.weather_cache (
  milestone_id uuid primary key references public.milestones(id) on delete cascade,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table public.milestone_legs (
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_milestone_id uuid not null references public.milestones(id) on delete cascade,
  to_milestone_id uuid not null references public.milestones(id) on delete cascade,
  distance_m int not null,
  duration_s int not null,
  mode text not null default 'driving',
  computed_at timestamptz not null default now(),
  primary key (from_milestone_id, to_milestone_id)
);
create index legs_trip on public.milestone_legs(trip_id);
alter table public.weather_cache enable row level security;
alter table public.milestone_legs enable row level security;
create policy weather_select on public.weather_cache for select using (public.is_trip_member((select trip_id from public.milestones where id = milestone_id)));
create policy legs_select on public.milestone_legs for select using (public.is_trip_member(trip_id));
-- NO insert/update/delete policies → not client-writable; edge fn uses service role (bypasses RLS).
```

**Edge function `enrich_milestone/index.ts`** (secret-gated via `x-webhook-secret` RPC like
`smart_reminders_cron`; service role): input `{ trip_id }`. For each milestone with lat/lng →
fetch Open-Meteo `forecast?latitude=&longitude=&current=...` → upsert `weather_cache`
(`expires_at = now()+6h`). For each consecutive ordered pair → fetch OSRM
`route/v1/driving/{lng1},{lat1};{lng2},{lat2}?overview=false` → upsert `milestone_legs`. Prune
legs whose endpoints no longer adjacent. Return `{ weather:n, legs:m }`. Vault secret
`enrich_milestone_secret`. **Do not** call external APIs from the client.

**Tasks**

- [ ] **7C.1** Apply migration + regen types + advisors.
- [ ] **7C.2** `utils/weather.ts`: `weatherCodeToIcon(code) → SpriteId` + `weatherCodeToLabelKey(code) → 'weather.clear'|…` (WMO codes). `utils/distance.ts`: `formatDistance(m, unit) → '120 km'|'75 mi'`, `formatDuration(s) → '1h30'|'45 min'`. Tests: known codes, km/mi rounding, h/min boundaries.
- [ ] **7C.3** Deploy `enrich_milestone` edge fn (Supabase MCP `deploy_edge_function`, `verify_jwt=false`); provision Vault secret. Smoke test via `execute_sql` invoking pg_net OR direct invoke; assert caches populated for a synthetic trip.
- [ ] **7C.4** `api.ts`: `triggerEnrich(tripId)` (invoke edge fn), `getMilestoneWeather`, `getTripLegs`. `hooks/useMilestoneWeather` + `hooks/useTripDistances` (query + trigger-on-stale). Tests: query keys, stale→trigger.
- [ ] **7C.5** Components: `WeatherBadge` (sprite + temp on `MilestoneNode`/detail card), `DistancePill` (on `MilestoneEdge` — `formatDistance · formatDuration`). RNTL + `t()`.
- [ ] **7C.6** Wire badges into existing `MilestoneNode` / `MilestoneEdge` (additive props, default hidden when no cache). i18n `weather.*` + `distance.*` (en+fr).
- [ ] **7C.7** `__tests__/contracts.test.ts`: i18n keys; edge slug `enrich_milestone` === client invoke string; weather sprite ids ∈ sprite manifest; cache tables have NO client write policy (assert via migration text).
- [ ] **7C.8** Validator → commit `feat(enrichment): distance + weather via enrich_milestone proxy (7C)`.

---

## 7D — .ics Export

No migration. Pure client.

**Tasks**

- [ ] **7D.1** `utils/ics.ts`: `buildIcs(trip, milestones) → string` (RFC-5545: `BEGIN:VCALENDAR`/`VERSION:2.0`/`PRODID`; one `VEVENT` per milestone with `UID`, `DTSTAMP`, `DTSTART`/`DTEND` from arrival/departure (all-day `VALUE=DATE` when no time), `SUMMARY`, `LOCATION`, `GEO`); CRLF line endings; escape `,;\\\n` in text; fold lines >75 octets). Tests: escaping, all-day vs timed, missing dates skipped, line folding, GEO from lat/lng.
- [ ] **7D.2** `api.ts`: `exportTripIcs(trip, milestones)` → write `FileSystem.cacheDirectory + slug.ics` (`expo-file-system`) → `Sharing.shareAsync` (`expo-sharing`). Test: filename slug + mime `text/calendar`.
- [ ] **7D.3** `ExportTripButton` component + entry in `TripDetailScreen` (overflow menu). i18n `calendarExport.*` (en+fr).
- [ ] **7D.4** `__tests__/contracts.test.ts`: i18n keys; no new native dep in package.json (assert `expo-print` absent).
- [ ] **7D.5** Validator → commit `feat(calendar-export): trip .ics export via share sheet (7D)`.

---

## 7E — Trip Scrapbook (depends 7A + 7C)

**Migration `20260605_7e_scrapbook.sql`**

```sql
create table public.scrapbooks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  png_path text,
  pdf_path text,
  stats jsonb not null default '{}',
  generated_by uuid not null references auth.users(id),
  generated_at timestamptz not null default now()
);
create index scrapbooks_trip on public.scrapbooks(trip_id, generated_at desc);
alter table public.scrapbooks enable row level security;
create policy scrapbooks_select on public.scrapbooks for select using (public.is_trip_member(trip_id));
-- INSERT via edge fn (service role). No client insert policy.
insert into storage.buckets (id, name, public) values ('trip-scrapbooks','trip-scrapbooks',false) on conflict do nothing;
create policy "trip-scrapbooks read" on storage.objects for select using (bucket_id='trip-scrapbooks' and public.is_trip_member((split_part(name,'/',1))::uuid));
create policy "trip-scrapbooks write" on storage.objects for insert with check (bucket_id='trip-scrapbooks' and public.is_trip_editor((split_part(name,'/',1))::uuid));
```

**Edge function `generate_scrapbook/index.ts`** (secret-gated, service role): input
`{ trip_id, png_path }`. Gather trip + milestones + photos (signed bytes) + stats (total
distance from `milestone_legs`, `countries_visited`, day count, checkin count). Compose PDF
with `pdf-lib` (https://esm.sh/pdf-lib) — cover page + milestone pages embedding photo bytes —
upload `trip-scrapbooks/<trip>/<id>.pdf`. INSERT `scrapbooks` row with `{png_path, pdf_path,
stats}`. Return `{ png_url, pdf_url }` (signed). Vault secret `generate_scrapbook_secret`.

**Tasks**

- [ ] **7E.1** Apply migration + regen types + advisors.
- [ ] **7E.2** `utils/stats.ts`: `computeTripStats(trip, milestones, legs, checkins) → {distanceM, countries, days, checkins}`. Tests: sums legs, distinct countries, day span, counts.
- [ ] **7E.3** `components/ScrapbookCard.tsx`: Skia canvas (reuse patterns from `WorldClearCinematic`/`OverworldBackground`) rendering the story card (title + stats + milestone dots + up-to-N photo thumbs); expose `renderToPngBase64()` via `makeImageSnapshot().encodeToBytes()`. Test: renders without crash (mock Skia), stats wired.
- [ ] **7E.4** Deploy `generate_scrapbook` edge fn + Vault secret. Smoke test on a synthetic trip → assert pdf uploaded + row inserted.
- [ ] **7E.5** `api.ts`: `generateScrapbook(tripId)` = render PNG → upload `trip-scrapbooks/<trip>/<id>.png` → invoke edge fn with `{trip_id, png_path}` → return signed urls; `listScrapbooks`. `hooks/useScrapbook`. Tests: handshake order (upload before invoke), query key.
- [ ] **7E.6** Components: `ScrapbookButton` (visible when trip has ≥1 milestone/photo; shows progress), `ScrapbookViewer` (PNG preview + share PNG/PDF via 4A sharing), `ScrapbookSection`. Entry in `TripDetailScreen`. i18n `scrapbook.*` (en+fr).
- [ ] **7E.7** `__tests__/contracts.test.ts`: i18n keys; edge slug `generate_scrapbook` === client invoke; bucket `trip-scrapbooks` === migration; `scrapbooks` no client-insert policy.
- [ ] **7E.8** Validator → commit `feat(scrapbook): on-demand PNG+PDF recap (7E)`.

---

## Phase close

- [ ] **C.1** Full suite green (`npm run typecheck && npm run lint && npm test`). Target ~900+.
- [ ] **C.2** `/auditing-runtime-contracts` over all new static→runtime boundaries (routes, env,
      bucket names, edge slugs, i18n, reaction set ↔ CHECK, notif categories).
- [ ] **C.3** Supabase advisors (security + perf) — no new findings vs baseline.
- [ ] **C.4** Security review (RLS self-only writes, cache non-writable, signed-URL scheme
      validation at open sink, edge secret-gating, SECURITY DEFINER revokes).
- [ ] **C.5** code-validator agent pass.
- [ ] **C.6** Update `CLAUDE.md` Active phase (Phase 7 done, test count). Commit + push.
- [ ] **C.7** `eas update --branch production --platform ios` (OTA — no build needed).

## Self-review

- **Spec coverage:** #19 distance (7C) · #20 weather (7C) · #21 .ics (7D) · #22 polls (7B) ·
  #23 reactions (7A) · #24 photos (7A) · #25 scrapbook (7E) — all mapped. ✓
- **No placeholders:** schemas/files/slugs concrete; test specs enumerated (workflow agents
  write the per-line TDD code). ✓
- **Type consistency:** `enrich_milestone`/`generate_scrapbook` slugs, `REACTION_IDS` set,
  bucket names `trip-photos`/`trip-scrapbooks`, helper names `is_trip_member`/`is_trip_editor`
  used identically across tasks + contracts. ✓
- **Anti-cheat/RLS:** cache + scrapbook tables have no client-write policy; reactions/votes
  self-only; `reaction_target_trip` revoked from anon/authenticated. ✓
