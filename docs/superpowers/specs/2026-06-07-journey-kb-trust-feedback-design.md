# Journey — KB trust & collaborative feedback — Design

> **Date**: 2026-06-07 · **Status**: Approved (brainstorm) · **Type**: feature (disclaimer + crowd-reporting) + KB gate reframe
> Related: `2026-06-06-journey-kb-reminders-pilot-design.md` (the `verified` gate this reframes),
> `docs/superpowers/reference/kb-verification-results.md` (the 13 corrections to apply).

## 1. Context & goal

The smart-reminders KB (`country_requirements`, 67 rules) currently HIDES unverified rows (`verified=true` gate at
RLS + cron). Entry rules change constantly and are nationality-specific, so exhaustive pre-verification doesn't
scale — **especially since the app's users are international** (rules must cover non-Western passports too, which a
hand-curated gate can't keep current). Instead: treat KB rules as **verifiable recommendations** — show them with a
"verify yourself" disclaimer + a per-rule **trust badge**, and let users **report** a rule as outdated/wrong with a
**live count** (Waze-style freshness). The disclaimer carries the legal/safety framing; the crowd carries freshness.

## 2. Decisions (ADR)

- **D1 — `verified` becomes a badge, not a visibility gate.** RLS `SELECT` returns to `USING (true)`; the cron drops
  its `.eq('verified', true)` filter (evaluates all rules). `verified` now drives a UI badge: `✓ source-checked`
  vs `community info — verify`. All rules become eligible to surface.
- **D2 — Live report counter via Realtime.** Reports are stored; a denormalized `report_count` on
  `country_requirements` is bumped by a trigger; `country_requirements` is added to the `supabase_realtime`
  publication so clients live-update the count via `postgres_changes` (the reactions/polls pattern). True
  cross-user real-time, per the product ask.
- **D3 — Dedicated `kb_rule_reports` table** (NOT the Phase-9 `reports` table, whose `target_id` is `uuid` while KB
  ids are `text`, and whose semantics are user/content moderation). KB reports are reference-data freshness signals.
- **D4 — Disclaimer in two places**: in-app caption (practical "verify yourself" nudge) + a ToS clause (legal cover).
- **D5 — International scope.** Rules are scoped by `applies_to_passport_countries` (already per-passport). Do NOT
  assume a Western set. `turkey_evisa` is KEPT and re-scoped to Türkiye e-visa-eligible nationalities. Future KB
  drafting must include non-Western passports; the disclaimer + crowd model is what makes that tractable.

## 3. DB changes

1. **Open the gate** (migration): `DROP/CREATE POLICY "Read country_requirements" … FOR SELECT USING (true);`
2. **Apply the 13 corrections** (from `kb-verification-results.md`): UPDATE fees/severity/`applies_to`, edit en/fr
   bodies, then set the corrected rows `verified=true`. Special cases: `turkey_evisa` re-scoped to e-visa-eligible
   nationalities and left `verified=false` (new scope, not yet source-confirmed → shows the "verify" badge);
   `cambodia_evisa` stays `verified=false` (uncertain fee). End state: ~65 `✓` + 2 `community`, **all shown**.
3. **`country_requirements.report_count int NOT NULL DEFAULT 0`** (denormalized).
4. **`kb_rule_reports`** table: `id uuid pk`, `rule_id text → country_requirements(id) on delete cascade`,
   `reporter_id uuid → auth.users default auth.uid()`, `reason text CHECK in ('outdated','incorrect','other')`,
   `details text`, `created_at timestamptz`. **`UNIQUE(rule_id, reporter_id)`** (one report/user/rule). RLS:
   insert `with check (reporter_id = auth.uid())`, select own. AFTER INSERT trigger → `report_count = report_count+1`
   on the parent rule (SECURITY DEFINER, grant-hardened: revoke from PUBLIC).
5. **Realtime**: add `country_requirements` to `supabase_realtime` publication (count is public, RLS `USING(true)`).
6. Regen types.

## 4. Client (`@features/smart-reminders`)

- `api`: `listKbRules(ids: string[])` → `{ id, verified, report_count, source_urls, action_url }[]` (RLS now allows
  the read); `reportKbRule(ruleId, reason, details?)` → insert (idempotent on the UNIQUE; treat dup as success).
- `hooks`: `useKbRules(ids)` (query + `postgres_changes` subscription on `country_requirements` → live
  `report_count`); `useReportKbRule()` (mutation + optimistic count bump).
- `SmartTipCard`: + trust badge (`verified` → `✓ vérifié` / else `info communauté`), + prominent official-source
  link, + "Signaler / périmé" action (opens a small reason chooser: outdated / incorrect / other), + live count
  line when `report_count > 0`.
- `SmartTipsSection`: + the disclaimer caption at the top.

## 5. Disclaimer copy

- **In-app** `smartReminders.disclaimer`:
  - EN: "Guidance only — entry rules change often and vary by nationality. Always check the official source before you travel."
  - FR: "Recommandations indicatives — les règles d'entrée changent souvent et dépendent de la nationalité. Vérifiez toujours la source officielle avant de partir."
- **ToS clause** (hand to user to add to the hosted ToS, env-linked from Phase 10): travel-requirement info is
  general guidance only, may be incomplete / not apply to your nationality / be out of date, is not legal or travel
  advice, you must verify with official authorities before travelling, no warranty / no liability, and
  community-contributed reports are unverified user signals. FR + EN provided in the plan.

## 6. Tests & i18n

- New i18n: `smartReminders.disclaimer`, `smartReminders.actions.report`, `smartReminders.badge.{verified,community}`,
  `smartReminders.report.{outdated,incorrect,other,count}` (en+fr).
- Contract tests: report `reason` vocab ↔ DB CHECK; `kb_rule_reports` RLS (insert-own, count public); i18n parity;
  existing `kbData`/i18n contracts unchanged. Security review (light): insert-own RLS, count-only public exposure,
  trigger grant-hardened, no PII.

## 7. Out of scope / risks

- No moderation/admin UI for reports (counts are the signal; you review high-count rules via dashboard/SQL).
- No auto-flag/auto-hide at a threshold (counter only — chosen for simplicity; easy to add later).
- Risk: a confidently-wrong rule could still mislead despite the disclaimer → mitigated by applying the 13
  corrections first, the badge, the prominent source link, and the live report signal.
- Spam: capped by `UNIQUE(rule_id, reporter_id)` (one report/user/rule).

## 8. Build order

Stage 0 (inline, careful): gate-open migration + 13 corrections + `kb_rule_reports` + `report_count` + trigger +
Realtime publication + cron filter removal + types regen. Stage 1: client (api/hooks/components) + i18n. Then
audit + validation + security review, then prod apply with approval (consistent with the KB pilot flow).
