import {
  COZY_BACKGROUND_COLOR,
  COZY_ROAD_PRIMARY_COLOR,
  COZY_WATER_COLOR,
  buildCozyMapStyle,
} from '../utils/cozyMapStyle';

jest.mock('@core/env', () => ({
  env: { maptilerApiKey: 'test-key' },
}));

describe('buildCozyMapStyle', () => {
  const style = buildCozyMapStyle();

  it('declares MapLibre style version 8', () => {
    expect(style.version).toBe(8);
  });

  it('points the vector source at MapTiler with the configured key', () => {
    const source = style.sources['maptiler'] as { type: string; url: string };
    expect(source.type).toBe('vector');
    expect(source.url).toContain('test-key');
  });

  it('uses the cream background', () => {
    const bg = style.layers.find((l) => l.id === 'background') as
      | { paint: { 'background-color': string } }
      | undefined;
    expect(bg).toBeDefined();
    expect(bg?.paint['background-color']).toBe(COZY_BACKGROUND_COLOR);
  });

  it('paints water in the sky-500 color', () => {
    const water = style.layers.find((l) => l.id === 'water') as
      | { paint: { 'fill-color': string } }
      | undefined;
    expect(water).toBeDefined();
    expect(water?.paint['fill-color']).toBe(COZY_WATER_COLOR);
  });

  it('paints primary roads in primary-600', () => {
    const roads = style.layers.find((l) => l.id === 'roads-primary') as
      | { paint: { 'line-color': string } }
      | undefined;
    expect(roads).toBeDefined();
    expect(roads?.paint['line-color']).toBe(COZY_ROAD_PRIMARY_COLOR);
  });

  it('declares a glyphs URL with the configured key', () => {
    expect(style.glyphs).toContain('test-key');
    expect(style.glyphs).toMatch(/\{fontstack\}/);
    expect(style.glyphs).toMatch(/\{range\}/);
  });
});
