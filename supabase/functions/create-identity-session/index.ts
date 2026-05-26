// Edge function: create-identity-session
// Creates a Stripe Identity VerificationSession for the authenticated user and
// returns the client_secret for the mobile SDK. Stores the session id on the
// profile for dedupe + audit. Webhook stripe-identity-webhook flips
// is_verified=true + verification_level=3 once Stripe delivers `verified`.
//
// Auth required (verify_jwt=true). Idempotent within a 24h window:
// if the profile already has a non-terminal session, returns its client_secret
// instead of creating a duplicate (saves cost — Stripe bills per verified, but
// duplicate sessions clutter the dashboard).

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

interface StripeVerificationSession {
  id: string;
  object: 'identity.verification_session';
  client_secret: string;
  status: 'requires_input' | 'processing' | 'verified' | 'canceled' | 'requires_action';
  url?: string;
}

const STRIPE_API = 'https://api.stripe.com/v1/identity/verification_sessions';

async function stripeCreateSession(
  secretKey: string,
  userId: string,
): Promise<StripeVerificationSession> {
  const params = new URLSearchParams();
  params.set('type', 'document');
  params.set('options[document][require_matching_selfie]', 'true');
  params.set('options[document][require_live_capture]', 'true');
  params.set('options[document][allowed_types][0]', 'passport');
  params.set('options[document][allowed_types][1]', 'id_card');
  params.set('options[document][allowed_types][2]', 'driving_license');
  params.set('metadata[user_id]', userId);
  params.set('metadata[source]', 'journey_mobile');

  const res = await fetch(STRIPE_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-11-20.acacia',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Stripe error ${res.status}: ${errText}`);
  }
  return (await res.json()) as StripeVerificationSession;
}

async function stripeRetrieveSession(
  secretKey: string,
  sessionId: string,
): Promise<StripeVerificationSession | null> {
  const res = await fetch(`${STRIPE_API}/${sessionId}`, {
    headers: { Authorization: `Bearer ${secretKey}`, 'Stripe-Version': '2024-11-20.acacia' },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Stripe retrieve error ${res.status}: ${await res.text()}`);
  }
  return (await res.json()) as StripeVerificationSession;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
  if (!SUPABASE_URL || !SERVICE_ROLE || !STRIPE_SECRET_KEY) {
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

  // Already verified? Return short-circuit so client can skip the sheet.
  const { data: profile } = await admin
    .from('profiles')
    .select('is_verified, stripe_identity_session_id')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.is_verified) {
    return json({ already_verified: true }, 200);
  }

  // Reuse an existing non-terminal session if present (saves Stripe billing on
  // verified, and avoids dashboard clutter from abandoned attempts).
  if (profile?.stripe_identity_session_id) {
    try {
      const existing = await stripeRetrieveSession(
        STRIPE_SECRET_KEY,
        profile.stripe_identity_session_id,
      );
      if (existing && (existing.status === 'requires_input' || existing.status === 'processing')) {
        return json({ id: existing.id, client_secret: existing.client_secret }, 200);
      }
    } catch (_e) {
      // Retrieval failure → fall through and create a new session.
    }
  }

  let session: StripeVerificationSession;
  try {
    session = await stripeCreateSession(STRIPE_SECRET_KEY, userId);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Stripe failed' }, 502);
  }

  const { error: updateErr } = await admin
    .from('profiles')
    .update({ stripe_identity_session_id: session.id })
    .eq('id', userId);
  if (updateErr) {
    // Non-fatal: the webhook will still find the session via metadata.user_id,
    // but log so we can monitor drift.
    console.error('[create-identity-session] profile update failed', updateErr.message);
  }

  return json({ id: session.id, client_secret: session.client_secret }, 200);
});
