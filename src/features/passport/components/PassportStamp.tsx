import { View } from 'react-native';

import { PixelText } from '@shared/components/PixelText';

import { countryName, flagFor } from '../flags';
import type { Stamp } from '../passport';

export function PassportStamp({ stamp }: { stamp: Stamp }) {
  const date = stamp.at ? stamp.at.slice(0, 10) : '';
  // One screen-reader element per stamp: speak the place + country name (+ date)
  // rather than the decorative flag emoji.
  const country = countryName(stamp.country);
  const a11yLabel = [stamp.label, country, date].filter(Boolean).join(', ');
  return (
    <View
      testID={`stamp-${stamp.milestone_id}`}
      accessible
      accessibilityRole="image"
      accessibilityLabel={a11yLabel}
      className="w-24 items-center rounded-lg border-2 border-border bg-surface-alt p-2"
    >
      <PixelText size="h2" importantForAccessibility="no">
        {flagFor(stamp.country)}
      </PixelText>
      <PixelText
        size="caption"
        numberOfLines={2}
        className="text-center"
        importantForAccessibility="no"
      >
        {stamp.label}
      </PixelText>
      {date ? (
        <PixelText size="caption" className="text-text-secondary" importantForAccessibility="no">
          {date}
        </PixelText>
      ) : null}
    </View>
  );
}
