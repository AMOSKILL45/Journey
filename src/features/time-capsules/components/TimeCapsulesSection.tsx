import { useMemo, useRef } from 'react';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { useTripMembers } from '@features/trips/hooks/useTripMembers';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import type { Capsule } from '../api';
import {
  useCapsuleMutations,
  useTimeCapsules,
  useTimeCapsulesRealtime,
} from '../hooks/useTimeCapsules';
import { isCapsuleOpen } from '../utils/openability';

import { CapsuleReveal } from './CapsuleReveal';
import { CreateCapsuleSheet, type CreateCapsuleSheetRef } from './CreateCapsuleSheet';
import { SealedCapsuleCard, type SealedCapsuleAuthor } from './SealedCapsuleCard';

export interface TimeCapsulesSectionProps {
  tripId: string;
}

/**
 * The trip's time-capsule shelf: sealed capsules render as locked cards with a
 * countdown; openable ones become an interactive {@link CapsuleReveal}. A Seal
 * CTA opens the create sheet; an empty state nudges the first capsule.
 */
export function TimeCapsulesSection({ tripId }: TimeCapsulesSectionProps) {
  const { t } = useTranslation();
  const createRef = useRef<CreateCapsuleSheetRef>(null);
  const { data: capsules = [], isLoading } = useTimeCapsules(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  const { open } = useCapsuleMutations(tripId);
  useTimeCapsulesRealtime(tripId);

  const authorById = useMemo(() => {
    const map = new Map<string, SealedCapsuleAuthor>();
    for (const m of members) {
      map.set(m.user_id, {
        spriteId: m.profile?.avatar_sprite_id ?? null,
        color: m.profile?.avatar_color ?? null,
      });
    }
    return map;
  }, [members]);

  if (isLoading) return null;

  const renderCapsule = (c: Capsule) =>
    isCapsuleOpen({ open_after: c.open_after, is_open: c.is_open }) ? (
      <CapsuleReveal key={c.id} capsule={c} onOpen={(id) => open.mutateAsync(id)} />
    ) : (
      <SealedCapsuleCard key={c.id} capsule={c} author={authorById.get(c.author_id)} />
    );

  return (
    <View className="gap-2">
      <PixelText size="h2" className="mb-1">
        {t('timeCapsules.create.title')}
      </PixelText>

      {capsules.length === 0 ? (
        <PixelCard className="items-center">
          <PixelText size="body" className="mb-2 text-center text-text-secondary">
            {t('timeCapsules.empty')}
          </PixelText>
        </PixelCard>
      ) : (
        capsules.map(renderCapsule)
      )}

      <PixelButton variant="secondary" onPress={() => createRef.current?.open()} fullWidth>
        {t('timeCapsules.create.seal')}
      </PixelButton>

      <CreateCapsuleSheet ref={createRef} tripId={tripId} />
    </View>
  );
}
