/**
 * Pure choreography for the "dive into the mountain" launch animation.
 *
 * These functions are the single source of truth for the animation curve and the
 * readiness gate. They carry the `'worklet'` directive so Reanimated can run the
 * interpolators on the UI thread (the directive is inert under Jest — the
 * Reanimated babel plugin is skipped in the test env, see babel.config.js).
 */

/** Fraction of the animation spent holding the icon at rest before the dive (seamless handoff). */
export const SPLASH_HOLD_RATIO = 0.18;
/** Fraction of the animation at which the crossfade to the app begins. */
export const SPLASH_FADE_START_RATIO = 0.55;
/** Final scale of the icon as the camera plunges into the mountain. */
export const SPLASH_MAX_SCALE = 9;
/** Duration of the dive + crossfade, in milliseconds. */
export const SPLASH_DIVE_MS = 850;
/** Hard cap before the splash gives up waiting on the session and reveals the app anyway. */
export const SPLASH_MAX_WAIT_MS = 2500;

/**
 * Whether the app is ready to be revealed: fonts loaded and session resolved, or
 * the safety timeout has fired so we never hang on a slow/cold boot.
 */
export function computeAppReady(
  fontsLoaded: boolean,
  sessionResolved: boolean,
  timedOut: boolean,
): boolean {
  return (fontsLoaded && sessionResolved) || timedOut;
}

/**
 * Icon scale for a given animation progress [0, 1]. Holds at 1 through the hold
 * phase, then accelerates (cubic ease-in) up to {@link SPLASH_MAX_SCALE} — the
 * feeling of diving into the artwork.
 */
export function splashScaleAt(progress: number): number {
  'worklet';
  if (progress <= SPLASH_HOLD_RATIO) return 1;
  const t = (progress - SPLASH_HOLD_RATIO) / (1 - SPLASH_HOLD_RATIO);
  return 1 + (SPLASH_MAX_SCALE - 1) * t * t * t;
}

/**
 * Overlay opacity for a given animation progress [0, 1]. Stays fully opaque until
 * {@link SPLASH_FADE_START_RATIO}, then crossfades linearly to 0.
 */
export function splashOpacityAt(progress: number): number {
  'worklet';
  if (progress <= SPLASH_FADE_START_RATIO) return 1;
  const t = (progress - SPLASH_FADE_START_RATIO) / (1 - SPLASH_FADE_START_RATIO);
  return 1 - t;
}
