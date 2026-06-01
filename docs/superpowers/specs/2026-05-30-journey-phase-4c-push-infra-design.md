# Phase 4C — Push Notification Infrastructure — Design

> Sub-project 4C of Phase 4. The reusable push-delivery foundation that 4D (smart reminders)
> and 4E (personal reminders) build on. Built **Max** scope: a generic notifications hub.
>
> Date: 2026-05-30 · Status: approved design (Max), pre-plan · Lens: architecture / ADRs

## 1. Context

Phase 4 decomposition: **4A Documents** ✅ · **4B Checklists** ✅ · **4C Push infra** (this) ·
4D Smart reminders (needs 4C) · 4E Personal reminders (needs 4C).

The master spec prescribes: `user_push_tokens` table, an Edge Function **`send_push`** (Expo Push
Service), **DB webhooks** triggering `send_push`, push **categories** with per-category user
preferences, and **quiet hours 22h–8h**. The Inbox tab (currently a stub) centralizes notifications.

**Max scope** (explicitly chosen): a generic **`notifications` table** is the hub — every notifiable
event inserts a row, which (a) backs the in-app Inbox and (b) triggers a push. This decouples
_"something happened"_ from _"how it's delivered."_ `expo-notifications` is a **native dependency** →
reaches devices only via an **EAS build** (not OTA); the user batches native changes and builds
manually.

## 2. Architecture Decision Records

| ADR                               | Decision                                                                                                | Rationale                                                                              | Consequence                                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| **1 Provider**                    | Expo Push Service                                                                                       | Free, unlimited, native to Expo (spec)                                                 | HTTP POST to `exp.host/--/api/v2/push/send`; handle receipts                                              |
| **2 Tokens**                      | `user_push_tokens` (user_id, token, platform, **timezone** IANA, device_id)                             | Multi-device; tz for quiet hours                                                       | RLS: user manages own; upsert on `(user_id, device_id)`                                                   |
| **3 Hub**                         | Generic `notifications` table                                                                           | Decouples event→delivery; powers Inbox + push + history                                | Slight deviation from "Inbox = reminder views"; forward-compatible (4D writes `category=smart_reminders`) |
| **4 Prefs**                       | Per-category + quiet-hours in `profiles.preferences` jsonb                                              | Spec already designates this jsonb; readable by `send_push`                            | No new prefs table; `send_push` reads the profile                                                         |
| **5 Primitive**                   | Edge Function `send_push` (service-role, **never client-callable**)                                     | Single authoritative sender: pref filter + quiet hours + token prune                   | Clients never send pushes → no spam vector                                                                |
| **6 Delivery (most complete)**    | **DB webhook**: trigger `supabase_functions.http_request` on `notifications` AFTER INSERT → `send_push` | Single source of truth: every inserted notification is delivered, no per-caller wiring | Needs function URL + webhook secret (Vault, **not committed**); `send_push` verifies secret               |
| **7 Event→notif**                 | pg triggers on existing events: `trip_members` insert, `checkins` insert → insert `notifications`       | Proves the pipeline end-to-end + delivers real value now                               | Future events (achievements Ph6, photos Ph7, reminders 4D) add triggers the same way                      |
| **8 Quiet hours (most complete)** | Store **IANA timezone**; `send_push` computes local hour via `Intl.DateTimeFormat({timeZone})`          | Correct across DST and all zones — no fixed-offset shortcut                            | tz captured from `expo-localization` at token registration                                                |

## 3. Data model (migration `..._push_infra.sql`)

```sql
CREATE TABLE public.user_push_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      text NOT NULL,
  platform   text NOT NULL CHECK (platform IN ('ios','android')),
  timezone   text,                              -- IANA, e.g. 'Europe/Paris' (quiet hours)
  device_id  text NOT NULL,                     -- dedup per device
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
CREATE INDEX idx_user_push_tokens_user ON public.user_push_tokens(user_id);

CREATE TABLE public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- recipient
  category   text NOT NULL,                     -- 'friends_checkin' | 'join' | 'smart_reminders' | ...
  title      text NOT NULL,
  body       text NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}',       -- deep-link target, e.g. { "tripId": "..." }
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
```

Notification **preferences** live in `profiles.preferences` jsonb under a `notifications` key:
`{ "notifications": { "enabled": true, "categories": { "friends_checkin": true, … }, "quietHours": true } }`.
A default is assumed when a key is absent (categories default ON, `join` always on, quietHours ON).

Categories (spec §8.6): `friends_checkin`, `friends_photo`, `smart_reminders`, `join` (always on),
`polls`, `achievements`. Title/body strings are **localized at insert time** (the triggering
context resolves the i18n string into `title`/`body`), so `notifications` stores ready-to-show text.

## 4. RLS

| Table              | SELECT                 | INSERT                           | UPDATE                                  | DELETE                 |
| ------------------ | ---------------------- | -------------------------------- | --------------------------------------- | ---------------------- |
| `user_push_tokens` | `user_id = auth.uid()` | `user_id = auth.uid()`           | `user_id = auth.uid()`                  | `user_id = auth.uid()` |
| `notifications`    | `user_id = auth.uid()` | — (service-role / triggers only) | `user_id = auth.uid()` (mark read only) | `user_id = auth.uid()` |

No INSERT policy on `notifications` → regular users cannot create notifications (no spam). Rows are
inserted by SECURITY DEFINER event triggers (ADR-7) and by service-role (4D/4E cron). UPDATE is
restricted to the recipient and used only to set `read_at` (the api only ever patches `read_at`).

## 5. `send_push` Edge Function (`supabase/functions/send_push`)

Service-role, invoked only by the webhook (ADR-6) / cron — never by clients. Verifies a
`x-webhook-secret` header against `Deno.env.get('SEND_PUSH_SECRET')` (rejects otherwise).

Flow for an inserted `notifications` row (the webhook posts the row):

1. Load the recipient's `profiles.preferences.notifications`. If `enabled === false`, or the
   category is off (and not `join`), stop (still kept in-app for the Inbox).
2. **Quiet hours** (if on and category not `join`): load the recipient's tokens; compute each
   token's **local hour** via `new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false })`.
   If local hour ∈ [22, 8), skip the push (the Inbox row remains; no device push).
3. POST to Expo Push API (`https://exp.host/--/api/v2/push/send`) with `{ to, title, body, data }`
   for the recipient's tokens (chunked ≤100).
4. Parse tickets; on `DeviceNotRegistered` / `InvalidCredentials`, **delete** the offending
   `user_push_tokens` row (prune).

The pure decision bits — `isWithinQuietHours(localHour)` and `shouldSendCategory(prefs, category)`
— live in `src/features/notifications/utils/quietHours.ts` (Jest-tested) and are **mirrored**
inside the Deno function (cross-runtime; kept in sync, small + covered by a comment + the unit test
documents the contract).

## 6. Delivery webhook (ADR-6)

Migration creates a trigger on `notifications` AFTER INSERT calling
`supabase_functions.http_request(<send_push_url>, 'POST', headers, row)`. The function URL and the
`x-webhook-secret` are read from Postgres settings backed by **Supabase Vault** (set once,
out-of-band, **never committed**):

```sql
-- one-time, run manually (NOT in the committed migration):
--   select vault.create_secret('https://<ref>.functions.supabase.co/send_push', 'send_push_url');
--   select vault.create_secret('<random>', 'send_push_secret');
create trigger on_notification_created
  after insert on public.notifications
  for each row execute function public.notify_send_push();  -- reads vault, calls http_request
```

`notify_send_push()` (SECURITY DEFINER) reads the two vault secrets and issues the HTTP request.
Secrets stay in Vault, out of git. If Vault setup is unavailable in an environment, the function
no-ops gracefully (in-app notification still created; push simply not sent) — **no dead-end**.

## 7. Event → notification triggers (ADR-7)

SECURITY DEFINER pg functions + triggers. Each `notifications` row is **single-recipient**, so a
trigger inserts **one row per recipient member** (`INSERT … SELECT m.user_id … FROM trip_members m
WHERE m.trip_id = NEW.trip_id AND m.user_id <> <actor>`), and each row independently fires the
webhook → `send_push`:

- `trip_members` AFTER INSERT → one row per existing other member: `category='join'`,
  data `{ tripId }`. ("Someone joined the trip.")
- `checkins` AFTER INSERT → one row per other trip member: `category='friends_checkin'`,
  data `{ tripId, milestoneId }`.

Title/body localized server-side with a neutral/English string in v1 (Postgres has no i18n).

> Title/body localization: triggers store a neutral/English string in v1 (Postgres has no i18n).
> A later refinement can store an `i18n_key` + `data` and localize client-side in the Inbox; for
> the **push** text, English v1 is the accepted tradeoff (documented, not a dead-end).

## 8. Client (`src/features/notifications`)

- `registration.ts` — `expo-notifications`: request permission, get Expo push token, capture IANA
  tz (`expo-localization`), upsert `user_push_tokens`; set Android channel; foreground handler
  (`setNotificationHandler`); response handler (tap → `router.push` the `data` deep-link).
- `api/pushTokens.ts` — `registerToken`, `removeToken` (on sign-out).
- `api/notifications.ts` — `listNotifications`, `markRead`, `markAllRead`, `unreadCount`.
- `hooks/useNotifications.ts`, `hooks/useNotificationPrefs.ts` (read/write `profiles.preferences`).
- `utils/quietHours.ts`, `utils/categories.ts` (pure, Jest-tested).
- `components/NotificationRow.tsx`.
- `index.ts` barrel.

Registration is invoked once after auth (in the root layout or an auth effect), gated on permission.

## 9. Inbox tab + Settings

- **Inbox** (`src/app/(tabs)/inbox.tsx`, replace stub): list `notifications` newest-first, unread
  styling + a tab badge (unread count), tap → mark read + deep-link, pull-to-refresh, empty state.
- **Settings**: a notifications section — global toggle, per-category toggles (`join` shown as
  always-on/disabled), quiet-hours toggle. Writes `profiles.preferences.notifications`.

## 10. i18n, testing, security, edge cases

- **i18n** `notifications.*` (en+fr): Inbox UI, settings labels, category names. (Trigger-generated
  push copy is server-side English v1 per §7.)
- **Testing**: `quietHours`/`categories` pure utils (Jest, exhaustive incl. DST boundary via fixed
  inputs) · `pushTokens`/`notifications` api (mock supabase) · `NotificationRow` render · contract
  tests (i18n keys, categories ↔ prefs shape, Inbox route). The `send_push` Deno fn is validated
  via the mirrored pure-util tests + manual EAS smoke.
- **Security**: `send_push` service-role + secret-gated, never client-exposed; `notifications` has
  no user INSERT policy (no spoofing/spam); token rows scoped to `auth.uid()`; Vault secrets never
  committed. Run `get_advisors` after the migration.
- **Edge cases**: permission denied → no token, app still works (in-app Inbox only); token rotates →
  upsert by `device_id`; invalid token → pruned on send; user in quiet hours → in-app only, no push;
  multi-device → all tokens receive; sign-out → `removeToken`.

## 11. Manual verification (after an EAS build)

1. Grant permission → a `user_push_tokens` row appears with the device tz.
2. A second member joins a trip / checks in → owner gets a push **and** an Inbox row; tap → trip.
3. Toggle a category off in Settings → that category no longer pushes (Inbox row still created).
4. Set device clock into 22h–8h → push suppressed, Inbox row present.
5. Uninstall/reinstall → stale token pruned on next send.

## 12. Implementation outline (detailed plan via writing-plans)

1. Deps: `expo-notifications`, `expo-device` (+ `expo-localization` already present). EAS build note.
2. Migration: `user_push_tokens` + `notifications` + RLS + event triggers + notify_send_push trigger; regen types.
3. `utils/quietHours.ts` + `utils/categories.ts` (+ tests).
4. `send_push` Edge Function (deploy via MCP) + mirrored pure logic.
5. `api/pushTokens.ts` + `api/notifications.ts` (+ tests) → hooks.
6. `registration.ts` + wire into root layout (post-auth) + sign-out removal.
7. `NotificationRow` + Inbox tab (replace stub) + tab unread badge.
8. Settings notifications section.
9. i18n (en+fr) + contract tests + final validation.
