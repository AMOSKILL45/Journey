// Edge function: delete-account
// Permanently deletes the authenticated caller's account (App Store 5.1.1(v) + GDPR
// right-to-erasure). ADR-010. Auth required (verify_jwt=true) — scoped to the caller's
// own auth.uid(); never accepts a target id.
//
// Order (matters — see ADR-010 §7.3):
//   1. collect the caller's Storage object paths (before their rows are purged)
//   2. purge_account_data(uid)  — anonymize shared content -> ghost, transfer owned shared
//      trips to the oldest remaining member, delete sole-owner trips + personal rows
//   3. remove the caller's Storage objects (best-effort; never blocks the deletion)
//   4. auth.admin.deleteUser(uid) — its CASCADE FKs finish profile + remaining personal data
//
// If the purge fails we DO NOT delete the auth user, so the user can retry rather than be
// left half-deleted.

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

const GHOST_USER_ID = 'de1e7e00-0000-4000-8000-000000000000';
const DOCS_BUCKET = 'trip-documents';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ error: 'Server misconfigured' }, 500);

  const auth = req.headers.get('Authorization');
  if (!auth) return json({ error: 'Unauthorized' }, 401);
  const userJwt = auth.replace(/^Bearer\s+/i, '');

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await admin.auth.getUser(userJwt);
  if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401);
  const userId = userData.user.id;

  // Never allow the sentinel to be deleted (defensive — it can't authenticate anyway).
  if (userId === GHOST_USER_ID) return json({ error: 'Forbidden' }, 403);

  // 1. Collect the caller's Storage object paths BEFORE their document rows are purged.
  let docPaths: string[] = [];
  {
    const { data: docs } = await admin
      .from('documents')
      .select('storage_path')
      .eq('uploaded_by', userId);
    docPaths = (docs ?? [])
      .map((d: { storage_path: string | null }) => d.storage_path)
      .filter((p: string | null): p is string => typeof p === 'string' && p.length > 0);
  }

  // 2. Purge / anonymize / transfer (single transaction in Postgres).
  const { error: purgeErr } = await admin.rpc('purge_account_data', { p_uid: userId });
  if (purgeErr) {
    console.error('[delete-account] purge_account_data failed', purgeErr.message);
    return json({ error: 'Deletion failed; nothing was removed. Please retry.' }, 500);
  }

  // 3. Remove the caller's Storage objects (best-effort — never block the deletion).
  if (docPaths.length > 0) {
    try {
      const { error: rmErr } = await admin.storage.from(DOCS_BUCKET).remove(docPaths);
      if (rmErr) console.error('[delete-account] storage remove failed', rmErr.message);
    } catch (e) {
      console.error('[delete-account] storage remove threw', e instanceof Error ? e.message : e);
    }
  }

  // 4. Delete the auth user (hard). CASCADE FKs finish profile + remaining personal rows.
  const { error: delErr } = await admin.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error('[delete-account] auth.admin.deleteUser failed', delErr.message);
    // Data is already purged/anonymized; surface so the client can retry the final step.
    return json({ error: 'Account data removed but final deletion failed; please retry.' }, 500);
  }

  return json({ success: true }, 200);
});
