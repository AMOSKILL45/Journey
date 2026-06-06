# Phase 10 — Architecture Decision Record

> **Date**: 2026-06-06 · **Status**: Proposed (pending user review) · **Deciders**: Amos (solo dev)
> Resolves the three open questions flagged in the Phase 10 design spec
> ([2026-06-06-journey-phase-10-stores-polish-design.md](2026-06-06-journey-phase-10-stores-polish-design.md) §4, §7.3, §8).
> Continues the project ADR series (Phase 9 = ADR-007/008/009 → this = **ADR-010/011/012**).

## Shared context

Phase 10 ships submit-readiness. Two decisions are low-risk (011 Readable Mode, 012 workflow
shape); one is the **sensitive core** (010 account deletion) and is grounded below in a live
introspection of the database's foreign-key graph.

---

# ADR-010: Account-deletion mechanism — sentinel ghost + ordered server-side purge

**Status:** Proposed

## Context

The product decision (brainstorming): **hard delete** the account + personal data, with a
confirmation dialog, and **anonymize** the departing user's contributions to _shared_ trips
(author → "Ancien voyageur") so co-travellers' trips survive.

A live FK introspection (`pg_constraint` over `auth.users` + `public.profiles`) shows the
current schema **cannot** express this policy with delete rules alone:

| Problem                        | Evidence                                                                                   | Effect of a naive `DELETE auth.users`               |
| ------------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Owned trips cascade-die        | `trips.owner_id → profiles` **CASCADE**, NOT NULL                                          | deletes **all** the user's trips, incl. shared ones |
| Path authorship blocks delete  | `milestones.created_by → profiles` **NO ACTION**, NOT NULL                                 | delete is **rejected** outright                     |
| Shared content cascade-dies    | `photos`, `checkins`, `poll_votes`, `reactions` **CASCADE**                                | shared memories vanish (want: anonymize)            |
| ~12 NO ACTION FKs block delete | `polls`, `documents`, `time_capsules`, `trip_checklists`, `checklist_items`, `scrapbooks`… | delete is **rejected**                              |
| Author columns are `NOT NULL`  | almost every `created_by`/`user_id`/`author_id`                                            | **cannot SET NULL** to anonymize                    |

Because the author columns are `NOT NULL`, anonymizing means **reassigning** them to a valid
user id — i.e. a reserved sentinel row.

## Decision

Adopt a **reserved "ghost" user** + an **ordered server-side purge**, run as a Postgres
`SECURITY DEFINER` function orchestrated by a thin edge function.

1. **Ghost sentinel** — one reserved `auth.users` row (fixed constant UUID, never logs in)
   with a `profiles` row. The client renders it as the i18n label `account.ghostName`
   ("Ancien voyageur" / "Former traveller") by matching the known UUID — **no language is
   stored in the DB**.
2. **`purge_account_data(uuid)`** — `SECURITY DEFINER`, revoked from `anon`/`authenticated`,
   runs the ordered policy below in **one transaction**. Does **not** touch `auth.users` or
   storage (it can't).
3. **`delete-account` edge function** (`verify_jwt=true`): derives `auth.uid()`, deletes the
   caller's **Storage** objects (their `trip-documents` files — possible passport scans),
   calls `purge_account_data(uid)`, then `auth.admin.deleteUser(uid)` (service role). The
   final auth delete lets the remaining **CASCADE** FKs finish personal-data cleanup.

### Table-by-table policy (derived from the live FK graph)

> Ordered so that, at the moment of `deleteUser`, **no `NO ACTION` FK still points at U** and
> **no `CASCADE` FK would take shared content**.

| Action                                   | Tables.columns                                                                                                                                                                                                                                    | Why                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| **ANONYMIZE → ghost**                    | `milestones.created_by`, `checkins.user_id`, `photos.user_id`, `polls.created_by`, `time_capsules.author_id`, `trip_checklists.created_by`, `checklist_items.created_by`                                                                          | shared content visible to other members; keep the row, drop the PII attribution |
| **TRANSFER**                             | `trips.owner_id` → longest-standing other member (`min(trip_members.joined_at)`) **if** other members exist                                                                                                                                       | a trip must keep a real owner; prevents both cascade-nuke and a headless trip   |
| **DELETE (cascade trip)**                | `trips` where U is the **sole** member                                                                                                                                                                                                            | nothing shared to preserve                                                      |
| **DELETE (personal)**                    | `documents` (+ Storage objects), `checklist_item_completions`, `checklist_suggestion_dismissals`, `scrapbooks`, `notifications`, `personal_reminders`, `poll_votes`, `reactions`, `trip_smart_reminders`, `user_achievements`, `user_push_tokens` | private to U; `documents` may hold PII (passport) → never anonymize             |
| **SET NULL**                             | `checklist_items.assigned_to`/`done_by`, `checklist_templates.created_by`, `trip_invitations.accepted_by`, `reports.resolved_by`, `trip_join_requests.responded_by`                                                                               | nullable refs; detach without deleting the host row                             |
| **CASCADE-auto** (via final auth delete) | `profiles`, `trip_members`, `trip_invitations.invited_by`, v1.1 `reports.reporter_id`/`user_blocks`/`trip_join_requests.requester_id`                                                                                                             | already `ON DELETE CASCADE`; let Postgres finish                                |

## Options Considered

### Option A: Sentinel ghost + ordered purge (chosen)

| Dimension    | Assessment                                                  |
| ------------ | ----------------------------------------------------------- |
| Complexity   | Med (ordered routine, one ghost row)                        |
| Blast radius | Low — no schema-wide ALTER, existing RLS/NOT NULL untouched |
| Correctness  | High — explicit per-table control                           |

**Pros:** preserves `NOT NULL` + existing RLS; exact "Ancien voyageur" UX; atomic; testable via synthetic SQL.
**Cons:** must seed + maintain a ghost row; the routine is long (but mechanical).

### Option B: Make author columns nullable + `ON DELETE SET NULL`

| Dimension    | Assessment                                                      |
| ------------ | --------------------------------------------------------------- |
| Complexity   | High (multi-table ALTER + every read path/RLS must handle NULL) |
| Blast radius | High — touches 9C member RPCs, RLS "is author" checks           |

**Pros:** deletion becomes partly automatic.
**Cons:** large migration; risks regressing RLS that assumes a non-null author; null-handling everywhere.

### Option C: Pure delete (cascade everything)

**Pros:** trivial. **Cons:** contradicts the "anonymize" product decision; destroys co-travellers' trips. Rejected.

## Trade-off Analysis

B's automatic SET-NULL is tempting but its blast radius lands on the **just-hardened 9C PII
surface** — the worst place to introduce regressions right before submission. A keeps the
risk inside one well-tested function. The ghost row is a small, permanent fixture.

## Consequences

- **Easier:** a single auditable purge path; synthetic-SQL provable (matches 6B/9C verification).
- **Harder:** the ghost UUID becomes a constant shared by migration + client env (`@core/env`); the purge order is rigid (documented + tested).
- **Revisit:** owner-transfer picks the oldest member silently — confirm this is acceptable (it slightly extends the "anonymize" answer; a future version could prompt the owner to choose a successor before deletion). **The existing `trips.owner_id ... CASCADE` footgun remains for raw dashboard deletes** — in v1.0 the edge function is the only delete path; FK hardening is a v1.1 option.

## Action Items

1. [ ] Migration: seed ghost `auth.users` + `profiles`; create `purge_account_data(uuid)` SECURITY DEFINER; revoke from anon/authenticated.
2. [ ] Edge fn `delete-account` (verify_jwt=true): Storage purge → `purge_account_data` → `auth.admin.deleteUser`.
3. [ ] Synthetic-SQL test: after purge of U, U's PII gone, shared content owned by ghost, co-member trips survive, sole-owner trips removed, no orphan FK.

---

# ADR-011: Readable Mode font strategy

**Status:** Proposed

## Context

10C Readable Mode swaps the pixel font (Press Start 2P) for legible type, auto-engaging at
≥150% system font scale. Open question: does the legible font need bundling (a **native
asset** → breaks the 100%-OTA goal)?

## Decision

**Reuse the already-bundled `body` (Nunito) + `heading` (Fredoka) fonts.** Readable Mode
toggles `PixelText`'s `fontFamily` from `pixel` → `body`/`heading`; no new font ships.
Auto-engage reads `PixelRatio.getFontScale()` (RN JS API). **Fully OTA-safe, zero native dep.**

## Options Considered

- **A — reuse Nunito/Fredoka (chosen):** OTA-safe, already loaded, on-brand cozy fallback.
- **B — bundle a dedicated high-legibility font (e.g. Atkinson Hyperlegible):** marginally better legibility but a **native asset** → needs an EAS build, breaks OTA, new CREDITS entry.

## Trade-off Analysis

Nunito is already the readable body font and meets ≥12pt AA legibility; B's gain doesn't
justify breaking OTA mid-polish-phase. Revisit only if beta a11y testing flags Nunito.

## Consequences

- Readable Mode + the whole 10C pass stay shippable OTA via `eas update`.
- Persisted in the `@features/feedback` store next to reduce-motion/haptics (one a11y surface).

## Action Items

1. [ ] `useReadableMode` (manual toggle ∨ `getFontScale() ≥ 1.5`); `PixelText` family bascule.
2. [ ] Verify Nunito/Fredoka @ ≥12pt pass AA contrast on cream/surface.

---

# ADR-012: Phase 10 workflow shape — seed → (net-new ∥ feature-lots) → integrate

**Status:** Proposed

## Context

10B/10C/10D are cross-cutting passes that edit the **same feature-screen files**. Parallel
agents partitioned _by concern_ would collide on those files. (Design §8 leaned to option c.)

## Decision

**Partition by feature-lot, not by concern**, behind a sequential seed:

1. **Seed (1 agent, sequential):** ghost+purge migration (apply + advisor-verify); `delete-account`/`export-account-data` edge-fn scaffolds; `@shared` `EmptyState`/`LoadingState`/`ErrorState`; `useReadableMode` + `PixelText` bascule; the **red** i18n en/fr parity contract test. Everything downstream consumes these stable interfaces.
2. **Parallel:**
   - **Net-new (isolated files):** 10A onboarding module + `PrePermissionSheet`; 10E client account/legal screens + edge-fn bodies.
   - **~4 feature-lot agents** (e.g. trips/path · documents/checklists · photos/polls/social · profile/inbox/achievements): each **owns its screens** and applies empty-states + a11y labels + i18n fixes together → **one writer per file**, no conflict.
3. **Integrate + audits:** `/auditing-runtime-contracts`, code-validator inline, security review, advisors.

## Options Considered

- **A — by concern (10B agent, 10C agent, 10D agent):** conceptually clean but **N writers per file** → merge conflicts. Rejected.
- **B — worktree isolation per concern-agent + serial merge:** avoids corruption but serializes the merge and still produces overlapping diffs to reconcile. Heavier.
- **C — by feature-lot + net-new parallel (chosen):** one writer per file, max real parallelism, seed guarantees stable shared interfaces.

## Trade-off Analysis

C trades a little per-agent context breadth (each lot does 3 concerns) for **conflict-free
parallelism** — the right trade when the bottleneck is file ownership, not agent reasoning.

## Consequences

- The seed is a hard barrier (its primitives gate everyone) — it must be correct first.
- Migration is applied + advisor-checked **before** client agents run (security-critical-first, as in Phase 9).

## Action Items

1. [ ] Author the workflow script: seed phase → `parallel`(net-new thunks + lot thunks) → integrate.
2. [ ] Define the exact screen→lot partition in the plan.
