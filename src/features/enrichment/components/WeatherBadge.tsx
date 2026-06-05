import { Image } from 'expo-image';
import { View } from 'react-native';

import { findSpriteById } from '@assets/sprites/milestones/manifest';
import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';
import { cn } from '@shared/utils/cn';

import { weatherCodeToIcon, weatherCodeToLabelKey } from '../utils/weather';

const ICON_SIZE = 16;
const TEMP_ROUNDING = 1;

export interface WeatherBadgeProps {
  /** WMO weather interpretation code (Open-Meteo `current.weather_code`). */
  weatherCode: number;
  /** Current temperature in degrees Celsius. */
  temperatureC: number;
  className?: string;
  testID?: string;
}

/**
 * Compact weather chip: a pixel condition sprite + the rounded temperature, for use on a
 * MilestoneNode or a milestone detail card. Renders nothing intrusive — caller positions it.
 */
export function WeatherBadge({ weatherCode, temperatureC, className, testID }: WeatherBadgeProps) {
  const { t } = useTranslation();
  const sprite = findSpriteById(weatherCodeToIcon(weatherCode));
  const conditionLabel = t(weatherCodeToLabelKey(weatherCode));
  const temp = t('weather.temperature', {
    value: Math.round(temperatureC / TEMP_ROUNDING) * TEMP_ROUNDING,
  });

  return (
    <View
      testID={testID ?? 'weather-badge'}
      accessibilityRole="text"
      accessibilityLabel={`${conditionLabel}, ${temp}`}
      className={cn(
        'flex-row items-center gap-1 rounded border-pixel border-border bg-surface px-1.5 py-0.5',
        className,
      )}
    >
      {sprite ? (
        <Image
          source={sprite.source}
          style={{ width: ICON_SIZE, height: ICON_SIZE }}
          contentFit="contain"
          accessibilityLabel={conditionLabel}
        />
      ) : null}
      <PixelText size="caption" family="body-bold">
        {temp}
      </PixelText>
    </View>
  );
}
