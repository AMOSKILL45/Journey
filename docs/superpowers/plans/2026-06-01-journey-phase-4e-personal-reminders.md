# Phase 4E — Personal Life Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trip-independent expiry reminders (passport, visa, ESTA, driving license, travel insurance) — auto-created from extracted/entered expiry dates plus fully manual user-created reminders — pushed at lead times via the 4C `notifications` hub.

**Architecture:** A per-user `personal_reminders` table. Three creation paths: a `profiles` trigger for passport expiry, a UI affordance on 4A documents for the four doc types, and manual CRUD in Settings. A daily `personal_reminders_cron` Edge Function evaluates lead times and INSERTs into `notifications` (new `life_reminders` category) — 4C delivers the push. A separate "Life reminders" tab in the Inbox.

**Tech Stack:** Supabase Postgres + RLS + pg_cron + Vault · Deno Edge Functions · TypeScript · TanStack Query v5 · NativeWind · Jest + RNTL · i18n-js.

**Spec:** `docs/superpowers/specs/2026-06-01-journey-phase-4de-reminders-design.md`
**Depends on:** 4C (notifications/send_push), 4D backbone (pg_cron enabled). Reuses the lead-time semantics from 4D (`nextDueLeadTime`, reproduced inline in the edge fn).

**Conventions:** identical to the 4D plan (MCP `apply_migration`/`generate_typescript_types`/`deploy_edge_function`; RLS user-own; i18n in `locales/{en,fr}.json`; validate inline with `npm run typecheck && npm run lint && npm test`).

---

## File Structure

**Migrations** (`supabase/migrations/`)

- `20260601100001_personal_reminders.sql` — table + RLS + partial unique index.
- `20260601100002_documents_expires_at.sql` — `documents.expires_at` (4A extension).
- `20260601100003_passport_reminder_trigger.sql` — `profiles` trigger.
- `20260601100004_personal_reminders_cron_schedule.sql` — daily `cron.schedule`.

**Edge function** (`supabase/functions/`)

- `personal_reminders_cron/index.ts` — daily evaluator.

**Feature** (`src/features/personal-reminders/`)

- `utils/reminderTypes.ts` — type vocabulary + default lead times + document-category mapping.
- `api/personalReminders.ts` — CRUD + create-from-document.
- `hooks/usePersonalReminders.ts` — TanStack queries/mutations.
- `components/LifeReminderRow.tsx` — one row in the Inbox tab.
- `components/ReminderFormSheet.tsx` — add/edit sheet (date, title, lead times).
- `index.ts` — barrel.
- `__tests__/` — `reminderTypes.test.ts`, `LifeReminderRow.test.tsx`, `contracts.test.ts`.

**Routes / modified**

- `src/app/(modals)/reminders.tsx` — Settings → Reminders CRUD screen.
- `src/features/notifications/utils/categories.ts` — add `life_reminders`.
- `src/features/notifications/screens/InboxScreen.tsx` — add the "Life reminders" tab.
- 4A document upload/edit sheet — add the "Remind me before this expires" affordance.
- `src/core/i18n/locales/{en,fr}.json` — `lifeReminders.*` + `notifications.categories.life_reminders`.

---

## Task 1: Add the `life_reminders` notification category

**Files:**

- Modify: `src/features/notifications/utils/categories.ts`
- Test: `src/features/notifications/__tests__/categories.test.ts` (existing — extend)

- [ ] **Step 1: Write/extend the failing test**

```ts
import { NOTIFICATION_CATEGORIES, defaultPrefs } from '../utils/categories';

it('includes life_reminders as a category, on by default', () => {
  expect(NOTIFICATION_CATEGORIES).toContain('life_reminders');
  expect(defaultPrefs().categories.life_reminders).toBe(true);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- notifications/categories`
Expected: FAIL (`life_reminders` not in list).

- [ ] **Step 3: Add the category**

In `categories.ts`, add `'life_reminders'` to the `NOTIFICATION_CATEGORIES` array (after `'smart_reminders'`). No other change — `defaultPrefs()` loops the array, `NotificationSettings` renders per category, and `send_push` reads prefs dynamically.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- notifications/categories`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/notifications/utils/categories.ts src/features/notifications/__tests__/categories.test.ts
git commit -m "feat(reminders): add life_reminders notification category"
```

---

## Task 2: `personal_reminders` table + RLS

**Files:**

- Create: `supabase/migrations/20260601100001_personal_reminders.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Phase 4E: trip-independent life reminders. Manual rows = user CRUD; auto rows = trigger/service-role.
CREATE TABLE IF NOT EXISTS public.personal_reminders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type         text NOT NULL
                          CHECK (reminder_type IN ('passport_expiry','visa_expiry','esta_expiry',
                                                    'driving_license_expiry','travel_insurance_expiry','custom')),
  related_document_id   uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  target_date           date NOT NULL,
  i18n_key              text,                       -- auto types; NULL for 'custom'
  title                 text,                       -- 'custom' (user-entered)
  body                  text,
  lead_times            int[] NOT NULL DEFAULT '{60,30,7}',
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','snoozed','dismissed','completed')),
  snooze_until          timestamptz,
  source                text NOT NULL DEFAULT 'manual'
                          CHECK (source IN ('auto_passport','auto_document','manual')),
  notifications_sent_at timestamptz[] NOT NULL DEFAULT '{}',
  fired_lead_times      int[] NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT label_present CHECK (i18n_key IS NOT NULL OR title IS NOT NULL)
);

-- Dedup auto rows only. NULLS NOT DISTINCT (PG15+) so passport rows (related_document_id IS NULL)
-- dedupe to one per user; without it two NULLs count distinct and duplicate every profile update.
CREATE UNIQUE INDEX uq_personal_reminders_auto
  ON public.personal_reminders(user_id, reminder_type, related_document_id)
  NULLS NOT DISTINCT WHERE source <> 'manual';
CREATE INDEX idx_personal_reminders_user_date ON public.personal_reminders(user_id, target_date);

ALTER TABLE public.personal_reminders ENABLE ROW LEVEL SECURITY;

-- SELECT: own rows.
CREATE POLICY "Own personal reminders SELECT" ON public.personal_reminders FOR SELECT
  USING (user_id = auth.uid());
-- INSERT: manual only (auto rows come from trigger / service role).
CREATE POLICY "Own manual reminders INSERT" ON public.personal_reminders FOR INSERT
  WITH CHECK (user_id = auth.uid() AND source = 'manual');
-- UPDATE: own rows (status/snooze/lead_times for auto; full for manual — column-level enforced in app).
CREATE POLICY "Own personal reminders UPDATE" ON public.personal_reminders FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
-- DELETE: own rows.
CREATE POLICY "Own personal reminders DELETE" ON public.personal_reminders FOR DELETE
  USING (user_id = auth.uid());
```

- [ ] **Step 2: Apply via MCP** (`apply_migration` name `personal_reminders`). Ask before prod DDL if required.

- [ ] **Step 3: Verify the NULLS NOT DISTINCT index**

`INSERT` two `auto_passport` rows for the same fake user via MCP `execute_sql` inside a transaction; expect the second to violate `uq_personal_reminders_auto`. Roll back.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601100001_personal_reminders.sql
git commit -m "feat(reminders): personal_reminders table + RLS + auto-dedup index"
```

---

## Task 3: `documents.expires_at` (4A extension)

**Files:**

- Create: `supabase/migrations/20260601100002_documents_expires_at.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Phase 4E: documents carry an optional expiry so a personal reminder can reference them.
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS expires_at date;
```

- [ ] **Step 2: Apply via MCP** (`apply_migration` name `documents_expires_at`).
- [ ] **Step 3: Verify** — MCP `list_tables`, confirm `documents.expires_at`.
- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601100002_documents_expires_at.sql
git commit -m "feat(reminders): add documents.expires_at (4A extension for 4E)"
```

---

## Task 4: Regenerate TypeScript types

**Files:**

- Modify: `src/core/supabase/types.ts`

- [ ] **Step 1:** MCP `generate_typescript_types` → write to `src/core/supabase/types.ts`.
- [ ] **Step 2:** `npm run typecheck`. Expected: PASS (`personal_reminders`, `documents.expires_at` present).
- [ ] **Step 3: Commit**

```bash
git add src/core/supabase/types.ts
git commit -m "chore(reminders): regenerate types for 4E"
```

---

## Task 5: Passport auto-reminder trigger

**Files:**

- Create: `supabase/migrations/20260601100003_passport_reminder_trigger.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Phase 4E: when passport_expires_at is set/changed AND the user opted in, upsert a passport reminder.
-- Opt-in lives in profiles.preferences->'reminders'->>'passportAutoReminder' (default true).
CREATE OR REPLACE FUNCTION public.upsert_passport_reminder() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.passport_expires_at IS NULL THEN RETURN NEW; END IF;
  IF COALESCE((NEW.preferences->'reminders'->>'passportAutoReminder')::boolean, true) = false THEN
    RETURN NEW;
  END IF;

  UPDATE public.personal_reminders
     SET target_date = NEW.passport_expires_at, status = 'active', updated_at = now()
   WHERE user_id = NEW.id AND reminder_type = 'passport_expiry' AND source = 'auto_passport';

  IF NOT FOUND THEN
    INSERT INTO public.personal_reminders
      (user_id, reminder_type, target_date, i18n_key, lead_times, source)
    VALUES
      (NEW.id, 'passport_expiry', NEW.passport_expires_at,
       'lifeReminders.types.passport_expiry', '{180,90,30,7}', 'auto_passport');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.upsert_passport_reminder() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_passport_expiry_set
  AFTER INSERT OR UPDATE OF passport_expires_at ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.upsert_passport_reminder();
```

- [ ] **Step 2: Apply via MCP** (`apply_migration` name `passport_reminder_trigger`).

- [ ] **Step 3: Verify**

Via MCP `execute_sql` on a test profile: set `passport_expires_at`; expect one `personal_reminders` row (`source='auto_passport'`). Update it again; expect the SAME row updated (no duplicate). Clean up.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260601100003_passport_reminder_trigger.sql
git commit -m "feat(reminders): passport-expiry auto-reminder trigger"
```

---

## Task 6: Reminder-type vocabulary util (TDD)

**Files:**

- Create: `src/features/personal-reminders/utils/reminderTypes.ts`
- Test: `src/features/personal-reminders/__tests__/reminderTypes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import {
  DEFAULT_LEAD_TIMES,
  REMINDER_TYPES,
  documentCategoryToReminderType,
} from '../utils/reminderTypes';

describe('reminderTypes', () => {
  it('exposes the v1.0 reminder types', () => {
    expect(REMINDER_TYPES).toEqual([
      'passport_expiry',
      'visa_expiry',
      'esta_expiry',
      'driving_license_expiry',
      'travel_insurance_expiry',
      'custom',
    ]);
  });
  it('passport defaults to 180/90/30/7', () => {
    expect(DEFAULT_LEAD_TIMES.passport_expiry).toEqual([180, 90, 30, 7]);
  });
  it('maps document categories to reminder types', () => {
    expect(documentCategoryToReminderType('visa')).toBe('visa_expiry');
    expect(documentCategoryToReminderType('travel_insurance')).toBe('travel_insurance_expiry');
    expect(documentCategoryToReminderType('boarding_pass')).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- personal-reminders/reminderTypes`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `reminderTypes.ts`**

```ts
export const REMINDER_TYPES = [
  'passport_expiry',
  'visa_expiry',
  'esta_expiry',
  'driving_license_expiry',
  'travel_insurance_expiry',
  'custom',
] as const;
export type ReminderType = (typeof REMINDER_TYPES)[number];

export const DEFAULT_LEAD_TIMES: Record<ReminderType, number[]> = {
  passport_expiry: [180, 90, 30, 7],
  visa_expiry: [60, 30, 7],
  esta_expiry: [60, 30],
  driving_license_expiry: [60, 14],
  travel_insurance_expiry: [30, 7],
  custom: [30, 7],
};

const DOC_CATEGORY_MAP: Record<string, ReminderType> = {
  visa: 'visa_expiry',
  esta: 'esta_expiry',
  driving_license: 'driving_license_expiry',
  travel_insurance: 'travel_insurance_expiry',
};

export function documentCategoryToReminderType(category: string): ReminderType | null {
  return DOC_CATEGORY_MAP[category] ?? null;
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- personal-reminders/reminderTypes`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/personal-reminders/utils/reminderTypes.ts src/features/personal-reminders/__tests__/reminderTypes.test.ts
git commit -m "feat(reminders): personal reminder type vocabulary + tests"
```

---

## Task 7: Client API (manual CRUD + create-from-document)

**Files:**

- Create: `src/features/personal-reminders/api/personalReminders.ts`

- [ ] **Step 1: Write the API**

```ts
import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

import {
  DEFAULT_LEAD_TIMES,
  documentCategoryToReminderType,
  type ReminderType,
} from '../utils/reminderTypes';

export type PersonalReminder = Database['public']['Tables']['personal_reminders']['Row'];

export async function listPersonalReminders(): Promise<PersonalReminder[]> {
  const { data, error } = await supabase
    .from('personal_reminders')
    .select('*')
    .neq('status', 'dismissed')
    .order('target_date', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createManualReminder(input: {
  title: string;
  targetDate: string; // 'YYYY-MM-DD'
  leadTimes?: number[];
}): Promise<void> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('not authenticated');
  const { error } = await supabase.from('personal_reminders').insert({
    user_id: user.id,
    reminder_type: 'custom',
    title: input.title,
    target_date: input.targetDate,
    lead_times: input.leadTimes ?? DEFAULT_LEAD_TIMES.custom,
    source: 'manual',
  });
  if (error) throw error;
}

export async function createReminderFromDocument(input: {
  documentId: string;
  category: string;
  expiresAt: string;
}): Promise<void> {
  const type = documentCategoryToReminderType(input.category);
  if (!type) return; // not a reminder-eligible category
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error('not authenticated');
  const { error } = await supabase.from('personal_reminders').insert({
    user_id: user.id,
    reminder_type: type,
    related_document_id: input.documentId,
    target_date: input.expiresAt,
    i18n_key: `lifeReminders.types.${type}`,
    lead_times: DEFAULT_LEAD_TIMES[type],
    source: 'manual', // user-initiated from the doc sheet; RLS allows manual INSERT
  });
  if (error) throw error;
}

export async function updateReminder(
  id: string,
  patch: Partial<
    Pick<PersonalReminder, 'title' | 'target_date' | 'lead_times' | 'status' | 'snooze_until'>
  >,
): Promise<void> {
  const { error } = await supabase
    .from('personal_reminders')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteReminder(id: string): Promise<void> {
  const { error } = await supabase.from('personal_reminders').delete().eq('id', id);
  if (error) throw error;
}

export type { ReminderType };
```

> Note: `createReminderFromDocument` writes `source='manual'` so it passes the manual-INSERT RLS policy (the create is user-initiated from the doc sheet). `auto_document` is reserved for any future server-side path.

- [ ] **Step 2: Verify** `npm run typecheck`. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/personal-reminders/api/personalReminders.ts
git commit -m "feat(reminders): personal reminders client API"
```

---

## Task 8: Hook

**Files:**

- Create: `src/features/personal-reminders/hooks/usePersonalReminders.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createManualReminder,
  deleteReminder,
  listPersonalReminders,
  updateReminder,
  type PersonalReminder,
} from '../api/personalReminders';

const KEY = ['personal-reminders'] as const;

export function usePersonalReminders() {
  return useQuery({ queryKey: KEY, queryFn: listPersonalReminders });
}

export function usePersonalReminderActions() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY });
  return {
    create: useMutation({ mutationFn: createManualReminder, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: (v: { id: string; patch: Parameters<typeof updateReminder>[1] }) =>
        updateReminder(v.id, v.patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteReminder, onSuccess: invalidate }),
  };
}

export type { PersonalReminder };
```

- [ ] **Step 2: Verify** `npm run typecheck`. Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/personal-reminders/hooks/usePersonalReminders.ts
git commit -m "feat(reminders): usePersonalReminders hook"
```

---

## Task 9: `personal_reminders_cron` Edge Function + schedule

**Files:**

- Create: `supabase/functions/personal_reminders_cron/index.ts`
- Create: `supabase/migrations/20260601100004_personal_reminders_cron_schedule.sql`

- [ ] **Step 1: Write the function**

```ts
// personal_reminders_cron: server-only, daily. Fires lead-time notifications for active reminders.
// INSERTs into notifications (category 'life_reminders'); 4C chain delivers the push. Secret-gated.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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
  const { data: reminders } = await sb
    .from('personal_reminders')
    .select(
      'id, user_id, reminder_type, target_date, lead_times, fired_lead_times, status, snooze_until',
    )
    .eq('status', 'active');
  if (!reminders?.length) {
    return new Response(JSON.stringify({ inserted: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let inserted = 0;
  for (const r of reminders) {
    if (r.snooze_until && new Date(r.snooze_until).getTime() > Date.now()) continue;
    const daysUntil = daysBetween(today, r.target_date);
    const lead = nextDueLeadTime(daysUntil, r.lead_times ?? [60, 30, 7], r.fired_lead_times ?? []);
    if (lead == null) continue;

    await sb.from('notifications').insert({
      user_id: r.user_id,
      category: 'life_reminders',
      title: r.reminder_type,
      body: r.reminder_type, // resolved client-side from data
      data: { reminderId: r.id, type: r.reminder_type, kind: 'life_reminder' },
    });
    await sb
      .from('personal_reminders')
      .update({
        fired_lead_times: [...(r.fired_lead_times ?? []), lead],
        notifications_sent_at: [new Date().toISOString()],
        updated_at: new Date().toISOString(),
      })
      .eq('id', r.id);
    inserted++;
  }
  return new Response(JSON.stringify({ inserted }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2: Deploy via MCP** (`deploy_edge_function` name `personal_reminders_cron`, `verify_jwt: false`).

- [ ] **Step 3: Write the schedule migration**

```sql
-- Phase 4E: run personal_reminders_cron daily at 09:00 UTC.
SELECT cron.schedule(
  'personal_reminders_cron',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'personal_reminders_cron_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'send_push_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

- [ ] **Step 4: Provision Vault secret** `personal_reminders_cron_url` = the deployed function URL. Apply the migration via MCP (`personal_reminders_cron_schedule`).

- [ ] **Step 5: Verify**

`SELECT jobname FROM cron.job WHERE jobname = 'personal_reminders_cron';` → one row. Smoke-test the 403 gate with a wrong secret.

- [ ] **Step 6: Commit**

```bash
git add supabase/functions/personal_reminders_cron/index.ts supabase/migrations/20260601100004_personal_reminders_cron_schedule.sql
git commit -m "feat(reminders): personal_reminders_cron edge fn + daily schedule"
```

---

## Task 10: `LifeReminderRow` component (TDD)

**Files:**

- Create: `src/features/personal-reminders/components/LifeReminderRow.tsx`
- Test: `src/features/personal-reminders/__tests__/LifeReminderRow.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react-native';

import { LifeReminderRow } from '../components/LifeReminderRow';

describe('LifeReminderRow', () => {
  it('shows the custom title when type is custom', () => {
    render(<LifeReminderRow type="custom" title="Visa expires" targetDate="2026-08-01" />);
    expect(screen.getByText('Visa expires')).toBeTruthy();
  });
  it('shows the i18n label for an auto type', () => {
    render(<LifeReminderRow type="passport_expiry" title={null} targetDate="2026-12-01" />);
    expect(screen.getByText(/passport/i)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- personal-reminders/LifeReminderRow`
Expected: FAIL (module not found). (Auto-type label needs Task 12 i18n.)

- [ ] **Step 3: Implement the component**

```tsx
import { View } from 'react-native';

import { t } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

interface Props {
  type:
    | 'passport_expiry'
    | 'visa_expiry'
    | 'esta_expiry'
    | 'driving_license_expiry'
    | 'travel_insurance_expiry'
    | 'custom';
  title: string | null;
  targetDate: string;
}

export function LifeReminderRow({ type, title, targetDate }: Props) {
  const label = type === 'custom' && title ? title : t(`lifeReminders.types.${type}`);
  return (
    <View className="flex-row justify-between py-2">
      <PixelText className="text-text-primary">{label}</PixelText>
      <PixelText className="text-text-secondary">{targetDate}</PixelText>
    </View>
  );
}
```

> Confirm `PixelText` import path/props against `src/shared/components/` before writing.

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- personal-reminders/LifeReminderRow`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/personal-reminders/components/LifeReminderRow.tsx src/features/personal-reminders/__tests__/LifeReminderRow.test.tsx
git commit -m "feat(reminders): LifeReminderRow component + tests"
```

---

## Task 11: `ReminderFormSheet` + Settings → Reminders screen

**Files:**

- Create: `src/features/personal-reminders/components/ReminderFormSheet.tsx`
- Create: `src/app/(modals)/reminders.tsx`

- [ ] **Step 1: Implement the form sheet**

Use the existing bottom-sheet pattern (`PixelBottomSheet` from Phase 2). Fields: title (text), target date (date picker), lead-time chips. On submit, call `usePersonalReminderActions().create` (or `.update` when editing). Complete code:

```tsx
import { useState } from 'react';
import { View } from 'react-native';

import { t } from '@core/i18n';
import { PixelBottomSheet } from '@shared/components/PixelBottomSheet';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';

import { usePersonalReminderActions } from '../hooks/usePersonalReminders';

export function ReminderFormSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { create } = usePersonalReminderActions();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(''); // 'YYYY-MM-DD'

  const submit = () => {
    if (!title || !date) return;
    create.mutate({ title, targetDate: date }, { onSuccess: onClose });
  };

  return (
    <PixelBottomSheet visible={visible} onClose={onClose}>
      <View className="gap-3 p-4">
        <PixelInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('lifeReminders.form.titlePlaceholder')}
        />
        <PixelInput value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <PixelButton onPress={submit} disabled={create.isPending}>
          {t('lifeReminders.form.save')}
        </PixelButton>
      </View>
    </PixelBottomSheet>
  );
}
```

> Confirm `PixelBottomSheet`/`PixelButton`/`PixelInput` APIs against `src/shared/components/`. Swap the raw date field for the project's date picker if one exists.

- [ ] **Step 2: Implement the Reminders screen**

```tsx
import { useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { t } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

import { LifeReminderRow } from '@features/personal-reminders/components/LifeReminderRow';
import { ReminderFormSheet } from '@features/personal-reminders/components/ReminderFormSheet';
import {
  usePersonalReminderActions,
  usePersonalReminders,
} from '@features/personal-reminders/hooks/usePersonalReminders';

export default function RemindersScreen() {
  const { data } = usePersonalReminders();
  const { remove } = usePersonalReminderActions();
  const [adding, setAdding] = useState(false);

  return (
    <View className="flex-1 bg-cream p-4">
      <PixelText className="font-heading text-text-primary">
        {t('lifeReminders.screen.title')}
      </PixelText>
      <FlatList
        data={data ?? []}
        keyExtractor={(r) => r.id}
        ListEmptyComponent={
          <PixelText className="text-text-secondary">{t('lifeReminders.screen.empty')}</PixelText>
        }
        renderItem={({ item }) => (
          <Pressable onLongPress={() => remove.mutate(item.id)}>
            <LifeReminderRow
              type={item.reminder_type}
              title={item.title}
              targetDate={item.target_date}
            />
          </Pressable>
        )}
      />
      <PixelButton onPress={() => setAdding(true)}>{t('lifeReminders.screen.add')}</PixelButton>
      <ReminderFormSheet visible={adding} onClose={() => setAdding(false)} />
    </View>
  );
}
```

- [ ] **Step 3: Add an entry point** from the profile/settings tab to `/(modals)/reminders` (match how Settings links to other modals). Read the profile screen first to place it next to `NotificationSettings`.

- [ ] **Step 4: Verify** `npm run typecheck && npm test -- personal-reminders`. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/personal-reminders/components/ReminderFormSheet.tsx "src/app/(modals)/reminders.tsx"
git commit -m "feat(reminders): Settings -> Reminders CRUD screen + form sheet"
```

---

## Task 12: Life reminders Inbox tab + document affordance + i18n

**Files:**

- Modify: `src/features/notifications/screens/InboxScreen.tsx`
- Modify: 4A document upload/edit sheet (`src/features/documents/components/DocumentUploadSheet.tsx` — confirm exact name)
- Modify: `src/core/i18n/locales/{en,fr}.json`

- [ ] **Step 1: Add the "Life reminders" tab to InboxScreen**

Read `InboxScreen.tsx`. Add a 2-segment toggle ("Notifications" | "Life reminders"). The first keeps the existing notifications list; the second renders `usePersonalReminders()` rows via `LifeReminderRow`. Keep the existing list intact.

- [ ] **Step 2: Add the document expiry affordance**

In the document upload/edit sheet, when the selected `category` maps via `documentCategoryToReminderType(category) !== null`, show an expiry date field + a "Remind me before this expires" toggle. On save, if set, persist `documents.expires_at` and call `createReminderFromDocument({ documentId, category, expiresAt })`.

- [ ] **Step 3: Add i18n keys (en.json)**

```json
"lifeReminders": {
  "screen": { "title": "Reminders", "empty": "No reminders yet.", "add": "Add reminder" },
  "form": { "titlePlaceholder": "What should we remind you about?", "save": "Save" },
  "inboxTab": "Life reminders",
  "types": {
    "passport_expiry": "Passport expiry",
    "visa_expiry": "Visa expiry",
    "esta_expiry": "ESTA expiry",
    "driving_license_expiry": "Driving license expiry",
    "travel_insurance_expiry": "Travel insurance expiry",
    "custom": "Reminder"
  }
}
```

Add `"life_reminders": "Life reminders"` under `notifications.categories` in en.json.

- [ ] **Step 4: Mirror all keys in fr.json** (translated). Every en key MUST exist in fr.

- [ ] **Step 5: Verify** `npm run typecheck && npm test`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/notifications/screens/InboxScreen.tsx src/features/documents src/core/i18n/locales/en.json src/core/i18n/locales/fr.json
git commit -m "feat(reminders): Life reminders Inbox tab + doc expiry affordance + i18n"
```

---

## Task 13: Runtime-contract tests

**Files:**

- Create: `src/features/personal-reminders/__tests__/contracts.test.ts`

- [ ] **Step 1: Write the contract tests**

```ts
import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { REMINDER_TYPES } from '../utils/reminderTypes';

const FEATURE_DIR = path.join(__dirname, '..');

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

describe('personal-reminders runtime contracts', () => {
  it('every static t("lifeReminders.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const f of walk(FEATURE_DIR)) {
      for (const m of fs
        .readFileSync(f, 'utf8')
        .matchAll(/t\(\s*[`'"]lifeReminders\.([a-zA-Z0-9_.${}]+)[`'"]/g)) {
        if (!m[1].includes('${')) keys.add(`lifeReminders.${m[1]}`);
      }
    }
    expect(keys.size).toBeGreaterThan(0);
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('every reminder type has an i18n label in en and fr', () => {
    for (const ty of REMINDER_TYPES) {
      expect(typeof resolveKey(en, `lifeReminders.types.${ty}`)).toBe('string');
      expect(typeof resolveKey(fr, `lifeReminders.types.${ty}`)).toBe('string');
    }
  });

  it('life_reminders has a category label in en and fr', () => {
    expect(typeof resolveKey(en, 'notifications.categories.life_reminders')).toBe('string');
    expect(typeof resolveKey(fr, 'notifications.categories.life_reminders')).toBe('string');
  });
});
```

- [ ] **Step 2: Run** `npm test -- personal-reminders/contracts`. Expected: PASS (fix i18n gaps until green).

- [ ] **Step 3: Commit**

```bash
git add src/features/personal-reminders/__tests__/contracts.test.ts
git commit -m "test(reminders): personal-reminders runtime-contract tests"
```

---

## Task 14: Barrel + final validation

**Files:**

- Create: `src/features/personal-reminders/index.ts`

- [ ] **Step 1: Write the barrel**

```ts
export { usePersonalReminders } from './hooks/usePersonalReminders';
export { LifeReminderRow } from './components/LifeReminderRow';
export { ReminderFormSheet } from './components/ReminderFormSheet';
export type { PersonalReminder } from './api/personalReminders';
```

- [ ] **Step 2: Full validation**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all PASS.

- [ ] **Step 3: Security audit** — MCP `get_advisors` (security + performance). Expected: no new ERROR (pg_net/pg_cron WARN acceptable, as 4C).

- [ ] **Step 4: Update CLAUDE.md** "Active phase" — mark Phase 4D + 4E done (mirror the 4A/4B/4C summary style).

- [ ] **Step 5: Commit + push**

```bash
git add src/features/personal-reminders/index.ts CLAUDE.md
git commit -m "feat(reminders): personal-reminders barrel + 4E validation + docs"
git push origin main
```

---

## Self-Review (completed during planning)

- **Spec coverage:** `life_reminders` category (Task 1), `personal_reminders` + RLS + NULLS-NOT-DISTINCT dedup (2), `documents.expires_at` (3), passport trigger (5), type vocab + doc mapping (6), manual CRUD API/hook (7–8), daily cron reusing lead-time semantics (9), Inbox tab + doc affordance (12), Settings CRUD screen (11), i18n (12), contract tests (13). ✔
- **Placeholder scan:** the two cross-file UI wirings (Inbox tab, doc sheet) describe exact behavior + the function to call; no "TODO fill in". Date input uses a plain field with a note to swap for the project picker.
- **Type consistency:** `ReminderType`/`REMINDER_TYPES`/`DEFAULT_LEAD_TIMES`/`documentCategoryToReminderType` consistent across util, API, components; `nextDueLeadTime`/`daysBetween` match the 4D edge fn byte-for-byte; `PersonalReminder` sourced from generated `Database`.
- **RLS note:** `createReminderFromDocument` uses `source='manual'` to satisfy the manual-INSERT policy (user-initiated); documented in Task 7.
