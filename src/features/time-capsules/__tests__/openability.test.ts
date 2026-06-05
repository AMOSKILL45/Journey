import { countdownLabel, isCapsuleOpen } from '@features/time-capsules/utils/openability';

const ONE_SECOND_MS = 1000;
const ONE_MINUTE_MS = 60_000;
const TWO_DAYS_MS = 2 * 86_400_000;

it('is open once open_after has passed', () => {
  const past = new Date(Date.now() - ONE_SECOND_MS).toISOString();
  const future = new Date(Date.now() + ONE_MINUTE_MS).toISOString();
  expect(isCapsuleOpen({ open_after: past, is_open: false })).toBe(true);
  expect(isCapsuleOpen({ open_after: future, is_open: false })).toBe(false);
  // server-computed milestone openness wins
  expect(isCapsuleOpen({ open_after: null, is_open: true })).toBe(true);
});

it('treats a missing trigger as sealed', () => {
  expect(isCapsuleOpen({ open_after: null, is_open: false })).toBe(false);
});

it('formats a countdown for a sealed capsule', () => {
  const future = new Date(Date.now() + TWO_DAYS_MS).toISOString();
  expect(countdownLabel(future)).toMatch(/2/);
});

it('clamps a past date to a zero countdown', () => {
  const past = new Date(Date.now() - TWO_DAYS_MS).toISOString();
  expect(countdownLabel(past)).toBe('0');
});
