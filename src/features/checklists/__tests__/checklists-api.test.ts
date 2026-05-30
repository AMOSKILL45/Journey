import { supabase } from '@core/supabase/client';

import { listChecklists, toggleMyCompletion } from '../api/checklists';

describe('checklists api', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lists checklists for a trip ordered by order_index', async () => {
    jest.spyOn(supabase, 'from').mockImplementation(
      () =>
        ({
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [{ id: 'c1' }], error: null }),
        }) as never,
    );
    expect(await listChecklists('t1')).toEqual([{ id: 'c1' }]);
  });

  it('toggleMyCompletion inserts a completion row for the current user', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    const insert = jest.fn().mockResolvedValue({ error: null });
    jest.spyOn(supabase, 'from').mockReturnValue({ insert } as never);

    await toggleMyCompletion('item-9', true);
    expect(insert).toHaveBeenCalledWith({ item_id: 'item-9', user_id: 'u1' });
  });
});
