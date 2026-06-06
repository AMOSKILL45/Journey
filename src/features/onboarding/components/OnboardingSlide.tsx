import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import type { OnboardingScreenConfig } from '../data/screens';

import { OnboardingIllustration } from './OnboardingIllustration';

export interface OnboardingSlideProps {
  screen: OnboardingScreenConfig;
  /** Page width so each slide fills exactly one horizontal page. */
  width: number;
}

/**
 * One onboarding page (UI spec §1): illustration placeholder (~45% height) +
 * heading (Fredoka h2) + 1–2 line body (Nunito). Sized to a single page width
 * for the paging FlatList.
 */
export function OnboardingSlide({ screen, width }: OnboardingSlideProps) {
  const { t } = useTranslation();
  const title = t(screen.titleKey);
  return (
    <View
      style={{ width }}
      className="flex-1 justify-center gap-6 px-8"
      testID={`onboarding-slide-${screen.key}`}
    >
      <OnboardingIllustration label={title} testID={`onboarding-illustration-${screen.key}`} />
      <View className="gap-3">
        <PixelText size="h2" family="heading" className="text-center">
          {title}
        </PixelText>
        <PixelText size="body" className="text-center text-text-secondary">
          {t(screen.bodyKey)}
        </PixelText>
      </View>
    </View>
  );
}
