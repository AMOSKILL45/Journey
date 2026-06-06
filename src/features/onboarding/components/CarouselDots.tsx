import { View } from 'react-native';

import { colors } from '@core/theme';

const DOT_SIZE = 10;
const DOT_GAP = 8;
const INACTIVE_OPACITY = 0.2;

export interface CarouselDotsProps {
  count: number;
  activeIndex: number;
}

/**
 * Page indicator for the onboarding carousel (UI spec §1): active dot =
 * primary-500, inactive = border @ 20%. Exposed to screen readers as a single
 * `progressbar` with `accessibilityValue` (min/max/now) — the idiomatic RN
 * pattern, so no extra i18n string is required and individual dots stay hidden.
 */
export function CarouselDots({ count, activeIndex }: CarouselDotsProps) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: count, now: activeIndex + 1 }}
      style={{ flexDirection: 'row', gap: DOT_GAP }}
    >
      {Array.from({ length: count }).map((_, i) => {
        const active = i === activeIndex;
        return (
          <View
            key={i}
            testID={`onboarding-dot-${i}`}
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              width: DOT_SIZE,
              height: DOT_SIZE,
              borderRadius: DOT_SIZE / 2,
              backgroundColor: colors.primary[500],
              opacity: active ? 1 : INACTIVE_OPACITY,
            }}
          />
        );
      })}
    </View>
  );
}
