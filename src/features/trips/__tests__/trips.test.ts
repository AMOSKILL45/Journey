import { supabase } from '@core/supabase/client';

import { createTrip, deleteTrip, getTrip, listMyTrips } from '../api/trips';

describe('trips.api', () => {
  afterEach(() => jest.restoreAllMocks());

  it('listMyTrips queries trips ordered by start_date asc', async () => {
    const mockSingle = jest.fn();
    const builder = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [{ id: 't1', name: 'A' }], error: null } as never),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: mockSingle,
    };
    const fromSpy = jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    const result = await listMyTrips();
    expect(fromSpy).toHaveBeenCalledWith('trips');
    expect(builder.order).toHaveBeenCalledWith('start_date', { ascending: true });
    expect(result).toEqual([{ id: 't1', name: 'A' }]);
  });

  it('getTrip queries by id with maybeSingle', async () => {
    const builder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 't1' }, error: null } as never),
    };
    jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    const result = await getTrip('t1');
    expect(builder.eq).toHaveBeenCalledWith('id', 't1');
    expect(result).toEqual({ id: 't1' });
  });

  it('createTrip throws when not authenticated', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: null }, error: null } as never);
    await expect(createTrip({ name: 'X' })).rejects.toThrow('Not authenticated');
  });

  it('createTrip inserts owner_id from current user', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    const builder = {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 't1', name: 'X' }, error: null } as never),
    };
    jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    const result = await createTrip({ name: 'X' });
    expect(builder.insert).toHaveBeenCalledWith({ name: 'X', owner_id: 'u1' });
    expect(result).toEqual({ id: 't1', name: 'X' });
  });

  it('deleteTrip throws on supabase error', async () => {
    const builder = {
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ error: { message: 'denied' } } as never),
    };
    jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    await expect(deleteTrip('t1')).rejects.toMatchObject({ message: 'denied' });
  });
});
