# Phase 8 — Bold Gambits — Design

> **Date**: 2026-06-05 · **Status**: approved (brainstorming) · **Codename**: `journey`
> Single source of truth for Phase 8. Spec → Plan → ADR → UI → Workflow build → audits.

## 1. Overview

Phase 8 ("Bold gambits", spec §2.1 #27–31, timeline §12.1) adds five independent
"bold" features on top of the now-complete core (phases 0–7 + 1.5). All five are
**100% OTA — zero new native dependency** (they reuse Skia, Reanimated, the Phase 5
realtime channel, and the Phase 7 edge-function-proxy pattern).

The five gambits are decomposed into five sub-modules under this one spec, exactly as
phases 4/6/7 were decomposed:

| Sub    | Gambit                                                        | New DB                                               | New edge fn          | Reuses                                             |
| ------ | ------------------------------------------------------------- | ---------------------------------------------------- | -------------------- | -------------------------------------------------- |
| **8A** | 3 world themes (Europe Forest · Asia Sakura · Tropical Beach) | —                                                    | —                    | `worldThemes.ts`, OverworldBackground              |
| **8B** | Boss milestones + clear cutscene                              | — (`is_boss` exists)                                 | —                    | `WorldClearCinematic` pattern, 6C sound            |
| **8C** | Time capsules                                                 | `time_capsules` (+ helper fn + RPC + cron + trigger) | `time_capsules_cron` | 4C/4E notification chain, Reanimated/Skia          |
| **8D** | Caravan mode (2-user screen sync)                             | — (ephemeral)                                        | —                    | Phase 5 realtime channel, `useMapCamera`           |
| **8E** | Random encounters (surprise POI)                              | `encounter_cache`                                    | `random_encounter`   | Phase 7 edge-proxy + cache pattern, milestones API |

Build order (small → complex): **8A → 8B → 8C → 8D → 8E**. DB migrations + edge
functions are applied first (via Supabase MCP, grant-hardened up-front per the 6A
lesson); then client modules are built — 8A/8B/8D are client-only and run in parallel,
8C/8E follow their backend.

### 1.1 Design commandments that bind this phase

- **#3 Suggestions, never impositions** + **#11 smart reminders = suggestions**: random
  encounters (8E) and any capsule/boss prompt are **never auto-applied**. The user
  always taps to add/open.
- **#1 Private by default**: caravan (8D) is opt-in and ephemeral; time capsules (8C)
  are members-only and the message is cryptographically invisible until openable.
- **#12 i18n key-driven, zero hardcoded strings**: every new string is a key (en + fr).

### 1.2 Out of scope (YAGNI)

- Real pixel-art (theme backgrounds, boss sprite, capsule/encounter art) and real CC0
  audio files — **asset tasks**, placeholders ship now (Metro-bundleable).
- Manual per-trip theme override UI — themes stay auto-derived from destination country.
- `GooglePlacesProvider` implementation — the provider **interface** ships, Google is a
  later drop-in (no key, no cost now).
- Polar Ice theme (spec tags v1.x).
- Caravan voice/chat, capsule media attachments (text-only v1).

---

## 2. 8A — Three new world themes

### 2.1 What it does

Renders three additional overworld map themes so trips to Europe / East Asia / tropical
destinations get a fitting backdrop instead of the generic fallback.

### 2.2 Design

Extend `src/features/map/utils/worldThemes.ts` (currently 2 themes):

- `WorldThemeId` union → `'adventure-generic' | 'usa-desert' | 'europe-forest' | 'asia-sakura' | 'tropical-beach'`.
- Three `WORLD_THEMES` entries, palettes from spec §6.3:
  - **europe-forest** — sky `#A8D6FF`→`#D8ECFF`, ground `#86A86E`, accents `#D1654A`/`#6E4628`/`#9CA8B0`.
  - **asia-sakura** — sky `#FFD6E0`→`#FFEAF1`, ground `#9FCFA0`, accents `#5B3B7F`/`#FFCB05`/`#B82838`.
  - **tropical-beach** — sky `#5FCFE6`→`#BDEEF6`, ground `#FFF1B8`, accents `#FF7A4A`/`#FF4592`/`#3FBA9A`.
- Extend `COUNTRY_THEME_OVERRIDES` (ISO 3166-1 alpha-2, upper-cased by `pickWorldTheme`):
  - **europe-forest**: FR, DE, IT, AT, CH, BE, NL, LU, PL, CZ, SK, SI, HU, RO, SE, NO, FI, DK, IE, GB, PT, HR.
  - **asia-sakura**: JP, KR, CN, TW.
  - **tropical-beach**: TH, ID, PH, MV, VN, MY, LK, FJ, PF, MU, SC, DO, BS, JM, BB, CR, BZ.
  - usa-desert keeps US/USA; everything else → `adventure-generic`.
- Placeholder `background.png` (gradient) at `src/assets/worldThemes/<id>/background.png`
  for each new theme — real pixel-art is an asset task (the file `OverworldBackground.tsx`
  comment already points to Phase 8).

### 2.3 Tests

- `WORLD_THEME_IDS.length === 5`; each theme exposes all required fields.
- `pickWorldTheme('JP') === 'asia-sakura'`, `'TH' → 'tropical-beach'`, `'FR' → 'europe-forest'`, unknown → `adventure-generic`.

---

## 3. 8B — Boss milestones + clear cutscene

### 3.1 What it does

When a traveler checks in to a milestone flagged `is_boss`, a short "Boss Cleared"
cinematic plays — a milestone-level analogue of the achievement "World Clear".

### 3.2 Design

`is_boss` already exists on `milestones` (DB + types), and the creation sheet already
has a boss toggle. Phase 8 adds the **payoff**:

- `src/features/milestones/components/BossClearCinematic.tsx` — Skia cinematic built on
  the same pattern as `WorldClearCinematic` (≈2.5 s, **skippable**, **reduced-motion =
  static frame**). Shows the milestone name + boss sprite.
- `useBossCutscene` hook + a `BossClearPresenter` mounted in `TripDetailScreen` (where
  PathView/check-in lives). On a successful check-in whose milestone `is_boss === true`,
  the presenter enqueues and renders the cinematic overlay.
- Sound/haptics via 6C: `playSfx('boss_cleared')` + `haptics.success()` on cutscene
  start. `boss_cleared` is added to `SOUND_IDS` (the contract test asserts every
  `playSfx` id ∈ `SOUND_IDS`; `soundAssets` stays empty → lazy no-op until the real file).
- Boss sprite: a special `sprite_id` from the milestone sprite manifest (placeholder).
  `MilestoneNode` already styles boss nodes; add a crown/ring accent if missing.
- i18n `boss.*` (title, subtitle with `{milestone}`, skip label) en + fr.

### 3.3 Tests

- Cinematic renders; skippable; reduced-motion path is static.
- Presenter triggers **only** for `is_boss` check-ins, never for normal milestones.
- `boss_cleared` ∈ `SOUND_IDS` (contract).

---

## 4. 8C — Time capsules

### 4.1 What it does

A traveler seals a message now that becomes readable later — either after a date
(`open_after`) or when a chosen milestone is reached (`open_at_milestone`). Recipient is
the whole trip (group) or one member. The message is **invisible until openable**, even
to the database client, enforced by RLS.

### 4.2 Data model

```sql
time_capsules (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references trips(id) on delete cascade,
  milestone_id      uuid references milestones(id) on delete set null,   -- optional anchor
  author_id         uuid not null references auth.users(id),
  recipient_id      uuid references auth.users(id),                      -- NULL = group
  message           text not null,
  open_after        timestamptz,                                         -- time trigger
  open_at_milestone uuid references milestones(id) on delete set null,   -- event trigger
  opened_at         timestamptz,                                         -- first open
  notified_at       timestamptz,                                         -- cron idempotency
  created_at        timestamptz not null default now(),
  constraint time_capsules_has_trigger
    check (open_after is not null or open_at_milestone is not null)
)
```

### 4.3 Openability + RLS (the security core)

A capsule is **openable** when its trigger has fired:

```sql
create function _capsule_is_open(p_open_after timestamptz, p_open_at_milestone uuid)
returns boolean language sql stable as $$
  select (p_open_after is not null and now() >= p_open_after)
      or (p_open_at_milestone is not null
          and exists (select 1 from checkins c where c.milestone_id = p_open_at_milestone));
$$;
```

- **RLS on `time_capsules`** (defense in depth — the row, message included, is hidden
  until openable):
  - `INSERT`: `author_id = auth.uid() AND is_trip_member(trip_id, auth.uid())` (the 2-arg `is_trip_member` helper from 4A, reused throughout 7A/7B).
  - `SELECT`: `is_trip_member(trip_id) AND (recipient_id IS NULL OR recipient_id = auth.uid()) AND _capsule_is_open(open_after, open_at_milestone)`.
  - `DELETE`: `author_id = auth.uid()` OR trip owner (moderation).
  - No `UPDATE` policy for clients (opening is via RPC).
- **`list_trip_capsules(p_trip_id uuid)`** — `SECURITY DEFINER` RPC for the UI list. It
  derives `auth.uid()`, checks membership, and returns **metadata for every capsule**
  (id, author_id, recipient_id, open_after, open_at_milestone, opened_at, created_at,
  `is_open` boolean) with `message` **NULLed unless** the row is openable AND the caller
  is the recipient/group. This is what lets the UI render "🔒 sealed capsule, opens on
  DATE" without leaking content. (RLS can't hide a single column, so this RPC is the
  metadata path; the strict table RLS is the belt-and-suspenders content path.)
- **`open_time_capsule(p_capsule_id uuid)`** — `SECURITY DEFINER` RPC: verifies
  membership + recipient + openable, stamps `opened_at = now()` if NULL, returns the
  message. Internal helpers + RPCs grant-hardened (revoked from `anon`) up-front.

### 4.4 Notifications

- New notification category `time_capsule` (added to the categories util + per-category
  prefs in `profiles.preferences`).
- **`time_capsules_cron`** edge fn (verify_jwt=false, secret-gated, daily via pg_cron —
  the 4E pattern): finds capsules whose `open_after` crossed and `notified_at IS NULL`,
  INSERTs a `time_capsule` notification (to recipient, or all members if group), stamps
  `notified_at`. Reuses the 4C push chain.
- **Trigger on `checkins`** for milestone-anchored capsules: when a check-in lands on a
  milestone that is some capsule's `open_at_milestone`, INSERT the notification (idempotent
  via `notified_at`).

### 4.5 Client

`src/features/time-capsules/`:

- `api.ts` (create insert; list via `list_trip_capsules`; open via `open_time_capsule`),
  `useTimeCapsules` hook.
- `CreateCapsuleSheet` (message + trigger mode time/milestone + recipient picker
  group/member), `SealedCapsuleCard` (locked + countdown to `open_after`),
  `CapsuleReveal` (Reanimated/Skia unwrap animation on open), `TimeCapsulesSection` in
  `TripDetailScreen`.
- `playSfx('capsule_open')` on reveal. i18n `timeCapsules.*` (en + fr).

### 4.6 Tests

- `_capsule_is_open` truth table (time fired / not, milestone reached / not).
- RLS: sealed message unreadable; readable after `open_after`; non-recipient blocked;
  `list_trip_capsules` NULLs message while sealed but returns metadata.
- Client: create/seal/open; contract (category ∈ vocab, RPCs + table in generated types).

---

## 5. 8D — Caravan mode

### 5.1 What it does

Two (or more) trip members co-watch the map live: a **leader** drives the camera, and
**followers** see the leader's viewport move in real time. Opt-in, ephemeral, no storage.

### 5.2 Design

Reuses the Phase 5 members-only realtime channel `trip:{id}` (Realtime Authorization RLS
already restricts it to trip members). No DB.

- `src/features/caravan/`:
  - `caravanStore` (zustand): `{ role: 'off' | 'leading' | 'following', leaderId: string | null }`.
  - `caravan` broadcast event on the existing channel, payload
    `{ leaderId, center: [lng, lat], zoom, mapMode: 'overworld' | 'real' }`.
  - `useCaravan(channel)` hook: subscribes to `caravan` events, exposes role + the latest
    incoming camera; provides `broadcastCamera` (leader, throttled ≈250 ms on camera move)
    and `lead()` / `follow(leaderId)` / `leave()`.
  - `CaravanControls` overlay (start leading · join leader · leave) + a "Following X — tap
    to break" banner.
- Integration in `TripMapView` (the map's integration point may import caravan — one-way,
  no cycle): when `following`, incoming `{center,zoom,mapMode}` is applied to the
  `useMapCamera` shared values (worklet via `runOnUI`, same JS-bridge approach as
  `MapCrossfade`) and local pan/zoom is suppressed until the user breaks follow; when
  `leading`, camera changes are broadcast.
- Safety: opt-in both sides (a follower chooses to follow), ephemeral, members-only.
- i18n `caravan.*` (en + fr).

### 5.3 Tests

- `caravanReducer` role transitions (off↔leading↔following, leader leaves → followers reset).
- Broadcast payload shape; throttle util.
- Follower applies incoming camera (mocked shared values).
- Contract: event name constant ↔ the channel subscription.

---

## 6. 8E — Random encounters

### 6.1 What it does

Surfaces a surprise nearby point of interest ("Random Encounter! There's a viewpoint
200 m away — add it?") that the user can add as a milestone or dismiss. Suggestions,
never impositions.

### 6.2 Design

Follows the Phase 7 edge-proxy + cache pattern (like `enrich_milestone` + `weather_cache`).

- **`random_encounter`** edge fn (**verify_jwt=true**; caller authorized via JWT →
  `trip_members`, not the cron secret-gate): input `{ trip_id, lng, lat, radius? }`.
  Verifies membership, queries the POI provider server-side, curates/filters/ranks, caches,
  returns `Encounter[]` `{ name, category, lng, lat, distance_m, tags }`.
- **Provider interface** (server-side, the extensibility point):
  `EncounterProvider { findNearby(coord, radiusM): Promise<Encounter[]> }`.
  - `OverpassProvider` (default, **active**): OpenStreetMap Overpass API — free, no key.
    Curated query over interesting tags (`tourism=viewpoint|artwork|attraction`,
    `amenity=cafe|ice_cream`, `historic=*`, `natural=peak|waterfall|beach`), `out body`
    capped (~30), ranked by distance with light randomness for "surprise".
  - `GooglePlacesProvider` — interface-only stub (drop-in later, needs a paid key; not now).
- **`encounter_cache`** table: key = rounded coord + radius bucket, `results jsonb`,
  `fetched_at`, `expires_at` (TTL). **Service-role only** — SELECT/INSERT revoked from
  `anon`/`authenticated` (clients reach encounters through the edge fn, never the cache
  directly), mirroring `weather_cache`/`milestone_legs`.
- **Client** `src/features/encounters/`: `api.ts` (invoke `random_encounter`),
  `useEncounters` hook, `EncounterCard` (pixel "Random Encounter!"), a "Surprise me"
  affordance (TripDetail / map) + optional prompt on check-in, **add-as-milestone** action
  (reuses the milestones API; never auto-adds), dismissable. `playSfx('encounter')`.
  i18n `encounters.*` (en + fr).

### 6.3 Tests

- Overpass query builder; cache-key rounding; distance/rank util.
- Provider interface conformance (Overpass returns the `Encounter` shape).
- Edge fn contract (function name/URL, membership check, verify_jwt=true).
- RLS: `encounter_cache` not client-readable. Add-as-milestone creates a milestone.

---

## 7. Cross-cutting

- **DB migrations** (Supabase MCP, grant-hardened up-front, types regen):
  `time_capsules` (+ `_capsule_is_open`, `list_trip_capsules`, `open_time_capsule`, cron
  schedule, checkin trigger, `notified_at`); `encounter_cache`.
- **Edge functions**: `random_encounter` (verify_jwt=true), `time_capsules_cron`
  (verify_jwt=false, secret-gated) + pg_cron daily schedule (Vault URL).
- **Notification categories**: add `time_capsule`.
- **Sound ids**: add `boss_cleared`, `capsule_open`, `encounter` to `SOUND_IDS`
  (`soundAssets` stays empty → lazy no-op; real audio = asset task).
- **i18n**: theme labels, `boss.*`, `timeCapsules.*`, `caravan.*`, `encounters.*` (en + fr).
- **Native deps**: **none** — Phase 8 ships OTA like Phase 7.
- **Folder structure**: new features `@features/time-capsules`, `@features/caravan`,
  `@features/encounters`; 8A extends `@features/map`, 8B extends `@features/milestones`.

## 8. Build sequencing (for the workflow)

1. **Me, first (Supabase MCP + edge deploy)**: apply 8C + 8E migrations (grant-hardened),
   regen types, deploy `random_encounter` + `time_capsules_cron`, schedule crons, Vault URLs.
2. **Workflow, parallel client modules**: 8A (themes), 8B (boss cutscene), 8D (caravan) are
   independent and run concurrently; 8C (capsules client) and 8E (encounters client) run
   once their backend from step 1 exists.
3. **Integrate + harden inline**: wire presenters/sections into `TripDetailScreen` and
   `TripMapView`; run contract tests, code-validator, advisors, security review.

## 9. Testing & verification strategy

- Unit + contract tests per module (i18n keys, sound-id vocab, route/edge-fn names,
  channel event names, notification categories, generated-types presence, RLS no-write).
- `code-validator` after the build; `get_advisors` (security + perf) must be baseline-clean;
  `/auditing-runtime-contracts` for the static→runtime boundaries (edge-fn URLs, cron
  secrets, channel events, deep links); `/security-review` on the diff.
- On-device verification (EAS build) is required for the Skia cutscenes, realtime caravan
  sync, and the edge-fn round-trips — backend chains are live, device proof is a follow-up
  (consistent with the rest of the project's OTA posture).

## 10. Pipeline after this spec

spec (this doc) → `writing-plans` (implementation plan) → `/architecture` (ADR: time-capsule
RLS gating model, caravan broadcast protocol, encounter provider abstraction + edge-proxy)
→ `/ui-ux-pro-max` (boss cutscene, capsule create/seal/open, caravan controls, encounter
card, theme visuals) → **Workflow** multi-agent build → `/auditing-runtime-contracts` +
`code-validator` + `/security-review`.
