import { supabase } from '@core/supabase/client';
import { listMembers } from '@features/trips/api/members';

jest.mock('@core/supabase/client', () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));

const mockedFrom = supabase.from as jest.Mock;
const mockedRpc = supabase.rpc as jest.Mock;

describe('listMembers', () => {
  afterEach(() => jest.clearAllMocks());

  it('merges trip_members with safe profiles from the RPC (not a profiles embed)', async () => {
    const eq = jest
      .fn()
      .mockResolvedValue({ data: [{ trip_id: 't1', user_id: 'u1', role: 'editor' }], error: null });
    mockedFrom.mockReturnValue({ select: () => ({ eq }) });
    mockedRpc.mockResolvedValue({
      data: [{ id: 'u1', display_name: 'Ana', avatar_sprite_id: 's1', avatar_color: '#fff' }],
      error: null,
    });

    const members = await listMembers('t1');

    expect(mockedFrom).toHaveBeenCalledWith('trip_members');
    expect(eq).toHaveBeenCalledWith('trip_id', 't1');
    expect(mockedRpc).toHaveBeenCalledWith('get_trip_member_profiles', { p_trip_id: 't1' });
    expect(members).toHaveLength(1);
    expect(members[0].profile?.display_name).toBe('Ana');
    expect(members[0].profile?.avatar_sprite_id).toBe('s1');
    expect(members[0].profile?.avatar_color).toBe('#fff');
  });

  it('does NOT embed the profiles table (PII hardening — base SELECT is own-only)', async () => {
    const select = jest.fn((_columns?: string) => ({
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    }));
    mockedFrom.mockReturnValue({ select });
    mockedRpc.mockResolvedValue({ data: [], error: null });

    await listMembers('t1');

    // The select must be a plain column list, never a `profiles(...)` embed.
    const selectArg = select.mock.calls[0]?.[0];
    if (selectArg !== undefined) {
      expect(selectArg).not.toMatch(/profiles\s*\(/);
    }
  });

  it('sets profile to null when the RPC returns no row for a member', async () => {
    const eq = jest.fn().mockResolvedValue({
      data: [
        { trip_id: 't1', user_id: 'u1', role: 'owner' },
        { trip_id: 't1', user_id: 'u2', role: 'viewer' },
      ],
      error: null,
    });
    mockedFrom.mockReturnValue({ select: () => ({ eq }) });
    mockedRpc.mockResolvedValue({
      data: [{ id: 'u1', display_name: 'Ana', avatar_sprite_id: 's1', avatar_color: '#fff' }],
      error: null,
    });

    const members = await listMembers('t1');

    expect(members).toHaveLength(2);
    expect(members.find((m) => m.user_id === 'u1')?.profile?.display_name).toBe('Ana');
    expect(members.find((m) => m.user_id === 'u2')?.profile).toBeNull();
  });

  it('throws when the trip_members query errors', async () => {
    const eq = jest.fn().mockResolvedValue({ data: null, error: { message: 'denied' } });
    mockedFrom.mockReturnValue({ select: () => ({ eq }) });

    await expect(listMembers('t1')).rejects.toMatchObject({ message: 'denied' });
    expect(mockedRpc).not.toHaveBeenCalled();
  });

  it('throws when the member-profiles RPC errors', async () => {
    const eq = jest
      .fn()
      .mockResolvedValue({ data: [{ trip_id: 't1', user_id: 'u1', role: 'editor' }], error: null });
    mockedFrom.mockReturnValue({ select: () => ({ eq }) });
    mockedRpc.mockResolvedValue({ data: null, error: { message: 'rpc boom' } });

    await expect(listMembers('t1')).rejects.toMatchObject({ message: 'rpc boom' });
  });
});
