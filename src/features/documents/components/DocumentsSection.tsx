import { useMemo, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingState } from '@shared/components/LoadingState';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

import type { DocumentRow } from '../api/documents';
import { useDeleteDocument, useTripDocuments } from '../hooks/useDocuments';
import { useOfflineDocs } from '../hooks/useOfflineDocs';
import { localPathFor } from '../utils/offlineCache';
import { openDocument } from '../utils/openDocument';

import { DocumentCard } from './DocumentCard';
import {
  DocumentUploadSheet,
  SUGGESTED_CATEGORIES,
  type DocumentUploadSheetRef,
} from './DocumentUploadSheet';
import { DocumentViewer } from './DocumentViewer';

export interface DocumentsSectionProps {
  tripId: string;
  currentUserId: string | null;
  isOwner: boolean;
  uploaderName: (userId: string) => string;
}

function categoryLabel(t: (k: string) => string, value: string): string {
  return (SUGGESTED_CATEGORIES as readonly string[]).includes(value)
    ? t(`documents.category.${value}`)
    : value || t('documents.category.other');
}

export function DocumentsSection({
  tripId,
  currentUserId,
  isOwner,
  uploaderName,
}: DocumentsSectionProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<DocumentUploadSheetRef>(null);
  const { data: docs = [], isLoading, isError, refetch } = useTripDocuments(tripId);
  const { downloadedIds, busyId, downloadDocument, evictDocument, downloadAll } =
    useOfflineDocs(tripId);
  const del = useDeleteDocument(tripId);

  const [viewerUri, setViewerUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, DocumentRow[]>();
    for (const d of docs) {
      const key = d.category || 'other';
      map.set(key, [...(map.get(key) ?? []), d]);
    }
    return Array.from(map.entries());
  }, [docs]);

  const handleOpen = async (doc: DocumentRow) => {
    setError(null);
    if (doc.file_type === 'image' && downloadedIds.includes(doc.id)) {
      setViewerUri(localPathFor(doc));
      return;
    }
    try {
      await openDocument(doc);
    } catch {
      setError(t('documents.errors.offlineFirst'));
    }
  };

  const handleToggleOffline = (doc: DocumentRow) => {
    if (downloadedIds.includes(doc.id)) void evictDocument(doc);
    else void downloadDocument(doc);
  };

  const confirmDelete = (doc: DocumentRow) => {
    Alert.alert(t('documents.delete.confirmTitle'), t('documents.delete.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => del.mutate(doc) },
    ]);
  };

  const canManage = (doc: DocumentRow) => isOwner || doc.uploaded_by === currentUserId;

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <PixelText size="h2">{t('documents.title')}</PixelText>
        {docs.length > 0 ? (
          <PixelButton variant="ghost" onPress={() => void downloadAll(docs)}>
            {t('documents.downloadAll')}
          </PixelButton>
        ) : null}
      </View>

      {error ? (
        <PixelText size="caption" className="mb-2 text-error">
          {error}
        </PixelText>
      ) : null}

      {isLoading ? (
        <LoadingState testID="documents-loading" variant="skeleton" label={t('common.loading')} />
      ) : isError ? (
        <ErrorState
          testID="documents-error"
          title={t('common.error')}
          body={t('common.somethingWentWrong')}
          onRetry={() => void refetch()}
        />
      ) : docs.length === 0 ? (
        <EmptyState
          testID="documents-empty"
          title={t('emptyStates.documents.title')}
          body={t('emptyStates.documents.body')}
          actionLabel={t('emptyStates.documents.action')}
          onAction={() => sheetRef.current?.open()}
        />
      ) : (
        <>
          {grouped.map(([cat, items]) => (
            <View key={cat} className="mb-4">
              <PixelText size="small" family="body-medium" className="mb-2 text-text-secondary">
                {categoryLabel(t, cat)}
              </PixelText>
              {items.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  uploaderName={uploaderName(doc.uploaded_by)}
                  isOffline={downloadedIds.includes(doc.id)}
                  isBusy={busyId === doc.id}
                  canManage={canManage(doc)}
                  onOpen={() => void handleOpen(doc)}
                  onToggleOffline={() => handleToggleOffline(doc)}
                  onDelete={() => confirmDelete(doc)}
                />
              ))}
            </View>
          ))}
          <PixelButton variant="primary" onPress={() => sheetRef.current?.open()} fullWidth>
            {t('documents.addCta')}
          </PixelButton>
        </>
      )}

      <DocumentUploadSheet ref={sheetRef} tripId={tripId} />
      <DocumentViewer
        visible={viewerUri !== null}
        uri={viewerUri}
        onClose={() => setViewerUri(null)}
      />
    </View>
  );
}
