import { presentIdentityVerificationSheet } from '@stripe/stripe-identity-react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Image } from 'react-native';

import {
  createIdentitySession,
  isAlreadyVerified,
  type CreateIdentitySessionResponse,
} from '../api/identity';

const BRAND_LOGO = require('@assets/images/splash.png');

const PROFILE_QUERY_KEY = ['my-profile'] as const;
const WEBHOOK_LEAD_MS = 1500;

export type IdentityFlowStatus = 'FlowCompleted' | 'FlowCanceled' | 'FlowFailed';

export interface UseIdentityVerificationResult {
  present: () => Promise<void>;
  status: IdentityFlowStatus | undefined;
  loading: boolean;
  alreadyVerified: boolean;
  error: string | null;
}

/**
 * Wraps @stripe/stripe-identity-react-native's useStripeIdentity to fix a known
 * SDK bug where `loading` never resets to false if the optionsProvider throws
 * (e.g. when our create-identity-session edge function returns a non-2xx) —
 * the upstream `present()` is `async () => { setLoading(true); await opts(); setLoading(false); ... }`
 * with no try/finally, so the spinner can spin forever on any backend error.
 *
 * Here we own the loading lifecycle in a try/finally and surface the real
 * error message to the UI instead of swallowing it.
 */
export function useIdentityVerification(): UseIdentityVerificationResult {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<IdentityFlowStatus | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const alreadyVerifiedRef = useRef(false);

  const present = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await createIdentitySession();
      if (isAlreadyVerified(result)) {
        alreadyVerifiedRef.current = true;
        setStatus('FlowCompleted');
        // No sheet to present — profile is already verified upstream.
        void qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
        return;
      }
      const session = result as CreateIdentitySessionResponse;
      const sheetResult = await presentIdentityVerificationSheet({
        sessionId: session.id,
        ephemeralKeySecret: session.ephemeral_key_secret,
        brandLogo: Image.resolveAssetSource(BRAND_LOGO),
      });
      setStatus(sheetResult.status);
      if (sheetResult.error) setError(sheetResult.error.message);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setStatus('FlowFailed');
    } finally {
      setLoading(false);
    }
  }, [qc]);

  useEffect(() => {
    if (status !== 'FlowCompleted') return;
    // The webhook flips the profile flags asynchronously; invalidate so the
    // next reconciliation reflects is_verified=true. Light delay gives the
    // webhook a head start in the common case.
    const t = setTimeout(() => {
      void qc.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    }, WEBHOOK_LEAD_MS);
    return () => clearTimeout(t);
  }, [status, qc]);

  return {
    present,
    status,
    loading,
    alreadyVerified: alreadyVerifiedRef.current,
    error,
  };
}
