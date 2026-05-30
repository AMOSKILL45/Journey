import { useCallback, useEffect, useState } from 'react';

import { getSignedUrl, type DocumentRow } from '../api/documents';
import { downloadDoc, evictDoc, listDownloadedIds } from '../utils/offlineCache';

export function useOfflineDocs(tripId: string) {
  const [downloadedIds, setDownloadedIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setDownloadedIds(await listDownloadedIds(tripId));
  }, [tripId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const downloadDocument = useCallback(
    async (doc: DocumentRow) => {
      if (doc.file_type === 'url' || !doc.storage_path) return;
      setBusyId(doc.id);
      try {
        const url = await getSignedUrl(doc.storage_path);
        await downloadDoc(doc, url);
        await refresh();
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const evictDocument = useCallback(
    async (doc: DocumentRow) => {
      setBusyId(doc.id);
      try {
        await evictDoc(doc);
        await refresh();
      } finally {
        setBusyId(null);
      }
    },
    [refresh],
  );

  const downloadAll = useCallback(
    async (docs: DocumentRow[]) => {
      for (const doc of docs) {
        if (doc.file_type !== 'url') {
          await downloadDocument(doc);
        }
      }
    },
    [downloadDocument],
  );

  return { downloadedIds, busyId, downloadDocument, evictDocument, downloadAll, refresh };
}
