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
