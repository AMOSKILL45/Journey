# Phase 8 — Architecture Decision Records

> **Date:** 2026-06-05 · **Deciders:** solo dev (Amos) · **Status:** Accepted
> Companion to `2026-06-05-journey-phase-8-bold-gambits-design.md`. Continues the
> Phase 7 numbering (ADR-001 enrich proxy · ADR-002 milestone_legs · ADR-003 hybrid
> scrapbook). Shared constraints for all three: **OTA, zero new native dependency,
> no recurring cost, private-by-default, reuse existing infra.**

---

## ADR-004: Time-capsule sealed-message gating

**Status:** Accepted · **Date:** 2026-06-05

### Context

A time capsule's `message` must be invisible until the capsule is _openable_ (its
`open_after` time has passed **or** its `open_at_milestone` has been reached) — invisible
even to the authenticated owner of a valid session who knows the row id. Yet the UI must
still list "🔒 sealed capsule from Alice, opens on 24 Dec" metadata for _every_ trip
member. PostgreSQL RLS is **row-level**, not column-level: a single SELECT policy can
either expose the whole row or hide it — it cannot return the row while masking one column.

### Decision

A **two-path model** with a single shared openability predicate.

1. `_capsule_is_open(open_after, open_at_milestone)` — one `STABLE` SQL function encodes
   "openable". Reused everywhere so the rule lives in exactly one place.
2. **Strict table RLS (content path, defense in depth):** the `SELECT` policy returns the
   full row — message included — only when `is_trip_member` AND recipient matches AND
   `_capsule_is_open(...)`. A raw `select message from time_capsules` therefore yields zero
   rows while sealed.
3. **`list_trip_capsules(trip_id)` `SECURITY DEFINER` RPC (metadata path):** returns
   metadata for all of a trip's capsules with `message` **NULLed** unless the row is
   openable AND the caller is the recipient/group. This is what the list UI consumes.
4. **`open_time_capsule(id)` `SECURITY DEFINER` RPC:** re-checks membership + recipient +
   openability, stamps `opened_at` once, returns the message.

### Options Considered

| Option                                       | Complexity | Cost | Secrecy   | Familiarity                                |
| -------------------------------------------- | ---------- | ---- | --------- | ------------------------------------------ |
| **A — strict RLS + metadata RPC** (chosen)   | Med        | $0   | Strong    | High (matches 6A/6B SECURITY DEFINER RPCs) |
| B — security_invoker view that NULLs message | Med-High   | $0   | Medium    | Low (view↔RLS interaction subtle)          |
| C — client-side message encryption           | High       | $0   | Strongest | Low (group key escrow)                     |

**A pros:** secrecy logic centralized in one predicate; reuses the established
SECURITY-DEFINER-RPC + grant-hardening pattern; the strict RLS is a belt-and-suspenders
backstop behind the RPC. **A cons:** every read path must go through RLS or the RPC — no
ad-hoc `select message`.

**B cons:** a view that masks columns must out-rank the table's own RLS and is easy to get
subtly wrong (a future `select *` on the base table could leak). **C cons:** key custody
for group capsules (NULL recipient) needs shared-key escrow — heavy and YAGNI for a v1
"message to your future selves".

### Trade-off Analysis

The only duplicated logic across the three paths is the openability test, and that is
extracted into `_capsule_is_open` — so there is no real duplication, just reuse. B trades
that centralization for a fragile column-masking view; C buys cryptographic secrecy we
don't need against our own trusted backend. A gives the required guarantee (no sealed-
message leak) at the lowest cognitive cost.

### Consequences

- **Easier:** one predicate to audit; the security review only has to verify
  `_capsule_is_open` + the three grants.
- **Harder:** no ad-hoc reads — all access flows through RLS or the two RPCs.
- **Revisit when:** capsules gain media attachments → Storage RLS must mirror the same
  openability predicate (a signed-URL gate), which is a separate follow-up.

### Action Items

1. [ ] Implement `_capsule_is_open`, the RLS policies, and both RPCs (plan Task 8C.1).
2. [ ] Grant-harden: revoke internal/`SECURITY DEFINER` fns from `anon` up-front.
3. [ ] Synthetic-SQL verify: sealed row returns 0 via table SELECT, 1 (message NULL) via RPC.

---

## ADR-005: Caravan camera-sync transport

**Status:** Accepted · **Date:** 2026-06-05

### Context

Caravan mode lets trip members co-watch the map: a **leader** drives the camera and
**followers** see it move live. Requirements: OTA, members-only (private), low latency at
camera-move frequency, and **no persistence** (the shared viewport is ephemeral — a late
joiner just needs the next frame, not history).

### Decision

Reuse the **Phase 5 members-only `trip:{id}` Realtime channel** (its Realtime
Authorization RLS already restricts membership). Add a `caravan` **broadcast** event with
payload `{ leaderId, center: [lng,lat], zoom, mapMode }`, emitted by the leader through a
**~250 ms leading+trailing throttle** on camera change. Followers apply the incoming
camera to the `useMapCamera` Reanimated shared values via `runOnUI` — the same JS-bridge
technique already used by `MapCrossfade`. Role lives in an ephemeral `caravanStore`
(`off | leading | following`). **No database object.**

### Options Considered

| Option                                               | Complexity | Cost (per camera move) | Latency | Persistence             |
| ---------------------------------------------------- | ---------- | ---------------------- | ------- | ----------------------- |
| **A — broadcast on existing channel** (chosen)       | Low        | $0, no DB write        | Lowest  | None (correct)          |
| B — `postgres_changes` on a `caravan_sessions` table | Med        | a DB write per move    | Higher  | Persists ephemeral data |
| C — a dedicated per-caravan channel                  | Med        | $0                     | Lowest  | None                    |

**A pros:** zero schema, reuses existing member auth, fire-and-forget matches the
ephemeral nature, throttle bounds bandwidth. **A cons:** no delivery guarantee (acceptable
— the next frame corrects any drop).

**B cons:** writing to Postgres at camera-pan frequency is churny and expensive, and
persists data that is meaningless after the session. **C cons:** an extra channel
lifecycle + auth surface for no benefit — the trip channel already authorizes exactly the
right members.

### Trade-off Analysis

Broadcast gives the lowest latency and zero storage cost, and "follow the leader" is
self-correcting so the lack of delivery guarantees is a non-issue. The cost is that we must
(a) suppress a follower's local pan/zoom gestures while following, and (b) reset followers
when the leader leaves — both handled in the `caravanReducer` (`leaderGone`) driven by
channel presence. That is strictly less complexity than a table + its RLS + cleanup.

### Consequences

- **Easier:** no migration; reuses the channel and the crossfade camera-bridge.
- **Harder:** camera ownership must be explicit (a `following` map ignores local gestures
  until "break"); leader-gone handling rides on presence.
- **Revisit when:** caravans need >trip-sized fan-out or replay — Realtime broadcast is
  fine for trip groups; persistence would only matter for a "replay our journey" feature.

### Action Items

1. [ ] `caravanProtocol` (event const, payload type, reducer, throttle) + store (Task 8D.1–8D.2).
2. [ ] `TripMapView`: broadcast when leading, apply via `runOnUI` when following (Task 8D.3).
3. [ ] Contract test pinning `CARAVAN_EVENT='caravan'` to the channel subscription.

---

## ADR-006: Random-encounter POI sourcing

**Status:** Accepted · **Date:** 2026-06-05

### Context

Random encounters surface a surprise nearby POI the user can add as a milestone. The spec's
original note said Google Places ($200 free credit), but Places needs a Google Cloud
project, an API key, and billing. The user asked for the **most complete & functional**
option with **no cost now** and room to upgrade. Must stay private-by-default and obey
commandments #3/#11 (suggestions, never auto-applied).

### Decision

Reuse the **Phase 7 edge-proxy + cache pattern** (ADR-001/002). A `random_encounter` edge
function (deployed **verify_jwt=true**, authorizing the caller as a `trip_members` member
before any work) queries a server-side **`EncounterProvider`**. The default
**`OverpassProvider`** hits the **OpenStreetMap Overpass API** — free, no key. Results are
cached in `encounter_cache` (service-role only, coord-rounded key, 24 h TTL). The provider
interface leaves `GooglePlacesProvider` as a one-file drop-in for later.

### Options Considered

| Option                                                  | Complexity | Cost        | Data richness | Key/billing |
| ------------------------------------------------------- | ---------- | ----------- | ------------- | ----------- |
| **A — edge proxy + Overpass provider + cache** (chosen) | Med        | $0          | Good          | None        |
| B — call Overpass directly from the client              | Low        | $0          | Good          | None        |
| C — Google Places now                                   | Med        | ~$ per call | Richest       | Required    |

**A pros:** member-auth gate, a shared server-side cache (kind to Overpass + faster),
centralized provider swap, and a server-side rate-limit budget; fully active with no key.
**A cons:** one extra network hop vs. a direct client call.

**B cons:** exposes our query patterns and rate-limit to every client, no shared cache, no
auth gate, and no central place to swap providers. **C cons:** cost + key provisioning +
billing the user must set up; the spec itself tags Places v1.x.

### Trade-off Analysis

The proxy hop buys authorization, caching, and provider-swap-in-one-place — the same
reasons ADR-001 chose a proxy for weather/distance. Overpass data is less rich than Places,
but "there's a viewpoint 200 m away — add it?" needs name + category + coordinates, which
Overpass has. Keeping the provider behind an interface means the richness gap is closeable
later by dropping in Places with a key, without touching the client.

### Consequences

- **Easier:** zero cost/key; swap provider in `providers/`; cache shields Overpass.
- **Harder:** Overpass uptime/rate-limits are outside our control (mitigated by the 24 h
  cache + a capped, timed query).
- **Revisit when:** Overpass quality/availability disappoints → implement
  `GooglePlacesProvider` and flip the provider switch.

### Action Items

1. [ ] `encounter_cache` table, service-role only (Task 8E.1).
2. [ ] `random_encounter` edge fn (verify_jwt=true) + `EncounterProvider`/`OverpassProvider` (Task 8E.2).
3. [ ] Contract test pinning the edge-fn name + the membership check; RLS test that the cache is not client-readable.

---

## Cross-cutting consequence

All three decisions reuse infra already in the codebase (the SECURITY-DEFINER-RPC +
grant-hardening pattern, the members-only Realtime channel, and the edge-proxy + cache
pattern). Net new native dependencies: **zero** — Phase 8 ships OTA like Phase 7.
