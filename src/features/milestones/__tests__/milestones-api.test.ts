import { supabase } from '@core/supabase/client';

import { listTripCheckinMilestoneIds } from '../api/milestones';

describe('listTripCheckinMilestoneIds', () => {
  afterEach(() => jest.restoreAllMocks());

  it('returns empty array when the trip has no milestones', async () => {
    jest.spyOn(supabase, 'from').mockImplementation(
      () =>
        ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [], error: null }),
        }) as never,
    );
    const result = await listTripCheckinMilestoneIds('trip-1');
    expect(result).toEqual([]);
  });

  it('queries checkins for milestones and returns unique ids', async () => {
    const fromSpy = jest.spyOn(supabase, 'from');
    fromSpy.mockImplementationOnce(
      () =>
        ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: [{ id: 'm1' }, { id: 'm2' }], error: null }),
        }) as never,
    );
    fromSpy.mockImplementationOnce(
      () =>
        ({
          select: jest.fn().mockReturnThis(),
          in: jest.fn().mockResolvedValue({
            data: [{ milestone_id: 'm1' }, { milestone_id: 'm1' }, { milestone_id: 'm2' }],
            error: null,
          }),
        }) as never,
    );
    const result = await listTripCheckinMilestoneIds('trip-1');
    expect(result.sort()).toEqual(['m1', 'm2']);
  });
});
