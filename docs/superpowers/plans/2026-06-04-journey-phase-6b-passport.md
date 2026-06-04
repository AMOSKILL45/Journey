# Phase 6B — Adventurer Passport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mint a passport **stamp** per checked-in milestone (place + country flag + date) and fill the traveler's `countries_visited`, persisted server-side via a check-in trigger and shown on a Passport screen off Profile. 100% OTA.

**Architecture:** A check-in `AFTER INSERT` trigger calls a SECURITY DEFINER `_rebuild_passport(uid)` that FULL-recomputes `profiles.passport_stamps` (jsonb) + `countries_visited` (text[]) from the user's checkins (idempotent); a migration backfills existing users; the client reads its own profile row (existing RLS) + a catch-up `rebuild_my_passport()` RPC on screen open.

**Tech Stack:** Supabase Postgres (plpgsql, SECURITY DEFINER, triggers), TypeScript strict, TanStack Query v5, NativeWind v4, i18n-js (FR+EN), Jest + RNTL.

**Spec:** `docs/superpowers/specs/2026-06-04-journey-phase-6b-passport-design.md`

**Resolved pre-conditions** (verified against the codebase):

- Country data with `{ code: ISO α-2, name, flag }` lives at `src/features/profile/data/countries.ts` (reuse it).
- `trips.destination_country` is **ISO α-2** (set in `CreateTripScreen` from the same picker).
- The 4E `upsert_passport_reminder` trigger is `AFTER INSERT OR UPDATE OF passport_expires_at` — our rebuild touches only `passport_stamps`/`countries_visited`, so **no cascade**.

**Workflow execution map:**

- **Phase A (sequential, prod DDL on `ewsoupkfkachxidmuwoi`):** Task 1 (migration + backfill + types regen).
- **Phase B (parallel after A):** Tasks 2, 3, 4, 8 (flags, passport utils, api, i18n).
- **Phase C (parallel after B):** Tasks 5, 6, 7 (hook, stamp component, screen+barrel).
- **Phase D (sequential after C):** Tasks 9 (wiring), 10 (contracts + validation + docs).

**Conventions to mirror:** `src/features/achievements/*` (just shipped — same idioms: api/hooks/components/contract tests), modal route `src/app/(modals)/achievements.tsx`, country data `src/features/profile/data/countries.ts`. Validate inline: `npm run typecheck && npm run lint && npm test`. Agents do NOT git-commit (main session commits).

---

## File structure

```
supabase/migrations/20260604_passport.sql        # _rebuild_passport + rebuild_my_passport + trigger + backfill
src/core/supabase/types.ts                        # regenerated (Modify)
src/features/passport/
  flags.ts               # ISO α-2 → flag emoji + country name (reuses profile/data/countries) — pure
  passport.ts            # Stamp type + parseStamps / sortByDateDesc / groupByCountry — pure
  api.ts                 # fetchMyPassport / rebuildMyPassport
  hooks/usePassport.ts   # query + catch-up rebuild on mount
  components/PassportStamp.tsx
  screens/PassportScreen.tsx
  index.ts               # barrel
  __tests__/{flags,passport,PassportStamp,PassportScreen,contracts}.test.ts(x)
src/app/(modals)/passport.tsx                     # route (Create)
src/app/(tabs)/profile.tsx                        # add entry row (Modify)
src/core/i18n/locales/{en,fr}.json                # passport.* (Modify)
```

---

## Task 1: Migration — rebuild fn + trigger + backfill

**Files:** Create `supabase/migrations/20260604_passport.sql`; Modify `src/core/supabase/types.ts`

- [ ] **Step 1: Write the migration**

```sql
-- Internal: full-recompute the user's passport from their checkins. SECURITY DEFINER, client-revoked.
create or replace function public._rebuild_passport(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_stamps jsonb; v_countries text[];
begin
  if p_uid is null then return; end if;
  select coalesce(jsonb_agg(s order by s_at desc), '[]'::jsonb) into v_stamps
  from (
    select distinct on (c.milestone_id)
      jsonb_build_object(
        'milestone_id', c.milestone_id, 'trip_id', m.trip_id,
        'label', m.name, 'country', t.destination_country, 'at', c.checked_in_at
      ) as s,
      c.checked_in_at as s_at
    from checkins c
    join milestones m on m.id = c.milestone_id
    join trips t on t.id = m.trip_id
    where c.user_id = p_uid
    order by c.milestone_id, c.checked_in_at desc
  ) q;
  select coalesce(array_agg(distinct t.destination_country), '{}') into v_countries
  from checkins c
  join milestones m on m.id = c.milestone_id
  join trips t on t.id = m.trip_id
  where c.user_id = p_uid and t.destination_country is not null;
  update profiles set passport_stamps = v_stamps, countries_visited = v_countries where id = p_uid;
end $$;
revoke all on function public._rebuild_passport(uuid) from public, anon, authenticated;

-- Public wrapper: derives auth.uid() (no IDOR), the only client-callable entry.
create or replace function public.rebuild_my_passport()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  perform public._rebuild_passport(auth.uid());
end $$;
revoke all on function public.rebuild_my_passport() from public, anon;
grant execute on function public.rebuild_my_passport() to authenticated;

-- Trigger: every check-in rebuilds that user's passport.
create or replace function public._passport_after_checkins() returns trigger
language plpgsql security definer set search_path = public as
$$ begin perform public._rebuild_passport(new.user_id); return null; end $$;
revoke all on function public._passport_after_checkins() from public, anon, authenticated;

create trigger trg_passport_checkins after insert on public.checkins
  for each row execute function public._passport_after_checkins();

-- Backfill existing travelers.
do $$ declare u uuid; begin
  for u in select distinct user_id from public.checkins loop
    perform public._rebuild_passport(u);
  end loop;
end $$;
```

- [ ] **Step 2: Apply** — `mcp__472a285c-8015-423f-bab3-4c3f82a99890__apply_migration` name `passport`. ⚠️ Prod DDL on `ewsoupkfkachxidmuwoi`.
- [ ] **Step 3: Verify** — `mcp__472a285c-...__execute_sql`:
  - `select count(*) from pg_trigger where tgname = 'trg_passport_checkins';` = 1
  - grants: `select has_function_privilege('authenticated','public.rebuild_my_passport()','execute')` = true; `has_function_privilege('anon','public._rebuild_passport(uuid)','execute')` = false; same false for `authenticated`.
  - sanity: `select id, jsonb_array_length(coalesce(passport_stamps,'[]'::jsonb)) stamps, coalesce(array_length(countries_visited,1),0) countries from profiles where passport_stamps is not null limit 5;`
- [ ] **Step 4: Regen types** — `generate_typescript_types`, overwrite `src/core/supabase/types.ts`; confirm `rebuild_my_passport` appears in the `Functions` block.
- [ ] **Step 5: Run advisors** — `get_advisors('security')`; confirm no new finding beyond the known baseline + the intentional `rebuild_my_passport` authenticated RPC WARN. (Internal fns must NOT appear thanks to the explicit anon/authenticated revokes.)
- [ ] **Step 6: Commit** `feat(passport): rebuild fn + check-in trigger + backfill + types (6B)` (main session).

---

## Task 2: `flags.ts` (pure) + test

**Files:** Create `src/features/passport/flags.ts`, `src/features/passport/__tests__/flags.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { countryName, flagFor } from '../flags';

describe('flags', () => {
  it('returns the listed flag + name for a known ISO code', () => {
    expect(flagFor('JP')).toBe('🇯🇵');
    expect(countryName('JP')).toBe('Japan');
  });
  it('derives a flag emoji for a valid 2-letter code (listed or not) and is case-insensitive', () => {
    expect(flagFor('kr')).toBe('🇰🇷');
  });
  it('falls back for null / unknown', () => {
    expect(flagFor(null)).toBe('🏳️');
    expect(flagFor('ZZZ')).toBe('🏳️');
    expect(countryName(null)).toBe('');
    expect(countryName('ZZ')).toBe('ZZ');
  });
});
```

- [ ] **Step 2: Run → fail** `npm test -- passport/__tests__/flags`
- [ ] **Step 3: Implement**

```ts
import { COUNTRIES } from '@features/profile/data/countries';

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

function deriveFlag(code: string): string | null {
  if (!/^[A-Za-z]{2}$/.test(code)) return null;
  const cc = code.toUpperCase();
  const base = 0x1f1e6; // regional indicator 'A'
  return String.fromCodePoint(base + (cc.charCodeAt(0) - 65), base + (cc.charCodeAt(1) - 65));
}

export function flagFor(code: string | null): string {
  if (!code) return '🏳️';
  const listed = BY_CODE.get(code.toUpperCase());
  if (listed) return listed.flag;
  return deriveFlag(code) ?? '🏳️';
}

export function countryName(code: string | null): string {
  if (!code) return '';
  return BY_CODE.get(code.toUpperCase())?.name ?? code;
}
```

- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit** `feat(passport): flags util (6B)`.

---

## Task 3: `passport.ts` (pure) + test

**Files:** Create `src/features/passport/passport.ts`, `__tests__/passport.test.ts`

- [ ] **Step 1: Failing test**

```ts
import { groupByCountry, parseStamps, sortByDateDesc, type Stamp } from '../passport';

const raw = [
  { milestone_id: 'm1', trip_id: 't1', label: 'A', country: 'JP', at: '2026-01-01T00:00:00Z' },
  { milestone_id: 'm2', trip_id: 't1', label: 'B', country: 'JP', at: '2026-03-01T00:00:00Z' },
  { bogus: true },
  null,
];

describe('passport', () => {
  it('parses + coerces, dropping malformed rows', () => {
    const out = parseStamps(raw);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ milestone_id: 'm1', country: 'JP' });
  });
  it('parseStamps returns [] for non-array', () => {
    expect(parseStamps(null)).toEqual([]);
    expect(parseStamps({})).toEqual([]);
  });
  it('sorts by date descending', () => {
    expect(sortByDateDesc(parseStamps(raw)).map((s) => s.milestone_id)).toEqual(['m2', 'm1']);
  });
  it('groups by country', () => {
    expect(Object.keys(groupByCountry(parseStamps(raw)))).toEqual(['JP']);
  });
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

```ts
export interface Stamp {
  milestone_id: string;
  trip_id: string | null;
  label: string;
  country: string | null;
  at: string | null;
}

export function parseStamps(raw: unknown): Stamp[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
    .map((s) => ({
      milestone_id: String(s.milestone_id ?? ''),
      trip_id: s.trip_id ? String(s.trip_id) : null,
      label: String(s.label ?? ''),
      country: s.country ? String(s.country) : null,
      at: s.at ? String(s.at) : null,
    }))
    .filter((s) => s.milestone_id !== '');
}

export function sortByDateDesc(stamps: Stamp[]): Stamp[] {
  return [...stamps].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''));
}

export function groupByCountry(stamps: Stamp[]): Record<string, Stamp[]> {
  return stamps.reduce<Record<string, Stamp[]>>((acc, s) => {
    const key = s.country ?? '??';
    (acc[key] ??= []).push(s);
    return acc;
  }, {});
}
```

- [ ] **Step 4: Run → pass.**
- [ ] **Step 5: Commit** `feat(passport): stamp utils (6B)`.

---

## Task 4: `api.ts`

**Files:** Create `src/features/passport/api.ts`

- [ ] **Step 1: Implement**

```ts
import { supabase } from '@core/supabase/client';

import { parseStamps, type Stamp } from './passport';

export interface Passport {
  stamps: Stamp[];
  countries: string[];
}

export async function fetchMyPassport(): Promise<Passport> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { stamps: [], countries: [] };
  const { data, error } = await supabase
    .from('profiles')
    .select('passport_stamps, countries_visited')
    .eq('id', uid)
    .single();
  if (error) throw error;
  return {
    stamps: parseStamps(data?.passport_stamps),
    countries: (data?.countries_visited ?? []) as string[],
  };
}

export async function rebuildMyPassport(): Promise<void> {
  const { error } = await supabase.rpc('rebuild_my_passport');
  if (error) throw error;
}
```

- [ ] **Step 2: Typecheck** `npm run typecheck` (confirms `rebuild_my_passport` + columns in regenerated types).
- [ ] **Step 3: Commit** `feat(passport): api (6B)`.

---

## Task 5: `usePassport` hook

**Files:** Create `src/features/passport/hooks/usePassport.ts`

- [ ] **Step 1: Implement**

```ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { fetchMyPassport, rebuildMyPassport } from '../api';

export const passportKey = ['passport', 'mine'] as const;

export function usePassport() {
  const qc = useQueryClient();
  useEffect(() => {
    let active = true;
    void rebuildMyPassport()
      .then(() => {
        if (active) void qc.invalidateQueries({ queryKey: passportKey });
      })
      .catch(() => {
        /* read still works from the last persisted state */
      });
    return () => {
      active = false;
    };
  }, [qc]);
  return useQuery({ queryKey: passportKey, queryFn: fetchMyPassport });
}
```

- [ ] **Step 2: Typecheck → PASS. Commit** `feat(passport): usePassport hook (6B)`.

---

## Task 6: `PassportStamp` + test

**Files:** Create `src/features/passport/components/PassportStamp.tsx`, `__tests__/PassportStamp.test.tsx`

- [ ] **Step 1: Failing test**

```tsx
import { render } from '@testing-library/react-native';

import { PassportStamp } from '../components/PassportStamp';

describe('PassportStamp', () => {
  it('renders flag, label and date', () => {
    const { getByTestId, getByText } = render(
      <PassportStamp
        stamp={{
          milestone_id: 'm1',
          trip_id: 't1',
          label: 'Tokyo Tower',
          country: 'JP',
          at: '2026-06-04T10:00:00Z',
        }}
      />,
    );
    expect(getByTestId('stamp-m1')).toBeTruthy();
    expect(getByText('Tokyo Tower')).toBeTruthy();
    expect(getByText('🇯🇵')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

```tsx
import { View } from 'react-native';

import { PixelText } from '@shared/components/PixelText';

import { flagFor } from '../flags';
import type { Stamp } from '../passport';

export function PassportStamp({ stamp }: { stamp: Stamp }) {
  const date = stamp.at ? stamp.at.slice(0, 10) : '';
  return (
    <View
      testID={`stamp-${stamp.milestone_id}`}
      className="w-24 items-center rounded-lg border-2 border-border bg-surface-alt p-2"
    >
      <PixelText size="h2">{flagFor(stamp.country)}</PixelText>
      <PixelText size="caption" numberOfLines={2} className="text-center">
        {stamp.label}
      </PixelText>
      {date ? (
        <PixelText size="caption" className="text-text-secondary">
          {date}
        </PixelText>
      ) : null}
    </View>
  );
}
```

- [ ] **Step 4: Run → pass. Commit** `feat(passport): PassportStamp (6B)`.

---

## Task 7: `PassportScreen` + barrel

**Files:** Create `src/features/passport/screens/PassportScreen.tsx`, `src/features/passport/index.ts`, `__tests__/PassportScreen.test.tsx`

- [ ] **Step 1: Failing test** (mock the hook)

```tsx
import { render } from '@testing-library/react-native';

import { PassportScreen } from '../screens/PassportScreen';

jest.mock('../hooks/usePassport', () => ({
  usePassport: () => mockState,
}));
let mockState: {
  data: { stamps: unknown[]; countries: string[] } | undefined;
  isLoading: boolean;
  refetch: () => void;
};

describe('PassportScreen', () => {
  it('shows the empty state with zero counts', () => {
    mockState = { data: { stamps: [], countries: [] }, isLoading: false, refetch: jest.fn() };
    const { getByText } = render(<PassportScreen />);
    expect(getByText('passport.screen.empty')).toBeTruthy();
  });
  it('renders stamps when present', () => {
    mockState = {
      data: {
        stamps: [
          { milestone_id: 'm1', trip_id: 't1', label: 'A', country: 'JP', at: '2026-01-01' },
        ],
        countries: ['JP'],
      },
      isLoading: false,
      refetch: jest.fn(),
    };
    const { getByTestId } = render(<PassportScreen />);
    expect(getByTestId('stamp-m1')).toBeTruthy();
  });
});
```

> Note: i18n in tests returns the key string, so assert on `'passport.screen.empty'` (matches the existing test convention in the repo).

- [ ] **Step 2: Run → fail.**
- [ ] **Step 3: Implement**

```tsx
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { rebuildMyPassport } from '../api';
import { PassportStamp } from '../components/PassportStamp';
import { usePassport } from '../hooks/usePassport';
import { sortByDateDesc } from '../passport';

export function PassportScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = usePassport();
  const stamps = sortByDateDesc(data?.stamps ?? []);
  const countries = data?.countries ?? [];

  return (
    <View className="flex-1 bg-cream" style={{ paddingTop: insets.top + SCREEN_PADDING }}>
      <PixelText size="h1" className="mb-1 px-6">
        {t('passport.screen.title')}
      </PixelText>
      <PixelText size="caption" className="mb-4 px-6 text-text-secondary">
        {t('passport.screen.counts', { countries: countries.length, stamps: stamps.length })}
      </PixelText>
      <FlatList
        data={stamps}
        keyExtractor={(s) => s.milestone_id}
        numColumns={3}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 16, gap: 8 }}
        columnWrapperStyle={{ gap: 8 }}
        renderItem={({ item }) => <PassportStamp stamp={item} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void rebuildMyPassport().then(() => refetch());
            }}
          />
        }
        ListEmptyComponent={
          <PixelText size="body" className="mt-8 text-center text-text-secondary">
            {t('passport.screen.empty')}
          </PixelText>
        }
      />
    </View>
  );
}
```

- [ ] **Step 4: Barrel** `index.ts`:

```ts
export { PassportScreen } from './screens/PassportScreen';
export { PassportStamp } from './components/PassportStamp';
export { usePassport } from './hooks/usePassport';
export type { Stamp, Passport } from './passport';
```

> `Passport` type is exported from `api.ts`; re-export both from the barrel: add `export type { Passport } from './api';` and `export type { Stamp } from './passport';`.

- [ ] **Step 5: Run → pass. Commit** `feat(passport): PassportScreen + barrel (6B)`.

---

## Task 8: i18n (`passport.*`, en + fr)

**Files:** Modify `src/core/i18n/locales/en.json`, `src/core/i18n/locales/fr.json`

- [ ] **Step 1: Add the namespace** to both files:

```jsonc
"passport": {
  "screen": {
    "title": "Passport",                                  // fr: "Passeport"
    "counts": "{{countries}} countries · {{stamps}} stamps", // fr: "{{countries}} pays · {{stamps}} tampons"
    "empty": "Check in to your first milestone to earn a stamp.", // fr: "Pointe ton premier jalon pour gagner un tampon."
    "refresh": "Refresh"                                  // fr: "Actualiser"
  }
}
```

Write real FR + EN copy (no placeholders).

- [ ] **Step 2: Validate** `npm test -- i18n` (en/fr parity test stays green).
- [ ] **Step 3: Commit** `feat(passport): i18n en+fr (6B)`.

---

## Task 9: Wiring — route + Profile entry

**Files:** Create `src/app/(modals)/passport.tsx`; Modify `src/app/(tabs)/profile.tsx`

- [ ] **Step 1: Route** `(modals)/passport.tsx`:

```tsx
import { PassportScreen } from '@features/passport';

export default function PassportRoute() {
  return <PassportScreen />;
}
```

- [ ] **Step 2: Profile entry** — in `profile.tsx`, add directly below the Achievements `PixelButton`:

```tsx
<PixelButton
  variant="secondary"
  onPress={() => router.push('/(modals)/passport')}
  className="mb-3"
  fullWidth
>
  {t('passport.screen.title')}
</PixelButton>
```

- [ ] **Step 3: Verify** `npm run typecheck`; the global `src/__tests__/internal-routes-audit.test.ts` auto-covers `/(modals)/passport` (asserts the screen file exists) — run `npm test -- internal-routes-audit` → PASS.
- [ ] **Step 4: Commit** `feat(passport): route + profile entry (6B)`.

---

## Task 10: Contract tests + validation + docs

**Files:** Create `src/features/passport/__tests__/contracts.test.ts`; Modify `CLAUDE.md`

- [ ] **Step 1: Write contract tests**

```ts
import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

const FEATURE_DIR = path.join(__dirname, '..');
const MIGRATIONS = path.join(__dirname, '../../../../supabase/migrations');
const MIG = fs.readFileSync(path.join(MIGRATIONS, '20260604_passport.sql'), 'utf8');
const TYPES = fs.readFileSync(path.join(__dirname, '../../../core/supabase/types.ts'), 'utf8');

function resolveKey(obj: unknown, key: string): unknown {
  return key
    .split('.')
    .reduce<unknown>(
      (a, p) => (a && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined),
      obj,
    );
}

describe('passport runtime contracts', () => {
  it('every static t("passport.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    const walk = (dir: string): void => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name !== '__tests__') walk(full);
        } else if (/\.(ts|tsx)$/.test(e.name)) {
          for (const m of fs
            .readFileSync(full, 'utf8')
            .matchAll(/t\(\s*[`'"]passport\.([a-zA-Z0-9_.]+)[`'"]/g)) {
            keys.add(`passport.${m[1]}`);
          }
        }
      }
    };
    walk(FEATURE_DIR);
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('rebuild_my_passport RPC exists in the generated types', () => {
    expect(TYPES).toMatch(/rebuild_my_passport/);
  });

  it('passport columns exist in the generated types', () => {
    expect(TYPES).toContain('passport_stamps');
    expect(TYPES).toContain('countries_visited');
  });

  it('internal passport functions are revoked from anon + authenticated (not RPC-exposed)', () => {
    for (const fn of ['_rebuild_passport\\(uuid\\)', '_passport_after_checkins\\(\\)']) {
      expect(MIG).toMatch(
        new RegExp(
          `revoke all on function public\\.${fn} from [^;]*\\banon\\b[^;]*\\bauthenticated\\b`,
          'i',
        ),
      );
    }
    // wrapper keeps authenticated, drops anon
    expect(MIG).toMatch(
      /revoke all on function public\.rebuild_my_passport\(\) from [^;]*\banon\b/i,
    );
    expect(MIG).toMatch(
      /grant execute on function public\.rebuild_my_passport\(\) to authenticated/i,
    );
  });
});
```

- [ ] **Step 2: Run all** `npm run typecheck && npm run lint && npm test` → all PASS.
- [ ] **Step 3: Update `CLAUDE.md`** — add a "Phase 6B (Adventurer Passport) done" line (mirror 6A): per-milestone stamps via `_rebuild_passport` + `trg_passport_checkins` + backfill; client `flags`/`passport` utils + `usePassport` + `PassportStamp` + `PassportScreen`; route + Profile entry; `passport.*` i18n; contract tests; advisors clean; OTA. Update the test count.
- [ ] **Step 4: Commit** `feat(passport): contract tests + docs — Phase 6B complete`.

---

## Self-Review

**Spec coverage:** §2 ADRs → 6B-1/6B-3 (rebuild SQL, Task 1), 6B-2 (trigger, Task 1), 6B-4 (backfill + catch-up hook, Tasks 1+5), 6B-5 (countries SQL aligned, Task 1), 6B-6 (grant revokes, Task 1 + contract Task 10), 6B-7 (placeholder frame + flag, Tasks 2+6). §3 data model → Task 1. §4 client units → Tasks 2-7. §5 UX → Task 7 (counts header, grid, empty, pull-to-refresh). §6 i18n → Task 8. §7 tests/security → Tasks 2/3/6/7 unit, Task 10 contracts, advisors Task 1 Step 5. §8 open items → all resolved in this plan's pre-conditions. §9 non-goals respected.

**Placeholder scan:** No "TBD/TODO". Placeholder stamp art = documented design choice (frame + flag, real renderer in Task 6).

**Type consistency:** `Stamp` (Task 3) consumed by `api.ts` (Task 4), `PassportStamp` (Task 6), `PassportScreen` (Task 7). `Passport {stamps,countries}` (Task 4) returned by `fetchMyPassport`, consumed by `usePassport` (Task 5) + screen. `passportKey` (Task 5) used in the hook only. `flagFor`/`countryName` (Task 2) used in Task 6. `rebuild_my_passport` RPC name consistent across Task 1 SQL, Task 4 api, Task 10 contract.
