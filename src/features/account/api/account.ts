import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { supabase } from '@core/supabase/client';

/** Edge-function slugs (deployed, verify_jwt=true, scoped to the caller's auth.uid()). */
export const DELETE_ACCOUNT_FN = 'delete-account';
export const EXPORT_ACCOUNT_DATA_FN = 'export-account-data';

const EXPORT_FILE_PREFIX = 'journey-data-export';
const EXPORT_EXTENSION = 'json';
const EXPORT_MIME_TYPE = 'application/json';
const JSON_INDENT = 2;

/** Summary returned by the delete-account edge function (shape is informational). */
export interface DeleteAccountResult {
  deleted?: boolean;
  [key: string]: unknown;
}

/** GDPR export bundle returned by the export-account-data edge function. */
export interface AccountExport {
  exported_at: string;
  user_id: string;
  app: string;
  data: Record<string, unknown>;
}

export class SharingUnavailableError extends Error {
  constructor() {
    super('Sharing is not available on this device');
    this.name = 'SharingUnavailableError';
  }
}

function uuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now()}-${Math.round(Math.random() * 1_000_000_000)}`;
}

/**
 * Permanently delete the authenticated user's account (10E / GDPR right-to-erasure).
 * The edge function derives `auth.uid()` from the JWT and runs the table-by-table policy
 * (delete PII, anonymize shared content to the ghost sentinel) with the service role — the
 * client never supplies a target id. Idempotent server-side.
 */
export async function deleteAccount(): Promise<DeleteAccountResult> {
  const { data, error } = await supabase.functions.invoke<DeleteAccountResult>(DELETE_ACCOUNT_FN, {
    body: {},
  });
  if (error) throw error;
  return data ?? {};
}

/**
 * Fetch the authenticated user's full data bundle (GDPR portability). The edge function
 * assembles every owned row across tables; the caller writes it to a file and shares it.
 */
export async function exportAccountData(): Promise<AccountExport> {
  const { data, error } = await supabase.functions.invoke<AccountExport>(EXPORT_ACCOUNT_DATA_FN, {
    body: {},
  });
  if (error) throw error;
  if (!data) throw new Error('No data returned from export-account-data');
  return data;
}

/**
 * Serialize the export bundle to a JSON file in the cache directory and open the OS share
 * sheet (reuses expo-file-system + expo-sharing, both 4A deps — no new native dep). The cache
 * dir is used because the file is a disposable, re-derivable export.
 *
 * @returns the local `file://` URI written.
 * @throws SharingUnavailableError when the platform cannot present a share sheet.
 */
export async function shareAccountExport(bundle: AccountExport): Promise<string> {
  if (!(await Sharing.isAvailableAsync())) throw new SharingUnavailableError();

  const file = new File(Paths.cache, `${EXPORT_FILE_PREFIX}-${uuid()}.${EXPORT_EXTENSION}`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(bundle, null, JSON_INDENT));

  await Sharing.shareAsync(file.uri, {
    mimeType: EXPORT_MIME_TYPE,
    dialogTitle: EXPORT_FILE_PREFIX,
  });
  return file.uri;
}

/** Fetch + write + share in one step (the flow the Export row triggers). */
export async function exportAndShareAccountData(): Promise<string> {
  const bundle = await exportAccountData();
  return shareAccountExport(bundle);
}
