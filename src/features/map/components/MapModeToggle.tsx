import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';
import { cn } from '@shared/utils/cn';

export type MapMode = 'path' | 'map';

export interface MapModeToggleProps {
  mode: MapMode;
  onChange: (next: MapMode) => void;
}

const MODES: readonly { id: MapMode; i18nKey: string }[] = [
  { id: 'path', i18nKey: 'map.toggle.path' },
  { id: 'map', i18nKey: 'map.toggle.map' },
];

/**
 * Pixel-art segmented control for the Path / Map switch on the trip detail
 * screen. Two pill buttons inside a single bordered container — the active
 * pill is filled primary-500, inactive is surface with text-primary.
 */
export function MapModeToggle({ mode, onChange }: MapModeToggleProps) {
  const { t } = useTranslation();

  return (
    <View className="mb-3 flex-row self-center rounded-full border-2 border-primary-700 bg-surface p-1">
      {MODES.map((entry) => {
        const isActive = mode === entry.id;
        return (
          <Pressable
            key={entry.id}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              if (!isActive) onChange(entry.id);
            }}
            className={cn('rounded-full px-4 py-1', isActive ? 'bg-primary-500' : 'bg-transparent')}
          >
            <PixelText
              size="small"
              family="body-semibold"
              className={isActive ? 'text-white' : 'text-text-primary'}
            >
              {t(entry.i18nKey)}
            </PixelText>
          </Pressable>
        );
      })}
    </View>
  );
}
