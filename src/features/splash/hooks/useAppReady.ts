import { useEffect, useState } from 'react';

import { useSession } from '@features/auth';

import { SPLASH_MAX_WAIT_MS, computeAppReady } from '../choreography';

/**
 * Gate for revealing the app behind the launch animation. Ready once the fonts
 * are loaded and the auth session has resolved, with a {@link SPLASH_MAX_WAIT_MS}
 * safety timeout so a slow/cold boot never leaves the splash hanging.
 *
 * All decision logic lives in the pure, tested `computeAppReady`; this hook only
 * wires the React/timer/session inputs into it.
 */
export function useAppReady(fontsLoaded: boolean): boolean {
  const { loading: sessionLoading } = useSession();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), SPLASH_MAX_WAIT_MS);
    return () => clearTimeout(timer);
  }, []);

  return computeAppReady(fontsLoaded, !sessionLoading, timedOut);
}
