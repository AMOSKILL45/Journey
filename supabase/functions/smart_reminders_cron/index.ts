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
  // NB: trips has no `purpose` column (v1.0) — purpose stays null, so purpose-gated rules match regardless.
  const { data: trips } = await sb
    .from('trips')
    .select('id, start_date, end_date, destination_country, destination_countries')
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
        purpose: null,
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
