import { presenceReduce, tripTopic, type PresenceMember } from '../utils/channel';

const m = (over: Partial<PresenceMember>): PresenceMember => ({
  user_id: 'u',
  avatar_sprite_id: 's',
  avatar_color: '#fff',
  status: 'online',
  current_milestone_id: null,
  ...over,
});

describe('channel utils', () => {
  it('builds a trip topic', () => {
    expect(tripTopic('abc')).toBe('trip:abc');
  });
  it('reduces a presence state map to a unique member list', () => {
    const members = presenceReduce({
      k1: [m({ user_id: 'u1', current_milestone_id: 'm1' })],
      k2: [m({ user_id: 'u2' })],
    });
    expect(members.map((x) => x.user_id).sort()).toEqual(['u1', 'u2']);
  });
  it('dedupes the same user across keys (latest wins)', () => {
    const members = presenceReduce({
      a: [m({ user_id: 'u1', status: 'online' })],
      b: [m({ user_id: 'u1', status: 'idle' })],
    });
    expect(members).toHaveLength(1);
    expect(members[0].status).toBe('idle');
  });
});
