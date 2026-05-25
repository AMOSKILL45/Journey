import PostHog from 'posthog-react-native';

import { env } from '@core/env';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type EventProperties = Record<string, JsonValue>;

let posthogInstance: PostHog | null = null;

export const initPostHog = async (): Promise<void> => {
  if (!env.posthogApiKey) {
    if (__DEV__) {
      console.warn('[posthog] API key not configured, skipping init');
    }
    return;
  }

  posthogInstance = new PostHog(env.posthogApiKey, {
    host: env.posthogHost,
    flushAt: 20,
    flushInterval: 30000,
  });
};

export const track = (event: string, properties?: EventProperties): void => {
  posthogInstance?.capture(event, properties);
};

export const identify = (distinctId: string, properties?: EventProperties): void => {
  posthogInstance?.identify(distinctId, properties);
};

export const reset = (): void => {
  posthogInstance?.reset();
};
