import { useState } from 'react';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import type { PhotoWithUrl } from '../api';
import { useTripPhotos } from '../hooks/useTripPhotos';

import { PhotoGrid } from './PhotoGrid';
import { PhotoUploadButton } from './PhotoUploadButton';
import { PhotoViewer } from './PhotoViewer';

export interface PhotoSectionProps {
  tripId: string;
  /** When set, scopes the gallery to a single milestone (per-milestone album). */
  milestoneId?: string | null;
  currentUserId: string | null;
  /** True if the viewer can delete/edit any photo (owner or editor). */
  canManage: boolean;
  /** Hide the section heading (e.g. when embedded under a milestone). */
  hideTitle?: boolean;
}

/** Trip-level or per-milestone photo gallery: grid + uploader + full-screen viewer. */
export function PhotoSection({
  tripId,
  milestoneId = null,
  currentUserId,
  canManage,
  hideTitle = false,
}: PhotoSectionProps) {
  const { t } = useTranslation();
  const { data: photos = [], isLoading } = useTripPhotos(tripId, milestoneId);
  const [active, setActive] = useState<PhotoWithUrl | null>(null);

  return (
    <View>
      {hideTitle ? null : (
        <View className="mb-3 flex-row items-center justify-between">
          <PixelText size="h2">{t('photos.title')}</PixelText>
          {photos.length > 0 ? (
            <PixelText size="caption" className="text-text-secondary">
              {t('photos.count', { count: photos.length })}
            </PixelText>
          ) : null}
        </View>
      )}

      <View className="mb-3">
        <PhotoUploadButton tripId={tripId} milestoneId={milestoneId} />
      </View>

      {isLoading ? (
        <PixelText size="body" className="text-text-secondary">
          {t('common.loading')}
        </PixelText>
      ) : photos.length === 0 ? (
        <PixelCard className="items-center">
          <PixelText size="h3" className="mb-2">
            {t('photos.empty.title')}
          </PixelText>
          <PixelText size="body" className="text-center text-text-secondary">
            {t('photos.empty.body')}
          </PixelText>
        </PixelCard>
      ) : (
        <PhotoGrid photos={photos} onPressPhoto={setActive} />
      )}

      <PhotoViewer
        tripId={tripId}
        photo={active}
        currentUserId={currentUserId}
        canManage={canManage}
        onClose={() => setActive(null)}
      />
    </View>
  );
}
