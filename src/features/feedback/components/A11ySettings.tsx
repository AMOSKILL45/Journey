import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import { useFeedbackSettings } from '../store/feedbackSettings';

/**
 * Accessibility settings panel (UI spec §3 / design §4). Owns the Readable Mode
 * toggle and is grouped visually with the reduce-motion / haptics controls.
 * NOTE: not wired into the profile screen here — the screen owner imports it.
 */
export function A11ySettings() {
  const { t } = useTranslation();
  const readableModeManual = useFeedbackSettings((s) => s.readableModeManual);
  const setReadableModeManual = useFeedbackSettings((s) => s.setReadableModeManual);

  return (
    <View className="gap-1">
      <PixelText size="h3" className="mb-1">
        {t('a11y.sectionTitle')}
      </PixelText>
      <Pressable
        onPress={() => setReadableModeManual(!readableModeManual)}
        accessibilityRole="switch"
        accessibilityState={{ checked: readableModeManual }}
        accessibilityLabel={t('a11y.readableMode')}
        accessibilityHint={t('a11y.readableModeDescription')}
        className="flex-row items-start justify-between gap-3 py-2"
      >
        <View className="flex-1 gap-0.5">
          <PixelText size="body">{t('a11y.readableMode')}</PixelText>
          <PixelText size="small" className="text-text-secondary">
            {t('a11y.readableModeDescription')}
          </PixelText>
        </View>
        <View
          className={`mt-1 h-6 w-11 rounded-full border-2 border-border ${
            readableModeManual ? 'bg-secondary-500' : 'bg-surface-alt'
          }`}
        />
      </Pressable>
    </View>
  );
}
