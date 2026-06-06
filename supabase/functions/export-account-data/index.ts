// Edge function: export-account-data
// GDPR data portability — returns a JSON bundle of the authenticated caller's own data
// across all tables. Auth required (verify_jwt=true), scoped to the caller's auth.uid().
// The client writes the JSON to a file and shares it via the OS share sheet.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

// table -> column that identifies the caller's own rows.
const OWNED: Array<{ key: string; table: string; column: string }> = [
  { key: 'profile', table: 'profiles', column: 'id' },
  { key: 'trips_owned', table: 'trips', column: 'owner_id' },
  { key: 'memberships', table: 'trip_members', column: 'user_id' },
  { key: 'milestones_created', table: 'milestones', column: 'created_by' },
  { key: 'checkins', table: 'checkins', column: 'user_id' },
  { key: 'documents', table: 'documents', column: 'uploaded_by' },
  { key: 'trip_checklists_created', table: 'trip_checklists', column: 'created_by' },
  { key: 'checklist_items_created', table: 'checklist_items', column: 'created_by' },
  { key: 'checklist_completions', table: 'checklist_item_completions', column: 'user_id' },
  { key: 'photos', table: 'photos', column: 'user_id' },
  { key: 'polls_created', table: 'polls', column: 'created_by' },
  { key: 'poll_votes', table: 'poll_votes', column: 'user_id' },
  { key: 'reactions', table: 'reactions', column: 'user_id' },
  { key: 'personal_reminders', table: 'personal_reminders', column: 'user_id' },
  { key: 'trip_smart_reminders', table: 'trip_smart_reminders', column: 'user_id' },
  { key: 'notifications', table: 'notifications', column: 'user_id' },
  { key: 'user_achievements', table: 'user_achievements', column: 'user_id' },
  { key: 'time_capsules_authored', table: 'time_capsules', column: 'author_id' },
  { key: 'push_tokens', table: 'user_push_tokens', column: 'user_id' },
];

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: 'Server misconfigured' }, 500);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);
  const userJwt = authHeader.replace(/^Bearer\s+/i, '');

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(userJwt);
  if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
  const userId = userData.user.id;

  const entries = await Promise.all(
    OWNED.map(async ({ key, table, column }) => {
      const { data, error } = await admin.from(table).select('*').eq(column, userId);
      if (error) {
        console.error(`[export-account-data] ${table} failed`, error.message);
        return [key, { error: error.message }] as const;
      }
      return [key, data ?? []] as const;
    }),
  );

  const data: Record<string, unknown> = {};
  for (const [key, value] of entries) data[key] = value;

  return json(
    {
      exported_at: new Date().toISOString(),
      user_id: userId,
      app: 'This Is The Journey',
      data,
    },
    200,
  );
});
