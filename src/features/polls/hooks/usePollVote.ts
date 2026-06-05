import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@features/auth';

import { castVote, closePoll, createPoll, type CreatePollInput, type PollVote } from '../api';

import { pollVotesKey, pollsKey } from './useTripPolls';

/**
 * Mutations for a trip's polls: optimistic 1-tap voting (with rollback),
 * plus create + close. Optimistic vote writes straight into the `poll-votes`
 * cache so the bars move instantly; Realtime reconciles the truth shortly after.
 */
export function usePollVote(tripId: string) {
  const qc = useQueryClient();
  const { session } = useSession();
  const userId = session?.user.id ?? null;

  const vote = useMutation({
    mutationFn: (p: { pollId: string; optionId: string }) => castVote(p.pollId, p.optionId),
    onMutate: async (p) => {
      await qc.cancelQueries({ queryKey: pollVotesKey(tripId) });
      const previous = qc.getQueryData<PollVote[]>(pollVotesKey(tripId)) ?? [];
      if (userId) {
        const others = previous.filter((v) => !(v.poll_id === p.pollId && v.user_id === userId));
        qc.setQueryData<PollVote[]>(pollVotesKey(tripId), [
          ...others,
          {
            poll_id: p.pollId,
            user_id: userId,
            option_id: p.optionId,
            voted_at: new Date().toISOString(),
          },
        ]);
      }
      return { previous };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.previous) qc.setQueryData(pollVotesKey(tripId), ctx.previous);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: pollVotesKey(tripId) });
    },
  });

  const create = useMutation({
    mutationFn: (input: Omit<CreatePollInput, 'tripId'>) => createPoll({ ...input, tripId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pollsKey(tripId) });
    },
  });

  const close = useMutation({
    mutationFn: (pollId: string) => closePoll(pollId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: pollsKey(tripId) });
    },
  });

  return { vote, create, close, userId };
}
