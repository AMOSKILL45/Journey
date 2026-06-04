import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@core/supabase/client';

import { evaluateAchievements } from '../api';
import { filterUnseen, loadSeen, markSeen } from '../seenSet';

import { myAchievementsKey, useAchievementDefinitions } from './useAchievements';

export interface UnlockEvent {
  id: string;
  rarity: string;
}

/** Detects newly-unlocked achievements (catch-up RPC on mount + Realtime INSERTs),
 *  dedupes via a persisted seen-set, and exposes them one at a time. */
export function useAchievementUnlocks(userId: string | null) {
  const qc = useQueryClient();
  const { data: defs = [] } = useAchievementDefinitions();
  const [queue, setQueue] = useState<UnlockEvent[]>([]);
  const seenRef = useRef<Set<string>>(new Set());
  const rarityById = useRef<Map<string, string>>(new Map());

  rarityById.current = new Map(defs.map((d) => [d.id, d.rarity]));

  const enqueue = useCallback(async (ids: string[]) => {
    const fresh = filterUnseen(ids, seenRef.current);
    if (fresh.length === 0) return;
    seenRef.current = await markSeen(seenRef.current, fresh);
    setQueue((q) => [
      ...q,
      ...fresh.map((id) => ({ id, rarity: rarityById.current.get(id) ?? 'common' })),
    ]);
  }, []);

  useEffect(() => {
    if (!userId) return undefined;
    let cancelled = false;

    (async () => {
      seenRef.current = await loadSeen();
      const unlocked = await evaluateAchievements().catch(() => []);
      void qc.invalidateQueries({ queryKey: myAchievementsKey });
      if (!cancelled && unlocked.length) await enqueue(unlocked.map((u) => u.achievement_id));
    })();

    const channel = supabase
      .channel(`achievements:${userId}`, { config: { private: true } })
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as { achievement_id?: string };
          if (row?.achievement_id) {
            void enqueue([row.achievement_id]);
            void qc.invalidateQueries({ queryKey: myAchievementsKey });
          }
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId, qc, enqueue]);

  const dequeue = useCallback(() => setQueue((q) => q.slice(1)), []);
  return { current: queue[0] ?? null, dequeue };
}
