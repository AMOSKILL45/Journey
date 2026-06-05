import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTranslation } from '@core/i18n';
import { haptics, playSfx, useFeedbackSettings } from '@features/feedback';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import type { Encounter } from '../api';

export interface EncounterCardProps {
  encounter: Encounter;
  /** Persist the encounter as a milestone. The card plays the SFX + haptic; never auto-fires. */
  onAdd: (encounter: Encounter) => void;
  onDismiss: () => void;
  /** Disables Add while the create mutation is in flight. */
  adding?: boolean;
}

const ENTER_MS = 220;

/**
 * "RANDOM ENCOUNTER!" reveal card. Animates in (scale + fade) from the surprise
 * button; reduced motion collapses to a fade only. Two actions: Add (persists the
 * milestone, never automatically) and Dismiss. Distance is rendered with tabular
 * figures so the layout doesn't shift (UI spec 8E).
 */
export function EncounterCard({ encounter, onAdd, onDismiss, adding = false }: EncounterCardProps) {
  const { t } = useTranslation();
  const reduceMotion = useFeedbackSettings((s) => s.osReduceMotion);
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? withTiming(1, { duration: ENTER_MS })
      : withTiming(1, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
  }, [progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: reduceMotion ? 1 : 0.92 + 0.08 * progress.value }],
  }));

  const handleAdd = () => {
    playSfx('encounter');
    haptics.success();
    onAdd(encounter);
  };

  return (
    <Animated.View style={animatedStyle}>
      <PixelCard accessibilityLabel={t('encounters.title')} testID="encounter-card">
        <View className="mb-1 self-start rounded border-pixel border-border bg-accent-500 px-2 py-1">
          <PixelText size="pixel" family="pixel" className="text-accent-700">
            {t('encounters.title')}
          </PixelText>
        </View>

        <PixelText size="lead" family="heading" className="mt-2">
          {encounter.name}
        </PixelText>
        {/* SI unit symbol "m" is locale-invariant; only the number varies, rendered with
            tabular figures so the row doesn't shift between encounters. */}
        <PixelText
          size="small"
          family="body-medium"
          className="mt-0.5 text-text-secondary"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {`${Math.round(encounter.distance_m)} m`}
        </PixelText>

        <View className="mt-3 flex-row gap-2">
          <View className="flex-1">
            <PixelButton
              variant="primary"
              onPress={handleAdd}
              loading={adding}
              fullWidth
              accessibilityLabel={t('encounters.add')}
              testID="encounter-add"
            >
              {t('encounters.add')}
            </PixelButton>
          </View>
          <PixelButton
            variant="ghost"
            onPress={onDismiss}
            accessibilityLabel={t('encounters.dismiss')}
            testID="encounter-dismiss"
          >
            {t('encounters.dismiss')}
          </PixelButton>
        </View>
      </PixelCard>
    </Animated.View>
  );
}
