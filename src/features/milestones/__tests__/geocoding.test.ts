import { env } from '@core/env';

import { GeocodingNotConfiguredError, searchPlaces, type GeocodingResult } from '../api/geocoding';

const originalKey = (env as { maptilerApiKey?: string }).maptilerApiKey;

function setApiKey(key: string | undefined) {
  (env as { maptilerApiKey?: string }).maptilerApiKey = key;
}

describe('geocoding.searchPlaces', () => {
  beforeEach(() => {
    setApiKey('test-key');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    setApiKey(originalKey);
  });

  it('returns empty array for queries shorter than 2 chars', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    expect(await searchPlaces('')).toEqual([]);
    expect(await searchPlaces(' a ')).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('throws GeocodingNotConfiguredError when API key is missing', async () => {
    setApiKey(undefined);
    await expect(searchPlaces('Paris')).rejects.toBeInstanceOf(GeocodingNotConfiguredError);
  });

  it('parses MapTiler features into GeocodingResult[]', async () => {
    const mockJson = {
      type: 'FeatureCollection',
      features: [
        {
          id: 'place.1',
          type: 'Feature',
          text_en: 'Paris',
          place_name_en: 'Paris, France',
          center: [2.3522, 48.8566],
          properties: { country_code: 'fr' },
        },
        {
          id: 'place.2',
          type: 'Feature',
          text: 'Lyon',
          place_name: 'Lyon, France',
          center: [4.85, 45.75],
          properties: { country_code: 'fr' },
        },
      ],
    };
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockJson,
    } as Response);

    const results = await searchPlaces('paris');

    expect(results).toHaveLength(2);
    const [first, second] = results as [GeocodingResult, GeocodingResult];
    expect(first.name).toBe('Paris');
    expect(first.address).toBe('Paris, France');
    expect(first.lat).toBeCloseTo(48.8566);
    expect(first.lng).toBeCloseTo(2.3522);
    expect(first.countryCode).toBe('fr');
    expect(second.name).toBe('Lyon');
  });

  it('builds URL with key, limit and language', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ type: 'FeatureCollection', features: [] }),
    } as Response);

    await searchPlaces('Tokyo', { limit: 3, language: 'fr' });

    const call = fetchSpy.mock.calls[0];
    expect(call).toBeDefined();
    const url = call?.[0] as string;
    expect(url).toContain('https://api.maptiler.com/geocoding/Tokyo.json');
    expect(url).toContain('key=test-key');
    expect(url).toContain('limit=3');
    expect(url).toContain('language=fr');
  });

  it('throws when the response is not ok', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as Response);
    await expect(searchPlaces('Berlin')).rejects.toThrow(/Geocoding failed \(429\)/);
  });

  it('skips features without valid coordinates', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', text: 'No coords' },
          { type: 'Feature', text: 'Bad', center: [null, null] },
          { type: 'Feature', text: 'Good', center: [1, 2] },
        ],
      }),
    } as Response);
    const results = await searchPlaces('test');
    expect(results.map((r) => r.name)).toEqual(['Good']);
  });
});
