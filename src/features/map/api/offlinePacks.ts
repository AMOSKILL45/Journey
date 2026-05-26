import { OfflineManager, type OfflinePack } from '@maplibre/maplibre-react-native';

import { buildCozyMapStyle } from '../utils/cozyMapStyle';
import { padBoundingBox, type BoundingBox } from '../utils/mercator';

const PACK_ID_PREFIX = 'trip-';
const DEFAULT_MIN_ZOOM = 8;
const DEFAULT_MAX_ZOOM = 16;
const TRIP_PADDING_FRACTION = 0.3;

export type OfflineDownloadProgress = {
  /** 0–1 share of resources downloaded. */
  fraction: number;
  completedTileCount: number;
  completedResourceSize: number;
  state: 'inactive' | 'active' | 'complete';
};

export type OfflineDownloadProgressListener = (progress: OfflineDownloadProgress) => void;
export type OfflineDownloadErrorListener = (error: { id: string; message: string }) => void;

interface CreatePackOptions {
  tripId: string;
  bbox: BoundingBox;
  minZoom?: number;
  maxZoom?: number;
  onProgress?: OfflineDownloadProgressListener;
  onError?: OfflineDownloadErrorListener;
}

function packIdForTrip(tripId: string): string {
  return `${PACK_ID_PREFIX}${tripId}`;
}

/**
 * Kicks off an offline pack download for a trip's bounding box. The bbox is
 * padded so the user can pan slightly past the milestones without falling
 * off the cached area. Returns the created OfflinePack so callers can show
 * status / cancel.
 *
 * Per spec section 7.6, packs are zoom 8-16 (~50-200 MB per trip).
 */
export async function downloadTripPack({
  tripId,
  bbox,
  minZoom = DEFAULT_MIN_ZOOM,
  maxZoom = DEFAULT_MAX_ZOOM,
  onProgress,
  onError,
}: CreatePackOptions): Promise<OfflinePack> {
  const padded = padBoundingBox(bbox, TRIP_PADDING_FRACTION);
  return OfflineManager.createPack(
    {
      mapStyle: JSON.stringify(buildCozyMapStyle()),
      bounds: [padded.minLng, padded.minLat, padded.maxLng, padded.maxLat],
      minZoom,
      maxZoom,
      metadata: { tripId, kind: 'trip-pack' },
    },
    (_pack, status) => {
      if (!onProgress) return;
      const completed = status.completedResourceCount ?? 0;
      const required = status.requiredResourceCount ?? 0;
      onProgress({
        fraction: required > 0 ? completed / required : 0,
        completedTileCount: status.completedTileCount ?? 0,
        completedResourceSize: status.completedResourceSize ?? 0,
        state: status.state,
      });
    },
    (_pack, error) => {
      onError?.(error);
    },
  );
}

export async function deleteTripPack(tripId: string): Promise<void> {
  await OfflineManager.deletePack(packIdForTrip(tripId));
}

export async function listOfflinePacks(): Promise<OfflinePack[]> {
  return OfflineManager.getPacks();
}

/**
 * Looks up an existing pack for a trip by scanning metadata.tripId.
 * MapLibre IDs packs by the styleURL by default, so we tag with metadata to
 * find ours back.
 */
export async function findTripPack(tripId: string): Promise<OfflinePack | null> {
  const packs = await OfflineManager.getPacks();
  for (const pack of packs) {
    const metadata = pack.metadata as { tripId?: string } | undefined;
    if (metadata?.tripId === tripId) return pack;
  }
  return null;
}
