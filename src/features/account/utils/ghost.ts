import { t } from '@core/i18n';
import { isGhostUser } from '@features/trips/utils/sentinel';

export { GHOST_USER_ID, isGhostUser } from '@features/trips/utils/sentinel';

/**
 * Resolve the name to show for an author/owner. When the id is the reserved deleted-user
 * sentinel (10E §7.3), show the neutral localized ghost label (`account.ghostName`,
 * "Former traveller" / "Ancien voyageur") instead of any stored display name. Otherwise fall
 * back through the provided name to the generic anonymous label.
 *
 * Pure + synchronous so it can be used inline in render and in lists. Uses the standalone `t`
 * (locale is global) rather than the hook, so callers do not need a hook context.
 */
export function displayNameFor(
  userId: string | null | undefined,
  displayName: string | null | undefined,
): string {
  if (isGhostUser(userId)) return t('account.ghostName');
  return displayName ?? t('profile.anonymous');
}
