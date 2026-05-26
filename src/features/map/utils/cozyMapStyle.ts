import { env } from '@core/env';

/**
 * Custom MapLibre style JSON for the real-map layer. Sourced from MapTiler
 * vector tiles, overridden with Cozy Arcade palette per spec section 7.3.
 * The full style was designed in Maputnik and pared down to the layers that
 * actually appear in our final design — kept inline so we don't have to
 * ship a separate JSON asset and so callers can read the palette wiring
 * from one place.
 */

export const COZY_BACKGROUND_COLOR = '#FFF8EC';
export const COZY_WATER_COLOR = '#6BBFE2';
export const COZY_GRASS_COLOR = '#2A9D8F';
export const COZY_ROAD_PRIMARY_COLOR = '#C62A38';
export const COZY_ROAD_SECONDARY_COLOR = '#A41E2A';
export const COZY_LABEL_COLOR = '#0F1A2E';
export const COZY_LABEL_HALO_COLOR = '#FFF8EC';

export interface CozyMapStyle {
  version: 8;
  glyphs: string;
  sources: Record<string, unknown>;
  layers: Record<string, unknown>[];
}

const MAPTILER_TILES = 'https://api.maptiler.com/tiles/v3/tiles.json?key=';
const MAPTILER_GLYPHS = 'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=';

export function buildCozyMapStyle(): CozyMapStyle {
  const key = env.maptilerApiKey ?? '';
  return {
    version: 8,
    glyphs: `${MAPTILER_GLYPHS}${key}`,
    sources: {
      maptiler: {
        type: 'vector',
        url: `${MAPTILER_TILES}${key}`,
      },
    },
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': COZY_BACKGROUND_COLOR },
      },
      {
        id: 'landcover-grass',
        type: 'fill',
        source: 'maptiler',
        'source-layer': 'landcover',
        filter: ['==', 'class', 'grass'],
        paint: { 'fill-color': COZY_GRASS_COLOR, 'fill-opacity': 0.35 },
      },
      {
        id: 'water',
        type: 'fill',
        source: 'maptiler',
        'source-layer': 'water',
        paint: { 'fill-color': COZY_WATER_COLOR },
      },
      {
        id: 'roads-secondary',
        type: 'line',
        source: 'maptiler',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'secondary', 'tertiary'],
        paint: {
          'line-color': COZY_ROAD_SECONDARY_COLOR,
          'line-width': 2.5,
          'line-cap': 'round',
        },
      },
      {
        id: 'roads-primary',
        type: 'line',
        source: 'maptiler',
        'source-layer': 'transportation',
        filter: ['in', 'class', 'motorway', 'primary', 'trunk'],
        paint: {
          'line-color': COZY_ROAD_PRIMARY_COLOR,
          'line-width': 4,
          'line-cap': 'round',
        },
      },
      {
        id: 'place-labels',
        type: 'symbol',
        source: 'maptiler',
        'source-layer': 'place',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Regular'],
          'text-size': 12,
        },
        paint: {
          'text-color': COZY_LABEL_COLOR,
          'text-halo-color': COZY_LABEL_HALO_COLOR,
          'text-halo-width': 2,
        },
      },
    ],
  };
}
