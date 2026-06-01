export interface PresenceMember {
  user_id: string;
  avatar_sprite_id: string;
  avatar_color: string;
  status: 'online' | 'idle';
  current_milestone_id: string | null;
}

export function tripTopic(tripId: string): string {
  return `trip:${tripId}`;
}

/** Flatten Supabase presence state ({key: meta[]}) into one entry per user_id. */
export function presenceReduce(state: Record<string, PresenceMember[]>): PresenceMember[] {
  const byUser = new Map<string, PresenceMember>();
  for (const metas of Object.values(state)) {
    for (const m of metas) byUser.set(m.user_id, m);
  }
  return [...byUser.values()];
}
