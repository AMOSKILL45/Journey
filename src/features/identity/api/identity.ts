import { supabase } from '@core/supabase/client';

export interface CreateIdentitySessionResponse {
  id: string;
  client_secret: string;
  ephemeral_key_secret: string;
}

export interface AlreadyVerifiedResponse {
  already_verified: true;
}

export type IdentitySessionResult = CreateIdentitySessionResponse | AlreadyVerifiedResponse;

export function isAlreadyVerified(r: IdentitySessionResult): r is AlreadyVerifiedResponse {
  return 'already_verified' in r && r.already_verified === true;
}

export async function createIdentitySession(): Promise<IdentitySessionResult> {
  const { data, error } = await supabase.functions.invoke<IdentitySessionResult>(
    'create-identity-session',
    { body: {} },
  );
  if (error) throw error;
  if (!data) throw new Error('No data returned from create-identity-session');
  return data;
}
