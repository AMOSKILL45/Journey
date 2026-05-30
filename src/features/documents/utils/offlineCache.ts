import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import type { DocumentRow } from '../api/documents';

import { extensionForMime } from './fileTypes';

const registryKey = (tripId: string) => `offline-docs:${tripId}`;

function fileFor(doc: DocumentRow): File {
  return new File(
    Paths.document,
    'documents',
    doc.trip_id,
    `${doc.id}.${extensionForMime(doc.mime_type)}`,
  );
}

export function localPathFor(doc: DocumentRow): string {
  return fileFor(doc).uri;
}

export function isDownloaded(doc: DocumentRow): boolean {
  if (doc.file_type === 'url') return false;
  return fileFor(doc).exists;
}

export async function listDownloadedIds(tripId: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(registryKey(tripId));
  return raw ? (JSON.parse(raw) as string[]) : [];
}

async function addToRegistry(tripId: string, docId: string): Promise<void> {
  const ids = await listDownloadedIds(tripId);
  if (!ids.includes(docId)) {
    await AsyncStorage.setItem(registryKey(tripId), JSON.stringify([...ids, docId]));
  }
}

async function removeFromRegistry(tripId: string, docId: string): Promise<void> {
  const ids = await listDownloadedIds(tripId);
  await AsyncStorage.setItem(registryKey(tripId), JSON.stringify(ids.filter((id) => id !== docId)));
}

export async function downloadDoc(doc: DocumentRow, signedUrl: string): Promise<void> {
  if (doc.file_type === 'url') return;
  const dir = new Directory(Paths.document, 'documents', doc.trip_id);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  await File.downloadFileAsync(signedUrl, fileFor(doc));
  await addToRegistry(doc.trip_id, doc.id);
}

export async function evictDoc(doc: DocumentRow): Promise<void> {
  const file = fileFor(doc);
  if (file.exists) file.delete();
  await removeFromRegistry(doc.trip_id, doc.id);
}
