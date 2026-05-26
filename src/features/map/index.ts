// Public API surface of the Phase 3 map module.

// Components
export { TripMapView } from './components/TripMapView';
export type { TripMapViewProps } from './components/TripMapView';
export { MapModeToggle } from './components/MapModeToggle';
export type { MapMode, MapModeToggleProps } from './components/MapModeToggle';
export { MapCrossfade } from './components/MapCrossfade';
export type { MapCrossfadeProps } from './components/MapCrossfade';
export { OverworldBackground } from './components/OverworldBackground';
export type { OverworldBackgroundProps } from './components/OverworldBackground';
export { OverworldLayer } from './components/OverworldLayer';
export type { OverworldLayerProps } from './components/OverworldLayer';
export { RealMapLayer } from './components/RealMapLayer';
export type { RealMapLayerProps } from './components/RealMapLayer';
export { PixelCluster } from './components/PixelCluster';
export type { PixelClusterProps } from './components/PixelCluster';

// Hooks
export { useTripBoundingBox } from './hooks/useTripBoundingBox';
export {
  CROSSFADE_END,
  CROSSFADE_START,
  MAX_ZOOM,
  MIN_ZOOM,
  clampZoom,
  computeOverworldOpacity,
  computeRealMapOpacity,
  useZoomLevel,
} from './hooks/useZoomLevel';
export type { UseZoomLevelResult } from './hooks/useZoomLevel';
export { useMapCamera, suggestedZoomForBBox } from './hooks/useMapCamera';
export type { UseMapCameraOptions, UseMapCameraResult } from './hooks/useMapCamera';
export { usePinchZoom } from './hooks/usePinchZoom';

// Utils
export {
  bboxCenter,
  computeBoundingBox,
  latLngToPixel,
  padBoundingBox,
  pixelToLatLng,
} from './utils/mercator';
export type { BoundingBox, LatLng, PixelXY } from './utils/mercator';
export { CLUSTER_THRESHOLD_PX, cluster } from './utils/clustering';
export type { Cluster, ClusterablePoint } from './utils/clustering';
export {
  DEFAULT_WORLD_THEME_ID,
  WORLD_THEME_IDS,
  WORLD_THEMES,
  pickWorldTheme,
} from './utils/worldThemes';
export type { WorldTheme, WorldThemeId } from './utils/worldThemes';
export { buildCozyMapStyle } from './utils/cozyMapStyle';
export type { CozyMapStyle } from './utils/cozyMapStyle';

// API
export {
  deleteTripPack,
  downloadTripPack,
  findTripPack,
  listOfflinePacks,
} from './api/offlinePacks';
export type {
  OfflineDownloadProgress,
  OfflineDownloadProgressListener,
  OfflineDownloadErrorListener,
} from './api/offlinePacks';
