-- Phase 4E: documents carry an optional expiry so a personal reminder can reference them.
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS expires_at date;
