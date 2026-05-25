import { supabase } from '@core/supabase/client';

import { getMyProfile, updateMyProfile } from '../api/profile';

describe('profile.api', () => {
  afterEach(() => jest.restoreAllMocks());

  it('getMyProfile returns null when no user', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: null }, error: null } as never);
    const result = await getMyProfile();
    expect(result).toBeNull();
  });

  it('getMyProfile fetches the row matching the current user id', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    const builder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { id: 'u1', display_name: 'Amos' }, error: null } as never),
    };
    const fromSpy = jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    const result = await getMyProfile();
    expect(fromSpy).toHaveBeenCalledWith('profiles');
    expect(builder.eq).toHaveBeenCalledWith('id', 'u1');
    expect(result).toEqual({ id: 'u1', display_name: 'Amos' });
  });

  it('getMyProfile throws on supabase error', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    const builder = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: null, error: { message: 'denied' } } as never),
    };
    jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    await expect(getMyProfile()).rejects.toMatchObject({ message: 'denied' });
  });

  it('updateMyProfile throws when not authenticated', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: null }, error: null } as never);
    await expect(updateMyProfile({ display_name: 'X' })).rejects.toThrow('Not authenticated');
  });

  it('updateMyProfile updates the row for the current user and returns it', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    const builder = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({ data: { id: 'u1', display_name: 'Amos' }, error: null } as never),
    };
    const fromSpy = jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    const result = await updateMyProfile({ display_name: 'Amos' });
    expect(fromSpy).toHaveBeenCalledWith('profiles');
    expect(builder.update).toHaveBeenCalledWith({ display_name: 'Amos' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'u1');
    expect(result).toEqual({ id: 'u1', display_name: 'Amos' });
  });

  it('updateMyProfile throws on supabase error', async () => {
    jest
      .spyOn(supabase.auth, 'getUser')
      .mockResolvedValue({ data: { user: { id: 'u1' } }, error: null } as never);
    const builder = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'boom' } } as never),
    };
    jest.spyOn(supabase, 'from').mockReturnValue(builder as never);
    await expect(updateMyProfile({ display_name: 'X' })).rejects.toMatchObject({ message: 'boom' });
  });
});
