import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

import type { PhotoWithUrl } from '../api';
import { useDeletePhoto, useUpdatePhotoCaption } from '../hooks/useTripPhotos';
import { isValidCaption, normalizeCaption } from '../utils/caption';

import { ReactionBar } from './ReactionBar';

export interface PhotoViewerProps {
  tripId: string;
  photo: PhotoWithUrl | null;
  currentUserId: string | null;
  canManage: boolean;
  onClose: () => void;
}

/** Full-screen photo with caption editing (author/editor), reactions, and delete. */
export function PhotoViewer({
  tripId,
  photo,
  currentUserId,
  canManage,
  onClose,
}: PhotoViewerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const updateCaption = useUpdatePhotoCaption(tripId);
  const del = useDeletePhoto(tripId);

  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCaption(photo?.caption ?? '');
    setError(null);
  }, [photo]);

  if (!photo) return null;

  const canEditCaption = canManage || photo.user_id === currentUserId;

  const handleSaveCaption = async () => {
    if (!isValidCaption(caption)) {
      setError(t('photos.errors.captionTooLong'));
      return;
    }
    setError(null);
    try {
      await updateCaption.mutateAsync({ photoId: photo.id, caption: normalizeCaption(caption) });
    } catch {
      setError(t('photos.errors.saveFailed'));
    }
  };

  const handleDelete = async () => {
    try {
      await del.mutateAsync({ id: photo.id, storage_path: photo.storage_path });
      onClose();
    } catch {
      setError(t('photos.errors.deleteFailed'));
    }
  };

  return (
    <Modal visible animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-text-primary">
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
        >
          <View className="mb-3 flex-row justify-end px-4">
            <PixelButton variant="ghost" size="sm" onPress={onClose} className="bg-surface">
              {t('common.done')}
            </PixelButton>
          </View>

          <Image
            source={{ uri: photo.url }}
            style={{ width: '100%', aspectRatio: 1 }}
            contentFit="contain"
            transition={150}
            accessibilityLabel={photo.caption ?? t('photos.openPhoto')}
          />

          <View className="gap-3 px-4 pt-4">
            <ReactionBar targetType="photo" targetId={photo.id} currentUserId={currentUserId} />

            {canEditCaption ? (
              <>
                <PixelInput
                  label={t('photos.captionLabel')}
                  placeholder={t('photos.captionPlaceholder')}
                  value={caption}
                  onChangeText={setCaption}
                  multiline
                />
                <PixelButton
                  variant="secondary"
                  onPress={() => void handleSaveCaption()}
                  loading={updateCaption.isPending}
                >
                  {t('photos.saveCaption')}
                </PixelButton>
              </>
            ) : photo.caption ? (
              <PixelText size="body" className="text-surface">
                {photo.caption}
              </PixelText>
            ) : null}

            {error ? (
              <PixelText size="caption" className="text-error">
                {error}
              </PixelText>
            ) : null}

            {canManage || photo.user_id === currentUserId ? (
              <Pressable accessibilityRole="button" onPress={() => void handleDelete()}>
                <PixelText size="caption" family="body-bold" className="text-error">
                  {t('photos.deletePhoto')}
                </PixelText>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
