import { supabase } from '@core/supabase/client';

import { markRead } from '../api/notifications';

describe('notifications api', () => {
  afterEach(() => jest.restoreAllMocks());

  it('markRead patches read_at for the row', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    jest.spyOn(supabase, 'from').mockReturnValue({ update } as never);
    await markRead('n1');
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ read_at: expect.any(String) }));
    expect(eq).toHaveBeenCalledWith('id', 'n1');
  });
});
