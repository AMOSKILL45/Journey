import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';

// Import the standalone bridge (not the @features/onboarding barrel) so this
// hook doesn't pull the carousel/provider components into the realtime bundle.
import { requestPrePermission } from '@features/onboarding/prePermission';

import { writeLastPosition } from '../api/position';
import { cityRound, shouldBroadcast, type Stamped } from '../utils/geo';

const BACKUP_MS = 60_000;

export interface UseLocationBroadcastOptions {
  tripId: string;
  enabled: boolean; // sharing is precise|city_only and not paused/never/panic
  cityOnly: boolean; // round to ~0.1° before broadcasting
  sendPosition: (lat: number, lng: number) => void;
}

/**
 * Foreground location watcher: throttles to 5s/50m, broadcasts the position
 * over the trip channel, and backs it up to the DB every 60s. No-op unless
 * enabled. Native (`expo-location`) → only runs on a dev/EAS build.
 */
export function useLocationBroadcast({
  tripId,
  enabled,
  cityOnly,
  sendPosition,
}: UseLocationBroadcastOptions): void {
  const last = useRef<Stamped | null>(null);
  const lastBackup = useRef(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;

    void (async () => {
      // Pre-permission priming (10A): explain the value before the OS prompt.
      // Only prime when not already granted; "Not now" defers without prompting.
      const current = await Location.getForegroundPermissionsAsync();
      if (cancelled) return;
      if (current.status !== 'granted') {
        if (!(await requestPrePermission('location'))) return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled || status !== 'granted') return;
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 25, timeInterval: 5000 },
        (loc) => {
          const now = Date.now();
          const next = { lat: loc.coords.latitude, lng: loc.coords.longitude };
          if (!shouldBroadcast(last.current, next, now)) return;
          last.current = { ...next, ts: now };
          const lat = cityOnly ? cityRound(next.lat) : next.lat;
          const lng = cityOnly ? cityRound(next.lng) : next.lng;
          sendPosition(lat, lng);
          if (now - lastBackup.current >= BACKUP_MS) {
            lastBackup.current = now;
            void writeLastPosition(tripId, lat, lng);
          }
        },
      );
    })();

    return () => {
      cancelled = true;
      sub?.remove();
      last.current = null;
    };
  }, [enabled, cityOnly, tripId, sendPosition]);
}
