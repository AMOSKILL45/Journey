import { ActivityIndicator, Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import type { DocumentRow } from '../api/documents';
import { formatBytes, iconForFileType, type DocFileType } from '../utils/fileTypes';

export interface DocumentCardProps {
  doc: DocumentRow;
  uploaderName: string;
  isOffline: boolean;
  isBusy: boolean;
  canManage: boolean;
  onOpen: () => void;
  onToggleOffline: () => void;
  onDelete: () => void;
}

export function DocumentCard({
  doc,
  uploaderName,
  isOffline,
  isBusy,
  canManage,
  onOpen,
  onToggleOffline,
  onDelete,
}: DocumentCardProps) {
  const { t } = useTranslation();
  const isUrl = doc.file_type === 'url';

  return (
    <PixelCard className="mb-3">
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={doc.name}
        className="flex-row items-center gap-3"
      >
        <PixelText size="h2">{iconForFileType(doc.file_type as DocFileType)}</PixelText>
        <View className="flex-1">
          <PixelText size="body" family="body-medium" numberOfLines={1}>
            {doc.name}
          </PixelText>
          <PixelText size="caption" className="text-text-secondary">
            {t('documents.uploadedBy', { name: uploaderName })}
            {isUrl ? '' : ` · ${formatBytes(doc.size_bytes)}`}
          </PixelText>
        </View>
        {isOffline ? (
          <View
            testID="document-offline-badge"
            className="rounded border-2 border-border bg-secondary-500 px-2 py-1"
          >
            <PixelText size="caption" className="text-surface">
              {t('documents.offline.downloaded')}
            </PixelText>
          </View>
        ) : null}
      </Pressable>

      {!isUrl ? (
        <View className="mt-3 flex-row items-center gap-3">
          <Pressable
            onPress={onToggleOffline}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel={
              isOffline ? t('documents.offline.remove') : t('documents.offline.download')
            }
            className="flex-row items-center gap-2"
          >
            {isBusy ? <ActivityIndicator size="small" /> : null}
            <PixelText size="caption" className="text-sky-700">
              {isBusy
                ? t('documents.offline.downloading')
                : isOffline
                  ? t('documents.offline.remove')
                  : t('documents.offline.download')}
            </PixelText>
          </Pressable>
          {canManage ? (
            <Pressable
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
            >
              <PixelText size="caption" className="text-error">
                {t('common.delete')}
              </PixelText>
            </Pressable>
          ) : null}
        </View>
      ) : canManage ? (
        <View className="mt-3">
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
          >
            <PixelText size="caption" className="text-error">
              {t('common.delete')}
            </PixelText>
          </Pressable>
        </View>
      ) : null}
    </PixelCard>
  );
}
