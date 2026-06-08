/**
 * The app's registered deep-link / URL scheme — SINGLE SOURCE OF TRUTH.
 *
 * The OS only routes `<scheme>://…` URLs to this app when they match the `scheme`
 * registered in `app.config.ts`. So every link the CLIENT builds (auth redirect,
 * public-trip share, invitation) MUST use this exact value — a mismatch produces a
 * link that silently does nothing on device while unit tests stay green (the bug
 * that killed public-trip sharing: `journey://` ≠ `thisisthejourney://`).
 *
 * Enforced by `src/__tests__/deep-links-contract.test.ts`, which parses `scheme`
 * out of `app.config.ts` and asserts it equals this constant AND that every
 * builder's OUTPUT uses it. Keep this and `app.config.ts` in lockstep.
 */
export const APP_SCHEME = 'thisisthejourney';
