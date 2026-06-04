import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import { useFeedbackSettings } from '../store/feedbackSettings';

const VOLUME_STEPS = [0, 0.25, 0.5, 0.75, 1] as const;

function Toggle({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      className="flex-row items-center justify-between py-2"
    >
      <PixelText size="body">{label}</PixelText>
      <View
        className={`h-6 w-11 rounded-full border-2 border-border ${
          value ? 'bg-secondary-500' : 'bg-surface-alt'
        }`}
      />
    </Pressable>
  );
}

export function FeedbackSettings() {
  const { t } = useTranslation();
  const s = useFeedbackSettings();
  return (
    <View className="gap-1">
      <PixelText size="h2" className="mb-2">
        {t('feedback.settings.title')}
      </PixelText>
      <Toggle
        label={t('feedback.sfx')}
        value={s.sfxEnabled}
        onToggle={() => s.setSfx(!s.sfxEnabled)}
      />
      <Toggle
        label={t('feedback.uiSounds')}
        value={s.uiSoundsEnabled}
        onToggle={() => s.setUiSounds(!s.uiSoundsEnabled)}
      />
      <Toggle
        label={t('feedback.music')}
        value={s.musicEnabled}
        onToggle={() => s.setMusic(!s.musicEnabled)}
      />
      <Toggle
        label={t('feedback.haptics')}
        value={s.hapticsEnabled}
        onToggle={() => s.setHaptics(!s.hapticsEnabled)}
      />
      <View className="flex-row items-center justify-between py-2">
        <PixelText size="body">{t('feedback.volume')}</PixelText>
        <View className="flex-row gap-1">
          {VOLUME_STEPS.map((step) => (
            <Pressable
              key={step}
              testID={`vol-${step}`}
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => s.setVolume(step)}
              className={`h-6 w-6 rounded border-2 border-border ${
                step > 0 && s.masterVolume >= step ? 'bg-accent-500' : 'bg-surface-alt'
              }`}
            />
          ))}
        </View>
      </View>
    </View>
  );
}
