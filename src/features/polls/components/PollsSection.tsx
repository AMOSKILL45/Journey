import { useMemo, useRef } from 'react';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { haptics } from '@features/feedback';
import { useTripMembers } from '@features/trips/hooks/useTripMembers';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import { usePollVote } from '../hooks/usePollVote';
import { usePollVotes, usePolls, usePollsRealtime } from '../hooks/useTripPolls';

import { CreatePollSheet, type CreatePollSheetRef } from './CreatePollSheet';
import { PollCard } from './PollCard';

const EDITOR_ROLES = ['owner', 'editor'];

export function PollsSection({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const createRef = useRef<CreatePollSheetRef>(null);
  const { data: polls = [], isLoading } = usePolls(tripId);
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

  if (isLoading) return null;

  return (
    <View className="gap-2">
      <PixelText size="h2" className="mb-1">
        {t('polls.section.title')}
      </PixelText>

      {polls.length === 0 ? (
        <PixelCard className="items-center">
          <PixelText size="body" className="mb-2 text-center text-text-secondary">
            {t('polls.empty.body')}
          </PixelText>
        </PixelCard>
      ) : (
        polls.map((p) => (
          <PollCard
            key={p.id}
            poll={p}
            votes={votesByPoll.get(p.id) ?? []}
            myUserId={userId}
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
