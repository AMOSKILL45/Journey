import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import type { Poll, PollVote } from '../api';
import { tally } from '../utils/pollResults';

export interface PollCardProps {
  poll: Poll;
  votes: PollVote[];
  myUserId: string | null;
  /** Resolved author display name (ghost-aware). Shown as a "Poll by …" byline. */
  authorName?: string | null;
  canManage: boolean;
  onVote: (optionId: string) => void;
  onClose: () => void;
}

const FULL_PCT = 100;

export function PollCard({
  poll,
  votes,
  myUserId,
  authorName,
  canManage,
  onVote,
  onClose,
}: PollCardProps) {
  const { t } = useTranslation();
  const result = tally(poll, votes, myUserId);

  return (
    <PixelCard className="mb-3" accessibilityLabel={poll.question}>
      <View className="mb-2 flex-row items-start justify-between gap-2">
        <View className="flex-1">
          <PixelText size="body" family="body-bold">
            {poll.question}
          </PixelText>
          {authorName ? (
            <PixelText
              size="caption"
              className="text-text-secondary"
              accessibilityLabel={t('documents.uploadedBy', { name: authorName })}
            >
              {t('documents.uploadedBy', { name: authorName })}
            </PixelText>
          ) : null}
        </View>
        <View
          className={
            result.isOpen
              ? 'rounded-full bg-secondary-700 px-2 py-0.5'
              : 'rounded-full bg-surface-alt px-2 py-0.5'
          }
        >
          <PixelText
            size="caption"
            family="body-medium"
            className={result.isOpen ? 'text-white' : 'text-text-secondary'}
          >
            {result.isOpen ? t('polls.state.open') : t('polls.state.closed')}
          </PixelText>
        </View>
      </View>

      <View className="gap-2">
        {result.byOption.map((opt) => {
          const mine = result.myVote === opt.id;
          const isWinner = result.winnerId === opt.id;
          const row = (
            <View
              className={`overflow-hidden rounded border-2 ${mine ? 'border-primary-600' : 'border-border'}`}
            >
              {/* Filled bar behind the label, width = vote share. */}
              <View
                className={`absolute bottom-0 left-0 top-0 ${isWinner ? 'bg-accent-500' : 'bg-sky-500'}`}
                style={{ width: `${Math.min(opt.pct, FULL_PCT)}%`, opacity: 0.35 }}
              />
              <View className="flex-row items-center justify-between px-3 py-2">
                <PixelText size="body" className="flex-1" family={mine ? 'body-semibold' : 'body'}>
                  {mine ? `▶ ${opt.label}` : opt.label}
                </PixelText>
                <PixelText size="small" family="body-medium" className="ml-2 text-text-secondary">
                  {t('polls.optionResult', { pct: opt.pct, count: opt.count })}
                </PixelText>
              </View>
            </View>
          );

          if (!result.isOpen) {
            return <View key={opt.id}>{row}</View>;
          }
          return (
            <Pressable
              key={opt.id}
              onPress={() => onVote(opt.id)}
              accessibilityRole="button"
              accessibilityLabel={opt.label}
              accessibilityState={{ selected: mine }}
            >
              {row}
            </Pressable>
          );
        })}
      </View>

      <View className="mt-2 flex-row items-center justify-between">
        <PixelText size="caption" className="text-text-secondary">
          {t('polls.totalVotes', { count: result.total })}
        </PixelText>
        {canManage && result.isOpen ? (
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('polls.close')}
            testID="poll-close"
          >
            <PixelText size="caption" family="body-medium" className="text-primary-600">
              {t('polls.close')}
            </PixelText>
          </Pressable>
        ) : null}
      </View>
    </PixelCard>
  );
}
