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
