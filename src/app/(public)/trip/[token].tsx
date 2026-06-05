import { useLocalSearchParams } from 'expo-router';

import { PublicTripScreen } from '@features/trips';

/**
 * Public, read-only trip view reached via the `journey://t/:token` deep link
 * (the root deep-link handler rewrites `t/:token` → this `/trip/:token` route).
 * The `(public)` group sits outside the auth gate: a shared trip must open for
 * anyone with the link, signed in or not. RLS still gates the content to
 * non-private trips, and the screen only ever reads the safe subset.
 */
export default function PublicTripRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <PublicTripScreen token={token ?? ''} />;
}
