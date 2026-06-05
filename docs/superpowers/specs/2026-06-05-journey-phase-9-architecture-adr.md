# Phase 9 — Architecture Decision Records

> **Date:** 2026-06-05 · **Deciders:** solo dev (Amos) · **Status:** Accepted
> Companion to `2026-06-05-journey-phase-9-social-foundation-design.md`. Continues the
> numbering (Phase 7 ADR-001/002/003, Phase 8 ADR-004/005/006). Shared constraints:
> **private by default, public is a strict scoped opt-in, OTA, reuse existing patterns.**

---

## ADR-007: Profile safe-subset exposure mechanism

**Status:** Accepted · **Date:** 2026-06-05

### Context

`profiles` SELECT RLS is currently `true` — every authenticated user can read every column
of every profile, including `phone_number`, `passport_*`, `first/last_name`,
`stripe_identity_session_id`. The policy is named "limited fields" but RLS is **row-level**
and cannot mask columns. We need three access levels: a user reads their **own** full
profile; **co-members** see each other's safe basics (display name, avatar); **strangers**
see a public subset **only** if the target opted `visibility='public'`.

### Decision

Lock the base table to own-only (`auth.uid() = id`) and serve every cross-user read through
two **`SECURITY DEFINER` RPCs** (the proven 8C pattern), grant-hardened (revoke from
`PUBLIC`, grant `authenticated`):

- `get_trip_member_profiles(trip_id)` — safe fields for members of a trip the caller belongs to.
- `get_public_profile(user_id)` — public subset, gated on `visibility='public'`, with gender/age
  included only per the user's `gender_visible_in_public` / `show_age_in_public` flags.

### Options Considered

| Option                               | Complexity | PII safety           | Per-row gate                | Embedding                       |
| ------------------------------------ | ---------- | -------------------- | --------------------------- | ------------------------------- |
| **A — own-only RLS + RPCs** (chosen) | Med        | Strong (base locked) | Yes (in fn)                 | n/a (RPC)                       |
| B — `profiles_public` view           | Med        | Medium               | No (view is static columns) | PostgREST view-embed is finicky |
| C — column-level GRANTs              | Med-High   | Medium               | No                          | Works, but fragile              |

**A pros:** PII safe by construction (base table own-only); the membership + visibility
gates and the exact column set live in one auditable function; reuses 8C. **A cons:** the
member-display path changes from a nested embed to an RPC + client-side merge (one extra query).

**B cons:** one view can't express both "co-member basics (no gate)" and "stranger subset
(visibility gate)" with different columns; embedding `trip_members → view` needs a detected
FK PostgREST won't reliably infer; and it still exposes everyone's basics to everyone.
**C cons:** column privileges don't express a per-row `visibility='public'` gate, and new
columns silently regress the safe set.

### Trade-off Analysis

The RPC approach trades one extra client query (in `listMembers`) for a base table that is
**PII-safe by default** and a single place to audit exactly which columns leave the server
and under what gate. B and C are both leakier (no per-row gate) and more fragile to future
column additions.

### Consequences

- **Easier:** security review checks two functions + the own-only policy; new public fields
  are an explicit RPC edit.
- **Harder:** `listMembers` does two queries + a merge (kept behind the same
  `TripMemberWithProfile` shape, so callers are unaffected).
- **Revisit when:** v1.1 discovery needs a bulk public-profile listing → consider a gated
  `profiles_public` view at that point.

### Action Items

1. [ ] Drop `profiles` SELECT=true → own-only; add the two RPCs grant-hardened (plan Part 0 step 3).
2. [ ] Repoint `listMembers` to `get_trip_member_profiles` (plan Task 9C.1).

---

## ADR-008: Public-read scope — child-table allowlist

**Status:** Accepted · **Date:** 2026-06-05

### Context

A public trip must show the **journey (path)** but must NOT expose sensitive child data:
documents, checklists, time capsules, check-ins, realtime locations, the member list, or
member PII. `trips` SELECT already allows public read; the question is how far the public
read reaches into child tables.

### Decision

**Allowlist, not cascade.** Add a public SELECT policy to **`milestones` only** (gated on
the parent trip being non-private). Every other child table keeps its members-only RLS
**untouched**. Public exposure is opt-in per table, default-deny.

### Options Considered

| Option                                       | Complexity | Privacy                                  | Future cost                                    |
| -------------------------------------------- | ---------- | ---------------------------------------- | ---------------------------------------------- |
| **A — allowlist (milestones only)** (chosen) | Low        | Strong (default-deny)                    | Each new public field = a deliberate migration |
| B — public cascade to all child tables       | Low        | **Unacceptable** (leaks docs, locations) | —                                              |
| C — published projection table               | High       | Strong                                   | Stale data, sync machinery                     |

**A pros:** default-deny — a table becomes public only by an explicit, reviewable policy;
the security review surface is exactly one table. **A cons:** adding "public photos" later
needs another explicit policy (this is a feature, not a bug — it forces the privacy decision).

**B** over-exposes by construction. **C** adds a sync/staleness burden for no v1.0 benefit.

### Trade-off Analysis

The allowlist makes the safe thing the default and the unsafe thing impossible-by-omission.
The cost — an explicit migration per future public field — is exactly the friction we want
around exposing private data.

### Consequences

- **Easier:** auditing "what's public on a trip" = read one policy.
- **Harder:** v1.1 public photos / discovery each need a deliberate public policy.
- **Revisit when:** v1.1 adds public photos or a richer public trip view.

### Action Items

1. [ ] Add `milestones_public_select` gated on `trips.visibility <> 'private'` (plan Part 0 step 2).
2. [ ] Public trip view reads trip + milestones only (plan Task 9B).

---

## ADR-009: Public trip link transport

**Status:** Accepted · **Date:** 2026-06-05

### Context

Spec #33 wants an "open trip link = public view-only page", but the app has **no web**
(react-native-web fails — a standing project constraint). How does a shared link render?

### Decision

**v1.0 = custom-scheme deep link** `journey://t/{token}` (reusing the trip's `share_token`
and the existing deep-link handler) opening a **read-only in-app screen**; App Store
fallback if the app isn't installed. The viewer is a signed-in app user (the app is
auth-gated). A **server-rendered anonymous HTML page** is deferred to **v1.1** (discovery launch).

### Options Considered

| Option                              | Complexity | Infra/cost             | Anonymous web view     | OTA         |
| ----------------------------------- | ---------- | ---------------------- | ---------------------- | ----------- |
| **A — deep link into app** (chosen) | Low        | None (existing scheme) | No (needs app + login) | ✅          |
| B — server-rendered HTML page       | Med        | Domain + hosting       | Yes                    | n/a         |
| C — hybrid (app else HTML)          | High       | Domain + AASA (native) | Yes                    | ❌ (native) |

**A pros:** OTA, reuses `share_token` + the deep-link infra, zero hosting. **A cons:** not
truly anonymous — the viewer needs the app installed and to be signed in.

**B/C** deliver the real viral/anonymous web link but need a domain, hosting, HTML
rendering, and (C) `apple-app-site-association` + associated domains (a native build) — the
right investment when **discovery** launches in v1.1, overkill for a v1.0 foundation.

### Trade-off Analysis

For a foundation phase where sharing is link-to-friends (not public virality), A delivers
the end-to-end flow (visibility → link → read-only view) with zero new infra and stays OTA.
The anonymous-web capability is a v1.1 concern tied to discovery, so deferring it costs
nothing now and avoids standing up hosting before it's needed.

### Consequences

- **Easier:** OTA; reuses the invite deep-link pattern; no infra.
- **Harder:** the public screen must render behind the auth gate (viewer signed in); no
  browser preview until v1.1.
- **Revisit when:** v1.1 discovery → add the server-rendered HTML page + universal links
  (a native build with AASA).

### Action Items

1. [ ] `(public)/trip/[token]` route + `buildPublicTripLink` + deep-link wiring (plan Tasks 9A.1, 9B.2).

---

## Cross-cutting consequence

All three reuse infra already in the codebase (the 8C SECURITY-DEFINER-RPC + grant-hardening
pattern, the existing RLS helpers, the invite deep-link infra). Net new native dependencies:
**zero** — Phase 9 ships OTA. The HTML public page + universal links are the explicit v1.1
follow-up when discovery launches.
