# Phase 4A — Documents — Design

> Sub-project 4A of Phase 4 (Documents + Checklist + Smart Reminders). Phase 4 was
> decomposed into 5 independent sub-systems; this spec covers **Documents** only.
> Each sub-project gets its own spec → plan → implementation cycle.
>
> Date: 2026-05-30 · Status: approved design, pre-plan

## 1. Context & decomposition

Phase 4 in the master spec bundles three features that are really **five independent
sub-systems**:

| #      | Sub-project                              | Depends on         |
| ------ | ---------------------------------------- | ------------------ |
| **4A** | **Documents** (this spec)                | —                  |
| 4B     | Checklists (global + per-user readiness) | —                  |
| 4C     | Push notifications infra                 | —                  |
| 4D     | Smart reminders (trip)                   | 4C + 4B            |
| 4E     | Personal / life reminders                | 4C + 4A + Identity |

Recommended build order: `4A → 4B → 4C → 4D → 4E`.

**Documents is first** because it is self-contained (no cron/push), it is the headline
Phase 4 deliverable ("upload your ESTA"), and it establishes the Supabase Storage pattern
that Photos (Phase 7) will reuse. Documents is the **first feature in the app to use
Supabase Storage** — no uploads exist yet.

### Relationship to Checklists (4B)

The user's broader vision is a **trip-readiness system**: see at a glance _who has done
what / who is late_. That readiness/assignment logic lives in **Checklists (4B)**, not
here. Documents stays a **shared vault**; a checklist item in 4B will be able to reference
a document (e.g. "Upload your ESTA" → ✅ when a doc is attached). This spec only guarantees
that documents are referenceable by `id` and attributed by `uploaded_by`.

## 2. Scope

**In scope (v1.0 first cut — "Full"):**

- File documents: **PDF** and **image** (photo library + camera scan).
- **URL** documents: a saved link (e.g. an online booking), no file in Storage.
- **Milestone linking**: a document may optionally be attached to a milestone.
- **Offline**: explicit "make available offline" per document **and** "download all" per
  trip (option C — explicit download, not auto-cache).
- Shared visibility: every trip member sees all documents; attribution by uploader.

**Out of scope (later):**

- Auto-caching on view (we chose explicit download).
- Document versioning / history.
- Personal (trip-less) document vault — belongs to 4E / Identity.
- Readiness tracking, per-user assignment — belongs to 4B.
- OCR / MRZ extraction — belongs to Identity / 4E.

## 3. User stories

- As a member with **editor** role (invited members are editors by default), I add my
  travel docs (ESTA, plane ticket, hotel booking) so the whole trip can see them.
- As any member, I see **who uploaded** each document.
- As a member, I **make a doc (or the whole trip) available offline** to read it with no
  signal (plane, abroad without data).
- As a member, I attach a doc to a **milestone** (hotel booking → the hotel node) or save
  a **URL** instead of a file.
- As a **viewer**, I can see and open documents but cannot add or delete anything.

## 4. Data model

Migration `supabase/migrations/<ts>_trip_documents.sql`. Based on the master-spec
`documents` table, extended for URL docs + viewer hints.

```sql
CREATE TABLE IF NOT EXISTS public.documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id       uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  milestone_id  uuid REFERENCES public.milestones(id) ON DELETE SET NULL,
  category      text NOT NULL DEFAULT '',          -- free text; UI suggests chips
  name          text NOT NULL,
  file_type     text NOT NULL CHECK (file_type IN ('pdf','image','url')),
  storage_path  text,                              -- NULL when file_type = 'url'
  external_url  text,                              -- set when file_type = 'url'
  mime_type     text,                              -- for the viewer
  size_bytes    integer,                           -- NULL for url
  uploaded_by   uuid NOT NULL REFERENCES auth.users(id),
  uploaded_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documents_url_xor_file CHECK (
    (file_type = 'url' AND external_url IS NOT NULL AND storage_path IS NULL)
    OR (file_type <> 'url' AND storage_path IS NOT NULL)
  )
);

CREATE INDEX idx_documents_trip ON public.documents(trip_id);
CREATE INDEX idx_documents_milestone ON public.documents(milestone_id);
```

After the migration: regenerate `src/core/supabase/types.ts`
(`generate_typescript_types`).

## 5. Row-Level Security

Reuses existing helpers `is_trip_member(trip, uid)` and `is_trip_editor(trip, uid)`
(`role IN ('owner','editor')`). **Viewers are strictly read-only.**

| Action | Rule                                                                             |
| ------ | -------------------------------------------------------------------------------- |
| SELECT | `is_trip_member(trip_id, auth.uid())` — all members incl. viewers                |
| INSERT | `is_trip_editor(trip_id, auth.uid()) AND uploaded_by = auth.uid()`               |
| UPDATE | (`uploaded_by = auth.uid()` **AND** still editor) **OR** trip owner (moderation) |
| DELETE | (`uploaded_by = auth.uid()` **AND** still editor) **OR** trip owner (moderation) |

```sql
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
```

## 6. Storage bucket & policies

- **Private bucket** `trip-documents` (created via migration / SQL on `storage.buckets`).
- **Path convention**: `{trip_id}/{doc_id}.{ext}` — first folder segment = `trip_id`.
- Access via **short-lived signed URLs** (`createSignedUrl`), never public.
- **Storage RLS** on `storage.objects`, extracting `trip_id` from the path:

```sql
-- trip_id = (storage.foldername(name))[1]
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

The finer "uploader vs moderation" distinction is enforced on the `documents` table; the
Storage layer is gated at editor granularity.

## 7. Offline cache (option C — explicit)

Device-local, never in the DB.

- Library: `expo-file-system`. Local path:
  `documentDirectory/documents/{trip_id}/{doc_id}.{ext}`.
- A lightweight **registry** in AsyncStorage (`offline-docs:{trip_id}` → `doc_id[]`) for
  fast listing, reconciled against actual file existence.
- **Per-doc**: "make available offline" downloads via signed URL; a badge marks downloaded
  docs; "remove offline copy" evicts.
- **Per-trip**: "download all" iterates the trip's file docs (skips URL docs).
- **URL docs** are never downloadable (just a link).
- On document delete → evict the local file. On viewing offline without a local copy and no
  network → show "download it first".

## 8. Module structure (mirrors `src/features/milestones`)

```
src/features/documents/
  api/documents.ts          # CRUD + Storage (upload, signedUrl, remove)
  hooks/useDocuments.ts     # useTripDocuments, useUploadDocument, useDeleteDocument
  hooks/useOfflineDocs.ts   # downloadedIds, downloadDoc, downloadAll, evictDoc
  utils/offlineCache.ts     # expo-file-system + registry
  utils/fileTypes.ts        # mime→type, icon, formatBytes, isValidUrl, MAX_FILE_BYTES
  components/DocumentsSection.tsx     # list grouped by category + FAB
  components/DocumentCard.tsx         # icon, name, uploader, category, offline badge
  components/DocumentUploadSheet.tsx  # source + category + milestone + name / url
  components/DocumentViewer.tsx       # in-app image preview
  index.ts
  __tests__/
    documents-api.test.ts
    offlineCache.test.ts
    fileTypes.test.ts
    DocumentCard.test.tsx
```

### API surface (`api/documents.ts`)

```ts
listTripDocuments(tripId: string): Promise<DocumentRow[]>
createFileDocument(input: {
  tripId: string; milestoneId?: string; category: string; name: string;
  fileType: 'pdf' | 'image'; uri: string; mimeType: string; sizeBytes: number;
}): Promise<DocumentRow>                 // compress image → upload to Storage → insert row
createUrlDocument(input: {
  tripId: string; milestoneId?: string; category: string; name: string; url: string;
}): Promise<DocumentRow>
deleteDocument(doc: DocumentRow): Promise<void>   // remove Storage object + row + local cache
getSignedUrl(storagePath: string): Promise<string>
```

### Hooks

- `useTripDocuments(tripId)` — TanStack Query list, cache key `['documents', tripId]`.
- `useUploadDocument(tripId)` — mutation from a picker result; invalidates the list.
- `useDeleteDocument(tripId)` — mutation; optimistic removal.
- `useOfflineDocs(tripId)` — `{ downloadedIds, downloadDoc, downloadAll, evictDoc,
isDownloading }`.

## 9. UI / UX

- **Entry point**: a **Documents** button in the trip detail screen opens a dedicated route
  `src/app/(modals)/trip/[id]/documents.tsx` (scalable — Checklist will get its own).
- **Documents screen**: sections grouped by **category**; one `DocumentCard` per doc
  showing icon (by file_type), name, uploader avatar/name, category chip, and a **📥 offline
  badge** when downloaded; a **+** FAB to add. Empty state: friendly Cozy-Arcade prompt
  (no preloaded content).
- **Upload sheet** (`PixelBottomSheet`): pick **source** → Files (PDF, document-picker) /
  Photo library / Camera scan (image-picker) / **URL link**; then category (suggested chips
  _Billets, Hôtel, Assurance, Visa/ESTA, Transport, Autre_ + free text), optional milestone,
  name. Images compressed via `expo-image-manipulator`; reject files > `MAX_FILE_BYTES`
  (~25 MB).
- **Open a document** (tap):
  - image → in-app `DocumentViewer` preview;
  - pdf → system viewer via `expo-sharing` / `Linking` on the local file (downloads first if
    needed);
  - url → open in browser (`Linking.openURL`).
  - Offline + not downloaded + no network → message "download it first".
- All strings via `t('documents.*')`; zero hardcoded strings.

## 10. Dependencies

`expo-document-picker`, `expo-image-picker`, `expo-image-manipulator`,
`expo-file-system`, `expo-sharing`. (None currently installed — all new.)

Add via `npx expo install` to get SDK 54-compatible versions. Native modules → requires a
new EAS build (TestFlight), not just an OTA update.

## 11. i18n

Namespace `documents.*` in `en.json` (source of truth) + `fr.json`:
`documents.title`, `documents.empty.*`, `documents.add.*` (sources, category, milestone,
name, url), `documents.card.uploadedBy`, `documents.offline.*` (download / downloadAll /
remove / unavailable), `documents.category.*` (suggested chips), `documents.errors.*`
(tooLarge / uploadFailed / invalidUrl / offlineFirst), `documents.delete.confirm`.

## 12. Testing

Mirror the milestones test style (Jest + RNTL):

- `documents-api.test.ts` — CRUD, url-xor-file constraint, file_type detection, signed URL.
- `offlineCache.test.ts` — download, registry reconcile, evict, URL-doc skip.
- `fileTypes.test.ts` — mime→type, formatBytes, isValidUrl, size cap.
- `DocumentCard.test.tsx` — renders states (file vs url, offline badge, uploader).

Run `npm run typecheck && npm run lint && npm test` after each unit (inline, per workflow
preference — no code-validator subagent).

## 13. Edge cases & error handling

- Upload network failure → surface error, allow retry (no silent optimistic success).
- File over size cap → reject before upload with a clear message.
- Delete a downloaded doc → purge the local file + registry entry.
- Member demoted to viewer → RLS blocks new writes **and** further edits/deletes of their
  own docs (owner moderates); existing local cache untouched.
- Member removed from trip → RLS revokes access; local cache eviction is best-effort.
- Invalid / unreachable URL on a url-doc → validate format on input; reachability not
  guaranteed.
- Milestone deleted → `milestone_id` set NULL (doc survives, becomes trip-level).

## 14. Implementation outline (detailed plan via writing-plans)

1. Add deps + EAS build note.
2. Migration: `documents` table + RLS + `trip-documents` bucket + Storage policies; regen types.
3. `utils/fileTypes.ts` + tests.
4. `api/documents.ts` (Storage + CRUD) + tests.
5. `utils/offlineCache.ts` + `hooks/useOfflineDocs.ts` + tests.
6. `hooks/useDocuments.ts`.
7. Components: `DocumentCard`, `DocumentViewer`, `DocumentUploadSheet`, `DocumentsSection`.
8. Route `(modals)/trip/[id]/documents.tsx` + entry button in trip detail.
9. i18n keys (en + fr).
10. Barrel `index.ts` + final validation.

```

```
