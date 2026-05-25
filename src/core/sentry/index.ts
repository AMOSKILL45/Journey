import * as Sentry from '@sentry/react-native';

import { env } from '@core/env';

export const initSentry = (): void => {
  if (!env.sentryDsn) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[sentry] DSN not configured, skipping init');
    }
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    enabled: !__DEV__,
    tracesSampleRate: 1.0,
    environment: __DEV__ ? 'development' : 'production',
  });
};

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
