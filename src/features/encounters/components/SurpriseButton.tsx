import { ActivityIndicator, Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { haptics } from '@features/feedback';
import { PixelText } from '@shared/components/PixelText';

export interface SurpriseButtonProps {
  /** Fire the encounter search (the screen wires this to the fetch mutation). */
  onPress: () => void;
  /** While true the button shows a spinner and is non-interactive (fetch >300ms). */
  loading?: boolean;
  disabled?: boolean;
}

/**
 * Mystery "?" pixel box — the entry point to the random-encounter feature. Gold
 * accent, ≥44pt, light haptic on press. While fetching it shows a spinner and is
 * disabled so the user can't double-fire (UI spec 8E).
 */
export function SurpriseButton({
  onPress,
  loading = false,
  disabled = false,
}: SurpriseButtonProps) {
  const { t } = useTranslation();
  const interactive = !loading && !disabled;

  const handlePress = () => {
    if (!interactive) return;
    haptics.light();
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!interactive}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={t('encounters.surprise')}
      accessibilityState={{ disabled: !interactive, busy: loading }}
      testID="surprise-button"
    >
      {({ pressed }) => (
        <View
          className={`min-h-[44px] flex-row items-center justify-center gap-2 rounded border-pixel border-border bg-accent-500 px-4 py-3 ${
            interactive && pressed ? 'translate-x-[2px] translate-y-[2px]' : ''
          } ${interactive ? '' : 'opacity-50'}`}
          style={{
            shadowColor: '#0F1A2E',
            shadowOffset: {
              width: interactive && pressed ? 2 : 4,
              height: interactive && pressed ? 2 : 4,
            },
            shadowOpacity: 1,
            shadowRadius: 0,
            elevation: 0,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#0F1A2E" />
          ) : (
            <PixelText size="pixel" family="pixel" className="text-accent-700">
              ?
            </PixelText>
          )}
          <PixelText size="body" family="heading" className="text-accent-700">
            {t('encounters.surprise')}
          </PixelText>
        </View>
      )}
    </Pressable>
  );
}
