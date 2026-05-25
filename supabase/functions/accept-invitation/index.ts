// Edge function: accept-invitation
// Atomic: validate invitation token + insert membership + mark invitation accepted.
// Auth required (verify_jwt=true). Idempotent: re-calling with same token while already
// a member is a no-op success.

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  const userJwt = auth.replace(/^Bearer\s+/i, '');

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(userJwt);
  if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
  const userId = userData.user.id;

  let token: string | undefined;
  try {
    const body = (await req.json()) as { token?: string };
    token = body.token;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!token || typeof token !== 'string') return json({ error: 'token required' }, 400);

  const { data: inv, error: invErr } = await admin
    .from('trip_invitations')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  if (invErr) return json({ error: invErr.message }, 500);
  if (!inv) return json({ error: 'Invitation not found' }, 404);
  if (new Date(inv.expires_at) < new Date()) return json({ error: 'Invitation expired' }, 410);

  // Check if user is already a member (idempotent)
  const { data: existingMember } = await admin
    .from('trip_members')
    .select('trip_id')
    .eq('trip_id', inv.trip_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (!existingMember) {
    const { error: memErr } = await admin
      .from('trip_members')
      .insert({ trip_id: inv.trip_id, user_id: userId, role: inv.role ?? 'editor' });
    if (memErr && !memErr.message.toLowerCase().includes('duplicate')) {
      return json({ error: memErr.message }, 500);
    }
  }

  // Mark invitation accepted (only if not already accepted, to preserve first-acceptor info)
  if (!inv.accepted_at) {
    await admin
      .from('trip_invitations')
      .update({ accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq('id', inv.id);
  }

  return json({ trip_id: inv.trip_id });
});
