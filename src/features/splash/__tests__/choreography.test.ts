import {
  SPLASH_DIVE_MS,
  SPLASH_FADE_START_RATIO,
  SPLASH_HOLD_RATIO,
  SPLASH_MAX_SCALE,
  SPLASH_MAX_WAIT_MS,
  computeAppReady,
  splashOpacityAt,
  splashScaleAt,
} from '../choreography';

describe('splash choreography', () => {
  describe('computeAppReady', () => {
    it('is not ready while nothing has resolved', () => {
      expect(computeAppReady(false, false, false)).toBe(false);
    });

    it('is not ready when only the fonts are loaded', () => {
      expect(computeAppReady(true, false, false)).toBe(false);
    });

    it('is not ready when only the session has resolved', () => {
      expect(computeAppReady(false, true, false)).toBe(false);
    });

    it('is ready once fonts are loaded and the session has resolved', () => {
      expect(computeAppReady(true, true, false)).toBe(true);
    });

    it('falls back to ready when the max-wait timeout fires', () => {
      expect(computeAppReady(false, false, true)).toBe(true);
      expect(computeAppReady(true, false, true)).toBe(true);
    });
  });

  describe('splashScaleAt (the dive)', () => {
    it('starts at natural size', () => {
      expect(splashScaleAt(0)).toBe(1);
    });

    it('still holds natural size at the end of the hold phase', () => {
      expect(splashScaleAt(SPLASH_HOLD_RATIO)).toBe(1);
    });

    it('reaches the full dive scale at the end', () => {
      expect(splashScaleAt(1)).toBeCloseTo(SPLASH_MAX_SCALE, 5);
    });

    it('grows monotonically after the hold phase', () => {
      const samples = [SPLASH_HOLD_RATIO, 0.4, 0.6, 0.8, 1];
      for (let i = 1; i < samples.length; i++) {
        expect(splashScaleAt(samples[i])).toBeGreaterThan(splashScaleAt(samples[i - 1]));
      }
    });

    it('accelerates (ease-in): grows less in the first half of the dive than the second', () => {
      const diveStart = SPLASH_HOLD_RATIO;
      const diveMid = (SPLASH_HOLD_RATIO + 1) / 2;
      const firstHalf = splashScaleAt(diveMid) - splashScaleAt(diveStart);
      const secondHalf = splashScaleAt(1) - splashScaleAt(diveMid);
      expect(secondHalf).toBeGreaterThan(firstHalf);
    });
  });

  describe('splashOpacityAt (the crossfade)', () => {
    it('is fully opaque at the start', () => {
      expect(splashOpacityAt(0)).toBe(1);
    });

    it('is still fully opaque when the fade begins', () => {
      expect(splashOpacityAt(SPLASH_FADE_START_RATIO)).toBe(1);
    });

    it('is fully transparent at the end', () => {
      expect(splashOpacityAt(1)).toBeCloseTo(0, 5);
    });

    it('is half faded at the midpoint of the fade window', () => {
      const mid = SPLASH_FADE_START_RATIO + (1 - SPLASH_FADE_START_RATIO) / 2;
      expect(splashOpacityAt(mid)).toBeCloseTo(0.5, 5);
    });
  });

  it('exports sensible choreography constants', () => {
    expect(SPLASH_HOLD_RATIO).toBeGreaterThan(0);
    expect(SPLASH_HOLD_RATIO).toBeLessThan(SPLASH_FADE_START_RATIO);
    expect(SPLASH_FADE_START_RATIO).toBeLessThan(1);
    expect(SPLASH_MAX_SCALE).toBeGreaterThan(1);
    expect(SPLASH_DIVE_MS).toBeGreaterThan(0);
    expect(SPLASH_MAX_WAIT_MS).toBeGreaterThan(SPLASH_DIVE_MS);
  });
});
