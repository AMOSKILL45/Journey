import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { useTripMembers } from '@features/trips/hooks/useTripMembers';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingState } from '@shared/components/LoadingState';
import { PixelText } from '@shared/components/PixelText';

import type { PhotoWithUrl } from '../api';
import { resolveAuthorName } from '../data/ghostAuthor';
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
  const { data: photos = [], isLoading, isError, refetch } = useTripPhotos(tripId, milestoneId);
  const { data: members = [] } = useTripMembers(tripId);
  const [active, setActive] = useState<PhotoWithUrl | null>(null);

  // Resolve the active photo's author to a display name (ghost-aware) for the viewer byline.
  const activeAuthorName = useMemo(() => {
    if (!active) return null;
    const member = members.find((m) => m.user_id === active.user_id);
    return resolveAuthorName(active.user_id, member?.profile?.display_name ?? null);
  }, [active, members]);

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
        <LoadingState variant="skeleton" label={t('common.loading')} />
      ) : isError ? (
        <ErrorState
          title={t('photos.title')}
          body={t('common.somethingWentWrong')}
          onRetry={() => void refetch()}
        />
      ) : photos.length === 0 ? (
        <EmptyState title={t('emptyStates.photos.title')} body={t('emptyStates.photos.body')} />
      ) : (
        <PhotoGrid photos={photos} onPressPhoto={setActive} />
      )}

      <PhotoViewer
        tripId={tripId}
        photo={active}
        authorName={activeAuthorName}
        currentUserId={currentUserId}
        canManage={canManage}
        onClose={() => setActive(null)}
      />
    </View>
  );
}
