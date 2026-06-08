import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Eye } from 'lucide-react-native';
import { useMemo } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { supabase } from '@core/supabase/client';
import { colors } from '@core/theme';
import { PathView } from '@features/milestones';
import { ErrorState } from '@shared/components/ErrorState';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { fetchPublicMilestones, fetchPublicTripByToken } from '../api/publicTrip';

const BADGE_ICON_SIZE = 14;
const COVER_HEIGHT = 160;
// Empty set: the public path is read-only, so no milestone is "checked in" and
// nodes render in their default locked/current states without a check-in handler.
const NO_CHECKINS: ReadonlySet<string> = new Set<string>();

export interface PublicTripScreenProps {
  token: string;
}

const publicTripQueryKey = (token: string) => ['public-trip', token] as const;
const publicMilestonesQueryKey = (tripId: string) => ['public-milestones', tripId] as const;
const publicOwnerQueryKey = (ownerId: string) => ['public-owner', ownerId] as const;

/**
 * Read-only, shareable view of a trip reached via the `thisisthejourney://t/:token` deep
 * link. It exposes ONLY the safe subset — name, dates, destination, cover and
 * the milestone path. There is no FAB, no check-in and no edit; documents,
 * checklists, photos, members and live locations stay private (RLS + the fact
 * that this screen never queries them). When the token resolves to nothing
 * (private trip or unknown token) it shows the "not public" empty state.
 */
export function PublicTripScreen({ token }: PublicTripScreenProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tripQuery = useQuery({
    queryKey: publicTripQueryKey(token),
    queryFn: () => fetchPublicTripByToken(token),
  });
  const trip = tripQuery.data ?? null;

  const milestonesQuery = useQuery({
    queryKey: publicMilestonesQueryKey(trip?.id ?? ''),
    queryFn: () => fetchPublicMilestones(trip?.id ?? ''),
    enabled: Boolean(trip?.id),
  });
  const milestones = useMemo(() => milestonesQuery.data ?? [], [milestonesQuery.data]);

  // Owner attribution: only resolves a name when the owner opted their profile
  // public (the RPC is visibility-gated). Otherwise we fall back to "A traveler".
  const ownerQuery = useQuery({
    queryKey: publicOwnerQueryKey(trip?.owner_id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_profile', {
        p_user_id: trip?.owner_id ?? '',
      });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    enabled: Boolean(trip?.owner_id),
  });
  const ownerName = ownerQuery.data?.display_name?.trim();
  const attribution = ownerName && ownerName.length > 0 ? ownerName : t('social.public.anonymous');

  const contentPadding = {
    padding: SCREEN_PADDING,
    paddingTop: insets.top + SCREEN_PADDING,
    paddingBottom: insets.bottom + SCREEN_PADDING,
  };

  if (tripQuery.isLoading) {
    return (
      <View className="flex-1 bg-cream" style={contentPadding}>
        <View className="mb-4 rounded-xl bg-surface-alt" style={{ height: COVER_HEIGHT }} />
        <View className="mb-2 h-6 w-2/3 rounded bg-surface-alt" />
        <View className="mb-6 h-4 w-1/2 rounded bg-surface-alt" />
        <View className="h-64 rounded-xl bg-surface-alt" />
      </View>
    );
  }

  // A fetch failure must not masquerade as "private" — offer a real retry path.
  if (tripQuery.isError) {
    return (
      <View className="flex-1 bg-cream" style={contentPadding}>
        <ErrorState
          title={t('common.somethingWentWrong')}
          body={t('trips.errors.loadFailed')}
          onRetry={() => void tripQuery.refetch()}
        />
      </View>
    );
  }

  if (!trip) {
    return (
      <View className="flex-1 items-center justify-center bg-cream" style={contentPadding}>
        <PixelCard className="w-full items-center">
          <PixelText size="h2" className="mb-2 text-center">
            {t('social.public.notPublic')}
          </PixelText>
          <PixelButton variant="ghost" onPress={() => router.back()} className="mt-2">
            {t('common.back')}
          </PixelButton>
        </PixelCard>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream">
      {/* Persistent view-only banner: the screen must read as view-only, not disabled. */}
      <View
        className="bg-secondary-700 px-4 pb-3"
        style={{ paddingTop: insets.top + SCREEN_PADDING / 2 }}
      >
        <View className="flex-row items-center gap-2">
          <Eye size={BADGE_ICON_SIZE} color={colors.surface} />
          <PixelText size="small" family="body-semibold" className="text-white">
            {t('social.public.viewOnly')}
          </PixelText>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={contentPadding}>
        {trip.cover_image_url ? (
          <Image
            source={{ uri: trip.cover_image_url }}
            style={{ height: COVER_HEIGHT, borderRadius: 12 }}
            className="mb-4 w-full"
            resizeMode="cover"
          />
        ) : null}

        <View className="mb-1 flex-row items-center gap-2">
          <PixelText size="h1" className="flex-1">
            {trip.name}
          </PixelText>
          <View
            className="flex-row items-center gap-1 rounded-full border border-border bg-surface-alt px-2 py-1"
            accessibilityLabel={t('social.public.badge')}
          >
            <Eye size={BADGE_ICON_SIZE} color={colors.textPrimary} />
            <PixelText size="caption" family="body-semibold">
              {t('social.public.badge')}
            </PixelText>
          </View>
        </View>

        <PixelText size="small" className="mb-4 text-text-secondary">
          {attribution}
        </PixelText>

        <PixelCard className="mb-4">
          <View className="gap-1">
            {trip.start_date || trip.end_date ? (
              <PixelText size="small" className="text-text-secondary">
                {trip.start_date ?? '—'} → {trip.end_date ?? '—'}
              </PixelText>
            ) : null}
            {trip.destination_country ? (
              <PixelText size="small" className="text-text-secondary">
                {trip.destination_country}
              </PixelText>
            ) : null}
          </View>
        </PixelCard>

        {milestones.length > 0 ? (
          <View className="mb-6">
            <PathView milestones={milestones} checkedInIds={NO_CHECKINS as Set<string>} />
          </View>
        ) : (
          <PixelCard className="mb-6 items-center">
            <PixelText size="body" className="text-center text-text-secondary">
              {t('milestones.empty.title')}
            </PixelText>
          </PixelCard>
        )}

        {/* Ask-to-join: a visible-but-disabled affordance (v1.1). */}
        <PixelButton
          variant="primary"
          disabled
          fullWidth
          accessibilityLabel={t('social.public.askToJoin')}
        >
          {t('social.public.askToJoin')}
        </PixelButton>
        <PixelText size="caption" className="mt-2 text-center text-text-secondary">
          {t('social.public.askToJoinSoon')}
        </PixelText>

        <View className="mt-8">
          <PixelButton variant="ghost" onPress={() => router.back()} fullWidth>
            {t('common.back')}
          </PixelButton>
        </View>
      </ScrollView>
    </View>
  );
}
