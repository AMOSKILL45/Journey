# Phase 7 — Cherry-on-top — Design

> **Status**: approved (brainstorming 2026-06-05) — ready for plan.
> **Parent spec**: `docs/superpowers/specs/2026-05-24-this-is-the-journey-design.md` §2.1 (#19–25), §5 (data model), §12.1 (Phase 7).
> **Phase goal (spec §12.1)**: "Trip vivant" — polls, photos, reactions, météo, distance, scrapbook, .ics.

## 0. Summary

Phase 7 ("cherry-on-top") delivers the seven engagement/enrichment features that make a
trip feel alive. It is decomposed into **five independent sub-projects** mirroring the 4A–4E /
6A–6C pattern:

| Sub-project                 | Spec features | Nature                                                   |
| --------------------------- | ------------- | -------------------------------------------------------- |
| **7A — Photos + Reactions** | #24 + #23     | Storage gallery + fixed pixel-emoji reactions (Realtime) |
| **7B — Polls**              | #22           | Create / 1-tap vote / live results (Realtime)            |
| **7C — Distance + Weather** | #19 + #20     | Milestone enrichment via OSRM + Open-Meteo (cached)      |
| **7D — .ics Export**        | #21           | Whole-trip calendar export (share sheet)                 |
| **7E — Trip Scrapbook**     | #25           | On-demand recap edge function (PNG story + PDF album)    |

**Key property — 100% OTA-shippable.** Every native dependency required
(`expo-image-picker`, `expo-image-manipulator`, `expo-file-system`, `expo-sharing`) already
ships from Phase 4A. No new native module → no EAS build, ship via `eas update`.

**Reused infra**: 4A Storage + image compression; 4C notification categories
(`friends_photo`, `polls` already seeded); Phase 5 Realtime channel `trip:{id}`; Phase 6A
achievement metric hooks (optional stretch).

**Dependency order**: 7A and 7C are independent (parallelizable). 7B and 7D independent.
**7E depends on 7A (photos) + 7C (stats)** → built last.

## 1. Decisions locked in brainstorming

- **Scope**: full Phase 7 (all five sub-projects) in v1.0.
- **Reactions**: fixed curated pixel set of ~6 (heart, fire, laugh, wow, clap, star). No free
  emoji keyboard. Sprite art = asset task (ship with empty asset map, like 6C sounds).
- **Scrapbook trigger**: **on-demand** button only (no cron, no auto-at-trip-end).
- **Scrapbook output**: **both** a shareable PNG "story" card and a multi-page PDF album.
- **Polls**: single-select (`PK(poll_id, user_id)`), change-your-vote allowed (upsert), live
  results via Realtime, optional expiry.
- **.ics**: whole-trip export, one VEVENT per milestone, shared via the OS share sheet.

## 2. Architecture decisions (resolved)

The three HOW decisions are resolved in
`2026-06-05-journey-phase-7-architecture-adr.md` (all Accepted, 2026-06-05):

1. **ADR-001 — 7C fetch strategy**: **edge-function proxy** `enrich_milestone` (service role
   writes caches; client never calls OSRM/Open-Meteo directly). Matches the
   `smart_reminders_cron` / `send_push` pattern; OSRM provider swappable without an OTA.
2. **ADR-002 — 7C distance storage**: **`milestone_legs`** cache table (pairwise from→to),
   `weather_cache` per-milestone. `milestones.metadata` left untouched.
3. **ADR-003 — 7E render pipeline**: **hybrid** — PNG story card via **client Skia**
   (`makeImageSnapshot`, pixel-perfect, OTA-safe), PDF album via the **`generate_scrapbook`
   edge function** (`pdf-lib`, embeds photos). Preserves the 100% OTA property.

## 3. Sub-project specs

### 3.1 — 7A Photos + Reactions

**DB**

- `photos` (`id`, `trip_id` FK, `milestone_id` FK NULL, `user_id` FK, `storage_path`,
  `caption` text NULL, `taken_at` timestamptz NULL, `width` int NULL, `height` int NULL,
  `size_bytes` int, `created_at`). Indexes on `(trip_id, created_at desc)` and
  `(milestone_id)`.
- Private Storage bucket `trip-photos`; Storage policies path-scoped to trip membership
  (`<trip_id>/<photo_id>.<ext>`), signed-URL reads. Mirror 4A `trip-documents`.
- `reactions` (`id`, `target_type` text CHECK in (`photo`,`milestone`,`checkin`),
  `target_id` uuid, `user_id` FK, `emoji` text CHECK in the fixed set, `created_at`).
  `UNIQUE(target_type, target_id, user_id, emoji)` — toggle semantics (one of each per user
  per target). Realtime publication for live counts.
- **RLS**: photos — member SELECT, editor INSERT, `owner OR editor` DELETE/UPDATE(caption).
  reactions — member SELECT, self INSERT/DELETE.

**Client `src/features/photos/`**

- `data/reactionSet.ts` — `REACTION_IDS` vocab + sprite map; **empty `reactionAssets`** until
  pixel art lands (Metro can't bundle missing `require()`; pattern from 6C `soundManifest`).
- `utils/` — pure: caption validation, reaction tally/aggregate. Tests in `__tests__/`.
- `api.ts` — upload (compress via 4A `expo-image-manipulator`, ≤25 MB cap reusing 4A),
  signed-URL list, delete; reaction toggle. `hooks/` — `useTripPhotos`,
  `usePhotoReactions` (TanStack + Realtime postgres_changes).
- Components — `PhotoGrid`, `PhotoUploadButton` (camera + library via 4A picker),
  `PhotoViewer` (full-screen, caption, `ReactionBar`), `ReactionBar` (6 pixel buttons +
  counts, gated feedback haptic from 6C), `PhotoSection` (per-milestone + trip-level).
- Route `(modals)/photos/[tripId]` + TripDetailScreen entry. Reactions also surface on
  `MilestoneNode` / checkins via `target_type`.
- Notification on photo insert → `friends_photo` (reuse 4C trigger shape).
- i18n `photos.*` + `reactions.*` (en + fr).
- **Native**: none new. OTA.

### 3.2 — 7B Polls

**DB**

- `polls` (`id`, `trip_id` FK, `milestone_id` FK NULL, `question` text, `options` jsonb
  `[{id,label}]`, `created_by` FK, `expires_at` timestamptz NULL, `closed_at` timestamptz
  NULL, `created_at`).
- `poll_votes` (`poll_id` FK, `user_id` FK, `option_id` text, `voted_at`, `PK(poll_id,
user_id)`). Realtime publication for live results.
- **RLS**: polls — member SELECT, editor INSERT, `creator OR owner` UPDATE(close). votes —
  member SELECT, self INSERT/UPDATE (upsert to change vote).

**Client `src/features/polls/`**

- `utils/pollResults.ts` — pure: tally per option, percentages, winner, my-vote, is-open
  (respects `expires_at`/`closed_at`). Tests.
- `api.ts` + `hooks/` — `useTripPolls`, `usePollVote` (optimistic + Realtime).
- Components — `PollCard` (question + options + live bars + 1-tap vote + state),
  `CreatePollSheet` (question + 2–N options + optional expiry + optional milestone),
  `PollsSection`.
- TripDetailScreen entry. Notification on poll insert → `polls` (seeded category).
- i18n `polls.*`.
- **Native**: none. OTA.

### 3.3 — 7C Distance + Weather

**DB**

- `weather_cache` (`milestone_id` FK, `payload` jsonb, `fetched_at`, `expires_at`; PK or
  unique on `milestone_id`). TTL-based refresh.
- `milestone_legs` (`trip_id` FK, `from_milestone_id` FK, `to_milestone_id` FK, `distance_m`,
  `duration_s`, `mode`, `computed_at`) — pairwise distance/duration cache (ADR-002).
  Affected legs recompute on milestone reorder/insert/delete.
- **RLS**: member SELECT; writes via edge function (service role) or SECURITY DEFINER, never
  client-writable (cache integrity).

**Edge function `enrich_milestone`** (secret-gated, `verify_jwt=false` like existing crons)

- Fetches Open-Meteo (weather by lat/lng, no auth) + OSRM (distance/duration between ordered
  milestone pairs). Upserts caches. Invoked on-demand from client and/or on milestone
  create/update. Provider/proxy details → ADR.

**Client `src/features/enrichment/`** (or folded into `milestones`)

- `utils/` — pure: weather-code → pixel icon + i18n label; unit format km/mi + h/min
  (respect locale). Tests.
- `api.ts` + `hooks/` — `useMilestoneWeather`, `useTripDistances`.
- Components — `WeatherBadge` (on `MilestoneNode` / detail card), `DistancePill` (on
  `MilestoneEdge` — e.g. "120 km · 1h30").
- i18n `weather.*` (condition labels) + `distance.*`.
- **Native**: none. OTA.

### 3.4 — 7D .ics Export

- `src/features/calendar-export/` — pure `utils/ics.ts`: `buildIcs(trip, milestones)` →
  RFC-5545 VCALENDAR string; one VEVENT per milestone using `arrival_at`/`departure_at`,
  `SUMMARY`, `LOCATION`, `GEO`, `UID`, `DTSTAMP`. No dependency (string builder). Tests cover
  escaping, all-day vs timed, missing dates.
- Write to file (`expo-file-system`) → share (`expo-sharing`). `ExportTripButton` on
  TripDetailScreen.
- i18n `calendarExport.*`.
- **Native**: none (file-system + sharing from 4A). OTA.

### 3.5 — 7E Trip Scrapbook (depends 7A + 7C)

- **On-demand** button on TripDetailScreen, shown when the trip has content (≥1 milestone or
  photo).
- **Hybrid render (ADR-003)**: the **PNG story card renders client-side via Skia**
  (`makeImageSnapshot`, pixel-perfect, OTA-safe) and uploads to
  `trip-scrapbooks/<trip>/<id>.png`. The client then invokes **`generate_scrapbook`** with
  `{ trip_id, png_path }`.
- **Edge function `generate_scrapbook`**: gathers trip + milestones + photos + stats (total
  distance, countries visited, days, check-in count) → composes the **PDF** album via `pdf-lib`
  (embeds photo bytes, service role) → uploads `<trip>/<id>.pdf` → INSERTs the `scrapbooks` row
  with both paths → returns both signed URLs. Budget < 30 s (spec §9 perf).
- `scrapbooks` (`id`, `trip_id` FK, `png_path`, `pdf_path`, `stats` jsonb, `generated_by` FK,
  `generated_at`). **RLS**: member SELECT, editor INSERT (via edge fn / SECURITY DEFINER).
- **Client `src/features/scrapbook/`** — `ScrapbookCard` (Skia → PNG), `api.ts` (upload PNG,
  invoke edge fn, await, list) + hook + `ScrapbookButton`, `ScrapbookViewer` (preview PNG +
  download/share PNG and PDF), `ScrapbookSection`.
- i18n `scrapbook.*`.
- **Native**: none (sharing/file-system from 4A). OTA. Edge function is the heavy piece.

## 4. Cross-cutting

- **Build/workflow order**: 7A + 7C first (independent), then 7B + 7D, then **7E last**.
  Migrations run sequentially against the shared DB; client code per sub-project is
  parallelizable (worktree isolation if a workflow fans out).
- **Notifications**: 7A → `friends_photo`, 7B → `polls` (both categories already seeded in
  `src/features/notifications/utils/categories.ts`). Reuse the 4C insert-trigger →
  `notifications` hub → `send_push` chain.
- **Achievements (optional stretch)**: photo/poll counts could feed new 6A metrics
  (e.g. "shutterbug", "decision-maker"). Not required for phase completion; note only.
- **Privacy**: all Phase 7 content is trip-scoped and private-by-default (commandment #1).
  No content is pre-filled (commandment: empty by default). Storage buckets private + signed
  URLs only.
- **Security surface**: signed-URL scheme validation at open sink (4A lesson); edge functions
  secret-gated + SECURITY DEFINER fns revoked from anon/authenticated up-front (6A/6B lesson);
  reactions/votes self-only writes; cache tables not client-writable.

## 5. Runtime contracts (auditing-runtime-contracts)

Contract tests that must fail in CI, not TestFlight:

- **i18n coverage**: every `t('photos.*'|'reactions.*'|'polls.*'|'weather.*'|'distance.*'|
'calendarExport.*'|'scrapbook.*')` key exists in both `en.json` and `fr.json`.
- **Routes**: `(modals)/photos/[tripId]` (and any new modal) registered + reachable from the
  entry that links to it.
- **Storage buckets**: bucket names used in client (`trip-photos`, `trip-scrapbooks`) match
  the names in the Storage-policy migrations.
- **Reaction set ↔ DB**: `REACTION_IDS` vocab equals the `emoji` CHECK constraint set.
- **Edge functions**: client invoke names (`enrich_milestone`, `generate_scrapbook`) match
  deployed function slugs.
- **Notification categories**: `friends_photo` / `polls` used by triggers ∈ the categories
  enum/util.
- **Generated types**: new tables/columns present in `src/core/supabase/types`.

## 6. Out of scope (→ v1.1+)

- Auto-generate scrapbook at trip end (cron). On-demand only for v1.0.
- Free emoji keyboard for reactions.
- Comments/threads on photos (reactions only).
- Real pixel-art assets for reactions + scrapbook layout (asset task, ship placeholders).
- New achievement definitions wired to photos/polls (stretch).

## 7. Acceptance

- All five sub-projects shipped, `npm run typecheck` + `lint` + `test` green.
- Contract tests (§5) green.
- Supabase advisors clean (no new findings vs baseline).
- Security review + code-validator pass.
- 100% OTA (no `package.json` native additions beyond what 4A already provides).
- Target test count ~900+ (from 819).
