import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

import { extensionForMime, MAX_FILE_BYTES } from '../utils/fileTypes';

export type DocumentRow = Database['public']['Tables']['documents']['Row'];
export type DocumentInsert = Database['public']['Tables']['documents']['Insert'];

const BUCKET = 'trip-documents';
const SIGNED_URL_TTL_SEC = 60 * 60; // 1h
const IMAGE_MAX_WIDTH = 1600;
const IMAGE_QUALITY = 0.7;

export class FileTooLargeError extends Error {
  constructor() {
    super('File exceeds maximum size');
    this.name = 'FileTooLargeError';
  }
}

export interface CreateFileDocumentInput {
  tripId: string;
  milestoneId?: string | null;
  category: string;
  name: string;
  fileType: 'pdf' | 'image';
  uri: string;
  mimeType: string;
  sizeBytes: number;
}

export interface CreateUrlDocumentInput {
  tripId: string;
  milestoneId?: string | null;
  category: string;
  name: string;
  url: string;
}

function storageFileName(ext: string): string {
  return `${Date.now()}-${Math.round(Math.random() * 1_000_000_000)}.${ext}`;
}

export async function listTripDocuments(tripId: string): Promise<DocumentRow[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('trip_id', tripId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SEC);
  if (error) throw error;
  return data.signedUrl;
}

export async function createFileDocument(input: CreateFileDocumentInput): Promise<DocumentRow> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  if (input.sizeBytes > MAX_FILE_BYTES) throw new FileTooLargeError();

  let uri = input.uri;
  let mimeType = input.mimeType;
  if (input.fileType === 'image') {
    const out = await ImageManipulator.manipulateAsync(
      input.uri,
      [{ resize: { width: IMAGE_MAX_WIDTH } }],
      { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
    );
    uri = out.uri;
    mimeType = 'image/jpeg';
  }

  const storagePath = `${input.tripId}/${storageFileName(extensionForMime(mimeType))}`;
  const arrayBuffer = await fetch(uri).then((r) => r.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: mimeType, upsert: false });
  if (upErr) throw upErr;

  const insert: DocumentInsert = {
    trip_id: input.tripId,
    milestone_id: input.milestoneId ?? null,
    category: input.category,
    name: input.name,
    file_type: input.fileType,
    storage_path: storagePath,
    external_url: null,
    mime_type: mimeType,
    size_bytes: input.sizeBytes,
    uploaded_by: userData.user.id,
  };
  const { data, error } = await supabase.from('documents').insert(insert).select().single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw error;
  }
  return data;
}

export async function createUrlDocument(input: CreateUrlDocumentInput): Promise<DocumentRow> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');

  const insert: DocumentInsert = {
    trip_id: input.tripId,
    milestone_id: input.milestoneId ?? null,
    category: input.category,
    name: input.name,
    file_type: 'url',
    storage_path: null,
    external_url: input.url,
    mime_type: null,
    size_bytes: null,
    uploaded_by: userData.user.id,
  };
  const { data, error } = await supabase.from('documents').insert(insert).select().single();
  if (error) throw error;
  return data;
}

export async function deleteDocument(doc: DocumentRow): Promise<void> {
  if (doc.file_type !== 'url' && doc.storage_path) {
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  }
  const { error } = await supabase.from('documents').delete().eq('id', doc.id);
  if (error) throw error;
}
