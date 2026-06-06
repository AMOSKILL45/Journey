# Journey — Smart-reminders KB pilot (Ralph loop) — Design

> **Date**: 2026-06-06 · **Status**: Approved (brainstorm) · **Type**: content backlog + small schema/test hardening
> **Driver**: First Ralph-loop run on the project, used to expand the `country_requirements` knowledge base.
> Related: `docs/superpowers/reference/kb-coverage-checklist.md` (coverage tracker), Phase 4D (engine).

## 1. Context & problem

The smart-reminders **engine is complete and live** (Phase 4D): the `smart_reminders_cron` edge function reads
`public.country_requirements`, matches rules against a trip (destination × passport × duration × purpose), and
inserts user-facing reminder cards. The KB currently holds **18 curated rules**; the target is ~150
(`kb-coverage-checklist.md`). This is a **content backlog**, not an engine change.

Two facts make a naive "bulk-insert rows" approach unsafe:

1. **The KB is LIVE + public-read and drives user-facing cards.** The checklist is explicit: _"AI may draft rows;
   a human verifies against official sources … wrong info has real user impact."_ Inserting unverified visa/entry
   rules would immediately surface potentially-wrong information to users.
2. **The existing contract test has a coverage gap.** `src/features/smart-reminders/__tests__/contracts.test.ts`
   reads a **hard-coded** migration path (`20260601090002_country_requirements.sql`). Rules added in a _new_
   migration (as the checklist's "How to add a batch" recipe instructs) would **not** be checked → false green.

## 2. Goal & scope

Draft **~14 new `country_requirements` rules** for high-traffic FR/EN-market destinations, each with en+fr i18n and
official source URLs, **invisible to users until human verification**. Prove the full pipeline end-to-end
(schema → safe draft → generalized gate → audit → security → prod apply). A later run scales toward ~150 as pure
content, reusing this setup.

**Out of scope**: full ~150 coverage (later run); human source-verification pass (separate, human-owned);
any UI work (`ui-ux-pro-max` deliberately skipped — zero UI); the existing engine/cron logic.

## 3. Architecture decisions (ADR)

### ADR-1 — `verified` display gate

- **Decision**: Add `verified boolean NOT NULL DEFAULT false` to `country_requirements`. Semantics = _"vetted &
  approved for display"_. Every read site filters `verified = true`. The 18 existing rules are backfilled
  `verified = true` (curated launch set). Ralph's drafts are `verified = false` → never shown to users.
- **Why**: Decouples _drafting_ (cheap, AI) from _display_ (gated, human). Lets Ralph bulk-draft with zero
  user-facing risk. Source provenance stays tracked separately by `last_verified` + `source_urls`.
- **Alternatives rejected**: (a) draft directly into the live table marked PENDING — relies on a human pass before
  launch, leaves unverified rows displayable in the meantime; (b) scaffold-only skeletons — near-zero value.
- **Consequences**: small schema migration + a read-site filter; a future "publish" step = flip `verified=true`
  after human verification.

### ADR-2 — Generalize the KB contract test

- **Decision**: Change `contracts.test.ts` to **glob all** `*country_requirements*.sql` migrations (not one
  hard-coded path), so every seeded `i18n_key` — in any migration — is gated for `.title`/`.body` in en+fr.
  Stage 0 ships two **robust** gates: the generalized i18n parity test + a safety guard (no seed migration may set
  `verified` — drafts stay false). Deeper per-field validation (ISO alpha-2, `requirement_type`/`severity` ∈ CHECK,
  ≥1 `source_url`) is delegated to the post-run `/auditing-runtime-contracts` pass — robust SQL/DB-level parsing
  belongs there, not in a hand-written Stage 0 test that would false-fail and stall Ralph.
- **Why**: Without it, new rules pass in false-green — the exact static→runtime drift the audit skill targets.

### ADR-3 — Ralph runs LOCAL-only

- **Decision**: The Ralph loop only edits local files (`.sql` migration + `en/fr.json`) and runs jest. **No DB
  writes inside the loop.** `apply_migration` to prod happens **once at the end, with explicit user approval**.
- **Why**: Deterministic, side-effect-free, fully machine-verifiable locally. Honors the project rules "DDL to
  prod needs explicit approval" and "never auto-build". The contract test reads migrations statically — no DB
  needed to gate correctness.

## 4. Stage 0 — setup (done inline by Claude, before Ralph)

1. Migration `<ts>_country_requirements_verified_flag.sql`: add the column + `UPDATE … SET verified = true` for the
   18 existing rows.
2. Add `verified = true` filter at **every** read site. Primary reader = `smart_reminders_cron` query of
   `country_requirements`; Stage 0 enumerates and patches any other direct reader (e.g. a client fetch in
   `src/features/smart-reminders/api/`).
3. Generalize `contracts.test.ts` (glob migrations) + add the draft-safety guard test (ADR-2).
4. `generate_typescript_types` regen (after the step-1 apply).
5. Inline checks (`npm run typecheck` / `npm run lint` / `npm test`) green → **commit + push**. Step 1 is the only
   prod write now (additive, approved); the ~14 `verified=false` pilot rows + the cron redeploy land together at the
   final step, with approval.

## 5. Stage 1 — the Ralph loop

**Prompt (sketch)**: _Add ~14 `country_requirements` rules in a new migration
`<ts>_country_requirements_pilot_seed.sql` following `kb-coverage-checklist.md`. One rule per iteration: an INSERT
(`verified=false`, ≥1 official `source_url`, valid `requirement_type`/`severity`, idempotent `ON CONFLICT (id) DO
NOTHING`) + `smartReminders.kb.<id>.{title,body}` keys in en+fr + tick the checklist cell. Run `npm run typecheck &&
npm run lint && npm test`; fix until green. When ≥14 rules AND all green → output `<promise>KB PILOT COMPLETE</promise>`._

- Flags: `--completion-promise "KB PILOT COMPLETE"` · `--max-iterations 40` (safety ceiling; target is ~14).
- Commit per rule (commit-by-unit workflow).
- **Machine gate** = the generalized contract test + typecheck + lint → Ralph self-corrects on missing i18n or
  malformed fields.

### Rule schema Ralph fills (`country_requirements`)

`id` (snake_case) · `destination_country` (ISO alpha-2, or NULL for region rules) · `destination_regions` (text[]) ·
`requirement_type` (`visa|eta|vaccine|passport_validity|cash_declaration|insurance|other`) ·
`applies_to_passport_countries` / `excluded_passport_countries` (text[]) · `trip_duration_min/max_days` ·
`trip_purpose` (text[]) · `passport_validity_required_months` · `required` (bool) · `severity`
(`mandatory|strongly_recommended|recommended|good_to_know`) · `i18n_key` (`smartReminders.kb.<id>`) · `action_url` ·
`estimated_processing_days` · `estimated_cost_usd` · `followup_lead_times` (int[]) · `last_verified` (authoring date)
· `source_urls` (text[]) · **`verified=false`**.

## 6. Pilot rule set (target ~14 — Ralph follows the checklist)

`nz_nzeta` · `korea_keta` · `vietnam_evisa` · `indonesia_voa` · `turkey_evisa` · `egypt_evisa` · `morocco_entry` ·
`uae_voa` · `kenya_eta` · `south_africa_entry` · `mexico_tourist` · `argentina_visa_free` ·
`schengen_visa_short_stay` · `uk_standard_visitor`.

Selected for FR/EN-market traffic and for following existing patterns (`eta` / `visa` / `other`).

## 7. Testing & gates

- Generalized `contracts.test.ts`: every KB `i18n_key` (any migration) has `.title`+`.body` in en+fr; pilot rows
  well-formed (ADR-2).
- `npm run typecheck` clean · `npm run lint` no new errors · `npm test` green.
- Completion is the AND of: ≥14 pilot rules + all checks green.

## 8. Post-run (requested pipeline)

`/auditing-runtime-contracts` (harden KB contracts: ISO validity, region-token vocab, severity/type CHECK parity) →
inline validation (`typecheck`/`lint`/`test`) → **security review** (light: public-read reference data, no
destructive op; confirm RLS unchanged, no client write, no leak via the new column) → then propose the prod
`apply_migration` for user approval.

## 9. Risks & guardrails

- Unverified content → mitigated by `verified=false` (invisible) + human publish step.
- Long-loop quality drift → small pilot + `--max-iterations 40` ceiling + `/cancel-ralph` available.
- Migration date-prefix collision (achievements lesson) → use distinct timestamps for the two new migrations.
- Idempotency → `ON CONFLICT (id) DO NOTHING`.
- No UI risk → `ui-ux-pro-max` skipped (assumed, zero UI surface).
