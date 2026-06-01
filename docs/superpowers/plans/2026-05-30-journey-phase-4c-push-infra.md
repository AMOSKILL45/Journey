# Phase 4C — Push Notification Infrastructure — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the reusable push-delivery foundation — a generic `notifications` hub that backs an in-app Inbox and fires Expo push (category-filtered, quiet-hours-aware), so 4D/4E just insert rows.

**Architecture:** Event → `notifications` row (pg trigger) → DB webhook → `send_push` Edge Function (service-role) → Expo Push, pruning dead tokens. Per-category prefs + IANA/DST quiet hours in `profiles.preferences`. Client registers an Expo token (with tz) and deep-links on tap. See the spec's ADRs.

**Tech Stack:** Expo SDK 54 (`expo-notifications`, `expo-device`, `expo-constants`, `expo-localization`), Supabase (Postgres + RLS + pg_net + Vault + Edge Functions/Deno), TanStack Query, NativeWind, Jest.

**Spec:** `docs/superpowers/specs/2026-05-30-journey-phase-4c-push-infra-design.md`

---

## Conventions (every task)

- Path aliases only; zero hardcoded strings (`t('notifications.…')`). After each task: `npm run typecheck && npm run lint` + the task's tests; then **commit AND push** (user preference). Jest sandbox prints `ERROR: failed to copy trust settings…` — ignore (filter `grep -vE "trust settings|certificate-"`).
- Supabase MCP for Journey = server `472a285c-8015-423f-bab3-4c3f82a99890`. DDL migration + edge-function deploy need explicit user approval.
- Type name: the notifications Row is exported as **`AppNotification`** (avoid clashing with the global DOM `Notification`).

## File structure

```
supabase/migrations/20260530160001_push_infra.sql     # tables + RLS + event triggers + webhook trigger  (create)
supabase/functions/send_push/index.ts                 # Deno: Expo Push sender                            (create)
src/core/supabase/types.ts                            # regen                                            (modify)
package.json                                           # expo-notifications, expo-device                  (modify)

src/features/notifications/
  utils/categories.ts          # category list, defaults, shouldSendCategory
  utils/quietHours.ts          # isWithinQuietHours (pure)
  api/pushTokens.ts            # registerToken / removeToken
  api/notifications.ts         # list / markRead / markAllRead / unreadCount
  hooks/useNotifications.ts    # list + unread + mark-read mutations
  hooks/useNotificationPrefs.ts# read/write profiles.preferences.notifications
  registration.ts              # expo-notifications setup (permission, token, handlers, channel)
  components/NotificationRow.tsx
  components/NotificationSettings.tsx
  screens/InboxScreen.tsx
  index.ts
  __tests__/{categories,quietHours,notifications-api,contracts}.test.ts
  __tests__/NotificationRow.test.tsx

src/app/(tabs)/inbox.tsx                               # replace stub -> InboxScreen                       (modify)
src/app/_layout.tsx                                    # register push post-auth                           (modify)
```

---

## Task 1: Dependencies

- [ ] **Step 1:** `npx expo install expo-notifications expo-device` (expo-constants + expo-localization already present).
- [ ] **Step 2:** `npm run typecheck` → PASS.
- [ ] **Step 3:** Commit + push:

```bash
git add package.json package-lock.json
git commit -m "chore(notifications): add expo-notifications + expo-device" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

> ⚠️ Native modules → reach the device only via a new **EAS build** (not OTA). Build is batched/manual (user).

---

## Task 2: Migration — tables, RLS, triggers, webhook

**Files:** Create `supabase/migrations/20260530160001_push_infra.sql`; Modify `src/core/supabase/types.ts`.

- [ ] **Step 1: Write the migration**

```sql
-- Phase 4C: push infra. Tokens + generic notifications hub + event triggers + webhook to send_push.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      text NOT NULL,
  platform   text NOT NULL CHECK (platform IN ('ios','android')),
  timezone   text,
  device_id  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user ON public.user_push_tokens(user_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}',
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own tokens" ON public.user_push_tokens FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Own notifications SELECT" ON public.notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Own notifications UPDATE" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own notifications DELETE" ON public.notifications FOR DELETE
  USING (user_id = auth.uid());
-- No INSERT policy: only SECURITY DEFINER triggers / service-role insert (anti-spam).

-- Webhook: every inserted notification -> send_push (url+secret from Vault; no-op if unset).
CREATE OR REPLACE FUNCTION public.notify_send_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fn_url text; secret text;
BEGIN
  SELECT decrypted_secret INTO fn_url FROM vault.decrypted_secrets WHERE name = 'send_push_url';
  SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name = 'send_push_secret';
  IF fn_url IS NULL OR secret IS NULL THEN
    RETURN NEW; -- not configured: in-app notification still created, push skipped (no dead-end)
  END IF;
  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', secret),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_send_push() FROM anon, authenticated;

CREATE TRIGGER on_notification_created AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_send_push();

-- Event -> notification: trip member joined (one row per other member).
CREATE OR REPLACE FUNCTION public.notify_trip_join() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, category, title, body, data)
  SELECT m.user_id, 'join', 'New traveler', 'Someone joined your trip.',
         jsonb_build_object('tripId', NEW.trip_id)
  FROM public.trip_members m
  WHERE m.trip_id = NEW.trip_id AND m.user_id <> NEW.user_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_trip_join() FROM anon, authenticated;
CREATE TRIGGER on_trip_member_added AFTER INSERT ON public.trip_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_trip_join();

-- Event -> notification: check-in (one row per other member of the milestone's trip).
CREATE OR REPLACE FUNCTION public.notify_checkin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_trip uuid;
BEGIN
  SELECT trip_id INTO v_trip FROM public.milestones WHERE id = NEW.milestone_id;
  IF v_trip IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, category, title, body, data)
  SELECT m.user_id, 'friends_checkin', 'Check-in', 'A traveler checked in.',
         jsonb_build_object('tripId', v_trip, 'milestoneId', NEW.milestone_id)
  FROM public.trip_members m
  WHERE m.trip_id = v_trip AND m.user_id <> NEW.user_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_checkin() FROM anon, authenticated;
CREATE TRIGGER on_checkin_created AFTER INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.notify_checkin();
```

- [ ] **Step 2:** Apply via MCP `mcp__472a285c-…__apply_migration` (name `push_infra`). If denied, stop and ask the user to approve (prod DDL).
- [ ] **Step 3:** MCP `list_tables` (confirm both tables, RLS on) + `get_advisors` (type security) — no new warnings on the two tables.
- [ ] **Step 4:** MCP `generate_typescript_types` → overwrite `src/core/supabase/types.ts`. `npm run typecheck` → PASS.
- [ ] **Step 5:** Commit + push:

```bash
git add supabase/migrations/20260530160001_push_infra.sql src/core/supabase/types.ts
git commit -m "feat(notifications): push tokens + notifications hub + event/webhook triggers" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```

> **One-time Vault setup (NOT committed; run via MCP `execute_sql` when ready to enable pushes):**
> `select vault.create_secret('https://ewsoupkfkachxidmuwoi.functions.supabase.co/send_push','send_push_url');`
> `select vault.create_secret('<random-secret>','send_push_secret');`
> Set the same secret as the `SEND_PUSH_SECRET` env on the edge function. Until then, in-app notifications work; pushes are skipped (no dead-end).

---

## Task 3: `utils/categories.ts` + `utils/quietHours.ts` (TDD)

**Files:** Create the two utils; Test `__tests__/categories.test.ts`, `__tests__/quietHours.test.ts`.

- [ ] **Step 1: Write failing tests**

`src/features/notifications/__tests__/categories.test.ts`:

```ts
import { NOTIFICATION_CATEGORIES, defaultPrefs, shouldSendCategory } from '../utils/categories';

describe('categories', () => {
  it('exposes the spec categories incl. always-on join', () => {
    expect(NOTIFICATION_CATEGORIES).toEqual(
      expect.arrayContaining([
        'friends_checkin',
        'friends_photo',
        'smart_reminders',
        'join',
        'polls',
        'achievements',
      ]),
    );
  });
  it('defaults: enabled, all categories on, quiet hours on', () => {
    const p = defaultPrefs();
    expect(p.enabled).toBe(true);
    expect(p.quietHours).toBe(true);
    expect(p.categories.friends_checkin).toBe(true);
  });
  it('respects global off, category off, and always-on join', () => {
    expect(shouldSendCategory({ enabled: false, categories: {}, quietHours: true }, 'join')).toBe(
      false,
    );
    expect(
      shouldSendCategory(
        { enabled: true, categories: { polls: false }, quietHours: true },
        'polls',
      ),
    ).toBe(false);
    expect(
      shouldSendCategory({ enabled: true, categories: { join: false }, quietHours: true }, 'join'),
    ).toBe(true);
    expect(
      shouldSendCategory({ enabled: true, categories: {}, quietHours: true }, 'achievements'),
    ).toBe(true);
  });
});
```

`src/features/notifications/__tests__/quietHours.test.ts`:

```ts
import { isWithinQuietHours } from '../utils/quietHours';

describe('isWithinQuietHours (22h–8h)', () => {
  it('is quiet late night and early morning', () => {
    expect(isWithinQuietHours(23)).toBe(true);
    expect(isWithinQuietHours(2)).toBe(true);
    expect(isWithinQuietHours(7)).toBe(true);
  });
  it('is not quiet during the day', () => {
    expect(isWithinQuietHours(8)).toBe(false);
    expect(isWithinQuietHours(14)).toBe(false);
    expect(isWithinQuietHours(21)).toBe(false);
  });
  it('treats 22 as the start of quiet', () => {
    expect(isWithinQuietHours(22)).toBe(true);
  });
});
```

- [ ] **Step 2:** Run both → FAIL.

- [ ] **Step 3: Implement**

`src/features/notifications/utils/categories.ts`:

```ts
export const NOTIFICATION_CATEGORIES = [
  'friends_checkin',
  'friends_photo',
  'smart_reminders',
  'join',
  'polls',
  'achievements',
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const ALWAYS_ON: NotificationCategory[] = ['join'];

export interface NotificationPrefs {
  enabled: boolean;
  categories: Partial<Record<string, boolean>>;
  quietHours: boolean;
}

export function defaultPrefs(): NotificationPrefs {
  const categories: Record<string, boolean> = {};
  for (const c of NOTIFICATION_CATEGORIES) categories[c] = true;
  return { enabled: true, categories, quietHours: true };
}

export function shouldSendCategory(prefs: NotificationPrefs, category: string): boolean {
  if (ALWAYS_ON.includes(category as NotificationCategory)) return true;
  if (!prefs.enabled) return false;
  return prefs.categories[category] !== false; // default on when unspecified
}
```

`src/features/notifications/utils/quietHours.ts`:

```ts
export const QUIET_START = 22;
export const QUIET_END = 8;

/** True if the given local hour (0–23) falls in the 22:00–08:00 quiet window. */
export function isWithinQuietHours(
  localHour: number,
  start = QUIET_START,
  end = QUIET_END,
): boolean {
  return localHour >= start || localHour < end;
}
```

- [ ] **Step 4:** Run both → PASS.
- [ ] **Step 5:** Commit + push (`feat(notifications): category + quiet-hours pure utils (TDD)`).

---

## Task 4: `send_push` Edge Function (Deno)

**Files:** Create `supabase/functions/send_push/index.ts`. Mirrors the `accept-invitation` Deno pattern (Deno.serve + service-role client). Not in the Jest suite; its decision logic mirrors Task 3's tested utils.

- [ ] **Step 1: Implement**

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('SEND_PUSH_SECRET') ?? '';
const ALWAYS_ON = ['join'];

function isWithinQuietHours(localHour: number): boolean {
  return localHour >= 22 || localHour < 8;
}
function shouldSendCategory(prefs: any, category: string): boolean {
  if (ALWAYS_ON.includes(category)) return true;
  if (!prefs?.enabled) return prefs?.enabled === undefined; // default-on if prefs absent
  return prefs.categories?.[category] !== false;
}
function localHourFor(tz: string | null): number {
  try {
    return Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: tz ?? 'UTC',
        hour: '2-digit',
        hour12: false,
      }).format(new Date()),
    );
  } catch {
    return Number(
      new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false }).format(new Date()),
    );
  }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET || !WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 });
  }
  const { record } = await req.json();
  if (!record?.user_id) return new Response('no record', { status: 400 });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const { data: profile } = await sb
    .from('profiles')
    .select('preferences')
    .eq('id', record.user_id)
    .maybeSingle();
  const prefs = (profile?.preferences as any)?.notifications ?? {
    enabled: true,
    categories: {},
    quietHours: true,
  };
  if (!shouldSendCategory(prefs, record.category)) return new Response('muted', { status: 200 });

  const { data: tokens } = await sb
    .from('user_push_tokens')
    .select('id, token, timezone')
    .eq('user_id', record.user_id);
  if (!tokens?.length) return new Response('no tokens', { status: 200 });

  const quiet = prefs.quietHours !== false && !ALWAYS_ON.includes(record.category);
  const messages = tokens
    .filter((t) => !(quiet && isWithinQuietHours(localHourFor(t.timezone))))
    .map((t) => ({ to: t.token, title: record.title, body: record.body, data: record.data ?? {} }));
  if (!messages.length) return new Response('quiet hours', { status: 200 });

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  const json = await res.json();

  // Prune dead tokens (DeviceNotRegistered).
  const data = Array.isArray(json?.data) ? json.data : [];
  const dead: string[] = [];
  data.forEach((ticket: any, i: number) => {
    if (ticket?.details?.error === 'DeviceNotRegistered') dead.push(tokens[i].id);
  });
  if (dead.length) await sb.from('user_push_tokens').delete().in('id', dead);

  return new Response(JSON.stringify({ sent: messages.length, pruned: dead.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

- [ ] **Step 2:** Deploy via MCP `mcp__472a285c-…__deploy_edge_function` (name `send_push`). If denied, stop and ask.
- [ ] **Step 3:** Set the function's `SEND_PUSH_SECRET` env (same value as the Vault `send_push_secret`) — note for the user (dashboard / EAS secret); the function is inert until set.
- [ ] **Step 4:** Commit + push the function source (`feat(notifications): send_push edge function (Expo Push + prefs/quiet-hours + prune)`).

---

## Task 5: `api/pushTokens.ts` + `api/notifications.ts` (TDD)

**Files:** Create both; Test `__tests__/notifications-api.test.ts`.

- [ ] **Step 1: Write failing test**

```ts
import { supabase } from '@core/supabase/client';

import { markRead } from '../api/notifications';

describe('notifications api', () => {
  afterEach(() => jest.restoreAllMocks());
  it('markRead patches read_at for the row', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    jest.spyOn(supabase, 'from').mockReturnValue({ update } as never);
    await markRead('n1');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ read_at: expect.any(String) }));
    expect(eq).toHaveBeenCalledWith('id', 'n1');
  });
});
```

- [ ] **Step 2:** Run → FAIL.

- [ ] **Step 3: Implement**

`src/features/notifications/api/notifications.ts`:

```ts
import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

export type AppNotification = Database['public']['Tables']['notifications']['Row'];

export async function listNotifications(): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}
```

`src/features/notifications/api/pushTokens.ts`:

```ts
import { supabase } from '@core/supabase/client';

export interface RegisterTokenInput {
  token: string;
  platform: 'ios' | 'android';
  timezone: string | null;
  deviceId: string;
}

export async function registerToken(input: RegisterTokenInput): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const { error } = await supabase.from('user_push_tokens').upsert(
    {
      user_id: userData.user.id,
      token: input.token,
      platform: input.platform,
      timezone: input.timezone,
      device_id: input.deviceId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,device_id' },
  );
  if (error) throw error;
}

export async function removeToken(deviceId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;
  const { error } = await supabase
    .from('user_push_tokens')
    .delete()
    .eq('user_id', userData.user.id)
    .eq('device_id', deviceId);
  if (error) throw error;
}
```

- [ ] **Step 4:** Run → PASS. **Step 5:** Commit + push.

---

## Task 6: Hooks

**Files:** Create `hooks/useNotifications.ts`, `hooks/useNotificationPrefs.ts`.

- [ ] **Step 1: `useNotifications.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { listNotifications, markAllRead, markRead } from '../api/notifications';

export const notificationsKey = ['notifications'] as const;

export function useNotifications() {
  return useQuery({ queryKey: notificationsKey, queryFn: listNotifications });
}

export function useUnreadCount() {
  const { data = [] } = useNotifications();
  return data.filter((n) => n.read_at === null).length;
}

export function useNotificationMutations() {
  const qc = useQueryClient();
  const inv = () => void qc.invalidateQueries({ queryKey: notificationsKey });
  return {
    markRead: useMutation({ mutationFn: (id: string) => markRead(id), onSuccess: inv }),
    markAllRead: useMutation({ mutationFn: () => markAllRead(), onSuccess: inv }),
  };
}
```

- [ ] **Step 2: `useNotificationPrefs.ts`** (reads/writes `profiles.preferences.notifications`)

```ts
import { useMutation } from '@tanstack/react-query';

import { updateMyProfile, useProfile, type ProfileUpdate } from '@features/profile';

import { defaultPrefs, type NotificationPrefs } from '../utils/categories';

export function useNotificationPrefs() {
  const { data: profile, refetch } = useProfile();
  const prefs: NotificationPrefs =
    (profile?.preferences as { notifications?: NotificationPrefs } | null)?.notifications ??
    defaultPrefs();
  const save = useMutation({
    mutationFn: (next: NotificationPrefs) => {
      const merged = {
        ...((profile?.preferences as Record<string, unknown>) ?? {}),
        notifications: next,
      };
      return updateMyProfile({ preferences: merged as ProfileUpdate['preferences'] });
    },
    onSuccess: () => void refetch(),
  });
  return { prefs, save };
}
```

> **Confirmed (no fallback needed):** `@features/profile` exports `useProfile` (returns `{ data, refetch }`), `updateMyProfile`, and `ProfileUpdate`; `profiles.preferences` (jsonb) exists. Note `profiles` also already has `smart_reminders_enabled` + `reminder_categories_muted` columns — those are **reminder-specific (4D's domain)**; 4C keeps the general push-category prefs under `preferences.notifications`, which 4D reconciles with the dedicated columns.

- [ ] **Step 3:** typecheck + lint. **Step 4:** Commit + push.

---

## Task 7: `registration.ts` (expo-notifications) + wire into root layout

**Files:** Create `registration.ts`; Modify `src/app/_layout.tsx`.

- [ ] **Step 1: Implement `registration.ts`**

```ts
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { getCalendars } from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerToken } from './api/pushTokens';

export const DEVICE_ID_KEY = 'device-id';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

function deviceId(): string {
  // Stable-enough per install; Constants.sessionId is per-launch, so derive from installationId-like source.
  return `${Device.osName ?? 'dev'}-${Constants.deviceName ?? 'device'}`;
}

export async function registerForPush(): Promise<void> {
  if (!Device.isDevice) return; // push works on physical devices only
  const settings = await Notifications.getPermissionsAsync();
  let granted = settings.granted;
  if (!granted) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
  const tokenResp = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined,
  );
  await registerToken({
    token: tokenResp.data,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    timezone: getCalendars()[0]?.timeZone ?? null,
    deviceId: deviceId(),
  });
}

/** Subscribe to taps -> deep-link. Returns an unsubscribe fn. */
export function addNotificationTapHandler(onTrip: (tripId: string) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
    const data = resp.notification.request.content.data as { tripId?: string };
    if (data?.tripId) onTrip(data.tripId);
  });
  return () => sub.remove();
}
```

- [ ] **Step 2: Wire into `src/app/_layout.tsx`** — after auth/session resolves, call `void registerForPush()` once, and register the tap handler that does `router.push(\`/(modals)/trip/${tripId}\`)`. (Read the current `\_layout.tsx`session handling and add a`useEffect`guarded on an authenticated session. Use the existing`expo-router` `router`.)

- [ ] **Step 3:** typecheck + lint (native module → no jest). **Step 4:** Commit + push.

---

## Task 8: `NotificationRow` (TDD) + Inbox tab

**Files:** Create `components/NotificationRow.tsx`, `screens/InboxScreen.tsx`; Test `__tests__/NotificationRow.test.tsx`; Modify `src/app/(tabs)/inbox.tsx`.

- [ ] **Step 1: Failing test**

```tsx
import { render } from '@testing-library/react-native';

import type { AppNotification } from '../api/notifications';
import { NotificationRow } from '../components/NotificationRow';

const base = {
  id: 'n1',
  user_id: 'u1',
  category: 'join',
  title: 'New traveler',
  body: 'Someone joined your trip.',
  data: {},
  read_at: null,
  created_at: '2026-05-30T00:00:00Z',
} as unknown as AppNotification;

describe('NotificationRow', () => {
  it('renders title and body', () => {
    const { getByText } = render(<NotificationRow notification={base} onPress={jest.fn()} />);
    expect(getByText('New traveler')).toBeTruthy();
    expect(getByText('Someone joined your trip.')).toBeTruthy();
  });
  it('marks unread with a dot', () => {
    const { getByTestId } = render(<NotificationRow notification={base} onPress={jest.fn()} />);
    expect(getByTestId('notification-unread-dot')).toBeTruthy();
  });
});
```

- [ ] **Step 2:** Run → FAIL.

- [ ] **Step 3: Implement `NotificationRow.tsx`**

```tsx
import { Pressable, View } from 'react-native';

import { PixelText } from '@shared/components/PixelText';

import type { AppNotification } from '../api/notifications';

export interface NotificationRowProps {
  notification: AppNotification;
  onPress: () => void;
}

export function NotificationRow({ notification, onPress }: NotificationRowProps) {
  const unread = notification.read_at === null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={notification.title}
      className="mb-2 flex-row items-center gap-3 rounded border-2 border-border bg-surface p-3"
    >
      {unread ? (
        <View
          testID="notification-unread-dot"
          className="h-2.5 w-2.5 rounded-full bg-primary-500"
        />
      ) : (
        <View className="h-2.5 w-2.5" />
      )}
      <View className="flex-1">
        <PixelText size="body" family="body-medium" numberOfLines={1}>
          {notification.title}
        </PixelText>
        <PixelText size="caption" className="text-text-secondary" numberOfLines={2}>
          {notification.body}
        </PixelText>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 4:** Run → PASS.

- [ ] **Step 5: `InboxScreen.tsx`** (reads notifications, tap → mark read + deep-link)

```tsx
import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import type { AppNotification } from '../api/notifications';
import { NotificationRow } from '../components/NotificationRow';
import { useNotificationMutations, useNotifications } from '../hooks/useNotifications';

export function InboxScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: notifications = [], isLoading, refetch } = useNotifications();
  const { markRead } = useNotificationMutations();

  const onPress = (n: AppNotification) => {
    if (n.read_at === null) markRead.mutate(n.id);
    const tripId = (n.data as { tripId?: string } | null)?.tripId;
    if (tripId) router.push(`/(modals)/trip/${tripId}`);
  };

  return (
    <View className="flex-1 bg-cream" style={{ paddingTop: insets.top + SCREEN_PADDING }}>
      <PixelText size="h1" className="mb-4 px-6">
        {t('tabs.inbox')}
      </PixelText>
      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        onRefresh={() => void refetch()}
        refreshing={isLoading}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <NotificationRow notification={item} onPress={() => onPress(item)} />
        )}
        ListEmptyComponent={
          <PixelText size="body" className="mt-8 text-center text-text-secondary">
            {t('notifications.empty')}
          </PixelText>
        }
      />
    </View>
  );
}
```

- [ ] **Step 6: Replace `src/app/(tabs)/inbox.tsx`**

```tsx
import { InboxScreen } from '@features/notifications';

export default InboxScreen;
```

- [ ] **Step 7:** typecheck + lint + the NotificationRow test → PASS. **Step 8:** Commit + push.

---

## Task 9: `NotificationSettings` component

**Files:** Create `components/NotificationSettings.tsx`. (Surface it wherever the app's settings live; if no settings screen exists yet, export it from the barrel for later mounting and render it on the profile tab.)

- [ ] **Step 1: Implement**

```tsx
import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import { useNotificationPrefs } from '../hooks/useNotificationPrefs';
import { ALWAYS_ON, NOTIFICATION_CATEGORIES, type NotificationCategory } from '../utils/categories';

function Toggle({
  label,
  value,
  disabled,
  onToggle,
}: {
  label: string;
  value: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
      className="flex-row items-center justify-between py-2"
    >
      <PixelText size="body" className={disabled ? 'text-text-secondary' : ''}>
        {label}
      </PixelText>
      <View
        className={`h-6 w-11 rounded-full border-2 border-border ${value ? 'bg-secondary-500' : 'bg-surface-alt'}`}
      />
    </Pressable>
  );
}

export function NotificationSettings() {
  const { t } = useTranslation();
  const { prefs, save } = useNotificationPrefs();

  const setEnabled = () => save.mutate({ ...prefs, enabled: !prefs.enabled });
  const setQuiet = () => save.mutate({ ...prefs, quietHours: !prefs.quietHours });
  const setCategory = (c: NotificationCategory) =>
    save.mutate({
      ...prefs,
      categories: { ...prefs.categories, [c]: prefs.categories[c] === false },
    });

  return (
    <View className="gap-1">
      <PixelText size="h2" className="mb-2">
        {t('notifications.settings.title')}
      </PixelText>
      <Toggle
        label={t('notifications.settings.enabled')}
        value={prefs.enabled}
        onToggle={setEnabled}
      />
      <Toggle
        label={t('notifications.settings.quietHours')}
        value={prefs.quietHours}
        onToggle={setQuiet}
      />
      {NOTIFICATION_CATEGORIES.map((c) => (
        <Toggle
          key={c}
          label={t(`notifications.categories.${c}`)}
          value={prefs.categories[c] !== false}
          disabled={ALWAYS_ON.includes(c)}
          onToggle={() => setCategory(c)}
        />
      ))}
    </View>
  );
}
```

- [ ] **Step 2:** typecheck + lint. **Step 3:** Commit + push.

---

## Task 10: i18n + barrel

**Files:** Modify `src/core/i18n/locales/en.json`, `fr.json`; Create `src/features/notifications/index.ts`.

- [ ] **Step 1: Add `notifications` block to `en.json`** (after `checklists`):

```json
"notifications": {
  "empty": "No notifications yet",
  "categories": {
    "friends_checkin": "Check-ins", "friends_photo": "Photos", "smart_reminders": "Smart tips",
    "join": "Crew joins", "polls": "Polls", "achievements": "Achievements"
  },
  "settings": {
    "title": "Notifications", "enabled": "Enable notifications", "quietHours": "Quiet hours (10pm–8am)"
  }
}
```

- [ ] **Step 2: Add to `fr.json`**:

```json
"notifications": {
  "empty": "Aucune notification",
  "categories": {
    "friends_checkin": "Check-ins", "friends_photo": "Photos", "smart_reminders": "Conseils malins",
    "join": "Arrivées dans l'équipe", "polls": "Sondages", "achievements": "Succès"
  },
  "settings": {
    "title": "Notifications", "enabled": "Activer les notifications", "quietHours": "Heures calmes (22h–8h)"
  }
}
```

- [ ] **Step 2b:** `node -e "require('./src/core/i18n/locales/en.json');require('./src/core/i18n/locales/fr.json');console.log('ok')"`.

- [ ] **Step 3: `index.ts` barrel**

```ts
export { listNotifications, markRead, markAllRead } from './api/notifications';
export type { AppNotification } from './api/notifications';
export { registerToken, removeToken } from './api/pushTokens';
export {
  useNotifications,
  useUnreadCount,
  useNotificationMutations,
  notificationsKey,
} from './hooks/useNotifications';
export { useNotificationPrefs } from './hooks/useNotificationPrefs';
export { registerForPush, addNotificationTapHandler } from './registration';
export { InboxScreen } from './screens/InboxScreen';
export { NotificationRow } from './components/NotificationRow';
export { NotificationSettings } from './components/NotificationSettings';
export {
  NOTIFICATION_CATEGORIES,
  ALWAYS_ON,
  defaultPrefs,
  shouldSendCategory,
} from './utils/categories';
export type { NotificationCategory, NotificationPrefs } from './utils/categories';
export { isWithinQuietHours } from './utils/quietHours';
```

- [ ] **Step 4:** typecheck + lint. **Step 5:** Commit + push.

---

## Task 11: Contract tests + final validation

**Files:** Create `__tests__/contracts.test.ts`.

- [ ] **Step 1: Write contract test**

```ts
import * as fs from 'fs';
import * as path from 'path';

import en from '@core/i18n/locales/en.json';
import fr from '@core/i18n/locales/fr.json';

import { NOTIFICATION_CATEGORIES } from '../utils/categories';

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

describe('notifications runtime contracts', () => {
  it('every static t("notifications.*") key resolves in en and fr', () => {
    const keys = new Set<string>();
    for (const f of walk(FEATURE_DIR)) {
      for (const m of fs
        .readFileSync(f, 'utf8')
        .matchAll(/t\(\s*['"`]notifications\.([a-zA-Z0-9_.]+)['"`]/g)) {
        keys.add(`notifications.${m[1]}`);
      }
    }
    expect([...keys].filter((k) => typeof resolveKey(en, k) !== 'string')).toEqual([]);
    expect([...keys].filter((k) => typeof resolveKey(fr, k) !== 'string')).toEqual([]);
  });

  it('every category has an i18n label in en and fr', () => {
    for (const c of NOTIFICATION_CATEGORIES) {
      expect(typeof resolveKey(en, `notifications.categories.${c}`)).toBe('string');
      expect(typeof resolveKey(fr, `notifications.categories.${c}`)).toBe('string');
    }
  });
});
```

- [ ] **Step 2:** Run → PASS.
- [ ] **Step 3: Final validation** — `npm run typecheck && npm run lint && npm test` → typecheck PASS, lint 0 errors, all suites PASS.
- [ ] **Step 4:** Commit + push (`test(notifications): runtime-contract tests + final validation`).

---

## Manual verification (after an EAS build + Vault/secret set)

1. Set Vault secrets + the function `SEND_PUSH_SECRET` (one-time, §Task 2/4 notes).
2. Grant permission → `user_push_tokens` row with the device IANA tz.
3. Second member joins a trip / checks in → push received **and** an Inbox row; tap → trip; unread dot clears.
4. Toggle a category off → no push for it (Inbox row still created); `join` cannot be turned off.
5. Device clock inside 22h–8h → push suppressed, Inbox row present. Reinstall → stale token pruned.

## Self-review (authoring time)

- **Spec coverage:** tokens+notifications+RLS+triggers+webhook → T2; send_push (prefs+quiet-hours+prune) → T4 (logic mirrored from T3 tested utils); client register/tap → T7; Inbox → T8; settings/prefs → T6+T9; categories+quiet-hours → T3; i18n → T10; contracts → T11. ADR-1..8 all realized.
- **Placeholder scan:** no TBD/TODO. `<random-secret>` / Vault URL are intentional out-of-band secrets, documented; the two "Verify" notes (profile `preferences` column + `profileQueryKey`/`useProfile` exports) are concrete checks with a fallback (add the column in T2), not vague placeholders.
- **Type consistency:** `AppNotification`, `NotificationPrefs`, `NotificationCategory`, `registerToken`/`removeToken`, `notificationsKey`, `shouldSendCategory`/`isWithinQuietHours` defined once and reused; the Deno `send_push` deliberately re-implements the two pure fns (cross-runtime) — same semantics as T3.
