import { t } from '@core/i18n';

/**
 * Reserved sentinel author id (Phase 10E account-deletion policy): shared content
 * authored by a deleted user is re-pointed at this id instead of being removed, so
 * co-travellers' trips stay intact. Mirrors the DB sentinel auth user.
 */
export const GHOST_AUTHOR_ID = 'de1e7e00-0000-4000-8000-000000000000';

/**
 * Resolve the display name for a content author. Returns the localized "former
 * traveller" name for the deletion sentinel, the looked-up name when present, and
 * a generic "anonymous" fallback otherwise. Never renders a raw uuid.
 */
export function resolveAuthorName(authorId: string | null, lookupName?: string | null): string {
  if (authorId === GHOST_AUTHOR_ID) return t('account.ghostName');
  const trimmed = lookupName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : t('profile.anonymous');
}
