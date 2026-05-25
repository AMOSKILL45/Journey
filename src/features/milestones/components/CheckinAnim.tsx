import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { findSpriteById } from '@assets/sprites/milestones/manifest';

const COIN_SPRITE_ID = 'milestones/star_gold';
const COIN_COUNT = 8;
const ANIM_DURATION = 900;
const BURST_RADIUS = 120;
const COIN_SIZE = 32;

export interface CheckinAnimProps {
  visible: boolean;
  onComplete: () => void;
}

interface CoinProps {
  angleRad: number;
  delay: number;
  source: ReturnType<typeof findSpriteById>;
  startProgress: number;
}

function Coin({ angleRad, delay, source, startProgress }: CoinProps) {
  const progress = useSharedValue(startProgress);

  useEffect(() => {
    if (startProgress >= 1) return;
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: ANIM_DURATION, easing: Easing.out(Easing.cubic) }),
    );
    return () => cancelAnimation(progress);
  }, [delay, progress, startProgress]);

  const animatedStyle = useAnimatedStyle(() => {
    const distance = BURST_RADIUS * progress.value;
    return {
      transform: [
        { translateX: Math.cos(angleRad) * distance },
        { translateY: Math.sin(angleRad) * distance - progress.value * 40 },
        { scale: 1 - progress.value * 0.2 },
      ],
      opacity: 1 - progress.value,
    };
  }, [angleRad]);

  if (!source) return null;
  return (
    <Animated.View style={[styles.coin, animatedStyle]}>
      <Image source={source.source} style={{ width: COIN_SIZE, height: COIN_SIZE }} />
    </Animated.View>
  );
}

export function CheckinAnim({ visible, onComplete }: CheckinAnimProps) {
  const scale = useSharedValue(0);
  const sprite = findSpriteById(COIN_SPRITE_ID);

  useEffect(() => {
    if (!visible) {
      scale.value = 0;
      return;
    }
    scale.value = withSequence(
      withTiming(1.4, { duration: 200, easing: Easing.out(Easing.back(2)) }),
      withTiming(1, { duration: 150 }),
      withDelay(
        ANIM_DURATION - 350,
        withTiming(0, { duration: 150 }, (finished) => {
          if (finished) runOnJS(onComplete)();
        }),
      ),
    );
  }, [visible, scale, onComplete]);

  const centerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value > 0 ? 1 : 0,
  }));

  if (!visible || !sprite) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
      <View style={styles.center}>
        <Animated.View style={centerStyle}>
          <Image
            source={sprite.source}
            style={{ width: COIN_SIZE * 2, height: COIN_SIZE * 2 }}
            contentFit="contain"
          />
        </Animated.View>
        {Array.from({ length: COIN_COUNT }).map((_, i) => (
          <Coin
            key={i}
            angleRad={(i / COIN_COUNT) * Math.PI * 2}
            delay={150 + (i % 4) * 30}
            source={sprite}
            startProgress={0}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coin: {
    position: 'absolute',
  },
});
