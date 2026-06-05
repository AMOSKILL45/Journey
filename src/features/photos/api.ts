import * as ImageManipulator from 'expo-image-manipulator';

import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

import type { ReactionId } from './data/reactionSet';
import { normalizeCaption } from './utils/caption';

export type PhotoRow = Database['public']['Tables']['photos']['Row'];
export type PhotoInsert = Database['public']['Tables']['photos']['Insert'];
export type ReactionRow = Database['public']['Tables']['reactions']['Row'];

export type ReactionTargetType = 'photo' | 'milestone' | 'checkin';

/** A stored photo plus a short-lived signed URL for its bytes. */
export interface PhotoWithUrl extends PhotoRow {
  url: string;
}

export const PHOTOS_BUCKET = 'trip-photos';
const SIGNED_URL_TTL_SEC = 60 * 60; // 1h
const IMAGE_MAX_WIDTH = 1600;
const IMAGE_QUALITY = 0.8;
export const MAX_PHOTO_BYTES = 25 * 1024 * 1024; // 25 MB

export class PhotoTooLargeError extends Error {
  constructor() {
    super('Photo exceeds maximum size');
    this.name = 'PhotoTooLargeError';
  }
}

function uuid(): string {
  // RFC4122 v4 via crypto if available, else a sufficiently-unique fallback for the path.
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.round(Math.random() * 1_000_000_000)}`;
}

export interface UploadPhotoInput {
  tripId: string;
  milestoneId?: string | null;
  uri: string;
  sizeBytes: number;
  caption?: string | null;
  takenAt?: string | null;
  width?: number | null;
  height?: number | null;
}

/**
 * Compress an image to <=1600px / 0.8 JPEG, reject anything over the 25 MB cap, upload to the
 * private `trip-photos` bucket at `<tripId>/<uuid>.jpg`, then insert the row. On row-insert
 * failure the orphaned object is cleaned up.
 */
export async function uploadPhoto(input: UploadPhotoInput): Promise<PhotoRow> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  if (input.sizeBytes > MAX_PHOTO_BYTES) throw new PhotoTooLargeError();

  const manipulated = await ImageManipulator.manipulateAsync(
    input.uri,
    [{ resize: { width: IMAGE_MAX_WIDTH } }],
    { compress: IMAGE_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
  );

  const storagePath = `${input.tripId}/${uuid()}.jpg`;
  const arrayBuffer = await fetch(manipulated.uri).then((r) => r.arrayBuffer());
  const { error: upErr } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(storagePath, arrayBuffer, { contentType: 'image/jpeg', upsert: false });
  if (upErr) throw upErr;

  const insert: PhotoInsert = {
    trip_id: input.tripId,
    milestone_id: input.milestoneId ?? null,
    user_id: userData.user.id,
    storage_path: storagePath,
    caption: normalizeCaption(input.caption),
    taken_at: input.takenAt ?? null,
    width: manipulated.width ?? input.width ?? null,
    height: manipulated.height ?? input.height ?? null,
    size_bytes: input.sizeBytes,
  };
  const { data, error } = await supabase.from('photos').insert(insert).select().single();
  if (error) {
    await supabase.storage.from(PHOTOS_BUCKET).remove([storagePath]);
    throw error;
  }
  return data;
}

/**
 * List a trip's photos newest-first (optionally filtered to one milestone) with a signed URL
 * per photo. Photos whose signed URL cannot be created are skipped rather than failing the list.
 */
export async function listTripPhotos(
  tripId: string,
  milestoneId?: string | null,
): Promise<PhotoWithUrl[]> {
  let query = supabase
    .from('photos')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });
  if (milestoneId) query = query.eq('milestone_id', milestoneId);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const paths = rows.map((r) => r.storage_path);
  const { data: signed, error: signErr } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SEC);
  if (signErr) throw signErr;

  const urlByPath = new Map<string, string>();
  for (const s of signed ?? []) {
    if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl);
  }

  const out: PhotoWithUrl[] = [];
  for (const row of rows) {
    const url = urlByPath.get(row.storage_path);
    if (url) out.push({ ...row, url });
  }
  return out;
}

export async function updatePhotoCaption(
  photoId: string,
  caption: string | null,
): Promise<PhotoRow> {
  const { data, error } = await supabase
    .from('photos')
    .update({ caption: normalizeCaption(caption) })
    .eq('id', photoId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePhoto(photo: Pick<PhotoRow, 'id' | 'storage_path'>): Promise<void> {
  if (photo.storage_path) {
    await supabase.storage.from(PHOTOS_BUCKET).remove([photo.storage_path]);
  }
  const { error } = await supabase.from('photos').delete().eq('id', photo.id);
  if (error) throw error;
}

export async function listReactions(
  targetType: ReactionTargetType,
  targetId: string,
): Promise<ReactionRow[]> {
  const { data, error } = await supabase
    .from('reactions')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId);
  if (error) throw error;
  return data ?? [];
}

export interface ToggleReactionResult {
  added: boolean;
}

/**
 * Toggle one reaction for the current user on a target: if a row already exists for
 * (target, user, emoji) it is deleted, otherwise it is inserted. Idempotent under the
 * UNIQUE(target_type, target_id, user_id, emoji) constraint.
 */
export async function toggleReaction(
  targetType: ReactionTargetType,
  targetId: string,
  emoji: ReactionId,
): Promise<ToggleReactionResult> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  const userId = userData.user.id;

  const { data: existing, error: selErr } = await supabase
    .from('reactions')
    .select('id')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing) {
    const { error } = await supabase.from('reactions').delete().eq('id', existing.id);
    if (error) throw error;
    return { added: false };
  }

  const { error } = await supabase.from('reactions').insert({
    target_type: targetType,
    target_id: targetId,
    user_id: userId,
    emoji,
  });
  if (error) throw error;
  return { added: true };
}
