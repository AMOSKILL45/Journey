import { useProfile } from '@features/profile/hooks/useProfile';

export type ExpiryUrgency = 'none' | 'expired' | 'critical' | 'warning' | 'notice' | 'info';

export interface PassportExpiryStatus {
  daysUntilExpiry: number | null;
  urgency: ExpiryUrgency;
  expiresAt: string | null;
}

// Tier thresholds in days. Critical = within a week, warning = within a month,
// notice = within 3 months, info = within 6 months. Beyond that → none.
const TIER_DAYS = {
  CRITICAL: 7,
  WARNING: 30,
  NOTICE: 90,
  INFO: 180,
} as const;

const MS_PER_DAY = 86_400_000;

function urgencyFor(days: number): ExpiryUrgency {
  if (days < 0) return 'expired';
  if (days <= TIER_DAYS.CRITICAL) return 'critical';
  if (days <= TIER_DAYS.WARNING) return 'warning';
  if (days <= TIER_DAYS.NOTICE) return 'notice';
  if (days <= TIER_DAYS.INFO) return 'info';
  return 'none';
}

export function computeExpiryStatus(
  expiresAt: string | null | undefined,
  now: Date = new Date(),
): PassportExpiryStatus {
  if (!expiresAt) return { daysUntilExpiry: null, urgency: 'none', expiresAt: null };

  // passport_expires_at is a Postgres date (YYYY-MM-DD), interpreted at UTC
  // midnight. We compute the day delta in calendar days, not absolute ms, so
  // a trip starting tomorrow morning shows "1 day" even if `now` is in the
  // afternoon.
  const target = new Date(`${expiresAt}T00:00:00Z`);
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = Math.floor((target.getTime() - today.getTime()) / MS_PER_DAY);

  return { daysUntilExpiry: days, urgency: urgencyFor(days), expiresAt };
}

export function usePassportExpiry(): PassportExpiryStatus {
  const { data: profile } = useProfile();
  return computeExpiryStatus(profile?.passport_expires_at);
}
