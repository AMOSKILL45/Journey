import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';

import type { PhotoWithUrl } from '../api';

const COLUMNS = 3;
const GAP = 6;

export interface PhotoGridProps {
  photos: PhotoWithUrl[];
  onPressPhoto: (photo: PhotoWithUrl) => void;
}

/** A simple square-thumbnail grid. Tapping a tile opens the full-screen viewer. */
export function PhotoGrid({ photos, onPressPhoto }: PhotoGridProps) {
  const { t } = useTranslation();
  return (
    <View
      className="flex-row flex-wrap"
      style={{ gap: GAP }}
      accessibilityLabel={t('photos.gridLabel')}
    >
      {photos.map((photo) => (
        <Pressable
          key={photo.id}
          onPress={() => onPressPhoto(photo)}
          accessibilityRole="imagebutton"
          accessibilityLabel={photo.caption ?? t('photos.openPhoto')}
          style={{ width: `${100 / COLUMNS}%` }}
        >
          <View className="aspect-square overflow-hidden rounded border-pixel border-border">
            <Image
              source={{ uri: photo.url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={150}
            />
          </View>
        </Pressable>
      ))}
    </View>
  );
}
