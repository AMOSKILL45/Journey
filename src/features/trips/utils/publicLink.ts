/**
 * Public trip deep link (Phase 9, ADR-009).
 *
 * v1.0 sharing is an in-app custom-scheme deep link (no web yet — react-native-web
 * is a standing project constraint), reusing the trip's `share_token` and the existing
 * deep-link handler. `thisisthejourney://t/{token}` opens the read-only public trip screen
 * (`(public)/trip/[token]`). An anonymous server-rendered HTML page is deferred to v1.1
 * (discovery launch).
 *
 * Mirrors the transport shape of `members.ts` `buildInvitationScheme` (custom scheme +
 * a short path segment + the token), kept as a dedicated `t/` path for public trips.
 */
import { APP_SCHEME } from '@core/env/scheme';

// The OS-registered scheme — NOT a literal. A bare 'journey' here shipped a dead
// link (app.config registers 'thisisthejourney'); always derive from APP_SCHEME.
const SCHEME = APP_SCHEME;
const PUBLIC_TRIP_PATH = 't';

export function buildPublicTripLink(shareToken: string): string {
  return `${SCHEME}://${PUBLIC_TRIP_PATH}/${shareToken}`;
}
