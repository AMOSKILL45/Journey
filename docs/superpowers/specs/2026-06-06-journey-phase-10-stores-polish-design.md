# Phase 10 — Stores Polish & Submit-Readiness — Design

> **Date**: 2026-06-06 · **Status**: approved (brainstorming) · **Codename**: `journey`
> v1.0 "stores polish" pass — deliverable: **App submit-ready** (spec §12.1 Phase 10, §13).
> Single source of truth for Phase 10. Spec → ADR → UI → Plan → Workflow build → audits.

## 1. Overview

Phase 10 makes the app **submittable to the App Store + Play Store**. It is ~60% a
**cross-cutting polish pass** over existing screens (empty states, a11y, i18n) and ~40%
**net-new flows** (first-run onboarding, the legal/compliance gates). The governing
constraints are unchanged: **private by default**, **i18n key-driven (zero hardcoded
strings)**, **no new native deps if avoidable** (target 100% OTA).

The deliverable "submit-ready" is only **true** if the blocking legal gate ships:
**in-app account deletion** is mandatory for App Store review (Guideline 5.1.1(v)) and GDPR
right-to-erasure. It lives in spec §13.3 (legal), not the §12.1 Phase-10 row, but Phase 10
is where it lands — confirmed in scope.

Key facts that shape scope:

- A **profile** onboarding already exists (`@features/profile` `OnboardingScreen` —
  nationality/sprite/name) reached via `(modals)/onboarding`. Phase 10 adds a **separate
  first-run intro** before sign-in; the two do not merge.
- `@features/feedback` already owns `osReduceMotion` + a settings store (6C). The a11y work
  (10C) **extends** it rather than creating a parallel module.
- `expo-sharing` / `expo-file-system` / `expo-image-manipulator` are already deps (4A) —
  data export reuses them; no new native dep.
- Anonymization (10E) depends on whether author columns are nullable / cascade — a real
  schema question deferred to the ADR (see §7.3, §8).

### 1.1 Decomposition (5 sub-modules under one spec)

| Sub     | What                                                       | New surface                                            | Type           |
| ------- | ---------------------------------------------------------- | ------------------------------------------------------ | -------------- |
| **10A** | First-run onboarding (4-screen carousel) + pre-permission  | `@features/onboarding`, `(onboarding)` route group     | net-new        |
| **10B** | Empty / loading / error states across all screens          | `@shared` `EmptyState`/`LoadingState`/`ErrorState`     | cross-cutting  |
| **10C** | Accessibility — Readable Mode, labels, contrast, targets   | `useReadableMode`, `A11ySettings`, `PixelText` bascule | cross-cutting  |
| **10D** | i18n audit — zero hardcoded strings + en/fr key parity     | contract test + lint guard + fixes                     | cross-cutting  |
| **10E** | Legal gates — account deletion, data export, age gate, ToS | `delete-account` + `export-account-data` edge fns      | net-new (+ DB) |

Build order: **seed (shared primitives + i18n parity test + edge-fn schema) → parallel
(10A, 10E client, feature-lot passes for 10B/10C/10D) → integrate → audits**. See §8.

### 1.2 Out-of-build, tracked elsewhere

- **Assets** (pixel-art): app icon 1024, splash, store screenshots FR+EN, feature graphic.
  Artist task — `EmptyState`/onboarding ship with placeholders.
- **Legal content**: privacy policy + ToS **text + hosting** is the owner's job; code only
  links to configured URLs (placeholder until hosted).
- **Detailed visuals** of 10A/10B/10C (mockups, layout): produced at `/ui-ux-pro-max`.

## 2. 10A — First-run onboarding

New module `@features/onboarding`, distinct from profile onboarding.

- **4-screen skippable carousel**, shown on first launch **before sign-in** (value prop
  sells the app, then auth). Persisted flag `onboarding_intro_seen` (AsyncStorage).
  Flow: **intro → sign-in → profile onboarding (existing) → app**.
- Screens map to the product pillars:
  1. **Plan together** — create trips, invite friends.
  2. **The path** — milestones as a Duolingo path on the overworld map.
  3. **Live together** — avatars gravitate live (realtime).
  4. **Private by default** — privacy framing + "Get started" CTA.
- Each screen: pixel-art illustration _placeholder_ + heading + 1–2 line body + dots
  indicator + Skip (persists the flag) + Next/Get started. Respects reduced-motion.
- Routing: `(onboarding)` group (or `(modals)/intro`); shown from the root layout when
  `!onboarding_intro_seen` and no session.
- **Pre-permission priming** (§6.7 "game unlock framing"): a reusable `PrePermissionSheet`
  (lives in `@features/onboarding`), wired on the two highest-value permissions —
  **notifications** (today requested silently on session, 4C `registration.ts`) and
  **location** (live avatars, 5B). Camera/photos are already gated by an explicit user tap
  (upload) → out of scope.
- `onboarding.*` i18n (en + fr).

## 3. 10B — Empty / loading / error states

- Three `@shared/components` primitives (audit existing partial impls first, do not
  duplicate): `EmptyState` (sprite + title + body + **one** primary action), `LoadingState`
  (skeleton/spinner, pixel-styled), `ErrorState` (message + retry). All take i18n keys, all
  carry `accessibilityLabel` (ties into 10C).
- Applied across every list/detail surface: trips, path (empty trip), documents, checklists,
  photos, polls, achievements, passport, inbox/notifications, discover (v1.1 stub),
  smart-reminders, life-reminders.
- Cross-cutting: edits many feature screens → see §8 partitioning.

## 4. 10C — Accessibility

- **Readable Mode**: a setting that swaps **Press Start 2P → readable fonts**
  (`body`/`heading`) for UI text, keeping the pixel font for pure-accent decoration only.
  **Auto-engages at ≥150%** system font scale (§6.10). Implemented as a `useReadableMode`
  hook + a font-family bascule inside `PixelText` (the DS text primitive); persisted in the
  `@features/feedback` settings store. **Open question for ADR**: does the readable font
  need to be bundled (→ native asset, breaks pure-OTA) or can we use a system font? Prefer a
  system/already-bundled font to stay OTA.
- **accessibilityLabels** on all sprites + icon-only controls (audit `PixelButton`,
  `MilestoneNode`, `PixelAvatar`, sprite pickers, FABs, close buttons).
- **Contrast AA**: verify token combinations against WCAG AA; fix failures (e.g. accent
  yellow `#FFCB05` on cream); document a contrast table in the plan.
- **Touch targets ≥44pt** + **reduced-motion**: coverage audit (some already done — the
  achievements cinematic, MilestoneNode). Fill gaps.
- Surface: extend `@features/feedback` with an `A11ySettings` panel (Readable Mode +
  existing reduce-motion/haptics toggles grouped).
- Cross-cutting.

## 5. 10D — i18n audit

- Sweep for **hardcoded strings in JSX** and enforce **en/fr key parity** (every `t()` key
  present in both locales; no orphan, no missing).
- Tooling (the durable output): a **contract test** asserting `en.json` ⟷ `fr.json` key-set
  equality (deep), plus a guard against hardcoded user-facing strings (ESLint rule
  `i18next/no-literal-string` scoped to screens/components, or a custom test). Fix every
  violation surfaced.
- Output = green parity test + lint guard wired into CI.

## 6. 10E — Legal / compliance gates

### 6.1 Account deletion (hard delete + confirmation)

- **`delete-account` edge function** (`verify_jwt=true`, runs with service role): derives
  `auth.uid()` from the JWT, executes the table-by-table policy (§7.3), then deletes the
  `auth.users` row. Idempotent; returns a summary.
- **Client**: Settings → "Delete my account" → an **explicit destructive confirmation
  dialog** ("Are you sure? This permanently deletes your account and data — this cannot be
  undone.") with a clear destructive CTA → calls the edge fn → sign-out + clears local
  caches (TanStack persist, Zustand, AsyncStorage flags).
- Semantics: **immediate hard delete** (no grace period in v1.0; grace = v1.1 upgrade).

### 6.2 Data export (GDPR)

- **`export-account-data` edge function** (`verify_jwt=true`): assembles all of the user's
  own rows across tables into a single **JSON** bundle and returns it.
- **Client**: Settings → "Export my data" → fetch → write to a file → **share sheet**
  (reuses `expo-file-system` + `expo-sharing` from 4A). No email infra.

### 6.3 Age gate

- Minimal **13+ / 16 EU** confirmation (§13.3) at sign-up / first profile setup — a
  confirmation step storing an `age_confirmed` flag (in `profiles.preferences` or a column).
  No DOB collection, no heavy verification.

### 6.4 Privacy policy + ToS

- A **"Legal"** section in Settings linking to hosted **Privacy Policy** + **Terms** URLs,
  read from `@core/env` config (zod-validated, placeholder values until hosted). The legal
  text and hosting are owner-provided content (§1.2).

## 7. Cross-cutting

### 7.1 i18n

Every new string is key-driven (`onboarding.*`, `emptyStates.*`/per-feature, `a11y.*`,
`account.*`, `legal.*`), added to **both** en + fr — and validated by the 10D parity test.

### 7.2 Security

- Deletion + export are **service-role edge fns gated by `verify_jwt=true`**, scoped to the
  caller's own `auth.uid()` — never a client-side privileged delete, never a user-supplied
  target id.
- Deletion must **not** leak others' data and must **fully** remove the caller's PII
  (anonymize-not-delete only applies to non-PII shared content — see §7.3).
- No sound during deletion/legal flows (sensitive-flow guard, 6C).
- `get_advisors` (security + perf) must be baseline-clean after the migration.

### 7.3 Account-deletion data policy (the sensitive core)

For deleting user **U**, classify every user-touching table into **delete / anonymize /
detach**. The categories below are the **policy**; the ADR/plan must reconcile them against
the **live schema** (actual FK column names, nullability, `ON DELETE` rules) via
`list_tables` before writing the migration.

- **Delete** (private to U): own `profiles` row (after anonymize step), `personal_reminders`,
  `user_push_tokens`, `notifications` (recipient = U), `user_achievements`,
  `trip_smart_reminders`, `checklist_suggestion_dismissals`, `checklist_item_completions` by
  U, `poll_votes` by U, `reactions` by U, plus v1.1 rows authored by U.
- **Anonymize** (visible to other members of shared trips): `milestones`, `photos`, `polls`,
  `checkins`, `time_capsules` authored by U → reassign author to a reserved **sentinel
  ("Ancien voyageur" / deleted-user)** or NULL; strip any PII in captions. Keep the content
  so co-travellers' trips stay intact.
- **Detach**: remove U from `trip_members` for trips that still have other members.
- **Delete + cascade**: trips where U is the **sole** member → delete the trip and all its
  children.

> **ADR decision required**: anonymization needs author columns to be **nullable** or to
> point at a **reserved sentinel auth user**. If they are `NOT NULL` FKs with
> `ON DELETE CASCADE`, deleting U would cascade-delete shared content instead of anonymizing
> it. The ADR picks one mechanism (sentinel row vs nullable + display fallback).

## 8. Build sequencing (for the workflow)

The cross-cutting passes (10B/10C/10D) edit **the same feature-screen files** → naive
parallel agents would conflict. Resolution (the ADR finalizes):

1. **Seed (sequential, one agent):** build the stable interfaces everything else consumes —
   `@shared` `EmptyState`/`LoadingState`/`ErrorState`, `useReadableMode` + `PixelText`
   bascule, the i18n **parity contract test** (red first), the 10E **DB migration**
   (sentinel/nullable decision applied) + edge-fn scaffolds. Apply + advisor-verify the
   migration here, before client work.
2. **Parallel:**
   - **Net-new** (isolated files): 10A onboarding module; 10E client (account screen) +
     `export-account-data`/`delete-account` edge-fn bodies.
   - **Feature-lot passes** — partition screens into ~4 lots by feature cluster (e.g.
     trips/path · documents/checklists · photos/polls/social · profile/inbox/achievements).
     Each agent owns its lot and applies **empty states + a11y labels + i18n fixes**
     together for those screens (one owner per file → no conflict).
3. **Integrate + audits:** `/auditing-runtime-contracts`, code-validator inline, security
   review, advisors.

## 9. Out of scope (YAGNI)

- Soft-delete / 30-day recovery (v1.1), data-export via email, DOB verification, a
  standalone a11y module, priming for every permission, authoring legal text, asset art.

## 10. Testing & verification

- **Contract tests**: en/fr key parity (10D); `onboarding.*`/`account.*`/`legal.*` keys
  exist; route ⟷ group registration for `(onboarding)`; edge-fn names ⟷ client callers;
  env config (privacy/ToS URLs) zod-parses.
- **Deletion**: synthetic SQL proof that after `delete-account(U)` — U's `auth.users` and
  PII are gone, shared content is anonymized (no PII, author = sentinel), co-member trips
  survive, sole-owner trips are removed. Verified via service-role SQL (mirrors the 6B/9C
  synthetic-RLS approach) since prod has no real accounts to destroy.
- **Advisors** security + perf baseline-clean after migration.
- **Device** (next EAS build): onboarding first-run gating, pre-permission prompts, Readable
  Mode at 150%+ system scale, real share-sheet export, real account deletion round-trip.

## 11. Pipeline after this spec

Per the requested pipe: **/architecture** (ADR — resolve §7.3 sentinel-vs-nullable, the
Readable-Mode font/OTA question, and the §8 workflow shape) → **/ui-ux-pro-max** (visual
spec for 10A/10B/10C) → **Workflow** build (seed → parallel → integrate) →
**/auditing-runtime-contracts** + **code-validator** + **security review**.
