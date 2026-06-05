import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';

import { t } from '@core/i18n';

import { formatStatLine, type CardStat } from '../utils/cardLayout';
import type { TripStats } from '../utils/stats';

/** Story-card canvas dimensions (portrait 9:16-ish, pixel-art friendly). */
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
/** Up to this many photo thumbnails are composited on the card. */
export const MAX_CARD_PHOTOS = 6;
/** Up to this many milestone dots are drawn on the path strip. */
export const MAX_CARD_DOTS = 12;

const PNG_QUALITY = 100;
const PADDING = 72;
const TITLE_SIZE = 84;
const SUBTITLE_SIZE = 40;
const STAT_VALUE_SIZE = 64;
const STAT_LABEL_SIZE = 30;
const DOT_RADIUS = 18;
const DOT_GAP = 56;
const DOT_STRIP_Y = 470;
const THUMB_SIZE = 300;
const THUMB_GAP = 24;
const THUMB_TOP = 560;
const THUMB_RADIUS = 24;
const STATS_TOP = 300;

/** Cozy Arcade palette mirrored for Skia (NativeWind classes are unreadable at runtime). */
const COLORS = {
  skyTop: '#6BBFE2',
  skyBottom: '#FFF8EC',
  panel: '#FFFFFF',
  ink: '#0F1A2E',
  inkSoft: '#5E6779',
  coin: '#FFCB05',
  primary: '#E63946',
  secondary: '#2A9D8F',
} as const;

/** A milestone reduced to what the card draws: a dot, tinted if it's a boss. */
export interface CardMilestone {
  id: string;
  isBoss: boolean;
}

/**
 * Minimal structural type for a decoded Skia image so this module never imports
 * Skia's types directly (the package is a native binding, unloadable in jest).
 */
export interface SkiaImageLike {
  width(): number;
  height(): number;
}

export interface ScrapbookCardProps {
  title: string;
  stats: TripStats;
  milestones: readonly CardMilestone[];
  /**
   * Number of photo slots to frame on the card (a teaser of the trip's gallery). The
   * photo-rich artifact is the PDF album, whose bytes the edge function embeds server-side.
   */
  photoCount?: number;
  /**
   * Optional pre-decoded photo bitmaps drawn into the framed slots. Loading remote bitmaps
   * client-side requires a static Skia import (unsafe in jest / OTA builds), so callers may
   * leave this empty and rely on the PDF for the real photos.
   */
  photos?: readonly SkiaImageLike[];
}

/** Imperative handle: capture the rendered canvas as a base64 PNG. */
export interface ScrapbookCardHandle {
  /** PNG bytes of the current canvas, base64-encoded; null if Skia is unavailable. */
  renderToPngBase64: () => string | null;
}

interface SkiaModule {
  Canvas: React.ComponentType<Record<string, unknown>>;
  Group: React.ComponentType<Record<string, unknown>>;
  Fill: React.ComponentType<Record<string, unknown>>;
  Rect: React.ComponentType<Record<string, unknown>>;
  RoundedRect: React.ComponentType<Record<string, unknown>>;
  Circle: React.ComponentType<Record<string, unknown>>;
  Image: React.ComponentType<Record<string, unknown>>;
  Text: React.ComponentType<Record<string, unknown>>;
  LinearGradient: React.ComponentType<Record<string, unknown>>;
  vec: (x: number, y: number) => unknown;
  matchFont: (style: Record<string, unknown>) => unknown;
  useCanvasRef: () => { current: CanvasRefLike | null };
  ImageFormat: { PNG: number };
}

interface CanvasRefLike {
  makeImageSnapshot: () => { encodeToBase64: (fmt?: number, quality?: number) => string } | null;
}

/**
 * Dynamically load Skia, guarded so it returns null in the jest environment (Skia ships
 * untransformed ESM with a native binding) and on builds without the module. Mirrors the
 * loader in `WorldClearCinematic`.
 */
function loadSkia(): SkiaModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('@shopify/react-native-skia') as SkiaModule;
    return mod?.Canvas ? mod : null;
  } catch {
    return null;
  }
}

/**
 * Skia "story" card for a trip: title, four headline stats, a strip of milestone dots, and
 * up to {@link MAX_CARD_PHOTOS} photo thumbnails — laid out for a pixel-perfect PNG export.
 *
 * The component renders an off-screen-sized Skia `Canvas`; the parent reads the bitmap via
 * the {@link ScrapbookCardHandle.renderToPngBase64} imperative handle (driven by
 * `makeImageSnapshot().encodeToBase64()`). When Skia is unavailable (jest, or a build without
 * the native module) it renders nothing and `renderToPngBase64()` returns null — the api then
 * surfaces a friendly error rather than crashing.
 *
 * Real pixel-art framing/stamps land as an asset task (Phase 8); the current art is a
 * placeholder gradient + panels.
 */
export const ScrapbookCard = forwardRef<ScrapbookCardHandle, ScrapbookCardProps>(
  function ScrapbookCard({ title, stats, milestones, photoCount = 0, photos = [] }, ref) {
    const skia = useMemo(loadSkia, []);
    const fallbackRef = useRef<CanvasRefLike | null>(null);
    const canvasRef = skia ? skia.useCanvasRef() : fallbackRef;

    useImperativeHandle(
      ref,
      () => ({
        renderToPngBase64: () => {
          if (!skia || !canvasRef.current) return null;
          const snapshot = canvasRef.current.makeImageSnapshot();
          if (!snapshot) return null;
          return snapshot.encodeToBase64(skia.ImageFormat.PNG, PNG_QUALITY);
        },
      }),
      [skia, canvasRef],
    );

    if (!skia) return null;

    const {
      Canvas,
      Group,
      Fill,
      RoundedRect,
      Circle,
      Image,
      Text,
      LinearGradient,
      vec,
      matchFont,
    } = skia;

    const titleFont = matchFont({
      fontFamily: 'Helvetica',
      fontSize: TITLE_SIZE,
      fontWeight: 'bold',
    });
    const subtitleFont = matchFont({ fontFamily: 'Helvetica', fontSize: SUBTITLE_SIZE });
    const statValueFont = matchFont({
      fontFamily: 'Helvetica',
      fontSize: STAT_VALUE_SIZE,
      fontWeight: 'bold',
    });
    const statLabelFont = matchFont({ fontFamily: 'Helvetica', fontSize: STAT_LABEL_SIZE });

    const dots = milestones.slice(0, MAX_CARD_DOTS);
    const slotCount = Math.min(MAX_CARD_PHOTOS, Math.max(photoCount, photos.length));
    const slots = Array.from({ length: slotCount }, (_, i) => photos[i] ?? null);
    const statLines = buildStatLines(stats);
    const subtitle = t('scrapbook.card.subtitle');

    const columns = 3;
    const thumbStride = THUMB_SIZE + THUMB_GAP;

    return (
      <Canvas ref={canvasRef} style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}>
        {/* Sky gradient background */}
        <Fill>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(0, CARD_HEIGHT)}
            colors={[COLORS.skyTop, COLORS.skyBottom]}
          />
        </Fill>

        {/* Title + subtitle */}
        <Text
          x={PADDING}
          y={PADDING + TITLE_SIZE}
          text={title}
          font={titleFont}
          color={COLORS.ink}
        />
        <Text
          x={PADDING}
          y={PADDING + TITLE_SIZE + SUBTITLE_SIZE + 16}
          text={subtitle}
          font={subtitleFont}
          color={COLORS.inkSoft}
        />

        {/* Stats row: value over label, evenly spaced */}
        {statLines.map((line, i) => {
          const x = PADDING + i * ((CARD_WIDTH - PADDING * 2) / statLines.length);
          return (
            <Group key={line.key}>
              <Text
                x={x}
                y={STATS_TOP + STAT_VALUE_SIZE}
                text={line.value}
                font={statValueFont}
                color={COLORS.primary}
              />
              <Text
                x={x}
                y={STATS_TOP + STAT_VALUE_SIZE + STAT_LABEL_SIZE + 8}
                text={line.label}
                font={statLabelFont}
                color={COLORS.inkSoft}
              />
            </Group>
          );
        })}

        {/* Milestone path strip: dots, boss tinted */}
        {dots.map((m, i) => (
          <Circle
            key={m.id}
            cx={PADDING + DOT_RADIUS + i * DOT_GAP}
            cy={DOT_STRIP_Y}
            r={DOT_RADIUS}
            color={m.isBoss ? COLORS.coin : COLORS.secondary}
          />
        ))}

        {/* Photo thumbnail slots: a framed panel per slot, with the bitmap overlaid when supplied */}
        {slots.map((img, i) => {
          const col = i % columns;
          const row = Math.floor(i / columns);
          const x = PADDING + col * thumbStride;
          const y = THUMB_TOP + row * thumbStride;
          return (
            <Group key={i}>
              <RoundedRect
                x={x}
                y={y}
                width={THUMB_SIZE}
                height={THUMB_SIZE}
                r={THUMB_RADIUS}
                color={COLORS.panel}
              />
              {img ? (
                <Image image={img} x={x} y={y} width={THUMB_SIZE} height={THUMB_SIZE} fit="cover" />
              ) : null}
            </Group>
          );
        })}
      </Canvas>
    );
  },
);

/** Map the numeric stats into the four labelled lines drawn on the card. */
function buildStatLines(stats: TripStats): CardStat[] {
  return [
    formatStatLine('distance', t('scrapbook.stats.distance'), stats.distanceM),
    formatStatLine('countries', t('scrapbook.stats.countries'), stats.countries),
    formatStatLine('days', t('scrapbook.stats.days'), stats.days),
    formatStatLine('checkins', t('scrapbook.stats.checkins'), stats.checkins),
  ];
}
