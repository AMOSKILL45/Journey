import { Image } from 'expo-image';
import { FlatList, View } from 'react-native';

import { AVATAR_SPRITES } from '@assets/sprites/avatars/manifest';
import { PixelCard } from '@shared/components/PixelCard';

export interface AvatarSpritePickerProps {
  value: string;
  onChange: (id: string) => void;
}

export function AvatarSpritePicker({ value, onChange }: AvatarSpritePickerProps) {
  return (
    <FlatList
      data={AVATAR_SPRITES}
      numColumns={4}
      contentContainerStyle={{ gap: 8 }}
      columnWrapperStyle={{ gap: 8 }}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PixelCard
          onPress={() => onChange(item.id)}
          variant={value === item.id ? 'elevated' : 'flat'}
          padding="sm"
          accessibilityLabel={item.label}
          className={value === item.id ? 'border-primary-600' : ''}
        >
          <View className="h-14 w-14 items-center justify-center">
            <Image source={item.source} style={{ width: 48, height: 48 }} contentFit="contain" />
          </View>
        </PixelCard>
      )}
    />
  );
}
