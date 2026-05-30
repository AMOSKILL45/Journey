# Phase 4A — Documents — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a trip-scoped shared document vault — any editor uploads PDFs / images / URL links, the whole crew views them, with explicit offline download and optional milestone linking.

**Architecture:** A standard feature module mirroring `src/features/milestones` (api → hooks → components → screen → barrel). Files live in private Supabase Storage bucket `trip-documents` behind signed URLs and Storage RLS; metadata in a new `documents` table with the same `is_trip_member` / `is_trip_editor` RLS helpers used everywhere else. Offline is device-local (`expo-file-system` + an AsyncStorage registry), never in the DB.

**Tech Stack:** Expo SDK 54, TypeScript strict, Supabase (Postgres + Storage), TanStack Query v5, NativeWind, Jest + RNTL. New deps: `expo-document-picker`, `expo-image-picker`, `expo-image-manipulator`, `expo-file-system`, `expo-sharing`.

**Spec:** `docs/superpowers/specs/2026-05-30-journey-phase-4a-documents-design.md`

---

## Conventions (apply to every task)

- Path aliases only (`@core`, `@shared`, `@features`, `@assets`), never `../../`.
- Zero hardcoded user-facing strings — always `t('documents.…')`.
- After each task: `npm run typecheck && npm run lint` must pass; run the task's tests; then commit. **Run checks inline — do NOT spawn the code-validator subagent** (user preference).
- Conventional commits (`feat:`, `chore:`, `test:`). End messages with the `Co-Authored-By` trailer used in this repo.
- Commit task-by-task, never batch.

## File structure (locked decomposition)

```
supabase/migrations/20260530120001_trip_documents.sql   # table + RLS + bucket + storage policies  (create)
src/core/supabase/types.ts                               # regenerated                              (modify)
package.json                                             # 5 expo deps                              (modify)

src/features/documents/
  utils/fileTypes.ts            # mime→type, ext, formatBytes, isValidUrl, icon, MAX_FILE_BYTES
  utils/offlineCache.ts         # expo-file-system + AsyncStorage registry
  utils/openDocument.ts         # open a doc (system viewer / browser), download-if-needed
  api/documents.ts              # DocumentRow types + CRUD + Storage upload/signedUrl/remove
  hooks/useDocuments.ts         # query + create(file/url) + delete mutations
  hooks/useOfflineDocs.ts       # offline state + download/evict/downloadAll
  components/DocumentCard.tsx    # one row: icon, name, uploader, category, offline control
  components/DocumentViewer.tsx  # in-app image preview modal
  components/DocumentUploadSheet.tsx  # source + category + milestone + name/url form
  components/DocumentsSection.tsx     # list grouped by category + FAB + download-all
  screens/DocumentsScreen.tsx    # screen shell read from route params
  index.ts                       # barrel
  __tests__/fileTypes.test.ts
  __tests__/offlineCache.test.ts
  __tests__/documents-api.test.ts
  __tests__/DocumentCard.test.tsx

src/app/(modals)/documents/[tripId].tsx                  # route → DocumentsScreen                  (create)
src/features/trips/screens/TripDetailScreen.tsx          # add "Documents" button                   (modify)
src/core/i18n/locales/en.json                            # documents namespace                      (modify)
src/core/i18n/locales/fr.json                            # documents namespace                      (modify)
```

---

## Task 1: Install dependencies

**Files:**

- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Install the 5 Expo modules (SDK-pinned)**

Run:

```bash
npx expo install expo-document-picker expo-image-picker expo-image-manipulator expo-file-system expo-sharing
```

Expected: `package.json` gains the 5 deps at SDK-54-compatible versions. No `app.config.ts` change is needed — `NSCameraUsageDescription` and `NSPhotoLibraryUsageDescription` already exist in `infoPlist`, and Android picker permissions are requested at runtime.

- [ ] **Step 2: Verify typecheck still passes**

Run: `npm run typecheck`
Expected: PASS (no usages yet).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(documents): add expo file/image/document picker + sharing deps" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

> ⚠️ **EAS note:** these are native modules. They only reach the device through a new **EAS build** (TestFlight), not an OTA `eas update`. Schedule a `preview`/`production` build before manual testing.

---

## Task 2: Migration — `documents` table, RLS, bucket, Storage policies

**Files:**

- Create: `supabase/migrations/20260530120001_trip_documents.sql`
- Modify: `src/core/supabase/types.ts` (regenerated)

- [ ] **Step 1: Write the migration SQL file**

Create `supabase/migrations/20260530120001_trip_documents.sql`:

```sql
-- Migration: documents table + RLS + private Storage bucket + storage policies.
-- Editors/owners write; all members read; viewers are read-only. Mirrors milestones RLS.

CREATE TABLE IF NOT EXISTS public.documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  milestone_id  uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  category      text NOT NULL DEFAULT '',
  name          text NOT NULL,
  file_type     text NOT NULL CHECK (file_type IN ('pdf','image','url')),
  storage_path  text,
  external_url  text,
  mime_type     text,
  size_bytes    integer,
  uploaded_by   uuid NOT NULL REFERENCES auth.users(id),
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documents_url_xor_file CHECK (
    (file_type = 'url' AND external_url IS NOT NULL AND storage_path IS NULL)
    OR (file_type <> 'url' AND storage_path IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_documents_trip ON public.documents(trip_id);
CREATE INDEX IF NOT EXISTS idx_documents_milestone ON public.documents(milestone_id);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members SELECT documents"
  ON public.documents FOR SELECT
  USING (public.is_trip_member(trip_id, auth.uid()));

CREATE POLICY "Editors INSERT own documents"
  ON public.documents FOR INSERT
  WITH CHECK (public.is_trip_editor(trip_id, auth.uid()) AND uploaded_by = auth.uid());

CREATE POLICY "Uploader-editor or owner UPDATE documents"
  ON public.documents FOR UPDATE
  USING (
    (uploaded_by = auth.uid() AND public.is_trip_editor(trip_id, auth.uid()))
    OR EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND owner_id = auth.uid())
  );

CREATE POLICY "Uploader-editor or owner DELETE documents"
  ON public.documents FOR DELETE
  USING (
    (uploaded_by = auth.uid() AND public.is_trip_editor(trip_id, auth.uid()))
    OR EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND owner_id = auth.uid())
  );

-- Private bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('trip-documents', 'trip-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: trip_id is the first path segment {trip_id}/{file}
CREATE POLICY "Members read trip-documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'trip-documents'
         AND public.is_trip_member(((storage.foldername(name))[1])::uuid, auth.uid()));

CREATE POLICY "Editors write trip-documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'trip-documents'
         AND public.is_trip_editor(((storage.foldername(name))[1])::uuid, auth.uid()));

CREATE POLICY "Editors update trip-documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'trip-documents'
         AND public.is_trip_editor(((storage.foldername(name))[1])::uuid, auth.uid()));

CREATE POLICY "Editors delete trip-documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'trip-documents'
         AND public.is_trip_editor(((storage.foldername(name))[1])::uuid, auth.uid()));
```

- [ ] **Step 2: Apply via Supabase MCP**

Use the `plugin:supabase:supabase` MCP tool `apply_migration` (project `ewsoupkfkachxidmuwoi`, name `trip_documents`) with the exact SQL above.

- [ ] **Step 3: Verify the table + advisors**

Run MCP `list_tables` and confirm `documents` exists with RLS enabled. Run `get_advisors` (type `security`) and confirm no new RLS/policy warnings on `documents` or `storage.objects`.
Expected: `documents` present, RLS on, no new advisor errors.

- [ ] **Step 4: Regenerate TS types**

Use MCP `generate_typescript_types` and overwrite `src/core/supabase/types.ts` with the result. Confirm `Database['public']['Tables']['documents']['Row']` now exists.

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260530120001_trip_documents.sql src/core/supabase/types.ts
git commit -m "feat(documents): documents table, RLS, private bucket + storage policies" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: `utils/fileTypes.ts` (TDD)

**Files:**

- Create: `src/features/documents/utils/fileTypes.ts`
- Test: `src/features/documents/__tests__/fileTypes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/documents/__tests__/fileTypes.test.ts`:

```ts
import {
  MAX_FILE_BYTES,
  extensionForMime,
  fileTypeFromMime,
  formatBytes,
  iconForFileType,
  isValidUrl,
} from '../utils/fileTypes';

describe('fileTypes', () => {
  it('maps mime to file_type', () => {
    expect(fileTypeFromMime('application/pdf')).toBe('pdf');
    expect(fileTypeFromMime('image/jpeg')).toBe('image');
    expect(fileTypeFromMime('image/png')).toBe('image');
    expect(fileTypeFromMime('text/plain')).toBeNull();
    expect(fileTypeFromMime(null)).toBeNull();
  });

  it('maps mime to a file extension', () => {
    expect(extensionForMime('application/pdf')).toBe('pdf');
    expect(extensionForMime('image/jpeg')).toBe('jpg');
    expect(extensionForMime('image/png')).toBe('png');
    expect(extensionForMime('weird/thing')).toBe('bin');
  });

  it('formats byte sizes', () => {
    expect(formatBytes(0)).toBe('—');
    expect(formatBytes(null)).toBe('—');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });

  it('validates http(s) urls only', () => {
    expect(isValidUrl('https://example.com/x')).toBe(true);
    expect(isValidUrl('http://a.b')).toBe(true);
    expect(isValidUrl('ftp://a.b')).toBe(false);
    expect(isValidUrl('not a url')).toBe(false);
    expect(isValidUrl('')).toBe(false);
  });

  it('exposes a 25MB cap and per-type icons', () => {
    expect(MAX_FILE_BYTES).toBe(25 * 1024 * 1024);
    expect(iconForFileType('pdf')).toBeTruthy();
    expect(iconForFileType('url')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/documents/__tests__/fileTypes.test.ts`
Expected: FAIL ("Cannot find module '../utils/fileTypes'").

- [ ] **Step 3: Write the implementation**

Create `src/features/documents/utils/fileTypes.ts`:

```ts
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

export type DocFileType = 'pdf' | 'image' | 'url';

export function fileTypeFromMime(mime: string | null | undefined): 'pdf' | 'image' | null {
  if (!mime) return null;
  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  return null;
}

export function extensionForMime(mime: string | null | undefined): string {
  switch (mime) {
    case 'application/pdf':
      return 'pdf';
    case 'image/png':
      return 'png';
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
      return 'heic';
    default:
      return 'bin';
  }
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = value >= 10 || unit === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[unit]}`;
}

export function isValidUrl(value: string): boolean {
  try {
    const u = new URL(value.trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function iconForFileType(fileType: DocFileType): string {
  switch (fileType) {
    case 'pdf':
      return '📄';
    case 'image':
      return '🖼️';
    case 'url':
      return '🔗';
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/documents/__tests__/fileTypes.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/utils/fileTypes.ts src/features/documents/__tests__/fileTypes.test.ts
git commit -m "feat(documents): fileTypes util (mime/ext/size/url helpers)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `utils/offlineCache.ts` (TDD)

Depends on Task 3 (`extensionForMime`) and the `DocumentRow` type from Task 5. To avoid a forward dependency, this util imports the `DocumentRow` type from `../api/documents`, which is created in Task 5. **Implement Task 5 before running these tests if your tooling type-checks across files**, or define the test's doc objects with `as DocumentRow`. The test below uses local fixtures cast to the type and mocks `expo-file-system` + AsyncStorage, so it runs independently.

**Files:**

- Create: `src/features/documents/utils/offlineCache.ts`
- Test: `src/features/documents/__tests__/offlineCache.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/documents/__tests__/offlineCache.test.ts`:

```ts
const fsMock = {
  documentDirectory: 'file:///docdir/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  downloadAsync: jest.fn().mockResolvedValue({ uri: 'file:///x' }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
};
jest.mock('expo-file-system', () => fsMock);

const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((k: string) => Promise.resolve(store[k] ?? null)),
  setItem: jest.fn((k: string, v: string) => {
    store[k] = v;
    return Promise.resolve();
  }),
}));

import type { DocumentRow } from '../api/documents';
import {
  downloadDoc,
  evictDoc,
  isDownloaded,
  listDownloadedIds,
  localPathFor,
} from '../utils/offlineCache';

const fileDoc = {
  id: 'd1',
  trip_id: 't1',
  file_type: 'image',
  mime_type: 'image/jpeg',
  storage_path: 't1/abc.jpg',
} as unknown as DocumentRow;

const urlDoc = { id: 'd2', trip_id: 't1', file_type: 'url' } as unknown as DocumentRow;

describe('offlineCache', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
    jest.clearAllMocks();
  });

  it('builds a local path under the doc directory', () => {
    expect(localPathFor(fileDoc)).toBe('file:///docdir/documents/t1/d1.jpg');
  });

  it('url docs are never downloaded', async () => {
    expect(await isDownloaded(urlDoc)).toBe(false);
    expect(fsMock.getInfoAsync).not.toHaveBeenCalled();
  });

  it('downloadDoc downloads and records the id in the registry', async () => {
    fsMock.getInfoAsync.mockResolvedValue({ exists: false });
    await downloadDoc(fileDoc, 'https://signed/url');
    expect(fsMock.downloadAsync).toHaveBeenCalledWith('https://signed/url', localPathFor(fileDoc));
    expect(await listDownloadedIds('t1')).toEqual(['d1']);
  });

  it('evictDoc deletes the file and removes it from the registry', async () => {
    fsMock.getInfoAsync.mockResolvedValue({ exists: false });
    await downloadDoc(fileDoc, 'https://signed/url');
    fsMock.getInfoAsync.mockResolvedValue({ exists: true });
    await evictDoc(fileDoc);
    expect(fsMock.deleteAsync).toHaveBeenCalled();
    expect(await listDownloadedIds('t1')).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/documents/__tests__/offlineCache.test.ts`
Expected: FAIL ("Cannot find module '../utils/offlineCache'" — and the api import resolves only after Task 5; if so, do Task 5 Step 3 first, then return here).

- [ ] **Step 3: Write the implementation**

Create `src/features/documents/utils/offlineCache.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

import type { DocumentRow } from '../api/documents';
import { extensionForMime } from './fileTypes';

const ROOT = `${FileSystem.documentDirectory}documents/`;

const registryKey = (tripId: string) => `offline-docs:${tripId}`;

export function localPathFor(doc: DocumentRow): string {
  const ext = extensionForMime(doc.mime_type);
  return `${ROOT}${doc.trip_id}/${doc.id}.${ext}`;
}

async function ensureDir(tripId: string): Promise<void> {
  const dir = `${ROOT}${tripId}`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

export async function isDownloaded(doc: DocumentRow): Promise<boolean> {
  if (doc.file_type === 'url') return false;
  const info = await FileSystem.getInfoAsync(localPathFor(doc));
  return info.exists;
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
  await ensureDir(doc.trip_id);
  await FileSystem.downloadAsync(signedUrl, localPathFor(doc));
  await addToRegistry(doc.trip_id, doc.id);
}

export async function evictDoc(doc: DocumentRow): Promise<void> {
  const path = localPathFor(doc);
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) await FileSystem.deleteAsync(path, { idempotent: true });
  await removeFromRegistry(doc.trip_id, doc.id);
}
```

> **SDK 54 note:** if `expo-file-system` raises a deprecation/runtime error for `documentDirectory`/`getInfoAsync`/`downloadAsync`/`deleteAsync`/`makeDirectoryAsync`, switch the import to `import * as FileSystem from 'expo-file-system/legacy';` — the functional API lives there in SDK 54. The mock in the test targets `'expo-file-system'`; update the `jest.mock` path to match if you switch.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/documents/__tests__/offlineCache.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/utils/offlineCache.ts src/features/documents/__tests__/offlineCache.test.ts
git commit -m "feat(documents): device-local offline cache (file-system + registry)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `api/documents.ts` (TDD)

**Files:**

- Create: `src/features/documents/api/documents.ts`
- Test: `src/features/documents/__tests__/documents-api.test.ts`

- [ ] **Step 1: Write the failing test** (mirrors the milestones-api test mocking style)

Create `src/features/documents/__tests__/documents-api.test.ts`:

```ts
import { supabase } from '@core/supabase/client';

import { FileTooLargeError, createUrlDocument, listTripDocuments } from '../api/documents';

describe('documents api', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lists documents for a trip newest-first', async () => {
    jest.spyOn(supabase, 'from').mockImplementation(
      () =>
        ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [{ id: 'd1' }], error: null }),
        }) as never,
    );
    const result = await listTripDocuments('t1');
    expect(result).toEqual([{ id: 'd1' }]);
  });

  it('creates a url document with file_type=url and no storage_path', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    const insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'd2', file_type: 'url' }, error: null }),
      }),
    });
    jest.spyOn(supabase, 'from').mockReturnValue({ insert } as never);

    const doc = await createUrlDocument({
      tripId: 't1',
      category: 'tickets',
      name: 'Booking',
      url: 'https://example.com/r',
    });

    expect(doc).toEqual({ id: 'd2', file_type: 'url' });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        trip_id: 't1',
        file_type: 'url',
        external_url: 'https://example.com/r',
        storage_path: null,
        uploaded_by: 'u1',
      }),
    );
  });

  it('rejects oversize files before any upload', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    const { createFileDocument } = await import('../api/documents');
    await expect(
      createFileDocument({
        tripId: 't1',
        category: 'tickets',
        name: 'huge',
        fileType: 'pdf',
        uri: 'file:///huge.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 26 * 1024 * 1024,
      }),
    ).rejects.toBeInstanceOf(FileTooLargeError);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/documents/__tests__/documents-api.test.ts`
Expected: FAIL ("Cannot find module '../api/documents'").

- [ ] **Step 3: Write the implementation**

Create `src/features/documents/api/documents.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/documents/__tests__/documents-api.test.ts`
Expected: PASS (3 tests). Now also re-run Task 4's test (the `DocumentRow` import resolves): `npx jest src/features/documents/__tests__/offlineCache.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/api/documents.ts src/features/documents/__tests__/documents-api.test.ts
git commit -m "feat(documents): api (list/create file+url/delete, signed urls, compression)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Hooks — `useDocuments.ts` + `useOfflineDocs.ts`

**Files:**

- Create: `src/features/documents/hooks/useDocuments.ts`
- Create: `src/features/documents/hooks/useOfflineDocs.ts`

- [ ] **Step 1: Write `useDocuments.ts`**

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createFileDocument,
  createUrlDocument,
  deleteDocument,
  listTripDocuments,
  type CreateFileDocumentInput,
  type CreateUrlDocumentInput,
  type DocumentRow,
} from '../api/documents';

export const documentsQueryKey = (tripId: string) => ['documents', tripId] as const;

export function useTripDocuments(tripId: string) {
  return useQuery({
    queryKey: documentsQueryKey(tripId),
    queryFn: () => listTripDocuments(tripId),
    enabled: Boolean(tripId),
  });
}

export function useCreateFileDocument(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateFileDocumentInput, 'tripId'>) =>
      createFileDocument({ ...input, tripId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentsQueryKey(tripId) });
    },
  });
}

export function useCreateUrlDocument(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<CreateUrlDocumentInput, 'tripId'>) =>
      createUrlDocument({ ...input, tripId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentsQueryKey(tripId) });
    },
  });
}

export function useDeleteDocument(tripId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (doc: DocumentRow) => deleteDocument(doc),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: documentsQueryKey(tripId) });
    },
  });
}
```

- [ ] **Step 2: Write `useOfflineDocs.ts`**

```ts
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
          // eslint-disable-next-line no-await-in-loop
          await downloadDocument(doc);
        }
      }
    },
    [downloadDocument],
  );

  return { downloadedIds, busyId, downloadDocument, evictDocument, downloadAll, refresh };
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/documents/hooks
git commit -m "feat(documents): TanStack query + offline hooks" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: `components/DocumentCard.tsx` (TDD)

**Files:**

- Create: `src/features/documents/components/DocumentCard.tsx`
- Test: `src/features/documents/__tests__/DocumentCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/features/documents/__tests__/DocumentCard.test.tsx`:

```tsx
import { render } from '@testing-library/react-native';

import type { DocumentRow } from '../api/documents';
import { DocumentCard } from '../components/DocumentCard';

const baseDoc = {
  id: 'd1',
  trip_id: 't1',
  milestone_id: null,
  category: 'tickets',
  name: 'Flight LAX → JFK',
  file_type: 'pdf',
  storage_path: 't1/x.pdf',
  external_url: null,
  mime_type: 'application/pdf',
  size_bytes: 1024,
  uploaded_by: 'u1',
  uploaded_at: '2026-05-30T00:00:00Z',
} as unknown as DocumentRow;

describe('DocumentCard', () => {
  it('renders the document name and uploader', () => {
    const { getByText } = render(
      <DocumentCard
        doc={baseDoc}
        uploaderName="Alice"
        isOffline={false}
        isBusy={false}
        canManage={false}
        onOpen={jest.fn()}
        onToggleOffline={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(getByText('Flight LAX → JFK')).toBeTruthy();
    expect(getByText(/Alice/)).toBeTruthy();
  });

  it('shows the offline badge when downloaded', () => {
    const { getByText } = render(
      <DocumentCard
        doc={baseDoc}
        uploaderName="Alice"
        isOffline
        isBusy={false}
        canManage={false}
        onOpen={jest.fn()}
        onToggleOffline={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    expect(getByText('documents.offline.downloaded')).toBeTruthy();
  });
});
```

> Note: the i18n test environment returns the key itself when a translation is absent, so asserting on `'documents.offline.downloaded'` is stable regardless of locale data load order.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/features/documents/__tests__/DocumentCard.test.tsx`
Expected: FAIL ("Cannot find module '../components/DocumentCard'").

- [ ] **Step 3: Write the implementation**

Create `src/features/documents/components/DocumentCard.tsx`:

```tsx
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
          <View className="rounded border-2 border-border bg-secondary-500 px-2 py-1">
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/features/documents/__tests__/DocumentCard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/documents/components/DocumentCard.tsx src/features/documents/__tests__/DocumentCard.test.tsx
git commit -m "feat(documents): DocumentCard with offline control" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: `utils/openDocument.ts` + `components/DocumentViewer.tsx`

**Files:**

- Create: `src/features/documents/utils/openDocument.ts`
- Create: `src/features/documents/components/DocumentViewer.tsx`

- [ ] **Step 1: Write `openDocument.ts`**

```ts
import { openURL } from 'expo-linking';
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
    if (doc.external_url) await openURL(doc.external_url);
    return;
  }
  if (!doc.storage_path) throw new Error('Missing storage path');

  if (!(await isDownloaded(doc))) {
    const url = await getSignedUrl(doc.storage_path);
    await downloadDoc(doc, url);
  }
  const path = localPathFor(doc);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: doc.mime_type ?? undefined });
  } else {
    await openURL(path);
  }
}
```

- [ ] **Step 2: Write `DocumentViewer.tsx`** (in-app image preview; PDFs/URLs use the system viewer via `openDocument`)

```tsx
import { Image, Modal, Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

export interface DocumentViewerProps {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}

export function DocumentViewer({ visible, uri, onClose }: DocumentViewerProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-text-primary/90 p-4">
        {uri ? (
          <Image
            source={{ uri }}
            resizeMode="contain"
            className="h-3/4 w-full"
            accessibilityLabel={t('documents.title')}
          />
        ) : null}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.done')}
          className="mt-4 rounded border-2 border-border bg-surface px-4 py-2"
        >
          <PixelText size="body" family="body-medium">
            {t('common.done')}
          </PixelText>
        </Pressable>
      </View>
    </Modal>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/documents/utils/openDocument.ts src/features/documents/components/DocumentViewer.tsx
git commit -m "feat(documents): open-in-system helper + image viewer modal" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: `components/DocumentUploadSheet.tsx`

**Files:**

- Create: `src/features/documents/components/DocumentUploadSheet.tsx`

Models the `MilestoneCreationSheet` ref pattern. Suggested categories are stored as canonical tokens; free text is allowed.

- [ ] **Step 1: Write the component**

```tsx
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { useMilestones } from '@features/milestones';
import { PixelBottomSheet, type PixelBottomSheetRef } from '@shared/components/PixelBottomSheet';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelChip } from '@shared/components/PixelChip';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

import { useCreateFileDocument, useCreateUrlDocument } from '../hooks/useDocuments';
import { fileTypeFromMime, isValidUrl } from '../utils/fileTypes';

export const SUGGESTED_CATEGORIES = [
  'tickets',
  'lodging',
  'insurance',
  'visa',
  'transport',
  'other',
] as const;

type PickedFile = {
  uri: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  fileType: 'pdf' | 'image';
};

export interface DocumentUploadSheetRef {
  open: () => void;
  close: () => void;
}

export interface DocumentUploadSheetProps {
  tripId: string;
  onCreated?: () => void;
}

export const DocumentUploadSheet = forwardRef<DocumentUploadSheetRef, DocumentUploadSheetProps>(
  ({ tripId, onCreated }, ref) => {
    const { t } = useTranslation();
    const sheetRef = useRef<PixelBottomSheetRef>(null);
    const createFile = useCreateFileDocument(tripId);
    const createUrl = useCreateUrlDocument(tripId);
    const { data: milestones = [] } = useMilestones(tripId);

    const [picked, setPicked] = useState<PickedFile | null>(null);
    const [urlValue, setUrlValue] = useState('');
    const [isUrlMode, setIsUrlMode] = useState(false);
    const [name, setName] = useState('');
    const [category, setCategory] = useState<string>('tickets');
    const [milestoneId, setMilestoneId] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const reset = useCallback(() => {
      setPicked(null);
      setUrlValue('');
      setIsUrlMode(false);
      setName('');
      setCategory('tickets');
      setMilestoneId(null);
      setFormError(null);
    }, []);

    useImperativeHandle(ref, () => ({
      open: () => {
        reset();
        sheetRef.current?.open();
      },
      close: () => sheetRef.current?.close(),
    }));

    const pickDocument = async () => {
      setFormError(null);
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets[0]) return;
      const a = res.assets[0];
      setIsUrlMode(false);
      setPicked({
        uri: a.uri,
        name: a.name,
        mimeType: a.mimeType ?? 'application/pdf',
        sizeBytes: a.size ?? 0,
        fileType: 'pdf',
      });
      if (!name) setName(a.name.replace(/\.[^/.]+$/, ''));
    };

    const pickImage = async (fromCamera: boolean) => {
      setFormError(null);
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setFormError(t('documents.errors.permissionDenied'));
        return;
      }
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (res.canceled || !res.assets[0]) return;
      const a = res.assets[0];
      setIsUrlMode(false);
      setPicked({
        uri: a.uri,
        name: a.fileName ?? 'photo.jpg',
        mimeType: a.mimeType ?? 'image/jpeg',
        sizeBytes: a.fileSize ?? 0,
        fileType: fileTypeFromMime(a.mimeType) === 'pdf' ? 'pdf' : 'image',
      });
    };

    const startUrlMode = () => {
      setPicked(null);
      setIsUrlMode(true);
      setFormError(null);
    };

    const handleSave = async () => {
      const trimmedName = name.trim();
      if (!trimmedName) {
        setFormError(t('documents.errors.nameRequired'));
        return;
      }
      setFormError(null);
      try {
        if (isUrlMode) {
          if (!isValidUrl(urlValue)) {
            setFormError(t('documents.errors.invalidUrl'));
            return;
          }
          await createUrl.mutateAsync({
            name: trimmedName,
            category,
            url: urlValue.trim(),
            milestoneId,
          });
        } else if (picked) {
          await createFile.mutateAsync({
            name: trimmedName,
            category,
            fileType: picked.fileType,
            uri: picked.uri,
            mimeType: picked.mimeType,
            sizeBytes: picked.sizeBytes,
            milestoneId,
          });
        } else {
          setFormError(t('documents.form.pickSource'));
          return;
        }
        reset();
        sheetRef.current?.close();
        onCreated?.();
      } catch (e) {
        if (e instanceof Error && e.name === 'FileTooLargeError') {
          setFormError(t('documents.errors.tooLarge'));
        } else {
          setFormError(t('documents.errors.uploadFailed'));
        }
      }
    };

    const isSaving = createFile.isPending || createUrl.isPending;
    const hasSource = isUrlMode || picked !== null;

    return (
      <PixelBottomSheet ref={sheetRef} snapPoints={['80%', '95%']}>
        <View className="gap-4">
          <PixelText size="h2">{t('documents.addCta')}</PixelText>

          <View>
            <PixelText size="small" family="body-medium" className="mb-2">
              {t('documents.form.pickSource')}
            </PixelText>
            <View className="flex-row flex-wrap gap-2">
              <PixelChip
                label={t('documents.source.files')}
                selected={picked?.fileType === 'pdf'}
                onPress={pickDocument}
              />
              <PixelChip
                label={t('documents.source.photo')}
                selected={false}
                onPress={() => pickImage(false)}
              />
              <PixelChip
                label={t('documents.source.camera')}
                selected={false}
                onPress={() => pickImage(true)}
              />
              <PixelChip
                label={t('documents.source.url')}
                selected={isUrlMode}
                onPress={startUrlMode}
              />
            </View>
            {picked ? (
              <PixelText size="caption" className="mt-2 text-text-secondary">
                {picked.name}
              </PixelText>
            ) : null}
          </View>

          {isUrlMode ? (
            <PixelInput
              label={t('documents.form.urlLabel')}
              placeholder={t('documents.form.urlPlaceholder')}
              autoCapitalize="none"
              keyboardType="url"
              value={urlValue}
              onChangeText={setUrlValue}
            />
          ) : null}

          <PixelInput
            label={t('documents.form.nameLabel')}
            placeholder={t('documents.form.namePlaceholder')}
            value={name}
            onChangeText={setName}
            required
          />

          <View>
            <PixelText size="small" family="body-medium" className="mb-2">
              {t('documents.form.categoryLabel')}
            </PixelText>
            <View className="flex-row flex-wrap gap-2">
              {SUGGESTED_CATEGORIES.map((c) => (
                <PixelChip
                  key={c}
                  label={t(`documents.category.${c}`)}
                  selected={category === c}
                  onPress={() => setCategory(c)}
                />
              ))}
            </View>
          </View>

          {milestones.length > 0 ? (
            <View>
              <PixelText size="small" family="body-medium" className="mb-2">
                {t('documents.form.milestoneLabel')}
              </PixelText>
              <View className="flex-row flex-wrap gap-2">
                <PixelChip
                  label={t('documents.form.milestoneNone')}
                  selected={milestoneId === null}
                  onPress={() => setMilestoneId(null)}
                />
                {milestones.map((m) => (
                  <PixelChip
                    key={m.id}
                    label={m.name}
                    selected={milestoneId === m.id}
                    onPress={() => setMilestoneId(m.id)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {formError ? (
            <PixelText size="caption" className="text-error">
              {formError}
            </PixelText>
          ) : null}

          <PixelButton
            variant="primary"
            onPress={handleSave}
            loading={isSaving}
            disabled={!hasSource}
            fullWidth
          >
            {t('documents.form.save')}
          </PixelButton>
        </View>
      </PixelBottomSheet>
    );
  },
);

DocumentUploadSheet.displayName = 'DocumentUploadSheet';
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS. (If `mediaTypes: ['images']` raises a type error on the installed `expo-image-picker`, replace with `mediaTypes: ImagePicker.MediaTypeOptions.Images`.)

- [ ] **Step 3: Commit**

```bash
git add src/features/documents/components/DocumentUploadSheet.tsx
git commit -m "feat(documents): upload sheet (file/photo/camera/url + category + milestone)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: `components/DocumentsSection.tsx`

**Files:**

- Create: `src/features/documents/components/DocumentsSection.tsx`

Groups docs by category, wires offline state, open, delete, and the upload sheet + "download all".

- [ ] **Step 1: Write the component**

```tsx
import { useMemo, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import type { DocumentRow } from '../api/documents';
import { useDeleteDocument, useTripDocuments } from '../hooks/useDocuments';
import { useOfflineDocs } from '../hooks/useOfflineDocs';
import { localPathFor } from '../utils/offlineCache';
import { openDocument } from '../utils/openDocument';
import {
  DocumentUploadSheet,
  type DocumentUploadSheetRef,
  SUGGESTED_CATEGORIES,
} from './DocumentUploadSheet';
import { DocumentCard } from './DocumentCard';
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
  const { data: docs = [], isLoading } = useTripDocuments(tripId);
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
        <PixelButton variant="ghost" onPress={() => void downloadAll(docs)}>
          {t('documents.downloadAll')}
        </PixelButton>
      </View>

      {error ? (
        <PixelText size="caption" className="mb-2 text-error">
          {error}
        </PixelText>
      ) : null}

      {isLoading ? (
        <PixelText size="body" className="text-text-secondary">
          {t('common.loading')}
        </PixelText>
      ) : docs.length === 0 ? (
        <PixelCard className="items-center">
          <PixelText size="h2" className="mb-2">
            {t('documents.empty.title')}
          </PixelText>
          <PixelText size="body" className="mb-4 text-center text-text-secondary">
            {t('documents.empty.body')}
          </PixelText>
          <PixelButton variant="primary" onPress={() => sheetRef.current?.open()}>
            {t('documents.addCta')}
          </PixelButton>
        </PixelCard>
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
```

- [ ] **Step 2: Typecheck + lint**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/documents/components/DocumentsSection.tsx
git commit -m "feat(documents): DocumentsSection (grouped list, offline, open, delete)" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Screen, route, barrel, trip-detail entry, i18n, final validation

**Files:**

- Create: `src/features/documents/screens/DocumentsScreen.tsx`
- Create: `src/features/documents/index.ts`
- Create: `src/app/(modals)/documents/[tripId].tsx`
- Modify: `src/features/trips/screens/TripDetailScreen.tsx`
- Modify: `src/core/i18n/locales/en.json`, `src/core/i18n/locales/fr.json`

- [ ] **Step 1: Write `DocumentsScreen.tsx`**

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { supabase } from '@core/supabase/client';
import { useTrip, useTripMembers } from '@features/trips';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { DocumentsSection } from '../components/DocumentsSection';

export function DocumentsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const id = tripId ?? '';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: trip } = useTrip(id);
  const { data: members = [] } = useTripMembers(id);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const uploaderName = (uid: string): string => {
    const m = members.find((mem) => mem.user_id === uid);
    return m?.profile?.display_name ?? t('documents.uploadedByUnknown');
  };

  return (
    <View className="flex-1 bg-cream">
      <ScrollView
        contentContainerStyle={{
          padding: SCREEN_PADDING,
          paddingTop: insets.top + SCREEN_PADDING,
          paddingBottom: 120,
        }}
      >
        <DocumentsSection
          tripId={id}
          currentUserId={userId}
          isOwner={trip?.owner_id === userId}
          uploaderName={uploaderName}
        />
        <View className="mt-8">
          <PixelButton variant="ghost" onPress={() => router.back()} fullWidth>
            {t('common.back')}
          </PixelButton>
        </View>
      </ScrollView>
    </View>
  );
}
```

> **Verified shape:** `@features/trips` exports `useTrip` and `useTripMembers`; `useTripMembers` returns `TripMemberWithProfile[]`, each with `user_id` and `profile: { display_name: string | null } | null` (see `src/features/trips/api/members.ts`). `trip.owner_id` is the owner. The `uploaderName` lookup above matches this exactly — no adjustment needed.

- [ ] **Step 2: Write the barrel `index.ts`**

```ts
export {
  listTripDocuments,
  createFileDocument,
  createUrlDocument,
  deleteDocument,
  getSignedUrl,
  FileTooLargeError,
} from './api/documents';
export type {
  DocumentRow,
  DocumentInsert,
  CreateFileDocumentInput,
  CreateUrlDocumentInput,
} from './api/documents';
export {
  useTripDocuments,
  useCreateFileDocument,
  useCreateUrlDocument,
  useDeleteDocument,
  documentsQueryKey,
} from './hooks/useDocuments';
export { useOfflineDocs } from './hooks/useOfflineDocs';
export { DocumentsSection } from './components/DocumentsSection';
export type { DocumentsSectionProps } from './components/DocumentsSection';
export { DocumentCard } from './components/DocumentCard';
export type { DocumentCardProps } from './components/DocumentCard';
export { DocumentUploadSheet } from './components/DocumentUploadSheet';
export type {
  DocumentUploadSheetProps,
  DocumentUploadSheetRef,
} from './components/DocumentUploadSheet';
export { DocumentsScreen } from './screens/DocumentsScreen';
export {
  MAX_FILE_BYTES,
  fileTypeFromMime,
  extensionForMime,
  formatBytes,
  isValidUrl,
  iconForFileType,
} from './utils/fileTypes';
export type { DocFileType } from './utils/fileTypes';
```

- [ ] **Step 3: Write the route `src/app/(modals)/documents/[tripId].tsx`**

```tsx
import { DocumentsScreen } from '@features/documents';

export default DocumentsScreen;
```

- [ ] **Step 4: Add the entry button in `TripDetailScreen.tsx`**

In `src/features/trips/screens/TripDetailScreen.tsx`, add a Documents button. Insert it right after the members `<MembersList tripId={trip.id} />` block (after line ~184), before the `InviteMemberForm` view:

```tsx
<View className="mt-6">
  <PixelButton
    variant="secondary"
    onPress={() => router.push(`/(modals)/documents/${trip.id}`)}
    fullWidth
  >
    {t('documents.title')}
  </PixelButton>
</View>
```

(`router` and `t` are already in scope in this screen. If `PixelButton` has no `secondary` variant, use `variant="primary"`.)

- [ ] **Step 5: Add i18n keys — `en.json`**

Add this top-level `"documents"` block to `src/core/i18n/locales/en.json` (keep existing keys; insert after `"identity"`):

```json
"documents": {
  "title": "Documents",
  "addCta": "+ Add document",
  "downloadAll": "Save trip offline",
  "uploadedBy": "Added by {{name}}",
  "uploadedByUnknown": "a crew member",
  "empty": {
    "title": "No documents yet",
    "body": "Add tickets, bookings or your ESTA so the whole crew has them."
  },
  "source": {
    "files": "File (PDF)",
    "photo": "Photo library",
    "camera": "Scan with camera",
    "url": "Web link"
  },
  "form": {
    "pickSource": "What do you want to add?",
    "nameLabel": "Name",
    "namePlaceholder": "e.g. Flight LAX → JFK",
    "categoryLabel": "Category",
    "milestoneLabel": "Link to a stop (optional)",
    "milestoneNone": "None",
    "urlLabel": "Link",
    "urlPlaceholder": "https://…",
    "save": "Add document"
  },
  "category": {
    "tickets": "Tickets",
    "lodging": "Lodging",
    "insurance": "Insurance",
    "visa": "Visa/ESTA",
    "transport": "Transport",
    "other": "Other"
  },
  "offline": {
    "download": "Save offline",
    "remove": "Remove offline copy",
    "downloaded": "Offline",
    "downloading": "Downloading…"
  },
  "errors": {
    "tooLarge": "File is too large (max 25 MB).",
    "uploadFailed": "Upload failed. Please try again.",
    "invalidUrl": "Enter a valid http(s) link.",
    "offlineFirst": "Save it offline first to open it here.",
    "permissionDenied": "Permission denied.",
    "nameRequired": "Give it a name."
  },
  "delete": {
    "confirmTitle": "Delete document?",
    "confirmBody": "This removes it for everyone."
  }
}
```

- [ ] **Step 6: Add i18n keys — `fr.json`** (same shape, French)

```json
"documents": {
  "title": "Documents",
  "addCta": "+ Ajouter un document",
  "downloadAll": "Enregistrer le voyage hors-ligne",
  "uploadedBy": "Ajouté par {{name}}",
  "uploadedByUnknown": "un membre",
  "empty": {
    "title": "Aucun document pour l'instant",
    "body": "Ajoute billets, réservations ou ton ESTA pour que toute l'équipe les ait."
  },
  "source": {
    "files": "Fichier (PDF)",
    "photo": "Photothèque",
    "camera": "Scanner avec l'appareil photo",
    "url": "Lien web"
  },
  "form": {
    "pickSource": "Qu'est-ce que tu veux ajouter ?",
    "nameLabel": "Nom",
    "namePlaceholder": "ex. Vol LAX → JFK",
    "categoryLabel": "Catégorie",
    "milestoneLabel": "Lier à une étape (optionnel)",
    "milestoneNone": "Aucune",
    "urlLabel": "Lien",
    "urlPlaceholder": "https://…",
    "save": "Ajouter le document"
  },
  "category": {
    "tickets": "Billets",
    "lodging": "Hébergement",
    "insurance": "Assurance",
    "visa": "Visa/ESTA",
    "transport": "Transport",
    "other": "Autre"
  },
  "offline": {
    "download": "Enregistrer hors-ligne",
    "remove": "Retirer la copie hors-ligne",
    "downloaded": "Hors-ligne",
    "downloading": "Téléchargement…"
  },
  "errors": {
    "tooLarge": "Fichier trop volumineux (max 25 Mo).",
    "uploadFailed": "Échec de l'envoi. Réessaie.",
    "invalidUrl": "Entre un lien http(s) valide.",
    "offlineFirst": "Enregistre-le hors-ligne d'abord pour l'ouvrir ici.",
    "permissionDenied": "Permission refusée.",
    "nameRequired": "Donne-lui un nom."
  },
  "delete": {
    "confirmTitle": "Supprimer le document ?",
    "confirmBody": "Ça le supprime pour tout le monde."
  }
}
```

- [ ] **Step 7: Full validation**

Run: `npm run typecheck && npm run lint && npm test`
Expected: typecheck PASS, lint PASS, all tests PASS (existing 139 + the new documents tests).

- [ ] **Step 8: Commit**

```bash
git add src/features/documents/screens src/features/documents/index.ts "src/app/(modals)/documents/[tripId].tsx" src/features/trips/screens/TripDetailScreen.tsx src/core/i18n/locales/en.json src/core/i18n/locales/fr.json
git commit -m "feat(documents): screen, route, trip-detail entry, barrel + i18n" -m "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Manual verification (after an EAS build → TestFlight)

Local Metro cannot load the new native modules; verify on a TestFlight build:

1. As an **editor**, open a trip → **Documents** → add a PDF (Files), a photo (camera), and a URL link. All appear, grouped by category, attributed "Added by <you>".
2. A second **member** sees all three. A **viewer** sees them but has **no** add/delete controls.
3. **Save offline** a file → the badge shows "Offline"; enable airplane mode → opening it still works; opening a non-saved file shows "Save it offline first".
4. Delete a doc → it disappears for everyone and the local copy is purged.
5. Attach a doc to a milestone → confirm it persists (`milestone_id` set).

## Self-review (done at authoring time)

- **Spec coverage:** scope (PDF/image/URL/milestone) → Tasks 2,5,9; offline option C → Tasks 4,6,10; shared visibility + attribution → Tasks 2 (RLS) ,7,11; viewer read-only RLS → Task 2; bucket + signed URLs → Tasks 2,5,8; module structure/i18n/tests/edge-cases → Tasks 3–11. No spec section left unmapped.
- **Placeholder scan:** no TBD/TODO; every code step shows full code. The two "verify before coding" callouts (members shape; `mediaTypes`/`expo-file-system/legacy`) are concrete fallbacks, not vague placeholders.
- **Type consistency:** `DocumentRow`, `CreateFileDocumentInput`, `CreateUrlDocumentInput`, `FileTooLargeError`, `documentsQueryKey`, `useOfflineDocs`, `localPathFor`, `openDocument`, `SUGGESTED_CATEGORIES` are defined once and referenced with identical names throughout.

```

```
