import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  MILESTONE_SPRITES,
  MILESTONE_SPRITE_CATEGORIES,
  type MilestoneSpriteCategory,
  type MilestoneSpriteId,
} from '@assets/sprites/milestones/manifest';
import { useTranslation } from '@core/i18n';
import { PixelChip } from '@shared/components/PixelChip';
import { PixelText } from '@shared/components/PixelText';
import { cn } from '@shared/utils/cn';

export interface SpritePickerProps {
  visible: boolean;
  selectedSpriteId?: MilestoneSpriteId | null;
  initialCategory?: MilestoneSpriteCategory | 'all';
  onSelect: (id: MilestoneSpriteId) => void;
  onClose: () => void;
}

const SPRITE_TILE_SIZE = 64;

export function SpritePicker({
  visible,
  selectedSpriteId,
  initialCategory = 'all',
  onSelect,
  onClose,
}: SpritePickerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<MilestoneSpriteCategory | 'all'>(initialCategory);

  const filtered = useMemo(
    () =>
      category === 'all'
        ? MILESTONE_SPRITES
        : MILESTONE_SPRITES.filter((s) => s.category === category),
    [category],
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View className="flex-1 bg-text-primary/60">
        <Pressable className="flex-1" onPress={onClose} accessibilityLabel={t('common.cancel')} />
        <View
          className="rounded-t-2xl border-t-pixel border-border bg-surface"
          style={{ paddingBottom: insets.bottom + 16, maxHeight: '85%' }}
        >
          <View className="flex-row items-center justify-between border-b-2 border-border px-5 py-4">
            <PixelText size="h2">{t('milestones.spritePicker.title')}</PixelText>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <PixelText size="body" className="text-text-secondary">
                {t('common.cancel')}
              </PixelText>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingVertical: 12 }}
            className="border-b-2 border-border"
          >
            <PixelChip
              label={t('milestones.spritePicker.all')}
              selected={category === 'all'}
              onPress={() => setCategory('all')}
            />
            {MILESTONE_SPRITE_CATEGORIES.map((cat) => (
              <PixelChip
                key={cat}
                label={t(`milestones.spritePicker.categories.${cat}`)}
                selected={category === cat}
                onPress={() => setCategory(cat)}
              />
            ))}
          </ScrollView>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View className="flex-row flex-wrap" style={{ gap: 12 }}>
              {filtered.map((sprite) => {
                const isSelected = sprite.id === selectedSpriteId;
                return (
                  <Pressable
                    key={sprite.id}
                    onPress={() => onSelect(sprite.id)}
                    accessibilityRole="button"
                    accessibilityLabel={sprite.label}
                    accessibilityState={{ selected: isSelected }}
                    className={cn(
                      'items-center justify-center rounded-md border-2 border-border bg-surface-alt p-2',
                      isSelected && 'border-primary-600 bg-accent-500',
                    )}
                    style={{ width: SPRITE_TILE_SIZE + 16, height: SPRITE_TILE_SIZE + 16 }}
                  >
                    <Image
                      source={sprite.source}
                      style={{ width: SPRITE_TILE_SIZE, height: SPRITE_TILE_SIZE }}
                      contentFit="contain"
                    />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
