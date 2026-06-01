import { create } from 'zustand';

import type { PresenceMember } from '../utils/channel';

export interface LivePosition {
  lat: number;
  lng: number;
  ts: number;
}

interface PresenceState {
  membersByTrip: Record<string, PresenceMember[]>;
  positionsByUser: Record<string, LivePosition>; // filled by 5B GPS broadcast
  setMembers: (tripId: string, members: PresenceMember[]) => void;
  setPosition: (userId: string, pos: LivePosition) => void;
  clearTrip: (tripId: string) => void;
}

export const usePresenceStore = create<PresenceState>((set) => ({
  membersByTrip: {},
  positionsByUser: {},
  setMembers: (tripId, members) =>
    set((s) => ({ membersByTrip: { ...s.membersByTrip, [tripId]: members } })),
  setPosition: (userId, pos) =>
    set((s) => ({ positionsByUser: { ...s.positionsByUser, [userId]: pos } })),
  clearTrip: (tripId) =>
    set((s) => {
      const next = { ...s.membersByTrip };
      delete next[tripId];
      return { membersByTrip: next };
    }),
}));
