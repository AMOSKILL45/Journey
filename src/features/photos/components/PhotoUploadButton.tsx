import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

import { useUploadPhoto } from '../hooks/useTripPhotos';

export interface PhotoUploadButtonProps {
  tripId: string;
  milestoneId?: string | null;
  onUploaded?: () => void;
}

/** Pick from camera or library (expo-image-picker) and upload (compress + 25 MB cap in api). */
export function PhotoUploadButton({ tripId, milestoneId, onUploaded }: PhotoUploadButtonProps) {
  const { t } = useTranslation();
  const upload = useUploadPhoto(tripId, milestoneId);
  const [error, setError] = useState<string | null>(null);

  const pick = async (fromCamera: boolean) => {
    setError(null);
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(t('photos.errors.permissionDenied'));
      return;
    }
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 1, exif: true })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 1,
          exif: true,
        });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    try {
      await upload.mutateAsync({
        uri: a.uri,
        sizeBytes: a.fileSize ?? 0,
        width: a.width ?? null,
        height: a.height ?? null,
      });
      onUploaded?.();
    } catch (e) {
      setError(
        e instanceof Error && e.name === 'PhotoTooLargeError'
          ? t('photos.errors.tooLarge')
          : t('photos.errors.uploadFailed'),
      );
    }
  };

  return (
    <View className="gap-2">
      <View className="flex-row gap-2">
        <PixelButton
          variant="secondary"
          onPress={() => void pick(false)}
          loading={upload.isPending}
          className="flex-1"
        >
          {t('photos.addFromLibrary')}
        </PixelButton>
        <PixelButton
          variant="primary"
          onPress={() => void pick(true)}
          loading={upload.isPending}
          className="flex-1"
        >
          {t('photos.addFromCamera')}
        </PixelButton>
      </View>
      {error ? (
        <PixelText size="caption" className="text-error">
          {error}
        </PixelText>
      ) : null}
    </View>
  );
}
