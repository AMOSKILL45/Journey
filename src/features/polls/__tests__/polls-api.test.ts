import { supabase } from '@core/supabase/client';

import { castVote, closePoll, createPoll, listTripPolls } from '../api';

describe('polls api', () => {
  afterEach(() => jest.restoreAllMocks());

  it('lists polls for a trip newest-first', async () => {
    const order = jest.fn().mockResolvedValue({ data: [{ id: 'p1' }], error: null });
    jest.spyOn(supabase, 'from').mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order,
    } as never);

    const result = await listTripPolls('t1');
    expect(result).toEqual([{ id: 'p1' }]);
    expect(order).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('createPoll inserts question + options + author', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    const insert = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: { id: 'p2' }, error: null }),
      }),
    });
    jest.spyOn(supabase, 'from').mockReturnValue({ insert } as never);

    const poll = await createPoll({
      tripId: 't1',
      question: 'Beach or city?',
      options: [
        { id: 'opt1', label: 'Beach' },
        { id: 'opt2', label: 'City' },
      ],
    });

    expect(poll).toEqual({ id: 'p2' });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        trip_id: 't1',
        question: 'Beach or city?',
        created_by: 'u1',
        milestone_id: null,
        expires_at: null,
        options: [
          { id: 'opt1', label: 'Beach' },
          { id: 'opt2', label: 'City' },
        ],
      }),
    );
  });

  it('castVote upserts on the (poll_id,user_id) PK', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u9' } }, error: null } as never);
    const upsert = jest.fn().mockResolvedValue({ error: null });
    jest.spyOn(supabase, 'from').mockReturnValue({ upsert } as never);

    await castVote('p1', 'opt2');

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ poll_id: 'p1', user_id: 'u9', option_id: 'opt2' }),
      { onConflict: 'poll_id,user_id' },
    );
  });

  it('castVote throws when not authenticated', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: null }, error: null } as never);
    await expect(castVote('p1', 'opt1')).rejects.toThrow('Not authenticated');
  });

  it('closePoll stamps closed_at on the poll', async () => {
    const eq = jest.fn().mockResolvedValue({ error: null });
    const update = jest.fn().mockReturnValue({ eq });
    jest.spyOn(supabase, 'from').mockReturnValue({ update } as never);

    await closePoll('p5');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ closed_at: expect.any(String) }));
    expect(eq).toHaveBeenCalledWith('id', 'p5');
  });

  it('propagates supabase errors on create', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    jest.spyOn(supabase, 'from').mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: new Error('boom') }),
        }),
      }),
    } as never);

    await expect(
      createPoll({ tripId: 't1', question: 'q', options: [{ id: 'opt1', label: 'a' }] }),
    ).rejects.toThrow('boom');
  });
});
