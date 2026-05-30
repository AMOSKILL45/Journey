import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@core/theme';

import { SPLASH_DIVE_MS, splashOpacityAt, splashScaleAt } from '../choreography';

/** Rest size of the mountain icon, in dp — kept in sync with the native splash for a seamless handoff. */
const ICON_WIDTH = 160;
const ICON_SOURCE = require('@assets/images/launch-icon.png');

export interface AnimatedSplashProps {
  /** When true, the icon dives into the screen and the cream overlay crossfades away to reveal the app. */
  appReady: boolean;
  /** Fired once the dive + crossfade completes, so the host can unmount the overlay. */
  onFinish: () => void;
  /** Fired on first layout — the host hides the native splash here, so the JS overlay takes over without a flash. */
  onLayout?: () => void;
}

/**
 * Full-screen launch overlay. Holds the icon at rest (matching the native splash),
 * then on {@link AnimatedSplashProps.appReady} plays the "dive into the mountain":
 * the icon accelerates toward the viewer while the cream backdrop fades to the app.
 *
 * The animation curve lives in the tested pure worklets `splashScaleAt` /
 * `splashOpacityAt`; progress is driven linearly so those functions own the shape.
 */
export function AnimatedSplash({ appReady, onFinish, onLayout }: AnimatedSplashProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!appReady) return;
    progress.value = withTiming(
      1,
      { duration: SPLASH_DIVE_MS, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(onFinish)();
      },
    );
    return () => cancelAnimation(progress);
  }, [appReady, progress, onFinish]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: splashOpacityAt(progress.value) }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: splashScaleAt(progress.value) }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      onLayout={onLayout}
      style={[StyleSheet.absoluteFillObject, styles.overlay, overlayStyle]}
    >
      <Animated.View style={iconStyle}>
        <Image source={ICON_SOURCE} style={styles.icon} contentFit="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
  },
  icon: {
    width: ICON_WIDTH,
    height: ICON_WIDTH,
  },
});
