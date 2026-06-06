// Reserved "deleted user" sentinel id (Phase 10E account-deletion policy §7.3).
// Content authored by a deleted account is re-pointed at this sentinel rather than
// cascade-deleted, so co-travellers' trips stay intact. The UI shows the neutral
// `account.ghostName` label ("Former traveller") instead of a real display name.
export const GHOST_USER_ID = 'de1e7e00-0000-4000-8000-000000000000';

/** True when an owner/member id is the reserved deleted-user sentinel. */
export const isGhostUser = (userId: string | null | undefined): boolean => userId === GHOST_USER_ID;
