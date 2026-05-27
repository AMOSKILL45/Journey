// Edge function: stripe-identity-webhook
// Receives Stripe Identity webhook events and flips the profile flags.
// Passport data (country, expiry, name, phone) is collected manually via the
// OnboardingScreen / Settings form, not fetched from the verification_report —
// we use a Stripe restricted key without "All Detailed Verification Results"
// scope to avoid the IP-whitelist requirement that scope imposes.
//
// verify_jwt=false — Stripe does not send a Supabase JWT. Authentication is
// via the Stripe-Signature header (HMAC-SHA256 of `<timestamp>.<raw_body>`
// using STRIPE_WEBHOOK_SECRET). 5-minute tolerance window.
//
// Handled events:
//   identity.verification_session.verified       → is_verified=true, level=3
//   identity.verification_session.canceled       → log only (user can retry)
//   identity.verification_session.requires_input → log only (user can retry)
//   identity.verification_session.processing     → log only
//   identity.verification_session.created        → log only
//
// Idempotent: re-delivering the same event is a no-op (postgres UPDATE on
// already-verified rows changes nothing).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const TOLERANCE_SECONDS = 300;

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      object: string;
      status?: string;
      metadata?: Record<string, string>;
    };
  };
}

function parseStripeSignature(header: string): { timestamp: number; v1: string[] } | null {
  const parts = header.split(',').map((p) => p.trim());
  let timestamp = 0;
  const v1: string[] = [];
  for (const part of parts) {
    const [k, v] = part.split('=', 2);
    if (k === 't') timestamp = Number(v);
    else if (k === 'v1') v1.push(v);
  }
  if (!timestamp || v1.length === 0) return null;
  return { timestamp, v1 };
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function verifyStripeSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parsed = parseStripeSignature(signatureHeader);
  if (!parsed) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parsed.timestamp) > TOLERANCE_SECONDS) return false;

  const payload = `${parsed.timestamp}.${rawBody}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const expected = new Uint8Array(sig);

  for (const candidate of parsed.v1) {
    try {
      if (timingSafeEqual(expected, hexToBytes(candidate))) return true;
    } catch {
      continue;
    }
  }
  return false;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!SUPABASE_URL || !SERVICE_ROLE || !STRIPE_WEBHOOK_SECRET) {
    return new Response('Server misconfigured', { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  const rawBody = await req.text();

  const isValid = await verifyStripeSignature(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  if (!isValid) return new Response('Invalid signature', { status: 401 });

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!event.type.startsWith('identity.verification_session.')) {
    return new Response('ignored', { status: 200 });
  }

  const session = event.data.object;
  const userId = session.metadata?.user_id;
  if (!userId) {
    console.error('[stripe-identity-webhook] no user_id in metadata', { id: session.id });
    return new Response('Missing user_id metadata', { status: 200 });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (event.type === 'identity.verification_session.verified') {
    const { error } = await admin
      .from('profiles')
      .update({
        is_verified: true,
        verification_level: 3,
        identity_verified_at: new Date().toISOString(),
        stripe_identity_session_id: session.id,
      })
      .eq('id', userId);
    if (error) {
      console.error('[stripe-identity-webhook] profile update failed', error.message);
      return new Response('DB error', { status: 500 });
    }
  } else {
    // Non-terminal or recoverable events: log only. Profile flags stay as-is so
    // the user can retry. We still remember the latest session id for dedupe.
    await admin
      .from('profiles')
      .update({ stripe_identity_session_id: session.id })
      .eq('id', userId);
  }

  return new Response('ok', { status: 200 });
});
