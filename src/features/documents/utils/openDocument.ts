import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';

import { getSignedUrl, type DocumentRow } from '../api/documents';

import { downloadDoc, isDownloaded, localPathFor } from './offlineCache';

/**
 * Opens a document. URL docs open in the browser. File docs are ensured on disk
 * (downloaded via signed URL if needed) then handed to the system viewer.
 * Throws if a file is not cached and cannot be fetched (offline) — the caller
 * surfaces `documents.errors.offlineFirst`.
 */
export async function openDocument(doc: DocumentRow): Promise<void> {
  if (doc.file_type === 'url') {
    if (doc.external_url) await Linking.openURL(doc.external_url);
    return;
  }
  if (!doc.storage_path) throw new Error('Missing storage path');

  if (!isDownloaded(doc)) {
    const url = await getSignedUrl(doc.storage_path);
    await downloadDoc(doc, url);
  }
  const path = localPathFor(doc);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: doc.mime_type ?? undefined });
  } else {
    await Linking.openURL(path);
  }
}
