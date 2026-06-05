import type { Database } from '@core/supabase/types';

import { computeTripStats, type StatsLeg, type StatsMilestone, type StatsTrip } from '../stats';

type CheckinRow = Database['public']['Tables']['checkins']['Row'];

function trip(overrides: Partial<StatsTrip> = {}): StatsTrip {
  return {
    start_date: null,
    end_date: null,
    destination_country: null,
    destination_countries: null,
    ...overrides,
  };
}

function checkin(id: string): CheckinRow {
  return {
    id,
    checked_in_at: '2026-06-01T10:00:00.000Z',
    location_actual: null,
    milestone_id: 'm1',
    note: null,
    user_id: 'u1',
  };
}

describe('computeTripStats', () => {
  describe('distanceM', () => {
    it('sums distance_m across all legs', () => {
      const legs: StatsLeg[] = [{ distance_m: 1200 }, { distance_m: 800 }, { distance_m: 50 }];
      expect(computeTripStats(trip(), [], legs, []).distanceM).toBe(2050);
    });

    it('is 0 with no legs', () => {
      expect(computeTripStats(trip(), [], [], []).distanceM).toBe(0);
    });
  });

  describe('countries', () => {
    it('counts distinct destination countries from the array, deduped', () => {
      const t = trip({ destination_countries: ['FR', 'fr', ' ES ', 'IT'] });
      expect(computeTripStats(t, [], [], []).countries).toBe(3);
    });

    it('merges the legacy single destination_country with the array', () => {
      const t = trip({ destination_country: 'JP', destination_countries: ['JP', 'KR'] });
      expect(computeTripStats(t, [], [], []).countries).toBe(2);
    });

    it('is 0 when no destination is set', () => {
      expect(computeTripStats(trip(), [], [], []).countries).toBe(0);
    });
  });

  describe('days', () => {
    it('returns the inclusive whole-day span of the trip', () => {
      const t = trip({ start_date: '2026-06-01', end_date: '2026-06-08' });
      expect(computeTripStats(t, [], [], []).days).toBe(8);
    });

    it('treats a same-day trip as 1 day', () => {
      const t = trip({ start_date: '2026-06-01', end_date: '2026-06-01' });
      expect(computeTripStats(t, [], [], []).days).toBe(1);
    });

    it('falls back to milestone dates when the trip has no dates', () => {
      const t = trip();
      const milestones: StatsMilestone[] = [
        { arrival_at: '2026-07-10T08:00:00.000Z', departure_at: null },
        { arrival_at: null, departure_at: '2026-07-12T20:00:00.000Z' },
      ];
      expect(computeTripStats(t, milestones, [], []).days).toBe(3);
    });

    it('is 0 when nothing is dated', () => {
      expect(
        computeTripStats(trip(), [{ arrival_at: null, departure_at: null }], [], []).days,
      ).toBe(0);
    });
  });

  describe('checkins', () => {
    it('counts the checkin rows', () => {
      const checkins = [checkin('c1'), checkin('c2')];
      expect(computeTripStats(trip(), [], [], checkins).checkins).toBe(2);
    });

    it('is 0 with no checkins', () => {
      expect(computeTripStats(trip(), [], [], []).checkins).toBe(0);
    });
  });

  it('folds a full trip into all four stats', () => {
    const t = trip({
      start_date: '2026-06-01',
      end_date: '2026-06-05',
      destination_countries: ['FR', 'ES'],
    });
    const out = computeTripStats(
      t,
      [{ arrival_at: '2026-06-02', departure_at: null }],
      [{ distance_m: 1000 }, { distance_m: 500 }],
      [checkin('c1')],
    );
    expect(out).toEqual({ distanceM: 1500, countries: 2, days: 5, checkins: 1 });
  });
});
