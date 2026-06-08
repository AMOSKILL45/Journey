import { useLocalSearchParams } from 'expo-router';

import { PublicTripScreen } from '@features/trips';

/**
 * Public, read-only trip view reached via the `thisisthejourney://t/:token` deep
 * link (the root deep-link handler rewrites `t/:token` → this `/trip/:token` route).
 * The `(public)` group sits outside the auth gate so the link resolves without a
 * redirect. For v1.0 the trip content reads require a signed-in session (anon is
 * intentionally NOT granted EXECUTE on the membership helper — private by default);
 * a logged-out visitor lands on the "not public" state until anonymous viewing
 * ships in v1.1. RLS still gates the content to non-private trips, and the screen
 * only ever reads the safe subset.
 */
export default function PublicTripRoute() {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <PublicTripScreen token={token ?? ''} />;
}
