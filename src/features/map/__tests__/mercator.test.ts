import {
  bboxCenter,
  computeBoundingBox,
  latLngToPixel,
  padBoundingBox,
  pixelToLatLng,
} from '../utils/mercator';

describe('mercator', () => {
  describe('latLngToPixel', () => {
    it('places (0,0) at the center of the world at zoom 0', () => {
      const px = latLngToPixel({ lat: 0, lng: 0 }, 0);
      expect(px.x).toBeCloseTo(128, 5);
      expect(px.y).toBeCloseTo(128, 5);
    });

    it('scales the world with zoom', () => {
      const z0 = latLngToPixel({ lat: 0, lng: 0 }, 0);
      const z3 = latLngToPixel({ lat: 0, lng: 0 }, 3);
      // At zoom 3 the world is 2^3 = 8x wider in tiles → center moves 8x
      expect(z3.x).toBeCloseTo(z0.x * 8, 5);
      expect(z3.y).toBeCloseTo(z0.y * 8, 5);
    });

    it('clamps to MAX_LAT to avoid Infinity at the poles', () => {
      const px = latLngToPixel({ lat: 90, lng: 0 }, 0);
      expect(Number.isFinite(px.y)).toBe(true);
    });
  });

  describe('pixelToLatLng', () => {
    it('round-trips a real-world coordinate (Paris)', () => {
      const paris = { lat: 48.8566, lng: 2.3522 };
      const px = latLngToPixel(paris, 12);
      const back = pixelToLatLng(px, 12);
      expect(back.lat).toBeCloseTo(paris.lat, 4);
      expect(back.lng).toBeCloseTo(paris.lng, 4);
    });

    it('round-trips a southern hemisphere coordinate (Sydney)', () => {
      const sydney = { lat: -33.8688, lng: 151.2093 };
      const px = latLngToPixel(sydney, 8);
      const back = pixelToLatLng(px, 8);
      expect(back.lat).toBeCloseTo(sydney.lat, 4);
      expect(back.lng).toBeCloseTo(sydney.lng, 4);
    });
  });

  describe('computeBoundingBox', () => {
    it('returns null for an empty input', () => {
      expect(computeBoundingBox([])).toBeNull();
    });

    it('returns a degenerate bbox for a single point', () => {
      const bbox = computeBoundingBox([{ lat: 10, lng: 20 }]);
      expect(bbox).toEqual({ minLat: 10, maxLat: 10, minLng: 20, maxLng: 20 });
    });

    it('expands to contain every input point', () => {
      const bbox = computeBoundingBox([
        { lat: 0, lng: 0 },
        { lat: 10, lng: -5 },
        { lat: -3, lng: 8 },
      ]);
      expect(bbox).toEqual({ minLat: -3, maxLat: 10, minLng: -5, maxLng: 8 });
    });
  });

  describe('bboxCenter', () => {
    it('computes the midpoint of the bounding box', () => {
      const center = bboxCenter({ minLat: 0, maxLat: 10, minLng: -2, maxLng: 6 });
      expect(center).toEqual({ lat: 5, lng: 2 });
    });
  });

  describe('padBoundingBox', () => {
    it('inflates the bbox by the requested fraction of its extent', () => {
      const padded = padBoundingBox({ minLat: 0, maxLat: 10, minLng: 0, maxLng: 20 }, 0.1);
      expect(padded.minLat).toBeCloseTo(-1, 5);
      expect(padded.maxLat).toBeCloseTo(11, 5);
      expect(padded.minLng).toBeCloseTo(-2, 5);
      expect(padded.maxLng).toBeCloseTo(22, 5);
    });

    it('falls back to a minimum pad on a degenerate (point) bbox', () => {
      const padded = padBoundingBox({ minLat: 5, maxLat: 5, minLng: 5, maxLng: 5 });
      expect(padded.minLat).toBeLessThan(5);
      expect(padded.maxLat).toBeGreaterThan(5);
      expect(padded.minLng).toBeLessThan(5);
      expect(padded.maxLng).toBeGreaterThan(5);
    });
  });
});
