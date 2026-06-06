import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useTranslation } from '@core/i18n';
import { haptics, playSfx } from '@features/feedback';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

const DEFAULT_DURATION_MS = 2500;
const ENTER_MS = 400;
const BURST_RING_COUNT = 3;
/** Cozy Arcade accent gold for the boss-clear radial burst (mirrors the spec palette). */
const BURST_TINT = '#FFCB05';

export interface BossClearCinematicProps {
  milestoneName: string;
  onDone: () => void;
  durationMs?: number;
}

/**
 * Full-screen "BOSS CLEARED!" reveal when a boss milestone is checked in. Plays a
 * Skia radial burst behind the title, auto-dismisses after
 * {@link BossClearCinematicProps.durationMs} (injectable for tests), and skips on
 * tap anywhere. Honours Reduce Motion: when enabled it renders a static composed
 * frame (no burst, no animation), still auto-dismissing + skippable. Fires
 * `playSfx('boss_cleared')` + `haptics.success()` on appear (both gated by the
 * feedback settings, including the `osReduceMotion` flag for haptics).
 *
 * Mirrors `@features/achievements/components/WorldClearCinematic` for the
 * Skia/skippable/reduced-motion idiom.
 */
export function BossClearCinematic({
  milestoneName,
  onDone,
  durationMs = DEFAULT_DURATION_MS,
}: BossClearCinematicProps) {
  const { t } = useTranslation();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    playSfx('boss_cleared');
    haptics.success();
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => {
        if (active) setReduceMotion(false);
      });
    const timer = setTimeout(onDone, durationMs);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [durationMs, onDone]);

  // While the Reduce Motion query is in flight we render the static layout so the
  // overlay (and its testID) is present immediately; the animated layout swaps in
  // once we know motion is allowed.
  const animate = reduceMotion === false;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <Pressable
        testID="bossclear-cinematic"
        accessibilityRole="button"
        accessibilityLabel={t('boss.skip')}
        onPress={onDone}
        style={styles.overlay}
      >
        <BossBurst animate={animate} />
        <BossContent
          headline={t('boss.cleared')}
          subtitle={t('boss.subtitle', { milestone: milestoneName })}
          animate={animate}
        />
        <View style={styles.skip} pointerEvents="none">
          <PixelText size="caption" className="text-cream/80">
            {t('boss.skip')}
          </PixelText>
        </View>
      </Pressable>
    </Modal>
  );
}

interface BossContentProps {
  headline: string;
  subtitle: string;
  animate: boolean;
}

function BossContent({ headline, subtitle, animate }: BossContentProps) {
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) {
      progress.value = 1;
      return;
    }
    progress.value = withSequence(
      withTiming(1.08, { duration: ENTER_MS, easing: Easing.out(Easing.back(2)) }),
      withDelay(60, withTiming(1, { duration: 140 })),
    );
  }, [animate, progress]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: animate ? Math.min(progress.value, 1) : 1,
    transform: [{ scale: progress.value }],
  }));

  return (
    <Animated.View style={cardStyle} pointerEvents="none">
      <PixelCard variant="elevated" className="items-center px-6 py-5">
        <PixelText size="h2" family="pixel" className="text-center text-primary-600">
          {headline}
        </PixelText>
        <PixelText size="lead" family="heading-bold" className="mt-3 text-center text-text-primary">
          {subtitle}
        </PixelText>
      </PixelCard>
    </Animated.View>
  );
}

interface BossBurstProps {
  animate: boolean;
}

/**
 * Skia radial burst. The Skia import is dynamic + guarded so the component never
 * crashes in the jest environment (Skia ships as untransformed ESM with a native
 * binding); on device it renders the real burst. When Skia is unavailable or
 * Reduce Motion is on, it renders nothing — the cinematic still shows the title.
 */
function BossBurst({ animate }: BossBurstProps) {
  const { width, height } = useWindowDimensions();
  const skia = useMemo(loadSkia, []);

  if (!animate || !skia) return null;

  const { Canvas, Circle, RadialGradient, vec } = skia;
  const cx = width / 2;
  const cy = height / 2;
  const maxR = Math.max(width, height);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Canvas style={StyleSheet.absoluteFill}>
        {Array.from({ length: BURST_RING_COUNT }).map((_, i) => {
          const r = (maxR / BURST_RING_COUNT) * (i + 1);
          return (
            <Circle key={i} cx={cx} cy={cy} r={r}>
              <RadialGradient
                c={vec(cx, cy)}
                r={r}
                colors={[`${BURST_TINT}AA`, `${BURST_TINT}00`]}
              />
            </Circle>
          );
        })}
      </Canvas>
    </View>
  );
}

interface SkiaModule {
  Canvas: React.ComponentType<Record<string, unknown>>;
  Circle: React.ComponentType<Record<string, unknown>>;
  RadialGradient: React.ComponentType<Record<string, unknown>>;
  vec: (x: number, y: number) => unknown;
}

function loadSkia(): SkiaModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy + guarded: Skia is untransformed ESM w/ a native binding; must no-op in jest, not crash
    const mod = require('@shopify/react-native-skia') as SkiaModule;
    return mod?.Canvas ? mod : null;
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 26, 46, 0.6)',
    paddingHorizontal: 24,
  },
  skip: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
  },
});
