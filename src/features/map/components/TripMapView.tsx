import { View } from 'react-native';

import type { Milestone } from '@features/milestones';

import { MapCrossfade, type MapCrossfadeProps } from './MapCrossfade';

export type TripMapViewProps = MapCrossfadeProps;

const DEFAULT_HEIGHT = 480;

/**
 * Embeddable map view for use inside a trip detail screen. Wraps
 * MapCrossfade with a sized container so the map can live inside a
 * scrollable parent without taking the whole screen.
 *
 * Callers control sizing via the wrapping View — this component sets a
 * sensible default height (480) so it's never zero-sized by accident.
 */
export function TripMapView(props: TripMapViewProps) {
  return (
    <View style={{ height: DEFAULT_HEIGHT, overflow: 'hidden', borderRadius: 12 }}>
      <MapCrossfade {...props} />
    </View>
  );
}

export type { Milestone };
