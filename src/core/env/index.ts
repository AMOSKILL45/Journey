import Constants from 'expo-constants';
import { z } from 'zod';

const envSchema = z.object({
  supabaseUrl: z.string().url('EXPO_PUBLIC_SUPABASE_URL must be a valid URL'),
  supabaseAnonKey: z.string().min(1, 'EXPO_PUBLIC_SUPABASE_ANON_KEY is required'),
  sentryDsn: z.string().url().optional(),
  posthogApiKey: z.string().optional(),
  posthogHost: z.string().url().optional(),
  maptilerApiKey: z.string().optional(),
  googleWebClientId: z.string().optional(),
  googleIosClientId: z.string().optional(),
  stripePublishableKey: z.string().optional(),
});

const raw = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;

const parsed = envSchema.safeParse(raw);

if (!parsed.success) {
  // Don't crash in dev — log warning. Crash in prod.
  if (!__DEV__) {
    throw new Error(`Env validation failed: ${parsed.error.message}`);
  }

  console.warn('[env] Validation warnings:', parsed.error.format());
}

export const env = parsed.success ? parsed.data : (raw as z.infer<typeof envSchema>);
