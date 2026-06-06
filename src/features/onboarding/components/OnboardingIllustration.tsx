import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useFeedbackSettings } from '@features/feedback/store/feedbackSettings';
import { PixelAvatar } from '@shared/components/PixelAvatar';
import { PixelCard } from '@shared/components/PixelCard';

const BOB_DISTANCE = 8;
const BOB_DURATION_MS = 1100;
/** Decorative avatar shown inside the placeholder frame (real art = asset task). */
const PLACEHOLDER_AVATAR_ID = 'avatars/adventurer_1';

export interface OnboardingIllustrationProps {
  /** Accessibility label describing the illustration (the screen heading). */
  label: string;
  testID?: string;
}

/**
 * Pixel-art illustration placeholder (UI spec §1) — a `PixelCard` frame with a
 * single ambient-motion element (a gently bobbing avatar). The bob is the ONE
 * permitted animated element per view and is disabled under reduced motion
 * (static frame). The avatar is decorative; the frame carries the a11y label.
 */
export function OnboardingIllustration({ label, testID }: OnboardingIllustrationProps) {
  const reduceMotion = useFeedbackSettings((s) => s.osReduceMotion);
  const bob = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      bob.value = 0;
      return;
    }
    bob.value = withRepeat(
      withTiming(1, { duration: BOB_DURATION_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reduceMotion, bob]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -bob.value * BOB_DISTANCE }],
  }));

  return (
    <PixelCard
      variant="elevated"
      padding="lg"
      accessibilityLabel={label}
      testID={testID}
      className="min-h-[220px] w-full items-center justify-center"
    >
      <Animated.View style={animatedStyle}>
        <View accessibilityElementsHidden importantForAccessibility="no">
          <PixelAvatar spriteId={PLACEHOLDER_AVATAR_ID} label={label} size="md" />
        </View>
      </Animated.View>
    </PixelCard>
  );
}
