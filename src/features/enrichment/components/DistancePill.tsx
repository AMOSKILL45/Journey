import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';
import { cn } from '@shared/utils/cn';

import { formatDistance, formatDuration, type DistanceUnit } from '../utils/distance';

const SEPARATOR = ' · ';

export interface DistancePillProps {
  /** Driving distance between two milestones, in meters. */
  distanceM: number;
  /** Driving duration between two milestones, in seconds. */
  durationS: number;
  /** Measurement system for the distance. Default metric. */
  unit?: DistanceUnit;
  className?: string;
  testID?: string;
}

/**
 * Small "120 km · 1h30" pill rendered at the midpoint of a MilestoneEdge. Distance + duration
 * come pre-cached from `milestone_legs`; this is pure presentation.
 */
export function DistancePill({
  distanceM,
  durationS,
  unit = 'metric',
  className,
  testID,
}: DistancePillProps) {
  const { t } = useTranslation();
  const distance = formatDistance(distanceM, unit);
  const duration = formatDuration(durationS);
  const label = `${distance}${SEPARATOR}${duration}`;

  return (
    <View
      testID={testID ?? 'distance-pill'}
      accessibilityRole="text"
      accessibilityLabel={t('distance.legLabel', { distance, duration })}
      className={cn(
        'flex-row items-center rounded border-pixel border-border bg-surface-alt px-1.5 py-0.5',
        className,
      )}
    >
      <PixelText size="caption" family="body-medium" numberOfLines={1}>
        {label}
      </PixelText>
    </View>
  );
}
