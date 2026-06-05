// time_capsules_cron: server-only, daily. Notifies recipients when a time capsule's open_after has
// passed (milestone-anchored capsules are handled by the trg_capsule_after_checkin trigger, not
// here). INSERTs into notifications (category 'time_capsule'); the 4C chain delivers the push.
// Secret-gated, mirrors personal_reminders_cron.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const candidate = req.headers.get('x-webhook-secret') ?? '';
  const { data: ok } = await sb.rpc('verify_webhook_secret', { candidate });
  if (ok !== true) return new Response('forbidden', { status: 403 });

  const nowIso = new Date().toISOString();
  const { data: capsules } = await sb
    .from('time_capsules')
    .select('id, trip_id, recipient_id, open_after, notified_at')
    .is('notified_at', null)
    .not('open_after', 'is', null)
    .lte('open_after', nowIso);
  if (!capsules?.length) {
    return new Response(JSON.stringify({ inserted: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let inserted = 0;
  for (const c of capsules) {
    let recipients: string[] = [];
    if (c.recipient_id) {
      recipients = [c.recipient_id];
    } else {
      const { data: members } = await sb
        .from('trip_members')
        .select('user_id')
        .eq('trip_id', c.trip_id);
      recipients = (members ?? []).map((m) => m.user_id as string);
    }
    for (const uid of recipients) {
      await sb.from('notifications').insert({
        user_id: uid,
        category: 'time_capsule',
        title: 'time_capsule',
        body: 'time_capsule', // resolved client-side from data
        data: { tripId: c.trip_id, capsuleId: c.id, kind: 'time_capsule' },
      });
      inserted++;
    }
    await sb.from('time_capsules').update({ notified_at: nowIso }).eq('id', c.id);
  }
  return new Response(JSON.stringify({ inserted }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
