import { computeExpiryStatus } from '../hooks/usePassportExpiry';

// Fix `now` so the tests are deterministic across time zones / dev clocks.
const NOW = new Date('2026-05-26T12:00:00Z');

describe('computeExpiryStatus', () => {
  it('returns none when expiresAt is null/undefined', () => {
    expect(computeExpiryStatus(null, NOW)).toEqual({
      daysUntilExpiry: null,
      urgency: 'none',
      expiresAt: null,
    });
    expect(computeExpiryStatus(undefined, NOW).urgency).toBe('none');
  });

  it('returns expired when the date has passed', () => {
    const yesterday = '2026-05-25';
    expect(computeExpiryStatus(yesterday, NOW)).toMatchObject({
      daysUntilExpiry: -1,
      urgency: 'expired',
    });
  });

  it('returns critical within 7 days', () => {
    const inFiveDays = '2026-05-31';
    expect(computeExpiryStatus(inFiveDays, NOW)).toMatchObject({
      daysUntilExpiry: 5,
      urgency: 'critical',
    });
  });

  it('returns warning at 30 days exactly', () => {
    const in30Days = '2026-06-25';
    expect(computeExpiryStatus(in30Days, NOW)).toMatchObject({
      daysUntilExpiry: 30,
      urgency: 'warning',
    });
  });

  it('returns notice between 30 and 90 days', () => {
    const in60Days = '2026-07-25';
    expect(computeExpiryStatus(in60Days, NOW)).toMatchObject({
      daysUntilExpiry: 60,
      urgency: 'notice',
    });
  });

  it('returns info between 90 and 180 days', () => {
    const in150Days = '2026-10-23';
    expect(computeExpiryStatus(in150Days, NOW)).toMatchObject({
      daysUntilExpiry: 150,
      urgency: 'info',
    });
  });

  it('returns none beyond 180 days', () => {
    const in1Year = '2027-05-26';
    expect(computeExpiryStatus(in1Year, NOW)).toMatchObject({
      urgency: 'none',
    });
  });

  it('treats expiry today as critical (0 days)', () => {
    expect(computeExpiryStatus('2026-05-26', NOW)).toMatchObject({
      daysUntilExpiry: 0,
      urgency: 'critical',
    });
  });
});
