import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { useFeedbackSettings } from '@features/feedback/store/feedbackSettings';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

import { ONBOARDING_SCREENS, type OnboardingScreenConfig } from '../data/screens';

import { CarouselDots } from './CarouselDots';
import { OnboardingSlide } from './OnboardingSlide';

const SKIP_HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 };

export interface OnboardingCarouselProps {
  /** Called when the user finishes (last screen "Get started") or taps Skip. */
  onComplete: () => void;
}

/**
 * First-run onboarding carousel (10A, UI spec §1): a 4-screen, fully skippable
 * paging FlatList with a dots indicator, a top-right Skip, and a Next /
 * "Get started" footer button (gesture-alternative — never gesture-only).
 * Reduced motion → instant page changes. `onComplete` fires for both Skip and
 * the final CTA; the caller persists the flag + routes onward.
 */
export function OnboardingCarousel({ onComplete }: OnboardingCarouselProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const reduceMotion = useFeedbackSettings((s) => s.osReduceMotion);
  const listRef = useRef<FlatList<OnboardingScreenConfig>>(null);
  const [index, setIndex] = useState(0);

  const lastIndex = ONBOARDING_SCREENS.length - 1;
  const isLast = index >= lastIndex;

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(e.nativeEvent.contentOffset.x / width);
      setIndex((prev) => (prev === next ? prev : next));
    },
    [width],
  );

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete();
      return;
    }
    const next = index + 1;
    setIndex(next);
    listRef.current?.scrollToIndex({ index: next, animated: !reduceMotion });
  }, [index, isLast, onComplete, reduceMotion]);

  const renderItem = useCallback(
    ({ item }: { item: OnboardingScreenConfig }) => <OnboardingSlide screen={item} width={width} />,
    [width],
  );

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top', 'bottom']}>
      <View className="flex-row justify-end px-4 py-2">
        <Pressable
          onPress={onComplete}
          hitSlop={SKIP_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.skip')}
          testID="onboarding-skip"
          className="px-3 py-2"
        >
          <PixelText size="body" family="body-medium" className="text-text-secondary">
            {t('onboarding.skip')}
          </PixelText>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={ONBOARDING_SCREENS}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        testID="onboarding-carousel-list"
      />

      <View className="gap-6 px-8 pb-4 pt-2">
        <View className="items-center">
          <CarouselDots count={ONBOARDING_SCREENS.length} activeIndex={index} />
        </View>
        <PixelButton
          onPress={goNext}
          fullWidth
          accessibilityLabel={t(isLast ? 'onboarding.getStarted' : 'onboarding.next')}
          testID="onboarding-next"
        >
          {t(isLast ? 'onboarding.getStarted' : 'onboarding.next')}
        </PixelButton>
      </View>
    </SafeAreaView>
  );
}
