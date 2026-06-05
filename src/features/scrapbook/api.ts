import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { supabase } from '@core/supabase/client';
import type { Database } from '@core/supabase/types';

import type { StatsLeg, StatsMilestone, StatsTrip } from './utils/stats';

export type ScrapbookRow = Database['public']['Tables']['scrapbooks']['Row'];

type CheckinRow = Database['public']['Tables']['checkins']['Row'];

/** Everything the client needs to render the story card + compute stats for a trip. */
export interface ScrapbookInputs {
  trip: StatsTrip & { name: string };
  milestones: (StatsMilestone & { id: string; is_boss: boolean | null })[];
  legs: StatsLeg[];
  checkins: CheckinRow[];
  /** Number of photos on the trip (used to frame thumbnail slots on the card). */
  photoCount: number;
}

/** Private bucket holding the rendered PNG story cards and PDF albums. */
export const SCRAPBOOKS_BUCKET = 'trip-scrapbooks';
/** Edge-function slug that composes the PDF album + inserts the `scrapbooks` row. */
export const GENERATE_SCRAPBOOK_FN = 'generate_scrapbook';
const SIGNED_URL_TTL_SEC = 60 * 60; // 1h
const PNG_CONTENT_TYPE = 'image/png';
const PNG_EXTENSION = 'png';
const PDF_EXTENSION = 'pdf';
const PDF_MIME_TYPE = 'application/pdf';

/** Which scrapbook artifact a share/download targets. */
export type ScrapbookArtifact = 'png' | 'pdf';

export class SharingUnavailableError extends Error {
  constructor() {
    super('Sharing is not available on this device');
    this.name = 'SharingUnavailableError';
  }
}

/** Result of a scrapbook generation: short-lived signed URLs for both artifacts. */
export interface ScrapbookResult {
  pngUrl: string | null;
  pdfUrl: string | null;
}

/** A stored scrapbook plus signed URLs for its PNG/PDF (when present). */
export interface ScrapbookWithUrls extends ScrapbookRow {
  pngUrl: string | null;
  pdfUrl: string | null;
}

export class ScrapbookRenderError extends Error {
  constructor() {
    super('Could not render the scrapbook card');
    this.name = 'ScrapbookRenderError';
  }
}

function uuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.round(Math.random() * 1_000_000_000)}`;
}

/** Decode a base64 PNG into raw bytes via a disposable cache file (no base64 lib needed). */
async function base64PngToBytes(pngBase64: string): Promise<Uint8Array> {
  const file = new File(Paths.cache, `scrapbook-${uuid()}.${PNG_EXTENSION}`);
  if (file.exists) file.delete();
  file.create();
  file.write(pngBase64, { encoding: 'base64' });
  const bytes = await file.bytes();
  file.delete();
  return bytes;
}

export interface GenerateScrapbookInput {
  tripId: string;
  /** Base64 PNG captured from {@link ScrapbookCard} via its imperative handle. */
  pngBase64: string;
}

/**
 * Generate a scrapbook for a trip (ADR-003 hybrid render):
 * 1. decode the client-rendered Skia PNG and upload it to `trip-scrapbooks/<trip>/<id>.png`;
 * 2. invoke the `generate_scrapbook` edge function with `{ trip_id, png_path }` — it composes
 *    the multi-page PDF (service role, embedding photo bytes), uploads it, and INSERTs the
 *    `scrapbooks` row (the table has no client-INSERT policy);
 * 3. return the signed URLs the function hands back.
 *
 * The upload MUST happen before the invoke (the function reads the PNG by path), so the two
 * steps are strictly ordered here.
 */
export async function generateScrapbook(input: GenerateScrapbookInput): Promise<ScrapbookResult> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error('Not authenticated');
  if (!input.pngBase64) throw new ScrapbookRenderError();

  const pngPath = `${input.tripId}/${uuid()}.${PNG_EXTENSION}`;
  const bytes = await base64PngToBytes(input.pngBase64);

  // Step 1 — upload PNG (must precede the edge invoke below).
  const { error: upErr } = await supabase.storage
    .from(SCRAPBOOKS_BUCKET)
    .upload(pngPath, bytes, { contentType: PNG_CONTENT_TYPE, upsert: false });
  if (upErr) throw upErr;

  // Step 2 — invoke the edge function to build the PDF + persist the row.
  const { data, error } = await supabase.functions.invoke<ScrapbookResult>(GENERATE_SCRAPBOOK_FN, {
    body: { trip_id: input.tripId, png_path: pngPath },
  });
  if (error) {
    // Clean up the orphaned PNG if the server step failed.
    await supabase.storage.from(SCRAPBOOKS_BUCKET).remove([pngPath]);
    throw error;
  }

  return { pngUrl: data?.pngUrl ?? null, pdfUrl: data?.pdfUrl ?? null };
}

/**
 * List a trip's generated scrapbooks newest-first, each with signed PNG/PDF URLs. A row whose
 * URL cannot be signed simply carries null for that artifact rather than failing the list.
 */
export async function listScrapbooks(tripId: string): Promise<ScrapbookWithUrls[]> {
  const { data, error } = await supabase
    .from('scrapbooks')
    .select('*')
    .eq('trip_id', tripId)
    .order('generated_at', { ascending: false });
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const out: ScrapbookWithUrls[] = [];
  for (const row of rows) {
    out.push({
      ...row,
      pngUrl: await signPath(row.png_path),
      pdfUrl: await signPath(row.pdf_path),
    });
  }
  return out;
}

/**
 * Read everything needed to render a trip's scrapbook card in one batch: the trip header, its
 * milestones (id + boss flag + dates), the cached driving legs, the check-ins, and the photo
 * count. All reads are member-scoped by RLS. Each sub-query degrades to empty on error so a
 * partial trip still produces a card (the numbers just reflect what's available).
 */
export async function fetchScrapbookInputs(tripId: string): Promise<ScrapbookInputs> {
  // Milestones first: their ids scope the check-in lookup (checkins reference milestone_id,
  // not trip_id).
  const [tripRes, milestonesRes] = await Promise.all([
    supabase
      .from('trips')
      .select('name, start_date, end_date, destination_country, destination_countries')
      .eq('id', tripId)
      .single(),
    supabase
      .from('milestones')
      .select('id, is_boss, arrival_at, departure_at')
      .eq('trip_id', tripId)
      .order('order_index', { ascending: true }),
  ]);
  if (tripRes.error) throw tripRes.error;

  const milestones = milestonesRes.data ?? [];
  const milestoneIds = milestones.map((m) => m.id);

  const [legsRes, checkinsRes, photosRes] = await Promise.all([
    supabase.from('milestone_legs').select('distance_m').eq('trip_id', tripId),
    milestoneIds.length > 0
      ? supabase
          .from('checkins')
          .select('id, checked_in_at, location_actual, milestone_id, note, user_id')
          .in('milestone_id', milestoneIds)
      : Promise.resolve({ data: [] as CheckinRow[] }),
    supabase.from('photos').select('id', { count: 'exact', head: true }).eq('trip_id', tripId),
  ]);

  return {
    trip: tripRes.data,
    milestones,
    legs: legsRes.data ?? [],
    checkins: (checkinsRes.data ?? []) as CheckinRow[],
    photoCount: photosRes.count ?? 0,
  };
}

/** Create a short-lived signed URL for a storage path, or null when absent/unsignable. */
async function signPath(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(SCRAPBOOKS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SEC);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Security sink: only http/https signed URLs may be downloaded + handed to the OS share
 * sheet. Signed URLs always come from Supabase storage (https), but re-validating the scheme
 * here keeps an unexpected/forged value from reaching `fetch`/`Sharing` (4A lesson).
 */
function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Download a scrapbook artifact from its signed URL into the cache directory and open the OS
 * share sheet. The cache dir is used because the file is a disposable, re-derivable export.
 *
 * @returns the local `file://` URI written.
 * @throws SharingUnavailableError when the platform cannot present a share sheet.
 */
export async function shareScrapbookArtifact(
  signedUrl: string,
  artifact: ScrapbookArtifact,
): Promise<string> {
  if (!isHttpUrl(signedUrl)) throw new Error('Invalid scrapbook URL');
  if (!(await Sharing.isAvailableAsync())) throw new SharingUnavailableError();

  const ext = artifact === 'pdf' ? PDF_EXTENSION : PNG_EXTENSION;
  const mimeType = artifact === 'pdf' ? PDF_MIME_TYPE : PNG_CONTENT_TYPE;
  const file = new File(Paths.cache, `scrapbook-${uuid()}.${ext}`);
  if (file.exists) file.delete();

  const response = await fetch(signedUrl);
  const buffer: ArrayBuffer = await response.arrayBuffer();
  file.create();
  file.write(new Uint8Array(buffer));

  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: 'scrapbook' });
  return file.uri;
}
