# Phase 7 — Architecture Decision Records

> Resolves the three HOW decisions deferred in
> `2026-06-05-journey-phase-7-cherry-on-top-design.md` §2.
> **Status of all three: Accepted.** Date: 2026-06-05. Deciders: solo dev (Amos).
> Overriding constraint for all three: **preserve the "100% OTA — no new native dep" phase
> property** and **match the established server-authoritative edge-function pattern**.

---

## ADR-001: 7C external-API fetch strategy

**Status:** Accepted · **Date:** 2026-06-05

### Context

7C enriches milestones with weather (Open-Meteo: free, no-auth, CORS-friendly) and inter-
milestone distance/duration (OSRM). The public OSRM demo (`router.project-osrm.org`) is
explicitly _not_ for production use (no SLA, ToS limits). The codebase already routes all
server logic through secret-gated edge functions running with the service role, and the
spec (§184) names a "geocoding proxy" edge function precedent. Cache tables must stay
non-client-writable for integrity (design §3.3 RLS).

### Decision

**Edge-function proxy.** A single `enrich_milestone` edge function (secret-gated,
`verify_jwt=false`, service role) fetches both Open-Meteo and OSRM and upserts the cache
tables. The client never calls the external APIs directly and never writes the caches.

### Options Considered

| Option                                       | Complexity | Cache integrity        | Provider lock-in           | Pattern fit |
| -------------------------------------------- | ---------- | ---------------------- | -------------------------- | ----------- |
| **A. Edge proxy (chosen)**                   | Med        | Strong (server writes) | Low (swap behind fn)       | High        |
| B. Direct client + client cache              | Low        | Weak (client writes)   | High (OSRM ToS in the app) | Low         |
| C. Hybrid (weather direct, distance proxied) | Med        | Mixed                  | Med                        | Med         |

**Pros (A):** cache tables stay non-client-writable (RLS intent + security); OSRM provider
is swappable (self-host / paid router) without an OTA; usage hidden; consistent with
`smart_reminders_cron` / `send_push`. **Cons:** one more edge fn; cold-start latency on an
on-demand, cached path (acceptable).

### Consequences

- Easier: future provider swap, rate-limit handling, server-side caching/TTL.
- Harder: one more function to deploy + secret to provision (Vault `enrich_milestone_*`).
- Revisit if OSRM demo proves unreliable → self-host OSRM or switch router behind the proxy.

---

## ADR-002: 7C distance storage model

**Status:** Accepted · **Date:** 2026-06-05

### Context

Weather is a per-milestone property; distance/duration is a property of an **ordered pair**
(from → to). `milestones.metadata` jsonb exists but is unused anywhere in the client. Storing
"distance_from_prev" on a single milestone couples cache data to the milestone's current
ordering, which silently invalidates on reorder/insert and makes "total trip distance" a
jsonb-sum across rows.

### Decision

**Two purpose-built cache tables.** `weather_cache` keyed per milestone, and a dedicated
**`milestone_legs`** table for the pairwise distance/duration cache:
`(trip_id, from_milestone_id, to_milestone_id, distance_m, duration_s, mode, computed_at)`.
`milestones.metadata` stays free for genuine per-milestone metadata.

### Options Considered

| Option                           | Models pair correctly | Survives reorder    | "Total distance" query | New table |
| -------------------------------- | --------------------- | ------------------- | ---------------------- | --------- |
| **A. `milestone_legs` (chosen)** | Yes                   | Yes (recompute leg) | trivial `SUM`          | +1        |
| B. `milestones.metadata` jsonb   | No                    | No (silent stale)   | jsonb sum across rows  | 0         |

**Pros (A):** correct relational model; cache isolated from source-of-truth rows; cheap
"total distance"; only adjacent legs recompute on reorder. **Cons:** one extra table + leg-
recompute trigger/logic on milestone reorder/insert/delete.

### Consequences

- Easier: trip-level distance stats (7E scrapbook), partial recompute, clean RLS (member
  SELECT, edge-fn write).
- Harder: must invalidate/recompute affected legs when milestone order changes.
- Revisit if multi-modal routing (walk/drive/transit per leg) is added — `mode` column ready.

---

## ADR-003: 7E scrapbook render pipeline (PNG + PDF)

**Status:** Accepted · **Date:** 2026-06-05

### Context

Scrapbook must output **both** a shareable PNG "story" card (aesthetic-critical, must match
the in-app pixel look) and a multi-page PDF album (document-style, embeds photos). The spec
(§757) hinted "fully server-side". But the app **already renders pixel-art with Skia**
(`WorldClearCinematic`, `OverworldBackground`), and a clean on-device PDF compositor that
embeds remote images would require a **new native dep** (e.g. `expo-print`) — which would
**break the 100% OTA phase property**.

### Decision

**Hybrid pipeline:**

- **PNG story card → client-side Skia.** Render with Skia, `makeImageSnapshot()` → PNG bytes,
  upload to `trip-scrapbooks/<trip>/<id>.png`. Pixel-perfect parity with the app, reuses
  existing Skia, **no new native dep**.
- **PDF album → `generate_scrapbook` edge function.** Deno + `pdf-lib` (pure JS, embeds
  JPG/PNG bytes via service role) composes the multi-page album, uploads
  `trip-scrapbooks/<trip>/<id>.pdf`, then INSERTs the `scrapbooks` row with **both** paths and
  returns signed URLs.

**Coordination:** client renders + uploads the PNG, then invokes `generate_scrapbook` with
`{ trip_id, png_path }`; the edge fn builds the PDF, writes the row, returns both signed URLs.

### Options Considered

| Option                           | Pixel parity (PNG) | OTA-safe                      | Headless-capable | Effort |
| -------------------------------- | ------------------ | ----------------------------- | ---------------- | ------ |
| A. Fully server-side (resvg+pdf) | Re-implement look  | Yes                           | Yes              | High   |
| B. Fully client-side             | Yes                | **No** (PDF needs native dep) | No               | High   |
| **C. Hybrid (chosen)**           | Yes (Skia)         | **Yes**                       | PDF only         | Med    |

**Pros (C):** preserves OTA; story card matches the app exactly; edge fn does the document-y
PDF it's best at; aligns aesthetic-criticality with the right tool. **Cons:** two render paths

- an upload→invoke handshake; PNG can't be regenerated fully headless (acceptable — trigger is
  on-demand from the app per brainstorming).

### Consequences

- Easier: keeps the no-EAS-build promise; high-fidelity shareable card; server owns PDF + the
  authoritative `scrapbooks` row.
- Harder: client/edge handshake to coordinate the two artifacts; PNG render lives on-device.
- Revisit if an auto-at-trip-end (headless) trigger is added in v1.1 → add a server-side
  resvg PNG path then (the edge fn already has the data).

### Action Items

1. [ ] 7C: deploy `enrich_milestone` edge fn + Vault secret; `weather_cache` + `milestone_legs`
       migrations + leg-recompute on reorder.
2. [ ] 7E: client Skia `ScrapbookCard` → PNG upload; `generate_scrapbook` edge fn (pdf-lib) →
       PDF + `scrapbooks` row; `trip-scrapbooks` bucket + policies.
3. [ ] Contract tests: edge-fn slugs, bucket names, cache tables not client-writable.
