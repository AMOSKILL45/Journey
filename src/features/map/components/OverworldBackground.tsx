import { Canvas, Image as SkiaImage, useImage } from '@shopify/react-native-skia';
import { useWindowDimensions, View } from 'react-native';

import { WORLD_THEMES, type WorldThemeId } from '../utils/worldThemes';

export interface OverworldBackgroundProps {
  themeId: WorldThemeId;
}

/**
 * Skia-rendered themed background for the overworld layer. Falls back to a
 * solid color view while the image is still decoding (useImage returns null
 * synchronously on first render). Cloud drift + decorative sprites land in
 * Phase 8 — the current art is a placeholder gradient.
 */
export function OverworldBackground({ themeId }: OverworldBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const theme = WORLD_THEMES[themeId];
  const image = useImage(theme.background);

  if (!image) {
    return (
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: theme.skyBottomColor,
        }}
      />
    );
  }

  return (
    <Canvas style={{ position: 'absolute', width, height }}>
      <SkiaImage image={image} x={0} y={0} width={width} height={height} fit="cover" />
    </Canvas>
  );
}
