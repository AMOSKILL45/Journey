/**
 * Pre-permission priming bridge (10A, UI spec §1).
 *
 * The OS permission prompts for notifications + location live in non-React code
 * (`@features/notifications/registration.ts` and
 * `@features/realtime/.../useLocationBroadcast.ts`). To show a value-framed
 * `PrePermissionSheet` BEFORE the OS prompt, those call sites `await
 * requestPrePermission(kind)`; this module relays the request to the mounted
 * `PrePermissionProvider`, which renders the sheet and resolves with the user's
 * choice ("Allow" → true, "Not now" / dismiss → false).
 *
 * Each kind is primed at most ONCE per install (tracked here, in-memory): once
 * the user has been primed we never block the call site again — the OS itself
 * remembers the real grant/deny, and re-priming would be nagging.
 */

export type PermissionKind = 'notifications' | 'location';

type Handler = (kind: PermissionKind) => Promise<boolean>;

let handler: Handler | null = null;
const primed = new Set<PermissionKind>();

/** Registered by `PrePermissionProvider` on mount; cleared on unmount. */
export function registerPrePermissionHandler(fn: Handler | null): void {
  handler = fn;
}

/**
 * Show the priming sheet for `kind` and resolve with the user's intent.
 *
 * - Returns `true` if the user opts in (so the caller proceeds to the OS prompt)
 *   or if priming was already shown once (we defer to the OS at that point).
 * - Returns `false` only the first time, when the user taps "Not now".
 *
 * Fail-open: if no provider is mounted, returns `true` so the existing flow
 * (direct OS prompt) is preserved rather than silently blocked.
 */
export async function requestPrePermission(kind: PermissionKind): Promise<boolean> {
  if (primed.has(kind)) return true;
  if (!handler) return true;
  primed.add(kind);
  return handler(kind);
}

/** Test-only: reset the in-memory primed set + handler. */
export function __resetPrePermissionForTests(): void {
  handler = null;
  primed.clear();
}
