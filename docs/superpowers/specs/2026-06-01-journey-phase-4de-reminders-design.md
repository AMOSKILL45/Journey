# Phase 4D + 4E — Reminders (Smart trip reminders + Personal life reminders) — Design

> Sub-projects 4D and 4E of Phase 4, specced together because they share one backbone:
> a scheduled evaluator that INSERTs into the 4C `notifications` hub. 4C does all the push work.
>
> Date: 2026-06-01 · Status: approved design (Max scope), pre-plan · Lens: architecture / ADRs
> Builds on: **4C Push infra** ✅ (`notifications` hub, `send_push`, categories, quiet hours).

## 1. Context

Phase 4 decomposition: **4A Documents** ✅ · **4B Checklists** ✅ · **4C Push infra** ✅ ·
**4D Smart reminders (this)** · **4E Personal reminders (this)**.

Master spec §9 prescribes two reminder systems:

- **4D — Smart trip reminders**: a curated **knowledge base** (`country_requirements`, ~150 rules:
  ESTA, ETIAS, ETA UK, vaccines, passport validity…), a **rules engine** (cron) that matches
  `destination_country × passport_country × duration × purpose` for upcoming trips, surfaces
  actionable **Smart Tips** cards in the trip view, and pushes at lead times (T-60/30/7).
- **4E — Personal life reminders**: reminders tied to the user's life, **trip-independent**
  (passport/visa/license/insurance expiry). Auto-created from extracted/entered expiry dates, plus
  fully **manual** user-created reminders. Separate "Life reminders" Inbox tab.

**Max scope** (explicitly chosen by product owner, 2026-06-01):

1. **Full ~150-rule knowledge base** (not a starter subset).
2. **All 5 auto-creation doc types**: passport · visa · ESTA · driving license · travel insurance.
3. **Manual reminder CRUD** included in v1.0 (Settings → Reminders).

**Reuse, don't rebuild.** Both features are just _new producers_ of `notifications` rows. The 4C
chain — `on_notification_created` → `notify_send_push` → `send_push` (category prefs + IANA/DST
quiet hours + Expo Push + token prune) — is untouched. The only 4C change is adding a
`life_reminders` category (`smart_reminders` already exists).

```
pg_cron ──┬─► smart_reminders_cron (edge fn)   ── country_requirements ⋈ trips ⋈ profiles
  2×/day  │        ├─ upsert trip_smart_reminders (pending cards, in-app)
          │        └─ INSERT notifications (category 'smart_reminders') ─┐
  daily   └─► personal_reminders_cron (edge fn) ── date math on personal_reminders
                   └─ INSERT notifications (category 'life_reminders') ──┤
                                                                          ▼
                                  on_notification_created → notify_send_push → send_push
                                  (4C, unchanged — quiet hours & category prefs enforced here)
```

## 2. Architecture Decision Records

| ADR                        | Decision                                                                                                                                                                                                                           | Rationale                                                                                                                                                             | Consequence                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **4DE-1** Eval mechanism   | **pg_cron → eval Edge Functions (TS)**, two fns (`smart_reminders_cron` 2×/day, `personal_reminders_cron` daily). Not pure plpgsql.                                                                                                | Rule eval (duration windows, purpose arrays, passport-validity months) is non-trivial; the whole test suite is Jest; master spec literally says "Edge Function cron". | Eval logic is unit-testable TS. +1 hop + service-role key in fns. Push is **not** re-implemented — fns only INSERT; 4C chain delivers. |
| **4DE-2** KB storage       | **Seeded `country_requirements` table**, i18n-keyed, with `last_verified` + `source_urls[]` per row. Seed via migration(s).                                                                                                        | Queryable/joinable in SQL; i18n via existing pipeline; quarterly refresh = new migration; staleness auditable via `last_verified`.                                    | Rejected JSON-in-edge-fn (not joinable) and admin UI (v1.x, YAGNI). Content is a tracked plan deliverable, human-verified pre-launch.  |
| **4DE-3** 4E auto-creation | passport → `profiles` trigger; visa/esta/license/insurance → `documents.expires_at` + typed category + opt-in; manual → direct CRUD.                                                                                               | Each source has a natural hook; no OCR beyond passport.                                                                                                               | Adds `expires_at` to `documents` (targeted 4A extension) + a typed reminder-category vocabulary.                                       |
| **4DE-4** Idempotency      | Cron is repeat-safe: `notifications_sent_at[]` on both feature tables tracks fired lead times; UNIQUE keys prevent duplicate rows; insert a notification only when `today == target − lead_time` and that lead time has not fired. | Cron runs 2×/day and pushes at multiple lead times — naive logic double-sends.                                                                                        | No dedupe needed in `notifications`; quiet-hours/category gating stays in `send_push`.                                                 |
| **4DE-5** New category     | Add `life_reminders` to `NOTIFICATION_CATEGORIES`, `defaultPrefs`, `NotificationSettings`, i18n.                                                                                                                                   | Life reminders must be independently muteable from trip smart reminders.                                                                                              | `smart_reminders` already exists; only one category added.                                                                             |
| **4DE-6** Consent          | Smart-tip "Add to checklist" and passport auto-reminder are **opt-in**, never silent auto-content.                                                                                                                                 | Commandments #3 (suggestions, never impositions) and #11 (reminders = suggestions).                                                                                   | A `trip_smart_reminders` card is a suggestion; it only becomes a checklist item on explicit tap.                                       |

## 3. Data model (delta)

New migration(s) under `supabase/migrations/`. Schemas follow master spec §5 / §9.5, with
idempotency columns added.

### 3.1 `country_requirements` (KB — curated, ~150 seeded rows)

```
country_requirements
  id                              text PK              -- 'us_esta', 'uk_eta', 'schengen_etias'...
  destination_country             text                 -- ISO 3166-1 alpha-2, NULL = applies by region
  destination_regions             text[]               -- e.g. {'schengen'} for multi-country rules
  requirement_type                text NOT NULL        -- 'visa'|'eta'|'vaccine'|'passport_validity'|'cash_declaration'|'insurance'|'other'
  applies_to_passport_countries   text[]               -- empty = all; else whitelist
  excluded_passport_countries     text[]               -- blacklist (overrides whitelist)
  trip_duration_min_days          int                  -- NULL = no bound
  trip_duration_max_days          int                  -- NULL = no bound (e.g. ESTA ≤ 90)
  trip_purpose                    text[]               -- {'tourism','business'} ; empty = any
  passport_validity_required_months int                -- for requirement_type='passport_validity'
  required                        boolean NOT NULL DEFAULT true
  severity                        text NOT NULL        -- 'mandatory'|'strongly_recommended'|'recommended'|'good_to_know'
  i18n_key                        text NOT NULL        -- 'smartReminders.kb.us_esta' → title/body/action_label
  action_url                      text
  estimated_processing_days       int
  estimated_cost_usd              numeric
  followup_lead_times             int[] NOT NULL DEFAULT '{60,30,7}'
  last_verified                   date NOT NULL        -- set by the human verification pass
  source_urls                     text[] NOT NULL      -- official sources
  created_at, updated_at          timestamptz
```

`title`/`body`/`action_label` are **not** columns — they resolve from `i18n_key` against
`en.json`/`fr.json` (commandment #12, zero hardcoded strings). RLS: **public read**, no client write.

### 3.2 `trip_smart_reminders` (per-user, per-trip actionable cards)

```
trip_smart_reminders
  id                       uuid PK
  trip_id                  uuid NOT NULL FK trips ON DELETE CASCADE
  user_id                  uuid NOT NULL FK auth.users ON DELETE CASCADE
  requirement_id           text NOT NULL FK country_requirements
  status                   text NOT NULL DEFAULT 'pending'  -- 'pending'|'done'|'dismissed'|'snoozed'|'not_applicable'
  snooze_until             timestamptz
  marked_done_at           timestamptz
  added_to_checklist_item_id uuid FK checklist_items ON DELETE SET NULL   -- 4B link
  notifications_sent_at    timestamptz[] NOT NULL DEFAULT '{}'            -- idempotency (4DE-4)
  fired_lead_times         int[] NOT NULL DEFAULT '{}'                    -- which lead times pushed
  created_at, updated_at   timestamptz
  UNIQUE (trip_id, user_id, requirement_id)
```

### 3.3 `personal_reminders` (per-user, trip-independent)

```
personal_reminders
  id                     uuid PK
  user_id                uuid NOT NULL FK auth.users ON DELETE CASCADE
  reminder_type          text NOT NULL          -- 'passport_expiry'|'visa_expiry'|'esta_expiry'|'driving_license_expiry'|'travel_insurance_expiry'|'custom'
  related_document_id    uuid FK documents ON DELETE SET NULL
  target_date            date NOT NULL           -- expiry date
  i18n_key               text                    -- for auto types; NULL for 'custom'
  title                  text                    -- used when 'custom' (user-entered)
  body                   text                    -- used when 'custom'
  lead_times             int[] NOT NULL          -- e.g. {180,90,30,7} passport ; {60,30,7} visa
  status                 text NOT NULL DEFAULT 'active'  -- 'active'|'snoozed'|'dismissed'|'completed'
  snooze_until           timestamptz
  source                 text NOT NULL DEFAULT 'manual'  -- 'auto_passport'|'auto_document'|'manual'
  notifications_sent_at  timestamptz[] NOT NULL DEFAULT '{}'
  fired_lead_times       int[] NOT NULL DEFAULT '{}'
  created_at, updated_at timestamptz

CREATE UNIQUE INDEX uq_personal_reminders_auto
  ON personal_reminders(user_id, reminder_type, related_document_id)
  NULLS NOT DISTINCT WHERE source <> 'manual';
CREATE INDEX idx_personal_reminders_user_date ON personal_reminders(user_id, target_date);
```

> Dedup (correctness): `uq_personal_reminders_auto` uses **`NULLS NOT DISTINCT`** (PG15+, Supabase
> is on it) so passport auto rows — which have `related_document_id IS NULL` — still dedupe to one
> per user. Without it, two NULLs count as distinct and passport reminders would duplicate on every
> profile update. `manual`/`custom` rows are excluded from the index (`source <> 'manual'`) and
> unconstrained — a user may keep many.

### 3.4 Altered tables

- **`documents`** `+ expires_at date NULL` — the doc carries its own expiry; reminder references it.
- **`profiles.preferences`** (jsonb, existing) `+= { reminders: { passportAutoReminder: bool, … } }`
  for the passport auto-reminder opt-in. No new column.

## 4. RLS

| Table                  | Policy                                                                                                                                                                                                                                                                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `country_requirements` | `SELECT` for `authenticated` (and/or `anon`); **no** INSERT/UPDATE/DELETE for clients — seed/refresh via migration only.                                                                                                                                                    |
| `trip_smart_reminders` | `SELECT`/`UPDATE` (status, snooze) where `user_id = auth.uid()`; rows created by cron (service role / SECURITY DEFINER). No client INSERT.                                                                                                                                  |
| `personal_reminders`   | `source='manual'`: full CRUD where `user_id = auth.uid()`. Auto rows: trigger/service-role-created; the user may UPDATE **status/snooze/lead_times only** (not `target_date`/`type`, which derive from the source) and DELETE. All SELECT scoped to `user_id = auth.uid()`. |
| cron edge fns          | Use **service role**; eval reads `trips`/`profiles`/`documents` across users — justified, server-only, mirrors 4C `send_push`.                                                                                                                                              |

## 5. Cron + eval Edge Functions (ADR 4DE-1)

Prereq: enable **`pg_cron`** extension (`pg_net` already enabled by 4C).

### 5.1 `smart_reminders_cron` (2×/day)

1. Select trips with `start_date` in the future (within max lead window) and their members + each
   member's `profiles.passport_country`.
2. For each (trip, member), query matching `country_requirements`:
   - `destination_country = trip.destination_country` (or region match), AND
   - passport whitelist/blacklist satisfied, AND
   - trip duration within `[min,max]`, AND purpose matches (or rule purpose empty).
3. Upsert `trip_smart_reminders` (pending) per match — idempotent via UNIQUE.
4. For each match where `today == start_date − lead_time` and `lead_time ∉ fired_lead_times`:
   INSERT a `notifications` row (category `smart_reminders`, `data = {tripId, requirementId}`),
   append the lead time to `fired_lead_times`/`notifications_sent_at`.
5. `passport_validity` rules compare `profiles.passport_expires_at` vs `trip.end_date +
required_months` → fire if insufficient.

### 5.2 `personal_reminders_cron` (daily)

1. Select `personal_reminders` where `status='active'` and (`snooze_until` null or past).
2. For each, for each `lead_time`: if `today == target_date − lead_time` and `lead_time ∉
fired_lead_times` → INSERT `notifications` (category `life_reminders`, `data={reminderId, type}`),
   record fired.
3. Auto-`completed` when `target_date` passed (optional housekeeping).

Both fns are **secret-gated** like `send_push` (invoked by pg_cron via `pg_net` with the webhook
secret; `verify_jwt=false` + `verify_webhook_secret` RPC). They never expose secrets.

## 6. 4E auto-creation sources (ADR 4DE-3)

- **Passport** — `AFTER INSERT OR UPDATE OF passport_expires_at ON profiles` trigger: if opt-in flag
  set and `passport_expires_at` not null → upsert `personal_reminders(type='passport_expiry',
source='auto_passport', lead_times='{180,90,30,7}')`. Opt-in checkbox lives on the
  identity/passport confirm screen and Settings.
- **Documents** — when a `documents` row has `category ∈ {visa, esta, driving_license,
travel_insurance}` and `expires_at` set, the upload/edit sheet offers "Remind me before this
  expires" → creates `personal_reminders(source='auto_document', related_document_id=…,
type=<mapped>)`. (UI-driven create, not a silent trigger — consent, commandment #11.)
- **Manual** — Settings → Reminders: create/edit/delete any `personal_reminders(source='manual',
type='custom')` with date + title + lead times.

## 7. Knowledge base — authoring methodology + sample

The full ~150 rows are a **tracked deliverable of the 4D plan** (inlining 150 rows would bloat this
doc to thousands of lines). Methodology:

- Matrix: **top ~30 destination countries × top ~10 passport countries × ~10 requirement types**,
  pruned to real, high-value rules (~150).
- Each row: official `source_urls` (e.g. `travel.state.gov`, `gov.uk`, `europa.eu`, IATA Timatic
  where licensable, destination immigration sites), `last_verified` set by a **human verification
  pass before launch**. Drafts are AI-generated **then verified** — entry rules change often and
  wrong info has real user consequences; `last_verified` makes staleness auditable and drives the
  quarterly refresh.
- Content (title/body/action_label) is i18n-keyed (`smartReminders.kb.<id>`), en + fr day one.

**Representative sample (illustrative — subject to verification pass):**

| id                      | dest     | type              | passports          | severity             | lead    | source                  |
| ----------------------- | -------- | ----------------- | ------------------ | -------------------- | ------- | ----------------------- |
| `us_esta`               | US       | eta               | VWP (FR, DE, …)    | mandatory            | 60/30/7 | esta.cbp.dhs.gov        |
| `schengen_etias`        | Schengen | eta               | visa-exempt non-EU | mandatory\*          | 60/30   | travel-europe.europa.eu |
| `uk_eta`                | GB       | eta               | many               | mandatory            | 30/14   | gov.uk                  |
| `passport_validity_6mo` | (many)   | passport_validity | all                | mandatory            | 90/30   | per-destination         |
| `schengen_90_180`       | Schengen | other             | visa-exempt        | good_to_know         | 30      | europa.eu               |
| `jp_visa_free_90`       | JP       | other             | many               | good_to_know         | 14      | mofa.go.jp              |
| `in_evisa`              | IN       | visa              | many               | mandatory            | 30/14   | indianvisaonline.gov.in |
| `br_visa`               | BR       | visa              | US/CA/AU\*         | mandatory            | 60/30   | gov.br                  |
| `yellow_fever`          | (zone)   | vaccine           | all                | strongly_recommended | 60      | who.int                 |
| `cash_10k_declaration`  | EU/US    | cash_declaration  | all                | good_to_know         | 7       | per-customs             |

`*` ETIAS launch date and Brazil visa reinstatement are **explicitly flagged** for the verification
pass — both have shifted recently.

## 8. Client / UI surfaces

`src/features/smart-reminders/` (new) and additions to `src/features/notifications/` + Settings.

- **4D Smart Tips** — section in `TripDetailScreen`: `SmartTipCard` per pending
  `trip_smart_reminders` (severity badge, title/body from i18n, action). 4 actions: **Done** ·
  **Add to checklist** (writes a 4B `checklist_items` row, sets `added_to_checklist_item_id`) ·
  **Snooze 7d** · **Open** (`action_url`). Empty state = sprite + sentence (commandment, no paralysis).
- **4E Life reminders** — new **tab in Inbox** (`InboxScreen` already exists), separate from trip
  notifications; `LifeReminderRow`. **Settings → Reminders** screen: CRUD list + add/edit sheet
  (date picker, title, lead-time chips). Doc-expiry "Remind me" affordance added to the 4A
  upload/edit sheet.
- **Shared** — `life_reminders` toggle in `NotificationSettings`; passport auto-reminder opt-in
  checkbox.
- Hooks/API: `useSmartReminders`, `usePersonalReminders` (TanStack Query); `api/smartReminders.ts`,
  `api/personalReminders.ts`. Deep-link targets for tap-through reuse 4C `registration.ts` routing.

## 9. i18n / Testing / Security / Edge cases

- **i18n**: `smartReminders.*` (UI + `kb.<id>` content), `lifeReminders.*`, en + fr, zero hardcode.
- **Testing**:
  - Pure unit: rule **matching** (whitelist/blacklist, duration, purpose, region), passport-validity
    math, **lead-time idempotency** (no double-fire), personal-reminder date math.
  - **Contract tests** (auditing-runtime-contracts skill): category parity (`life_reminders` in
    util + Settings + send_push), route paths for deep links, **i18n-key parity** (every
    `country_requirements.i18n_key` resolves in en + fr), reminder-type ↔ i18n parity.
  - Readiness/security audit on the migrations + RLS (mirror 4C clean bar).
- **Security**: cron fns secret-gated, `SECURITY DEFINER` revoked from PUBLIC; service-role inserts
  only; `country_requirements` read-only to clients; `personal_reminders` strictly user-own.
- **Edge cases**: trip with no destination country (skip 4D match); user with no passport country
  (passport-validity + whitelist rules can't evaluate → only universal rules); snooze respected by
  cron; deleting a doc nulls `related_document_id` (the reminder **survives** — the expiry date is
  still valid; the user can dismiss it manually); quiet hours/category mute already handled by
  `send_push`.

## 10. Decomposition & implementation outline

One spec, **two plans** sharing a backbone (via writing-plans):

- **Backbone** (first chunk of the **4D plan**, per approved decision): enable `pg_cron`; add
  `life_reminders` category (util + Settings + i18n); cron-invocation plumbing + secret gating.
- **4D plan**: `country_requirements` + `trip_smart_reminders` migrations + RLS; **150-rule seed**
  (verified); `smart_reminders_cron` edge fn + eval + idempotency; Smart Tips UI + 4B "add to
  checklist" link; i18n + tests.
- **4E plan**: `personal_reminders` migration + RLS; `documents.expires_at`; passport trigger;
  document "remind me" affordance; manual CRUD (Settings → Reminders); Life reminders Inbox tab;
  `personal_reminders_cron`; i18n + tests.

Native deps: none new (push already needs an EAS build from 4C). Backend chain testable without a
device; on-device push verification piggybacks the next EAS build.

## 11. Out of scope (v1.x)

Admin authoring UI for the KB · smart matching / personalization · OCR document parsing beyond
passport · visa/insurance auto-detection from document _contents_ (we capture expiry by user input).
