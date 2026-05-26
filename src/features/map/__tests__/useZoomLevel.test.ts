import {
  CROSSFADE_END,
  CROSSFADE_START,
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  computeOverworldOpacity,
  computeRealMapOpacity,
} from '../hooks/useZoomLevel';

describe('useZoomLevel math', () => {
  describe('clampZoom', () => {
    it('clamps below MIN_ZOOM', () => {
      expect(clampZoom(2)).toBe(MIN_ZOOM);
    });

    it('clamps above MAX_ZOOM', () => {
      expect(clampZoom(99)).toBe(MAX_ZOOM);
    });

    it('passes through values inside the range', () => {
      expect(clampZoom(10)).toBe(10);
    });
  });

  describe('computeOverworldOpacity', () => {
    it('is fully opaque below the crossfade start', () => {
      expect(computeOverworldOpacity(CROSSFADE_START - 0.5)).toBe(1);
      expect(computeOverworldOpacity(CROSSFADE_START)).toBe(1);
    });

    it('is fully transparent at and above the crossfade end', () => {
      expect(computeOverworldOpacity(CROSSFADE_END)).toBe(0);
      expect(computeOverworldOpacity(CROSSFADE_END + 1)).toBe(0);
    });

    it('interpolates linearly between start and end', () => {
      const mid = (CROSSFADE_START + CROSSFADE_END) / 2;
      expect(computeOverworldOpacity(mid)).toBeCloseTo(0.5, 5);
    });
  });

  describe('computeRealMapOpacity', () => {
    it('is exactly 1 - overworldOpacity', () => {
      for (const z of [6, 8, 9, 10, 11, 14, 18]) {
        expect(computeRealMapOpacity(z) + computeOverworldOpacity(z)).toBeCloseTo(1, 5);
      }
    });
  });

  it('exports sensible crossfade bounds', () => {
    expect(CROSSFADE_START).toBeLessThan(CROSSFADE_END);
    expect(MIN_ZOOM).toBeLessThan(CROSSFADE_START);
    expect(CROSSFADE_END).toBeLessThan(MAX_ZOOM);
  });
});
