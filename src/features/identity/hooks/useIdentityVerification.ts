import { useStripeIdentity } from '@stripe/stripe-identity-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';
import { Image } from 'react-native';

import {
  createIdentitySession,
  isAlreadyVerified,
  type CreateIdentitySessionResponse,
} from '../api/identity';

const BRAND_LOGO = require('@assets/images/splash.png');

const PROFILE_QUERY_KEY = ['my-profile'] as const;

export interface UseIdentityVerificationResult {
  present: () => Promise<void>;
  status: 'FlowCompleted' | 'FlowCanceled' | 'FlowFailed' | undefined;
  loading: boolean;
  alreadyVerified: boolean;
  error: string | null;
}

export function useIdentityVerification(): UseIdentityVerificationResult {
  const qc = useQueryClient();
  const alreadyVerifiedRef = useRef(false);
  const errorRef = useRef<string | null>(null);

  const optionsProvider = useCallback(async () => {
    const result = await createIdentitySession();
    if (isAlreadyVerified(result)) {
      alreadyVerifiedRef.current = true;
      // Returning bogus values would crash the SDK; throw so the hook surfaces
      // an error and we short-circuit `present()` upstream.
      throw new Error('already_verified');
    }
    const session = result as CreateIdentitySessionResponse;
    return {
      sessionId: session.id,
      ephemeralKeySecret: session.ephemeral_key_secret,
      brandLogo: Image.resolveAssetSource(BRAND_LOGO),
    };
  }, []);

  const { present, status, loading, error } = useStripeIdentity(optionsProvider);

  useEffect(() => {
    if (error) errorRef.current = error.message;
  }, [error]);

  useEffect(() => {
    if (status !== 'FlowCompleted') return;
    // The webhook flips the profile flags asynchronously; invalidate so the
    // next reconciliation reflects is_verified=true. Light delay gives the
    // webhook a head start in the common case.
    const t = setTimeout(() => {
      void qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    }, 1500);
    return () => clearTimeout(t);
  }, [status, qc]);

  return {
    present,
    status,
    loading,
    alreadyVerified: alreadyVerifiedRef.current,
    error: errorRef.current,
  };
}
