export const MAX_CAPTION_LENGTH = 280;

/** Trim a caption and coerce empty/whitespace-only input to null (so the DB stores NULL). */
export function normalizeCaption(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/** A caption is valid when, after trimming, it is within the length cap (empty is allowed). */
export function isValidCaption(value: string | null | undefined): boolean {
  const normalized = normalizeCaption(value);
  if (normalized === null) return true;
  return normalized.length <= MAX_CAPTION_LENGTH;
}
