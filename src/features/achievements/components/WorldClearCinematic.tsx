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
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import { RARITY_FRAME } from '../rarity';
import { playUnlockSfx } from '../sound';
import type { Rarity } from '../types';

const DEFAULT_DURATION_MS = 2500;
const ENTER_MS = 320;
const BURST_RING_COUNT = 3;

/** Solid tint per rarity for the Skia radial burst (the NativeWind frame classes
 *  in {@link RARITY_FRAME} can't be read at runtime, so we mirror the palette here). */
const RARITY_BURST: Record<Rarity, string> = {
  common: '#FCEFD5',
  rare: '#6BBFE2',
  epic: '#2A9D8F',
  legendary: '#FFCB05',
};

export interface WorldClearCinematicProps {
  id: string;
  nameKey: string;
  descriptionKey: string;
  rarity: string;
  onDone: () => void;
  durationMs?: number;
}

/**
 * Full-screen "World Clear" reveal for `rare`+ unlocks. Plays a Skia radial
 * burst behind the badge, auto-dismisses after {@link WorldClearCinematicProps.durationMs}
 * (injectable for tests), and skips on tap anywhere. Honours Reduce Motion: when
 * enabled it renders a static reveal card with identical content (no animation),
 * still auto-dismissing. Sound is a muted no-op until Phase 6C.
 */
export function WorldClearCinematic({
  id,
  nameKey,
  descriptionKey,
  rarity,
  onDone,
  durationMs = DEFAULT_DURATION_MS,
}: WorldClearCinematicProps) {
  const { t } = useTranslation();
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  const tint = RARITY_BURST[rarity as Rarity] ?? RARITY_BURST.common;
  const frame = RARITY_FRAME[rarity as Rarity] ?? RARITY_FRAME.common;
  const name = nameKey ? t(nameKey) : '';
  const description = descriptionKey ? t(descriptionKey) : '';

  useEffect(() => {
    let active = true;
    playUnlockSfx(rarity);
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
  }, [durationMs, onDone, rarity]);

  // While the Reduce Motion query is in flight we render the static layout so the
  // overlay (and its testID) is present immediately; the animated layout swaps in
  // once we know motion is allowed.
  const animate = reduceMotion === false;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onDone}>
      <Pressable
        testID="worldclear-cinematic"
        accessibilityRole="button"
        accessibilityLabel={t('achievements.cinematic.skip')}
        onPress={onDone}
        style={styles.overlay}
      >
        <CinematicBurst tint={tint} animate={animate} />
        <CinematicContent
          badgeId={id}
          frame={frame}
          name={name}
          description={description}
          headline={t('achievements.cinematic.unlocked')}
          animate={animate}
        />
        <Pressable
          testID="worldclear-skip"
          accessibilityRole="button"
          accessibilityLabel={t('achievements.cinematic.skip')}
          onPress={onDone}
          style={styles.skip}
        >
          <PixelText size="caption" className="text-cream/80">
            {t('achievements.cinematic.skip')}
          </PixelText>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface CinematicContentProps {
  badgeId: string;
  frame: string;
  name: string;
  description: string;
  headline: string;
  animate: boolean;
}

function CinematicContent({
  badgeId,
  frame,
  name,
  description,
  headline,
  animate,
}: CinematicContentProps) {
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
        <PixelText size="caption" className="mb-2 text-text-secondary">
          {headline}
        </PixelText>
        <View
          testID={`worldclear-badge-${badgeId}`}
          className={`h-24 w-24 items-center justify-center rounded-xl border-2 ${frame}`}
        >
          <PixelText size="h1">{name ? name.slice(0, 1).toUpperCase() : '?'}</PixelText>
        </View>
        <PixelText size="h3" family="heading-bold" className="mt-3 text-center">
          {name}
        </PixelText>
        {description ? (
          <PixelText size="caption" className="mt-1 text-center text-text-secondary">
            {description}
          </PixelText>
        ) : null}
      </PixelCard>
    </Animated.View>
  );
}

interface CinematicBurstProps {
  tint: string;
  animate: boolean;
}

/**
 * Skia radial burst. The Skia import is dynamic + guarded so the component never
 * crashes in the jest environment (Skia ships as untransformed ESM with a native
 * binding); on device it renders the real burst. When Skia is unavailable or
 * Reduce Motion is on, it renders nothing — the cinematic still shows the badge.
 */
function CinematicBurst({ tint, animate }: CinematicBurstProps) {
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
              <RadialGradient c={vec(cx, cy)} r={r} colors={[`${tint}AA`, `${tint}00`]} />
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
    // eslint-disable-next-line @typescript-eslint/no-require-imports
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
    backgroundColor: 'rgba(15, 26, 46, 0.82)',
    paddingHorizontal: 24,
  },
  skip: {
    position: 'absolute',
    bottom: 48,
    alignSelf: 'center',
  },
});
