import { Pressable, View } from 'react-native';

import { PixelText } from '@shared/components/PixelText';

export interface PixelClusterProps {
  count: number;
  onPress?: () => void;
}

const SIZE = 48;

/**
 * Round pixel-art bubble used to collapse overlapping milestones / avatars
 * when the camera is too far out for individual nodes to be distinguishable.
 * Phase 7 will animate a radial "spread" on tap; for now we expose onPress
 * and rely on the parent to handle navigation.
 */
export function PixelCluster({ count, onPress }: PixelClusterProps) {
  const Container = onPress ? Pressable : View;
  return (
    <Container
      onPress={onPress}
      style={{
        width: SIZE,
        height: SIZE,
        borderRadius: SIZE / 2,
        backgroundColor: '#E63946',
        borderWidth: 3,
        borderColor: '#A41E2A',
        justifyContent: 'center',
        alignItems: 'center',
      }}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Cluster of ${count} milestones`}
    >
      <PixelText size="caption" className="text-white">
        {`+${count}`}
      </PixelText>
    </Container>
  );
}
