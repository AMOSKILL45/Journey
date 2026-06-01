# Phase 4D — Smart Trip Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Surface curated, contextual travel-prep tips (ESTA, ETIAS, passport validity…) on each trip and push them at lead times, by matching a knowledge base against `destination × passport × duration × purpose`.

**Architecture:** A seeded `country_requirements` knowledge base + per-user `trip_smart_reminders` cards. A `smart_reminders_cron` Edge Function (invoked 2×/day by `pg_cron` via `pg_net`, secret-gated like `send_push`) evaluates rules in TypeScript, upserts cards, and INSERTs into the 4C `notifications` hub — which already handles push delivery, category prefs, and quiet hours. No push code is rebuilt.

**Tech Stack:** Supabase Postgres + RLS + pg_cron + pg_net + Vault · Deno Edge Functions · TypeScript · TanStack Query v5 · NativeWind · Jest + RNTL · i18n-js.

**Spec:** `docs/superpowers/specs/2026-06-01-journey-phase-4de-reminders-design.md`

**Conventions (match existing code):**

- Migrations applied via Supabase MCP `apply_migration` (server `472a285c…`, project `ewsoupkfkachxidmuwoi`); DDL on prod may need explicit user approval. Regenerate types via MCP `generate_typescript_types` into `src/core/supabase/types.ts`.
- RLS reuses `public.is_trip_member(trip_id, uid)` / `public.is_trip_editor(trip_id, uid)`.
- Edge fns: `Deno.serve`, `createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`, gate on `verify_webhook_secret` RPC. Deploy via MCP `deploy_edge_function` with `verify_jwt: false`.
- i18n keys in `src/core/i18n/locales/{en,fr}.json`, zero hardcoded strings.
- Run validation inline (no code-validator subagent): `npm run typecheck && npm run lint && npm test`.

---

## File Structure

**Migrations** (`supabase/migrations/`)

- `20260601090001_enable_pg_cron.sql` — enable `pg_cron`.
- `20260601090002_country_requirements.sql` — KB table + RLS + concrete seed (~18 rules).
- `20260601090003_trip_smart_reminders.sql` — per-user cards table + RLS.
- `20260601090004_smart_reminders_cron_schedule.sql` — `cron.schedule` → `pg_net` POST to edge fn.

**Edge function** (`supabase/functions/`)

- `smart_reminders_cron/index.ts` — evaluator; imports pure utils copied inline (Deno can't import `src/`).

**Feature** (`src/features/smart-reminders/`)

- `utils/regions.ts` — region → ISO country lists (e.g. `schengen`).
- `utils/matchRequirements.ts` — pure rule-matching (shared logic, mirrored in edge fn).
- `utils/leadTimes.ts` — pure lead-time idempotency (`nextDueLeadTime`). **Shared with 4E.**
- `api/smartReminders.ts` — list/done/snooze/dismiss/addToChecklist.
- `hooks/useSmartReminders.ts` — TanStack queries/mutations.
- `components/SmartTipCard.tsx` — one card + 4 actions.
- `components/SmartTipsSection.tsx` — section list + empty state.
- `index.ts` — barrel.
- `__tests__/` — `matchRequirements.test.ts`, `leadTimes.test.ts`, `SmartTipCard.test.tsx`, `contracts.test.ts`.

**Modified**

- `src/features/trips/screens/TripDetailScreen.tsx` — mount `SmartTipsSection`.
- `src/core/i18n/locales/{en,fr}.json` — `smartReminders.*` + `smartReminders.kb.*`.

---

## Task 1: Enable pg_cron

**Files:**

- Create: `supabase/migrations/20260601090001_enable_pg_cron.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Phase 4D backbone: scheduled jobs run the reminder evaluators. pg_net already enabled (4C).
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

- [ ] **Step 2: Apply via MCP**

Use MCP `apply_migration` (name `enable_pg_cron`). If prod DDL needs approval, ask the user first.

- [ ] **Step 3: Verify**

Use MCP `list_extensions`. Expected: `pg_cron` present/installed.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601090001_enable_pg_cron.sql
git commit -m "feat(reminders): enable pg_cron extension (4D backbone)"
```

---

## Task 2: `country_requirements` table + RLS + concrete seed

**Files:**

- Create: `supabase/migrations/20260601090002_country_requirements.sql`

- [ ] **Step 1: Write the migration (table + RLS)**

```sql
-- Phase 4D: smart-reminders knowledge base. Curated, public-read, client write-protected.
CREATE TABLE IF NOT EXISTS public.country_requirements (
  id                                text PRIMARY KEY,
  destination_country               text,                       -- ISO alpha-2; NULL = region rule
  destination_regions               text[] NOT NULL DEFAULT '{}',
  requirement_type                  text NOT NULL,              -- visa|eta|vaccine|passport_validity|cash_declaration|insurance|other
  applies_to_passport_countries     text[] NOT NULL DEFAULT '{}',
  excluded_passport_countries       text[] NOT NULL DEFAULT '{}',
  trip_duration_min_days            int,
  trip_duration_max_days            int,
  trip_purpose                      text[] NOT NULL DEFAULT '{}',
  passport_validity_required_months int,
  required                          boolean NOT NULL DEFAULT true,
  severity                          text NOT NULL DEFAULT 'good_to_know'
                                      CHECK (severity IN ('mandatory','strongly_recommended','recommended','good_to_know')),
  i18n_key                          text NOT NULL,              -- base key; .title/.body/.actionLabel resolve client-side
  action_url                        text,
  estimated_processing_days         int,
  estimated_cost_usd                numeric,
  followup_lead_times               int[] NOT NULL DEFAULT '{60,30,7}',
  last_verified                     date NOT NULL,
  source_urls                       text[] NOT NULL DEFAULT '{}',
  created_at                        timestamptz NOT NULL DEFAULT now(),
  updated_at                        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_country_requirements_dest ON public.country_requirements(destination_country);

ALTER TABLE public.country_requirements ENABLE ROW LEVEL SECURITY;
-- Public read (curated, non-sensitive). No client write: seed/refresh via migration only.
CREATE POLICY "Read country_requirements" ON public.country_requirements FOR SELECT USING (true);
```

- [ ] **Step 2: Append the concrete starter seed (~18 verified-pending rules)**

```sql
-- last_verified = authoring date; Task 3 runs the human verification pass before launch.
-- ETIAS launch + Brazil visa reinstatement are flagged for that pass.
INSERT INTO public.country_requirements
  (id, destination_country, destination_regions, requirement_type, applies_to_passport_countries,
   trip_duration_max_days, trip_purpose, severity, i18n_key, action_url,
   estimated_processing_days, estimated_cost_usd, followup_lead_times, last_verified, source_urls)
VALUES
  ('us_esta','US','{}','eta','{FR,DE,ES,IT,GB,JP,AU,NL,BE,SE}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.us_esta','https://esta.cbp.dhs.gov/',3,21,'{60,30,7}','2026-06-01',
   '{https://esta.cbp.dhs.gov/,https://travel.state.gov/}'),
  ('uk_eta','GB','{}','eta','{FR,DE,ES,IT,US,JP,AU,NL,BE,SE}',180,'{tourism,business}','mandatory',
   'smartReminders.kb.uk_eta','https://www.gov.uk/eta',3,16,'{30,14}','2026-06-01',
   '{https://www.gov.uk/eta}'),
  ('schengen_etias',NULL,'{schengen}','eta','{US,GB,AU,CA,JP,BR}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.schengen_etias','https://travel-europe.europa.eu/etias_en',4,8,'{60,30}','2026-06-01',
   '{https://travel-europe.europa.eu/etias_en}'),
  ('canada_eta','CA','{}','eta','{FR,DE,GB,JP,AU,NL,BE,SE}',180,'{tourism,business}','mandatory',
   'smartReminders.kb.canada_eta','https://www.canada.ca/en/immigration-refugees-citizenship/services/visit-canada/eta.html',
   1,7,'{30,14}','2026-06-01','{https://www.canada.ca/}'),
  ('australia_eta','AU','{}','eta','{US,GB,JP,SG}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.australia_eta','https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/electronic-travel-authority-601',
   2,15,'{30,14}','2026-06-01','{https://immi.homeaffairs.gov.au/}'),
  ('india_evisa','IN','{}','visa','{FR,DE,US,GB,AU,JP}',30,'{tourism}','mandatory',
   'smartReminders.kb.india_evisa','https://indianvisaonline.gov.in/evisa/',4,25,'{30,14}','2026-06-01',
   '{https://indianvisaonline.gov.in/evisa/}'),
  ('brazil_visa','BR','{}','visa','{US,CA,AU}',90,'{tourism,business}','mandatory',
   'smartReminders.kb.brazil_visa','https://www.gov.br/mre/',10,81,'{60,30}','2026-06-01',
   '{https://www.gov.br/mre/}'),
  ('china_visa','CN','{}','visa','{FR,DE,US,GB,AU,JP}',30,'{tourism}','mandatory',
   'smartReminders.kb.china_visa','http://www.visaforchina.cn/',7,140,'{60,30}','2026-06-01',
   '{http://www.visaforchina.cn/}');

INSERT INTO public.country_requirements
  (id, destination_country, destination_regions, requirement_type, passport_validity_required_months,
   severity, i18n_key, followup_lead_times, last_verified, source_urls)
VALUES
  ('passport_validity_6mo',NULL,'{schengen,asia_6mo}','passport_validity',6,'mandatory',
   'smartReminders.kb.passport_validity_6mo','{90,30}','2026-06-01','{https://travel.state.gov/}'),
  ('passport_validity_3mo',NULL,'{schengen}','passport_validity',3,'strongly_recommended',
   'smartReminders.kb.passport_validity_3mo','{90,30}','2026-06-01','{https://travel-europe.europa.eu/}');

INSERT INTO public.country_requirements
  (id, destination_country, destination_regions, requirement_type, severity, i18n_key,
   followup_lead_times, last_verified, source_urls)
VALUES
  ('schengen_90_180',NULL,'{schengen}','other','good_to_know','smartReminders.kb.schengen_90_180',
   '{30}','2026-06-01','{https://europa.eu/youreurope/citizens/travel/}'),
  ('jp_visa_free_90','JP','{}','other','good_to_know','smartReminders.kb.jp_visa_free_90',
   '{14}','2026-06-01','{https://www.mofa.go.jp/}'),
  ('yellow_fever_zone',NULL,'{yellow_fever}','vaccine','strongly_recommended',
   'smartReminders.kb.yellow_fever_zone','{60,30}','2026-06-01','{https://www.who.int/}'),
  ('cash_10k_eu',NULL,'{schengen}','cash_declaration','good_to_know','smartReminders.kb.cash_10k_eu',
   '{7}','2026-06-01','{https://taxation-customs.ec.europa.eu/}'),
  ('cash_10k_us','US','{}','cash_declaration','good_to_know','smartReminders.kb.cash_10k_us',
   '{7}','2026-06-01','{https://www.cbp.gov/}'),
  ('thailand_visa_free','TH','{}','other','good_to_know','smartReminders.kb.thailand_visa_free',
   '{14}','2026-06-01','{https://www.thaievisa.go.th/}'),
  ('travel_insurance_schengen',NULL,'{schengen}','insurance','recommended',
   'smartReminders.kb.travel_insurance_schengen','{30,7}','2026-06-01','{https://travel-europe.europa.eu/}'),
  ('vaccine_routine',NULL,'{}','vaccine','good_to_know','smartReminders.kb.vaccine_routine',
   '{60}','2026-06-01','{https://wwwnc.cdc.gov/travel}')
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 3: Apply via MCP** (`apply_migration` name `country_requirements`). Ask before prod DDL if required.

- [ ] **Step 4: Verify seed**

Use MCP `execute_sql`: `SELECT count(*) FROM public.country_requirements;`
Expected: ≥ 18.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601090002_country_requirements.sql
git commit -m "feat(reminders): country_requirements KB + RLS + starter seed"
```

---

## Task 3: Expand & verify the knowledge base to ~150 rules

> This is a **content** task, not code. The schema + engine work end-to-end on the Task 2 seed; this grows coverage and sets `last_verified` truthfully. Do NOT mark rules verified without a real source check.

**Files:**

- Create: `supabase/migrations/20260601090005_country_requirements_full_seed.sql`
- Create: `docs/superpowers/reference/kb-coverage-checklist.md` (tracking)

- [ ] **Step 1: Build the coverage matrix checklist**

In `kb-coverage-checklist.md`, list the target cells and check them off as authored+verified:

```markdown
# KB coverage (target ~150 rules)

Destinations (top ~30): US, GB, schengen(26), CA, AU, JP, CN, IN, BR, TH, AE, ...
Passport groups: EU/Schengen, US, GB, CA, AU, JP, BR, IN, CN, ...
Requirement types: visa, eta, passport_validity, vaccine, cash_declaration, insurance, other

- [ ] US × {VWP, non-VWP} — esta, validity, cash
- [ ] Schengen × {visa-exempt, visa-required} — etias, 90/180, validity, insurance
- [ ] GB × {eta-required, visa-required}
- [ ] ... (one line per authored cell, checked when source-verified)
```

- [ ] **Step 2: Author the rows**

Append `INSERT ... ON CONFLICT (id) DO NOTHING;` blocks to `..._full_seed.sql`, same column shape as Task 2. Each row MUST have ≥1 official `source_urls` entry and a real `last_verified` date. Flag uncertain rows (ETIAS date, Brazil visa) in a SQL comment until verified.

- [ ] **Step 3: Apply via MCP** (`apply_migration` name `country_requirements_full_seed`).

- [ ] **Step 4: Verify count + i18n parity**

`SELECT count(*) FROM public.country_requirements;` → ~150.
Run the contract test from Task 15 (`npm test -- smart-reminders/contracts`) so every new `i18n_key` resolves in en+fr. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601090005_country_requirements_full_seed.sql docs/superpowers/reference/kb-coverage-checklist.md
git commit -m "feat(reminders): full KB seed (~150 rules) + coverage checklist"
```

---

## Task 4: `trip_smart_reminders` table + RLS

**Files:**

- Create: `supabase/migrations/20260601090003_trip_smart_reminders.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Phase 4D: per-user, per-trip actionable cards. Created by the cron (service role); user updates status.
CREATE TABLE IF NOT EXISTS public.trip_smart_reminders (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                    uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id                    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requirement_id             text NOT NULL REFERENCES public.country_requirements(id),
  status                     text NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','done','dismissed','snoozed','not_applicable')),
  snooze_until               timestamptz,
  marked_done_at             timestamptz,
  added_to_checklist_item_id uuid REFERENCES public.checklist_items(id) ON DELETE SET NULL,
  notifications_sent_at      timestamptz[] NOT NULL DEFAULT '{}',
  fired_lead_times           int[] NOT NULL DEFAULT '{}',
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id, requirement_id)
);
CREATE INDEX IF NOT EXISTS idx_tsr_trip_user ON public.trip_smart_reminders(trip_id, user_id);

ALTER TABLE public.trip_smart_reminders ENABLE ROW LEVEL SECURITY;
-- Owner reads/updates own cards, scoped to trip membership. No client INSERT (cron/service-role only).
CREATE POLICY "Own smart reminders SELECT" ON public.trip_smart_reminders FOR SELECT
  USING (user_id = auth.uid() AND public.is_trip_member(trip_id, auth.uid()));
CREATE POLICY "Own smart reminders UPDATE" ON public.trip_smart_reminders FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

- [ ] **Step 2: Apply via MCP** (`apply_migration` name `trip_smart_reminders`).

- [ ] **Step 3: Verify** — MCP `list_tables`, confirm `trip_smart_reminders` with the UNIQUE constraint.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601090003_trip_smart_reminders.sql
git commit -m "feat(reminders): trip_smart_reminders table + RLS"
```

---

## Task 5: Regenerate TypeScript types

**Files:**

- Modify: `src/core/supabase/types.ts`

- [ ] **Step 1:** Run MCP `generate_typescript_types`; write the result to `src/core/supabase/types.ts`.
- [ ] **Step 2:** Verify `npm run typecheck`. Expected: PASS (new tables present in `Database`).
- [ ] **Step 3: Commit**

```bash
git add src/core/supabase/types.ts
git commit -m "chore(reminders): regenerate Supabase types for 4D tables"
```

---

## Task 6: Pure rule-matching util (TDD)

**Files:**

- Create: `src/features/smart-reminders/utils/regions.ts`
- Create: `src/features/smart-reminders/utils/matchRequirements.ts`
- Test: `src/features/smart-reminders/__tests__/matchRequirements.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { ruleMatches, type RequirementRule, type TripContext } from '../utils/matchRequirements';

const base: RequirementRule = {
  id: 'x',
  destination_country: 'US',
  destination_regions: [],
  requirement_type: 'eta',
  applies_to_passport_countries: ['FR'],
  excluded_passport_countries: [],
  trip_duration_min_days: null,
  trip_duration_max_days: 90,
  trip_purpose: ['tourism'],
  passport_validity_required_months: null,
};
const ctx: TripContext = {
  destinationCountry: 'US',
  destinationCountries: ['US'],
  durationDays: 10,
  purpose: 'tourism',
  passportCountry: 'FR',
};

describe('ruleMatches', () => {
  it('matches on destination + passport whitelist + duration + purpose', () => {
    expect(ruleMatches(base, ctx)).toBe(true);
  });
  it('rejects when passport not in whitelist', () => {
    expect(ruleMatches(base, { ...ctx, passportCountry: 'JP' })).toBe(false);
  });
  it('rejects when excluded passport', () => {
    expect(ruleMatches({ ...base, excluded_passport_countries: ['FR'] }, ctx)).toBe(false);
  });
  it('rejects when duration exceeds max', () => {
    expect(ruleMatches(base, { ...ctx, durationDays: 120 })).toBe(false);
  });
  it('rejects when purpose mismatches', () => {
    expect(ruleMatches(base, { ...ctx, purpose: 'business' })).toBe(false);
  });
  it('matches region rules via the schengen list', () => {
    const r: RequirementRule = {
      ...base,
      destination_country: null,
      destination_regions: ['schengen'],
      applies_to_passport_countries: [],
      trip_purpose: [],
    };
    expect(ruleMatches(r, { ...ctx, destinationCountry: 'FR', destinationCountries: ['FR'] })).toBe(
      true,
    );
  });
  it('matches when whitelist empty (applies to all passports)', () => {
    expect(
      ruleMatches(
        { ...base, applies_to_passport_countries: [] },
        { ...ctx, passportCountry: 'JP' },
      ),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- smart-reminders/matchRequirements`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `regions.ts`**

```ts
// ISO alpha-2 lists for region-scoped rules. Extend as KB grows.
export const REGIONS: Record<string, string[]> = {
  schengen: [
    'AT',
    'BE',
    'HR',
    'CZ',
    'DK',
    'EE',
    'FI',
    'FR',
    'DE',
    'GR',
    'HU',
    'IS',
    'IT',
    'LV',
    'LI',
    'LT',
    'LU',
    'MT',
    'NL',
    'NO',
    'PL',
    'PT',
    'SK',
    'SI',
    'ES',
    'SE',
    'CH',
  ],
  yellow_fever: ['BR', 'CO', 'PE', 'BO', 'CD', 'AO', 'GH', 'KE', 'UG', 'NG'],
  asia_6mo: ['TH', 'VN', 'ID', 'SG', 'MY', 'PH', 'CN'],
};
```

- [ ] **Step 4: Implement `matchRequirements.ts`**

```ts
import { REGIONS } from './regions';

export interface RequirementRule {
  id: string;
  destination_country: string | null;
  destination_regions: string[];
  requirement_type: string;
  applies_to_passport_countries: string[];
  excluded_passport_countries: string[];
  trip_duration_min_days: number | null;
  trip_duration_max_days: number | null;
  trip_purpose: string[];
  passport_validity_required_months: number | null;
}

export interface TripContext {
  destinationCountry: string | null;
  destinationCountries: string[];
  durationDays: number | null;
  purpose: string | null;
  passportCountry: string | null;
}

function hitsDestination(rule: RequirementRule, ctx: TripContext): boolean {
  const dests = new Set([ctx.destinationCountry, ...ctx.destinationCountries].filter(Boolean));
  if (rule.destination_country && dests.has(rule.destination_country)) return true;
  return rule.destination_regions.some((r) => (REGIONS[r] ?? []).some((c) => dests.has(c)));
}

export function ruleMatches(rule: RequirementRule, ctx: TripContext): boolean {
  if (!hitsDestination(rule, ctx)) return false;

  if (ctx.passportCountry && rule.excluded_passport_countries.includes(ctx.passportCountry))
    return false;
  if (rule.applies_to_passport_countries.length) {
    if (!ctx.passportCountry || !rule.applies_to_passport_countries.includes(ctx.passportCountry))
      return false;
  }

  if (
    rule.trip_duration_min_days != null &&
    ctx.durationDays != null &&
    ctx.durationDays < rule.trip_duration_min_days
  )
    return false;
  if (
    rule.trip_duration_max_days != null &&
    ctx.durationDays != null &&
    ctx.durationDays > rule.trip_duration_max_days
  )
    return false;

  if (rule.trip_purpose.length && ctx.purpose && !rule.trip_purpose.includes(ctx.purpose))
    return false;

  return true;
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test -- smart-reminders/matchRequirements`
Expected: PASS (7 tests).

- [ ] **Step 6: Commit**

```bash
git add src/features/smart-reminders/utils/regions.ts src/features/smart-reminders/utils/matchRequirements.ts src/features/smart-reminders/__tests__/matchRequirements.test.ts
git commit -m "feat(reminders): pure rule-matching util + tests"
```

---

## Task 7: Lead-time idempotency util (TDD) — shared with 4E

**Files:**

- Create: `src/features/smart-reminders/utils/leadTimes.ts`
- Test: `src/features/smart-reminders/__tests__/leadTimes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { daysBetween, nextDueLeadTime } from '../utils/leadTimes';

describe('leadTimes', () => {
  it('daysBetween counts whole days (UTC)', () => {
    expect(daysBetween('2026-06-01', '2026-06-08')).toBe(7);
    expect(daysBetween('2026-06-08', '2026-06-01')).toBe(-7);
  });
  it('fires the largest unfired lead time at/under daysUntil', () => {
    // 58 days out, leads [60,30,7], none fired -> fire 60
    expect(nextDueLeadTime(58, [60, 30, 7], [])).toBe(60);
  });
  it('does not refire an already-fired lead time', () => {
    expect(nextDueLeadTime(58, [60, 30, 7], [60])).toBe(30);
  });
  it('returns null when no lead time is due yet', () => {
    expect(nextDueLeadTime(75, [60, 30, 7], [])).toBeNull();
  });
  it('steps down one per call when behind schedule', () => {
    expect(nextDueLeadTime(5, [60, 30, 7], [60, 30])).toBe(7);
  });
  it('returns null when all fired', () => {
    expect(nextDueLeadTime(2, [60, 30, 7], [60, 30, 7])).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- smart-reminders/leadTimes`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `leadTimes.ts`**

```ts
const MS_PER_DAY = 86_400_000;

/** Whole days from `from` to `to` (both 'YYYY-MM-DD', UTC). Positive if `to` is later. */
export function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`).getTime();
  const b = new Date(`${to}T00:00:00Z`).getTime();
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * The single lead time to fire this run: the largest unfired lead time L with daysUntil <= L.
 * Largest-first stepping means at most one push per run and no spam when the cron fell behind.
 */
export function nextDueLeadTime(
  daysUntil: number,
  leadTimes: number[],
  fired: number[],
): number | null {
  const due = leadTimes.filter((l) => daysUntil <= l && !fired.includes(l));
  return due.length ? Math.max(...due) : null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- smart-reminders/leadTimes`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/smart-reminders/utils/leadTimes.ts src/features/smart-reminders/__tests__/leadTimes.test.ts
git commit -m "feat(reminders): lead-time idempotency util + tests"
```

---

## Task 8: `smart_reminders_cron` Edge Function

> Deno can't import from `src/`, so the matching + lead-time logic is reproduced inline. Keep it byte-aligned with Tasks 6–7 (the contract test in Task 15 guards the region list & lead-time semantics conceptually; keep them in sync by hand).

**Files:**

- Create: `supabase/functions/smart_reminders_cron/index.ts`

- [ ] **Step 1: Write the function**

```ts
// smart_reminders_cron: server-only. Invoked 2x/day by pg_cron (pg_net POST + x-webhook-secret).
// Evaluates country_requirements against upcoming trips, upserts trip_smart_reminders,
// and INSERTs notifications (category 'smart_reminders') at lead times. Push handled by 4C chain.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const MAX_LEAD = 90; // only consider trips starting within this many days

const REGIONS: Record<string, string[]> = {
  schengen: [
    'AT',
    'BE',
    'HR',
    'CZ',
    'DK',
    'EE',
    'FI',
    'FR',
    'DE',
    'GR',
    'HU',
    'IS',
    'IT',
    'LV',
    'LI',
    'LT',
    'LU',
    'MT',
    'NL',
    'NO',
    'PL',
    'PT',
    'SK',
    'SI',
    'ES',
    'SE',
    'CH',
  ],
  yellow_fever: ['BR', 'CO', 'PE', 'BO', 'CD', 'AO', 'GH', 'KE', 'UG', 'NG'],
  asia_6mo: ['TH', 'VN', 'ID', 'SG', 'MY', 'PH', 'CN'],
};

interface Rule {
  id: string;
  destination_country: string | null;
  destination_regions: string[];
  requirement_type: string;
  applies_to_passport_countries: string[];
  excluded_passport_countries: string[];
  trip_duration_min_days: number | null;
  trip_duration_max_days: number | null;
  trip_purpose: string[];
  passport_validity_required_months: number | null;
  followup_lead_times: number[];
}
interface Ctx {
  destinationCountry: string | null;
  destinationCountries: string[];
  durationDays: number | null;
  purpose: string | null;
  passportCountry: string | null;
}

function hitsDestination(rule: Rule, ctx: Ctx): boolean {
  const dests = new Set([ctx.destinationCountry, ...ctx.destinationCountries].filter(Boolean));
  if (rule.destination_country && dests.has(rule.destination_country)) return true;
  return rule.destination_regions.some((r) => (REGIONS[r] ?? []).some((c) => dests.has(c)));
}
function ruleMatches(rule: Rule, ctx: Ctx): boolean {
  if (!hitsDestination(rule, ctx)) return false;
  if (ctx.passportCountry && rule.excluded_passport_countries.includes(ctx.passportCountry))
    return false;
  if (
    rule.applies_to_passport_countries.length &&
    (!ctx.passportCountry || !rule.applies_to_passport_countries.includes(ctx.passportCountry))
  )
    return false;
  if (
    rule.trip_duration_min_days != null &&
    ctx.durationDays != null &&
    ctx.durationDays < rule.trip_duration_min_days
  )
    return false;
  if (
    rule.trip_duration_max_days != null &&
    ctx.durationDays != null &&
    ctx.durationDays > rule.trip_duration_max_days
  )
    return false;
  if (rule.trip_purpose.length && ctx.purpose && !rule.trip_purpose.includes(ctx.purpose))
    return false;
  return true;
}
function daysBetween(from: string, to: string): number {
  return Math.round(
    (new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime()) / 86_400_000,
  );
}
function nextDueLeadTime(daysUntil: number, leadTimes: number[], fired: number[]): number | null {
  const due = leadTimes.filter((l) => daysUntil <= l && !fired.includes(l));
  return due.length ? Math.max(...due) : null;
}

Deno.serve(async (req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const candidate = req.headers.get('x-webhook-secret') ?? '';
  const { data: ok } = await sb.rpc('verify_webhook_secret', { candidate });
  if (ok !== true) return new Response('forbidden', { status: 403 });

  const today = new Date().toISOString().slice(0, 10);
  const { data: rules } = await sb.from('country_requirements').select('*');
  const { data: trips } = await sb
    .from('trips')
    .select('id, start_date, end_date, destination_country, destination_countries, purpose')
    .gte('start_date', today);
  if (!rules?.length || !trips?.length) {
    return new Response(JSON.stringify({ inserted: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let inserted = 0;
  for (const trip of trips) {
    if (!trip.start_date) continue;
    const daysUntil = daysBetween(today, trip.start_date);
    if (daysUntil < 0 || daysUntil > MAX_LEAD) continue;
    const durationDays =
      trip.start_date && trip.end_date ? daysBetween(trip.start_date, trip.end_date) : null;

    const { data: members } = await sb
      .from('trip_members')
      .select('user_id')
      .eq('trip_id', trip.id);
    for (const m of members ?? []) {
      const { data: profile } = await sb
        .from('profiles')
        .select('passport_country')
        .eq('id', m.user_id)
        .maybeSingle();
      const ctx: Ctx = {
        destinationCountry: trip.destination_country,
        destinationCountries: trip.destination_countries ?? [],
        durationDays,
        purpose: (trip as { purpose?: string | null }).purpose ?? null,
        passportCountry: profile?.passport_country ?? null,
      };
      for (const rule of rules as Rule[]) {
        if (!ruleMatches(rule, ctx)) continue;

        // Upsert the in-app card (idempotent on UNIQUE(trip_id,user_id,requirement_id)).
        const { data: card } = await sb
          .from('trip_smart_reminders')
          .upsert(
            { trip_id: trip.id, user_id: m.user_id, requirement_id: rule.id },
            { onConflict: 'trip_id,user_id,requirement_id', ignoreDuplicates: false },
          )
          .select('id, status, fired_lead_times')
          .single();
        if (!card || card.status === 'dismissed' || card.status === 'done') continue;

        const lead = nextDueLeadTime(
          daysUntil,
          rule.followup_lead_times ?? [60, 30, 7],
          card.fired_lead_times ?? [],
        );
        if (lead == null) continue;

        // INSERT notification -> 4C webhook delivers the push (respecting prefs + quiet hours).
        await sb.from('notifications').insert({
          user_id: m.user_id,
          category: 'smart_reminders',
          title: rule.id,
          body: rule.id, // resolved client-side from i18n_key in data
          data: { tripId: trip.id, requirementId: rule.id, kind: 'smart_reminder' },
        });
        await sb
          .from('trip_smart_reminders')
          .update({
            fired_lead_times: [...(card.fired_lead_times ?? []), lead],
            notifications_sent_at: [new Date().toISOString()],
            updated_at: new Date().toISOString(),
          })
          .eq('id', card.id);
        inserted++;
      }
    }
  }
  return new Response(JSON.stringify({ inserted }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Deploy via MCP**

Use MCP `deploy_edge_function` (name `smart_reminders_cron`, `verify_jwt: false`).

- [ ] **Step 3: Smoke-test the gate**

`curl -s -X POST <fn_url> -H 'x-webhook-secret: wrong'` → `403`. (Real secret comes from the cron in Task 9.)

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/smart_reminders_cron/index.ts
git commit -m "feat(reminders): smart_reminders_cron edge function"
```

> Note on `trips.purpose`: if the column doesn't exist yet, the cron treats purpose as `null` (rules with non-empty `trip_purpose` simply won't match purpose-gated rules — they still match purpose-agnostic rules). Adding a `purpose` field to trips is out of scope for 4D; tracked as a follow-up.

---

## Task 9: Schedule the cron job

**Files:**

- Create: `supabase/migrations/20260601090004_smart_reminders_cron_schedule.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Phase 4D: run smart_reminders_cron at 08:00 and 18:00 UTC. Secret + URL come from Vault (set in 4C).
SELECT cron.schedule(
  'smart_reminders_cron',
  '0 8,18 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'smart_reminders_cron_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'send_push_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 2: Provision the Vault secret**

Set `smart_reminders_cron_url` in Vault to the deployed function URL (`https://ewsoupkfkachxidmuwoi.supabase.co/functions/v1/smart_reminders_cron`). Reuses the existing `send_push_secret` for gating. Ask the user / use MCP `execute_sql` with `vault.create_secret(...)`.

- [ ] **Step 3: Apply via MCP** (`apply_migration` name `smart_reminders_cron_schedule`).

- [ ] **Step 4: Verify**

`SELECT jobname, schedule FROM cron.job WHERE jobname = 'smart_reminders_cron';` → one row.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601090004_smart_reminders_cron_schedule.sql
git commit -m "feat(reminders): schedule smart_reminders_cron 2x/day"
```

---

## Task 10: Client API

**Files:**

- Create: `src/features/smart-reminders/api/smartReminders.ts`

- [ ] **Step 1: Write the API**

```ts
import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

export type SmartReminder = Database['public']['Tables']['trip_smart_reminders']['Row'];

export async function listTripSmartReminders(tripId: string): Promise<SmartReminder[]> {
  const { data, error } = await supabase
    .from('trip_smart_reminders')
    .select('*')
    .eq('trip_id', tripId)
    .neq('status', 'dismissed')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function setReminderStatus(
  id: string,
  status: SmartReminder['status'],
  extra: Partial<Pick<SmartReminder, 'snooze_until' | 'marked_done_at'>> = {},
): Promise<void> {
  const { error } = await supabase
    .from('trip_smart_reminders')
    .update({ status, updated_at: new Date().toISOString(), ...extra })
    .eq('id', id);
  if (error) throw error;
}

export async function snooze7d(id: string): Promise<void> {
  const until = new Date(Date.now() + 7 * 86_400_000).toISOString();
  await setReminderStatus(id, 'snoozed', { snooze_until: until });
}
```

- [ ] **Step 2: Verify** `npm run typecheck`. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/smart-reminders/api/smartReminders.ts
git commit -m "feat(reminders): smart reminders client API"
```

---

## Task 11: Hook

**Files:**

- Create: `src/features/smart-reminders/hooks/useSmartReminders.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  listTripSmartReminders,
  setReminderStatus,
  snooze7d,
  type SmartReminder,
} from '../api/smartReminders';

const key = (tripId: string) => ['smart-reminders', tripId] as const;

export function useSmartReminders(tripId: string) {
  return useQuery({ queryKey: key(tripId), queryFn: () => listTripSmartReminders(tripId) });
}

export function useSmartReminderActions(tripId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: key(tripId) });
  return {
    markDone: useMutation({
      mutationFn: (id: string) =>
        setReminderStatus(id, 'done', { marked_done_at: new Date().toISOString() }),
      onSuccess: invalidate,
    }),
    dismiss: useMutation({
      mutationFn: (id: string) => setReminderStatus(id, 'dismissed'),
      onSuccess: invalidate,
    }),
    snooze: useMutation({ mutationFn: (id: string) => snooze7d(id), onSuccess: invalidate }),
  };
}

export type { SmartReminder };
```

- [ ] **Step 2: Verify** `npm run typecheck`. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/smart-reminders/hooks/useSmartReminders.ts
git commit -m "feat(reminders): useSmartReminders hook"
```

---

## Task 12: `SmartTipCard` component (TDD)

**Files:**

- Create: `src/features/smart-reminders/components/SmartTipCard.tsx`
- Test: `src/features/smart-reminders/__tests__/SmartTipCard.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { fireEvent, render, screen } from '@testing-library/react-native';

import { SmartTipCard } from '../components/SmartTipCard';

const reminder = {
  id: 'r1',
  requirement_id: 'us_esta',
  status: 'pending' as const,
};

describe('SmartTipCard', () => {
  it('renders the i18n title for the requirement', () => {
    render(
      <SmartTipCard
        requirementId="us_esta"
        status="pending"
        onDone={jest.fn()}
        onSnooze={jest.fn()}
        onDismiss={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getByText(/ESTA/i)).toBeTruthy();
  });
  it('fires onDone when the Done action is pressed', () => {
    const onDone = jest.fn();
    render(
      <SmartTipCard
        requirementId="us_esta"
        status="pending"
        onDone={onDone}
        onSnooze={jest.fn()}
        onDismiss={jest.fn()}
        onOpen={jest.fn()}
      />,
    );
    fireEvent.press(screen.getByTestId('smarttip-done'));
    expect(onDone).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- smart-reminders/SmartTipCard`
Expected: FAIL (module not found). (Requires `smartReminders.kb.us_esta.title` from Task 14 — author Task 14 keys first or expect this test red until then.)

- [ ] **Step 3: Implement the component**

```tsx
import { Pressable, View } from 'react-native';

import { t } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

interface Props {
  requirementId: string;
  status: 'pending' | 'snoozed' | 'done' | 'dismissed' | 'not_applicable';
  onDone: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
  onOpen: () => void;
}

export function SmartTipCard({ requirementId, onDone, onSnooze, onDismiss, onOpen }: Props) {
  const base = `smartReminders.kb.${requirementId}`;
  return (
    <PixelCard>
      <PixelText className="text-text-primary font-heading">{t(`${base}.title`)}</PixelText>
      <PixelText className="text-text-secondary">{t(`${base}.body`)}</PixelText>
      <View className="flex-row gap-2 mt-2">
        <Pressable testID="smarttip-done" onPress={onDone}>
          <PixelText>{t('smartReminders.actions.done')}</PixelText>
        </Pressable>
        <Pressable testID="smarttip-checklist" onPress={onOpen}>
          <PixelText>{t('smartReminders.actions.addToChecklist')}</PixelText>
        </Pressable>
        <Pressable testID="smarttip-snooze" onPress={onSnooze}>
          <PixelText>{t('smartReminders.actions.snooze')}</PixelText>
        </Pressable>
        <Pressable testID="smarttip-dismiss" onPress={onDismiss}>
          <PixelText>{t('smartReminders.actions.dismiss')}</PixelText>
        </Pressable>
      </View>
    </PixelCard>
  );
}
```

> Confirm the real import paths/props of `PixelCard`/`PixelText` against `src/shared/components/` before writing; match their existing API.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- smart-reminders/SmartTipCard`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/smart-reminders/components/SmartTipCard.tsx src/features/smart-reminders/__tests__/SmartTipCard.test.tsx
git commit -m "feat(reminders): SmartTipCard component + tests"
```

---

## Task 13: `SmartTipsSection` + wire into TripDetailScreen

**Files:**

- Create: `src/features/smart-reminders/components/SmartTipsSection.tsx`
- Modify: `src/features/trips/screens/TripDetailScreen.tsx`

- [ ] **Step 1: Implement the section**

```tsx
import { View } from 'react-native';

import { t } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import { useSmartReminderActions, useSmartReminders } from '../hooks/useSmartReminders';
import { SmartTipCard } from './SmartTipCard';

export function SmartTipsSection({ tripId }: { tripId: string }) {
  const { data, isLoading } = useSmartReminders(tripId);
  const { markDone, snooze, dismiss } = useSmartReminderActions(tripId);
  const pending = (data ?? []).filter((r) => r.status === 'pending');
  if (isLoading || !pending.length) return null; // empty state handled by parent; no paralysis

  return (
    <View className="gap-2">
      <PixelText className="font-heading text-text-primary">
        {t('smartReminders.section.title')}
      </PixelText>
      {pending.map((r) => (
        <SmartTipCard
          key={r.id}
          requirementId={r.requirement_id}
          status={r.status}
          onDone={() => markDone.mutate(r.id)}
          onSnooze={() => snooze.mutate(r.id)}
          onDismiss={() => dismiss.mutate(r.id)}
          onOpen={() => {
            /* TODO Task: deep-link to action_url; wired with checklist add in 4B follow-up */
          }}
        />
      ))}
    </View>
  );
}
```

- [ ] **Step 2: Mount in TripDetailScreen**

Read `src/features/trips/screens/TripDetailScreen.tsx`, import `SmartTipsSection`, and render `<SmartTipsSection tripId={tripId} />` near the checklist/documents entries. Match the existing section layout.

- [ ] **Step 3: Verify** `npm run typecheck && npm test -- smart-reminders`. Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/smart-reminders/components/SmartTipsSection.tsx src/features/trips/screens/TripDetailScreen.tsx
git commit -m "feat(reminders): SmartTipsSection wired into TripDetailScreen"
```

---

## Task 14: i18n keys

**Files:**

- Modify: `src/core/i18n/locales/en.json`
- Modify: `src/core/i18n/locales/fr.json`

- [ ] **Step 1: Add `smartReminders.*` to en.json**

```json
"smartReminders": {
  "section": { "title": "Smart tips" },
  "actions": { "done": "Done", "addToChecklist": "Add to checklist", "snooze": "Snooze", "dismiss": "Dismiss", "open": "Open" },
  "kb": {
    "us_esta": { "title": "ESTA required (USA)", "body": "Apply for your ESTA before flying to the US. Processing can take up to 72h.", "actionLabel": "Apply for ESTA" },
    "uk_eta": { "title": "UK ETA required", "body": "You need an Electronic Travel Authorisation to enter the UK.", "actionLabel": "Apply for ETA" },
    "schengen_etias": { "title": "ETIAS (Europe)", "body": "ETIAS travel authorisation may be required for the Schengen area.", "actionLabel": "Check ETIAS" }
  }
}
```

- [ ] **Step 2: Mirror the exact key tree in fr.json** (translated values). Every key present in en MUST exist in fr.

- [ ] **Step 3:** Add a `kb.<id>` entry (title/body) for **every** seeded `country_requirements.i18n_key` (Tasks 2 + 3). The Task 15 contract test enforces this.

- [ ] **Step 4: Verify** `npm test -- smart-reminders/contracts`. Expected: PASS (after Task 15 exists).

- [ ] **Step 5: Commit**

```bash
git add src/core/i18n/locales/en.json src/core/i18n/locales/fr.json
git commit -m "feat(reminders): smartReminders i18n (en+fr)"
```

---

## Task 15: Runtime-contract tests

> Mirror `src/features/notifications/__tests__/contracts.test.ts`.

**Files:**

- Create: `src/features/smart-reminders/__tests__/contracts.test.ts`

- [ ] **Step 1: Write the contract tests**

```ts
import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

const FEATURE_DIR = path.join(__dirname, '..');
const SEED = path.join(
  __dirname,
  '../../../../supabase/migrations/20260601090002_country_requirements.sql',
);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== '__tests__') out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(e.name)) out.push(full);
  }
  return out;
}
function resolveKey(obj: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (a, p) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined),
      obj,
    );
}

describe('smart-reminders runtime contracts', () => {
  it('every static t("smartReminders.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const f of walk(FEATURE_DIR)) {
      for (const m of fs
        .readFileSync(f, 'utf8')
        .matchAll(/t\(\s*[`'"]smartReminders\.([a-zA-Z0-9_.${}]+)[`'"]/g)) {
        if (!m[1].includes('${')) keys.add(`smartReminders.${m[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('every seeded KB i18n_key has a .title and .body in en and fr', () => {
    const sql = fs.readFileSync(SEED, 'utf8');
    const keys = [...sql.matchAll(/'(smartReminders\.kb\.[a-z0-9_]+)'/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    for (const base of new Set(keys)) {
      for (const loc of [en, fr]) {
        expect(typeof resolveKey(loc, `${base}.title`)).toBe('string');
        expect(typeof resolveKey(loc, `${base}.body`)).toBe('string');
      }
    }
  });

  it('"smart_reminders" is a known notification category', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { NOTIFICATION_CATEGORIES } = require('@features/notifications/utils/categories');
    expect(NOTIFICATION_CATEGORIES).toContain('smart_reminders');
  });
});
```

- [ ] **Step 2: Run** `npm test -- smart-reminders/contracts`. Expected: PASS (fix i18n gaps until green).

- [ ] **Step 3: Commit**

```bash
git add src/features/smart-reminders/__tests__/contracts.test.ts
git commit -m "test(reminders): smart-reminders runtime-contract tests"
```

---

## Task 16: Barrel + final validation

**Files:**

- Create: `src/features/smart-reminders/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
export { SmartTipsSection } from './components/SmartTipsSection';
export { useSmartReminders } from './hooks/useSmartReminders';
export type { SmartReminder } from './api/smartReminders';
```

- [ ] **Step 2: Full validation**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all PASS; new test count up by the 4D suites.

- [ ] **Step 3: Security audit** — MCP `get_advisors` (security + performance). Expected: no new ERROR (pg_net/pg_cron in public may WARN, as in 4C).

- [ ] **Step 4: Commit + push**

```bash
git add src/features/smart-reminders/index.ts
git commit -m "feat(reminders): smart-reminders module barrel + 4D validation"
git push origin main
```

---

## Self-Review (completed during planning)

- **Spec coverage:** KB (Tasks 2–3), `trip_smart_reminders` (4), cron eval (6–9), idempotency (7,8), Smart Tips UI + 4 actions (12–13), i18n (14), contract tests (15), RLS (2,4), reuse-4C-push (8). ✔
- **Deferred & flagged:** `trips.purpose` may be absent (Task 8 note); "Add to checklist" deep wiring left as a marked follow-up in Task 13; ETIAS/Brazil flagged for verification (Tasks 2–3).
- **Type consistency:** `nextDueLeadTime`/`daysBetween`/`ruleMatches`/`hitsDestination` and `REGIONS` are identical across util + edge fn; `SmartReminder` type sourced from generated `Database`.
