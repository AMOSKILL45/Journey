import { View } from 'react-native';

import { PixelText } from '@shared/components/PixelText';

import { flagFor } from '../flags';
import type { Stamp } from '../passport';

export function PassportStamp({ stamp }: { stamp: Stamp }) {
  const date = stamp.at ? stamp.at.slice(0, 10) : '';
  return (
    <View
      testID={`stamp-${stamp.milestone_id}`}
      className="w-24 items-center rounded-lg border-2 border-border bg-surface-alt p-2"
    >
      <PixelText size="h2">{flagFor(stamp.country)}</PixelText>
      <PixelText size="caption" numberOfLines={2} className="text-center">
        {stamp.label}
      </PixelText>
      {date ? (
        <PixelText size="caption" className="text-text-secondary">
          {date}
        </PixelText>
      ) : null}
    </View>
  );
}
