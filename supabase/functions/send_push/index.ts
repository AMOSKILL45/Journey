// send_push: server-only Expo Push sender. Invoked by the `notifications` AFTER INSERT webhook.
// Auth: verifies the `x-webhook-secret` header against the Vault secret via the
// `verify_webhook_secret` RPC (never reads the secret into the function). Never client-callable.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ALWAYS_ON = ['join'];
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface Prefs {
  enabled: boolean;
  categories: Record<string, boolean>;
  quietHours: boolean;
}

function shouldSendCategory(prefs: Prefs, category: string): boolean {
  if (ALWAYS_ON.includes(category)) return true;
  if (!prefs.enabled) return false;
  return prefs.categories?.[category] !== false;
}

function isWithinQuietHours(localHour: number): boolean {
  return localHour >= 22 || localHour < 8;
}

function localHourFor(tz: string | null): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz ?? 'UTC',
    hour: 'numeric',
    hour12: false,
    hourCycle: 'h23',
  });
  return Number(fmt.format(new Date()));
}

Deno.serve(async (req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);

  const candidate = req.headers.get('x-webhook-secret') ?? '';
  const { data: ok } = await sb.rpc('verify_webhook_secret', { candidate });
  if (ok !== true) return new Response('forbidden', { status: 403 });

  const { record } = await req.json();
  if (!record?.user_id) return new Response('no record', { status: 400 });

  const { data: profile } = await sb
    .from('profiles')
    .select('preferences')
    .eq('id', record.user_id)
    .maybeSingle();
  const prefs: Prefs = (profile?.preferences as { notifications?: Prefs } | null)
    ?.notifications ?? {
    enabled: true,
    categories: {},
    quietHours: true,
  };
  if (!shouldSendCategory(prefs, record.category)) {
    return new Response(JSON.stringify({ skipped: 'muted' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: tokens } = await sb
    .from('user_push_tokens')
    .select('id, token, timezone')
    .eq('user_id', record.user_id);
  if (!tokens?.length) {
    return new Response(JSON.stringify({ skipped: 'no tokens' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const quiet = prefs.quietHours !== false && !ALWAYS_ON.includes(record.category);
  const live = tokens.filter((t) => !(quiet && isWithinQuietHours(localHourFor(t.timezone))));
  if (!live.length) {
    return new Response(JSON.stringify({ skipped: 'quiet hours' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const messages = live.map((t) => ({
    to: t.token,
    title: record.title,
    body: record.body,
    data: record.data ?? {},
  }));
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(messages),
  });
  const json = await res.json().catch(() => ({}));

  const tickets = Array.isArray(json?.data) ? json.data : [];
  const dead: string[] = [];
  tickets.forEach((ticket: { details?: { error?: string } }, i: number) => {
    if (ticket?.details?.error === 'DeviceNotRegistered') dead.push(live[i].id);
  });
  if (dead.length) await sb.from('user_push_tokens').delete().in('id', dead);

  return new Response(JSON.stringify({ sent: messages.length, pruned: dead.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
