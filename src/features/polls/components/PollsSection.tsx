import { useMemo, useRef } from 'react';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { haptics } from '@features/feedback';
import { useTripMembers } from '@features/trips/hooks/useTripMembers';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingState } from '@shared/components/LoadingState';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

import { resolveAuthorName } from '../data/ghostAuthor';
import { usePollVote } from '../hooks/usePollVote';
import { usePollVotes, usePolls, usePollsRealtime } from '../hooks/useTripPolls';

import { CreatePollSheet, type CreatePollSheetRef } from './CreatePollSheet';
import { PollCard } from './PollCard';

const EDITOR_ROLES = ['owner', 'editor'];

export function PollsSection({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const createRef = useRef<CreatePollSheetRef>(null);
  const { data: polls = [], isLoading, isError, refetch } = usePolls(tripId);
  const { data: votes = [] } = usePollVotes(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  const { vote, close, userId } = usePollVote(tripId);
  usePollsRealtime(tripId);

  const canManage = useMemo(() => {
    const me = members.find((m) => m.user_id === userId);
    return Boolean(me && EDITOR_ROLES.includes(me.role));
  }, [members, userId]);

  const votesByPoll = useMemo(() => {
    const map = new Map<string, typeof votes>();
    for (const v of votes) map.set(v.poll_id, [...(map.get(v.poll_id) ?? []), v]);
    return map;
  }, [votes]);

  // Ghost-aware author display name per poll (sentinel id → "former traveller").
  const authorNameFor = (createdBy: string | null): string => {
    const member = members.find((m) => m.user_id === createdBy);
    return resolveAuthorName(createdBy, member?.profile?.display_name ?? null);
  };

  return (
    <View className="gap-2">
      <PixelText size="h2" className="mb-1">
        {t('polls.section.title')}
      </PixelText>

      {isLoading ? (
        <LoadingState variant="skeleton" label={t('common.loading')} />
      ) : isError ? (
        <ErrorState
          title={t('polls.section.title')}
          body={t('common.somethingWentWrong')}
          onRetry={() => void refetch()}
        />
      ) : polls.length === 0 ? (
        <EmptyState title={t('emptyStates.polls.title')} body={t('emptyStates.polls.body')} />
      ) : (
        polls.map((p) => (
          <PollCard
            key={p.id}
            poll={p}
            votes={votesByPoll.get(p.id) ?? []}
            myUserId={userId}
            authorName={authorNameFor(p.created_by)}
            canManage={canManage}
            onVote={(optionId) => {
              haptics.selection();
              vote.mutate({ pollId: p.id, optionId });
            }}
            onClose={() => close.mutate(p.id)}
          />
        ))
      )}

      {canManage ? (
        <PixelButton variant="secondary" onPress={() => createRef.current?.open()} fullWidth>
          {t('polls.createCta')}
        </PixelButton>
      ) : null}

      <CreatePollSheet ref={createRef} tripId={tripId} />
    </View>
  );
}
