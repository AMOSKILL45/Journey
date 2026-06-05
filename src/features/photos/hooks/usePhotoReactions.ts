import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@core/supabase/client';

import { listReactions, toggleReaction, type ReactionRow, type ReactionTargetType } from '../api';
import { type ReactionId } from '../data/reactionSet';

export const reactionsQueryKey = (targetType: ReactionTargetType, targetId: string) =>
  ['reactions', targetType, targetId] as const;

/**
 * Live reactions for a single target. Loads the rows via TanStack and subscribes to Realtime
 * postgres_changes on `reactions` (filtered to this target) so counts update when anyone in the
 * trip reacts. `toggle` is optimistic — it flips the cached row immediately and reconciles on
 * settle.
 */
export function usePhotoReactions(
  targetType: ReactionTargetType,
  targetId: string,
  currentUserId: string | null,
) {
  const qc = useQueryClient();
  const key = reactionsQueryKey(targetType, targetId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => listReactions(targetType, targetId),
    enabled: Boolean(targetId),
  });

  useEffect(() => {
    if (!targetId) return undefined;
    const channel = supabase
      .channel(`reactions:${targetType}:${targetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
          filter: `target_id=eq.${targetId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: key });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [targetType, targetId, qc, key]);

  const toggle = useMutation({
    mutationFn: (emoji: ReactionId) => toggleReaction(targetType, targetId, emoji),
    onMutate: async (emoji: ReactionId) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ReactionRow[]>(key) ?? [];
      const mineIdx = previous.findIndex((r) => r.emoji === emoji && r.user_id === currentUserId);
      let next: ReactionRow[];
      if (mineIdx >= 0) {
        next = previous.filter((_, i) => i !== mineIdx);
      } else if (currentUserId) {
        const optimistic: ReactionRow = {
          id: `optimistic-${emoji}`,
          target_type: targetType,
          target_id: targetId,
          user_id: currentUserId,
          emoji,
          created_at: new Date().toISOString(),
        };
        next = [...previous, optimistic];
      } else {
        next = previous;
      }
      qc.setQueryData<ReactionRow[]>(key, next);
      return { previous };
    },
    onError: (_err, _emoji, context) => {
      if (context?.previous) qc.setQueryData(key, context.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });

  return { ...query, toggle };
}
