import { Canvas, Circle, Group, LinearGradient, Path, Rect, vec } from '@shopify/react-native-skia';
import { useWindowDimensions } from 'react-native';

import { WORLD_THEMES, type WorldThemeId } from '../utils/worldThemes';

export interface OverworldBackgroundProps {
  themeId: WorldThemeId;
}

/** Lerp a 6-digit hex toward a target hex by t in [0,1]. */
function mixHex(hex: string, target: string, t: number): string {
  const a = hex.replace('#', '');
  const b = target.replace('#', '');
  const ch = (s: string, i: number) => parseInt(s.slice(i, i + 2), 16);
  const lerp = (x: number, y: number) => Math.round(x + (y - x) * t);
  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(lerp(ch(a, 0), ch(b, 0)))}${toHex(lerp(ch(a, 2), ch(b, 2)))}${toHex(lerp(ch(a, 4), ch(b, 4)))}`;
}
const darken = (hex: string, t: number) => mixHex(hex, '#000000', t);
const lighten = (hex: string, t: number) => mixHex(hex, '#ffffff', t);

/** A puffy cloud = a few overlapping circles. */
function cloudCircles(cx: number, cy: number, r: number) {
  return [
    { cx: cx - r * 1.2, cy: cy + r * 0.2, r: r * 0.8 },
    { cx: cx - r * 0.4, cy, r },
    { cx: cx + r * 0.6, cy: cy + r * 0.1, r: r * 0.9 },
    { cx: cx + r * 1.4, cy: cy + r * 0.3, r: r * 0.65 },
  ];
}

/**
 * Procedurally-rendered Cozy-Arcade overworld: a themed sky gradient, a soft sun,
 * clouds, layered rolling hills and scattered foliage/flowers — all driven by the
 * world-theme palette (no image assets). Milestone nodes + the path are drawn on top
 * by OverworldLayer. Hand-painted tiles are a later asset task; this keeps the main
 * view reading as a game world in the meantime (replaces the flat placeholder PNG).
 */
export function OverworldBackground({ themeId }: OverworldBackgroundProps) {
  const { width: W, height: H } = useWindowDimensions();
  const theme = WORLD_THEMES[themeId];

  const groundTop = H * 0.42;
  const sunX = W * 0.8;
  const sunY = H * 0.16;
  const sunR = Math.min(W, H) * 0.09;

  // Back + front hill silhouettes, filled to the bottom of the canvas.
  const backHill =
    `M 0 ${groundTop} ` +
    `Q ${W * 0.28} ${groundTop - H * 0.07} ${W * 0.52} ${groundTop} ` +
    `Q ${W * 0.8} ${groundTop + H * 0.05} ${W} ${groundTop - H * 0.03} ` +
    `L ${W} ${H} L 0 ${H} Z`;
  const frontHill =
    `M 0 ${groundTop + H * 0.09} ` +
    `Q ${W * 0.24} ${groundTop + H * 0.02} ${W * 0.5} ${groundTop + H * 0.09} ` +
    `Q ${W * 0.78} ${groundTop + H * 0.17} ${W} ${groundTop + H * 0.07} ` +
    `L ${W} ${H} L 0 ${H} Z`;

  const groundDark = darken(theme.groundColor, 0.24);
  const groundLight = lighten(theme.groundColor, 0.1);
  const bushColor = darken(theme.groundColor, 0.34);

  const clouds = [
    { x: W * 0.2, y: H * 0.12, r: H * 0.028 },
    { x: W * 0.6, y: H * 0.08, r: H * 0.022 },
    { x: W * 0.88, y: H * 0.26, r: H * 0.018 },
  ];
  const bushes = [0.12, 0.34, 0.58, 0.74, 0.91].map((fx, i) => ({
    cx: W * fx,
    cy: groundTop + H * (0.12 + (i % 2) * 0.05),
    r: H * 0.02,
  }));
  const flowers = [0.08, 0.2, 0.3, 0.45, 0.55, 0.66, 0.8, 0.93].map((fx, i) => ({
    cx: W * fx,
    cy: groundTop + H * (0.2 + (i % 3) * 0.06),
    color: theme.accentColors[i % theme.accentColors.length] ?? theme.skyBottomColor,
  }));

  return (
    <Canvas style={{ position: 'absolute', width: W, height: H }}>
      {/* Sky */}
      <Rect x={0} y={0} width={W} height={H}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(0, H * 0.7)}
          colors={[theme.skyTopColor, theme.skyBottomColor]}
        />
      </Rect>

      {/* Sun: soft halo + core */}
      <Circle
        cx={sunX}
        cy={sunY}
        r={sunR * 1.7}
        color={lighten(theme.skyTopColor, 0.45)}
        opacity={0.3}
      />
      <Circle cx={sunX} cy={sunY} r={sunR} color="#FFF7DA" opacity={0.92} />

      {/* Clouds */}
      {clouds.map((c, i) => (
        <Group key={`cloud-${i}`} opacity={0.92}>
          {cloudCircles(c.x, c.y, c.r).map((p, j) => (
            <Circle key={j} cx={p.cx} cy={p.cy} r={p.r} color="#FFFFFF" />
          ))}
        </Group>
      ))}

      {/* Rolling hills, back to front */}
      <Path path={backHill} color={groundDark} />
      <Path path={frontHill} color={theme.groundColor} />
      <Rect x={0} y={H - H * 0.04} width={W} height={H * 0.04} color={groundLight} opacity={0.5} />

      {/* Foliage + flowers */}
      {bushes.map((b, i) => (
        <Group key={`bush-${i}`}>
          <Circle cx={b.cx - b.r * 0.7} cy={b.cy} r={b.r * 0.8} color={bushColor} />
          <Circle cx={b.cx + b.r * 0.7} cy={b.cy} r={b.r * 0.8} color={bushColor} />
          <Circle cx={b.cx} cy={b.cy - b.r * 0.4} r={b.r} color={bushColor} />
        </Group>
      ))}
      {flowers.map((f, i) => (
        <Group key={`flower-${i}`}>
          <Circle cx={f.cx} cy={f.cy} r={H * 0.007} color={f.color} />
          <Circle cx={f.cx} cy={f.cy} r={H * 0.003} color="#FFF7DA" />
        </Group>
      ))}
    </Canvas>
  );
}
