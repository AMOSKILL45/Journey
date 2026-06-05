import { create } from 'zustand';

import {
  caravanReducer,
  initialCaravan,
  type CaravanAction,
  type CaravanState,
} from '../utils/caravanProtocol';

interface CaravanStore extends CaravanState {
  dispatch: (action: CaravanAction) => void;
}

/**
 * Ephemeral caravan role store (ADR-005 — no DB object). Holds the current
 * `off | leading | following` role and applies transitions through the pure
 * `caravanReducer`, so the same logic is exercised by unit tests and runtime.
 */
export const useCaravanStore = create<CaravanStore>((set) => ({
  ...initialCaravan(),
  dispatch: (action) => set((s) => caravanReducer({ role: s.role, leaderId: s.leaderId }, action)),
}));
