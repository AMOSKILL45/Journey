import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { ExportTripButton } from '@features/calendar-export';
import { TripReadinessCard } from '@features/checklists';
import { EncounterCard, SurpriseButton, useEncounters, type Encounter } from '@features/encounters';
import { MapModeToggle, TripMapView, type MapMode } from '@features/map';
import {
  BossClearPresenter,
  CheckinAnim,
  MilestoneCreationSheet,
  type MilestoneCreationSheetRef,
  PathView,
  createCheckin,
  tripCheckinsQueryKey,
  useBossCutscene,
  useMilestones,
  useTripCheckinMilestoneIds,
  milestonesQueryKey,
  type Milestone,
} from '@features/milestones';
import { PollsSection } from '@features/polls';
import { useProfile } from '@features/profile';
import {
  OfflineBanner,
  SharingControls,
  sharingIsLive,
  useLocationBroadcast,
  useLocationSharing,
  usePresenceStore,
  useTripChannel,
  type PresenceMember,
} from '@features/realtime';
import { ScrapbookSection } from '@features/scrapbook';
import { SmartTipsSection } from '@features/smart-reminders';
import { TimeCapsulesSection } from '@features/time-capsules';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingState } from '@shared/components/LoadingState';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { deleteTrip, setTripVisibility, type TripVisibility } from '../api/trips';
import { InviteMemberForm } from '../components/InviteMemberForm';
import { MembersList } from '../components/MembersList';
import { VisibilityControl } from '../components/VisibilityControl';
import { useTrip } from '../hooks/useTrip';
import { useTripMembers } from '../hooks/useTripMembers';
import { TRIPS_QUERY_KEY } from '../hooks/useTrips';

const TRIP_VISIBILITIES: readonly TripVisibility[] = [
  'private',
  'unlisted',
  'public_view',
  'open_to_join',
];

function toTripVisibility(value: string | null): TripVisibility {
  return (TRIP_VISIBILITIES as readonly string[]).includes(value ?? '')
    ? (value as TripVisibility)
    : 'private';
}

const EMPTY_MEMBERS: PresenceMember[] = [];

export function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = id ?? '';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const sheetRef = useRef<MilestoneCreationSheetRef>(null);
  const { data: trip, isLoading, error: tripError, refetch: refetchTrip } = useTrip(tripId);
  const { data: milestones = [] } = useMilestones(tripId);
  const { data: checkedInIds = [] } = useTripCheckinMilestoneIds(tripId);
  const checkedInSet = useMemo(() => new Set(checkedInIds), [checkedInIds]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [animMilestoneId, setAnimMilestoneId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<MapMode>('path');
  const bossCutscene = useBossCutscene();
  const milestonesById = useMemo(() => {
    const map = new Map<string, Milestone>();
    for (const m of milestones) map.set(m.id, m);
    return map;
  }, [milestones]);

  // Random encounters ("surprise me"): anchored at the latest reached milestone with
  // coordinates, falling back to any milestone with coords. Manual-trigger only.
  const encounters = useEncounters(tripId);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const encounterAnchor = useMemo<{ lat: number; lng: number } | null>(() => {
    for (let i = milestones.length - 1; i >= 0; i -= 1) {
      const m = milestones[i];
      if (m.lat != null && m.lng != null) return { lat: m.lat, lng: m.lng };
    }
    return null;
  }, [milestones]);

  // Live presence: track self + read other members for the avatars layer.
  const { data: profile } = useProfile();
  const { data: members = [] } = useTripMembers(tripId);
  const sharing = useLocationSharing(tripId);
  const currentMilestoneId = useMemo(() => {
    for (let i = milestones.length - 1; i >= 0; i -= 1) {
      if (checkedInSet.has(milestones[i].id)) return milestones[i].id;
    }
    return null;
  }, [milestones, checkedInSet]);
  const self = useMemo<PresenceMember | null>(
    () =>
      profile
        ? {
            user_id: profile.id,
            avatar_sprite_id: profile.avatar_sprite_id ?? 'avatars/adventurer_1',
            avatar_color: profile.avatar_color ?? '#E63946',
            status: 'online',
            current_milestone_id: currentMilestoneId,
            display_name: profile.display_name,
          }
        : null,
    [profile, currentMilestoneId],
  );
  const { status: realtimeStatus, sendPosition } = useTripChannel(
    tripId,
    self,
    sharingIsLive(sharing.data),
  );
  const rawMembers = usePresenceStore((s) => s.membersByTrip[tripId] ?? EMPTY_MEMBERS);
  const positionsByUser = usePresenceStore((s) => s.positionsByUser);
  const liveMembers = useMemo(
    () =>
      rawMembers.map((m) => {
        const pos = positionsByUser[m.user_id];
        return pos && Date.now() - pos.ts < 30_000
          ? { ...m, liveLat: pos.lat, liveLng: pos.lng }
          : m;
      }),
    [rawMembers, positionsByUser],
  );
  const sharingMode = sharing.data?.location_sharing ?? 'paused';
  const panicActive =
    !!sharing.data?.panic_until && new Date(sharing.data.panic_until).getTime() > Date.now();
  useLocationBroadcast({
    tripId,
    enabled: !panicActive && (sharingMode === 'precise' || sharingMode === 'city_only'),
    cityOnly: sharingMode === 'city_only',
    sendPosition,
  });

  const del = useMutation({
    mutationFn: () => {
      if (!tripId) throw new Error('No trip id');
      return deleteTrip(tripId);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TRIPS_QUERY_KEY });
      router.back();
    },
    onError: (e) => {
      setDeleteError(e instanceof Error ? e.message : t('common.error'));
    },
  });

  const checkin = useMutation({
    mutationFn: (milestoneId: string) => createCheckin(milestoneId),
    onMutate: async (milestoneId: string) => {
      await qc.cancelQueries({ queryKey: tripCheckinsQueryKey(tripId) });
      const previous = qc.getQueryData<string[]>(tripCheckinsQueryKey(tripId)) ?? [];
      qc.setQueryData<string[]>(tripCheckinsQueryKey(tripId), [...previous, milestoneId]);
      setAnimMilestoneId(milestoneId);
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(tripCheckinsQueryKey(tripId), ctx.previous);
      setAnimMilestoneId(null);
    },
    onSuccess: (_data, milestoneId: string) => {
      // Queue the boss-clear cutscene; the hook ignores non-boss milestones.
      const m = milestonesById.get(milestoneId);
      if (m) bossCutscene.onCheckin({ id: m.id, name: m.name, is_boss: m.is_boss });
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: milestonesQueryKey(tripId) });
      void qc.invalidateQueries({ queryKey: tripCheckinsQueryKey(tripId) });
    },
  });

  // Visibility is an owner/editor-only control (RLS enforces it server-side too).
  const visibility = useMutation({
    mutationFn: (next: TripVisibility) => setTripVisibility(tripId, next),
    onSuccess: (updated) => {
      qc.setQueryData(['trips', tripId], updated);
      void qc.invalidateQueries({ queryKey: TRIPS_QUERY_KEY });
    },
  });

  const myRole = useMemo(
    () => members.find((m) => m.user_id === profile?.id)?.role ?? null,
    [members, profile?.id],
  );
  const canManageVisibility =
    (!!profile && trip?.owner_id === profile.id) || myRole === 'owner' || myRole === 'editor';

  if (isLoading) {
    return (
      <View className="flex-1 bg-cream" style={{ paddingTop: insets.top }}>
        <LoadingState variant="spinner" label={t('common.loading')} />
      </View>
    );
  }

  if (tripError || !trip) {
    return (
      <View className="flex-1 bg-cream" style={{ paddingTop: insets.top }}>
        <ErrorState
          title={t('common.somethingWentWrong')}
          body={t('trips.errors.loadFailed')}
          onRetry={() => void refetchTrip()}
        />
      </View>
    );
  }

  const confirmDelete = () => {
    Alert.alert(t('trips.detail.confirmDeleteTitle'), t('trips.detail.confirmDeleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => del.mutate() },
    ]);
  };

  const handleNodeLongPress = (milestone: Milestone) => {
    if (checkedInSet.has(milestone.id)) return;
    Alert.alert(t('milestones.checkin.confirmTitle'), milestone.name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('milestones.checkin.confirmCta'),
        onPress: () => checkin.mutate(milestone.id),
      },
    ]);
  };

  const handleSurprise = () => {
    if (!encounterAnchor) return;
    encounters.find.mutate(encounterAnchor, {
      onSuccess: (results) => setEncounter(results[0] ?? null),
    });
  };

  const handleAddEncounter = (enc: Encounter) => {
    encounters.add.mutate(enc, { onSuccess: () => setEncounter(null) });
  };

  return (
    <View className="flex-1 bg-cream">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          padding: SCREEN_PADDING,
          paddingTop: insets.top + SCREEN_PADDING,
          paddingBottom: 120,
        }}
      >
        <PixelText size="h1" className="mb-4">
          {trip.name}
        </PixelText>
        <OfflineBanner status={realtimeStatus} />
        <PixelCard className="mb-4">
          <View className="gap-1">
            <PixelText size="small" className="text-text-secondary">
              {t('trips.detail.status')}: {trip.status}
            </PixelText>
            <PixelText size="small" className="text-text-secondary">
              {t('trips.detail.visibility')}: {trip.visibility}
            </PixelText>
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

        {milestones.length === 0 ? (
          <View className="mb-6">
            <EmptyState
              title={t('emptyStates.tripPath.title')}
              body={t('emptyStates.tripPath.body')}
              actionLabel={t('emptyStates.tripPath.action')}
              onAction={() => sheetRef.current?.open()}
            />
          </View>
        ) : (
          <View className="mb-6">
            <MapModeToggle mode={viewMode} onChange={setViewMode} />
            {viewMode === 'path' ? (
              <PathView
                milestones={milestones}
                checkedInIds={checkedInSet}
                onNodeLongPress={handleNodeLongPress}
              />
            ) : (
              <TripMapView
                milestones={milestones}
                checkedInIds={checkedInSet}
                destinationCountry={trip.destination_country}
                liveMembers={liveMembers}
                onNodeLongPress={handleNodeLongPress}
              />
            )}
            <View className="mt-4 items-center">
              <PixelButton
                variant="primary"
                onPress={() => sheetRef.current?.open()}
                accessibilityLabel={t('emptyStates.tripPath.action')}
              >
                {t('milestones.addCta')}
              </PixelButton>
            </View>
          </View>
        )}

        <PixelText size="h2" className="mb-2 mt-2">
          {t('trips.detail.members')}
        </PixelText>
        <MembersList tripId={trip.id} />

        {canManageVisibility ? (
          <View className="mt-6">
            <VisibilityControl
              visibility={toTripVisibility(trip.visibility)}
              shareToken={trip.share_token}
              onChange={(next) => visibility.mutate(next)}
            />
          </View>
        ) : null}

        <View className="mt-4">
          <SharingControls tripId={trip.id} />
        </View>

        <View className="mt-6">
          <TripReadinessCard tripId={trip.id} />
        </View>

        <View className="mt-6">
          <SmartTipsSection tripId={trip.id} />
        </View>

        <View className="mt-6">
          <PollsSection tripId={trip.id} />
        </View>

        <View className="mt-6">
          <TimeCapsulesSection tripId={trip.id} />
        </View>

        {encounterAnchor ? (
          <View className="mt-6 gap-3">
            <SurpriseButton onPress={handleSurprise} loading={encounters.find.isPending} />
            {encounter ? (
              <EncounterCard
                encounter={encounter}
                onAdd={handleAddEncounter}
                onDismiss={() => setEncounter(null)}
                adding={encounters.add.isPending}
              />
            ) : null}
            {!encounter &&
            encounters.find.isSuccess &&
            (encounters.find.data?.length ?? 0) === 0 ? (
              <PixelText size="small" className="text-center text-text-secondary">
                {t('encounters.none')}
              </PixelText>
            ) : null}
            {encounters.find.isError ? (
              <View className="items-center gap-2">
                <PixelText size="small" className="text-center text-error">
                  {t('encounters.error')}
                </PixelText>
                <PixelButton variant="ghost" onPress={handleSurprise}>
                  {t('encounters.retry')}
                </PixelButton>
              </View>
            ) : null}
          </View>
        ) : null}

        <View className="mt-6">
          <ScrapbookSection tripId={trip.id} tripName={trip.name} />
        </View>

        <View className="mt-6">
          <PixelButton
            variant="secondary"
            onPress={() => router.push(`/(modals)/photos/${trip.id}`)}
            fullWidth
          >
            {t('photos.title')}
          </PixelButton>
        </View>

        <View className="mt-3">
          <PixelButton
            variant="secondary"
            onPress={() => router.push(`/(modals)/documents/${trip.id}`)}
            fullWidth
          >
            {t('documents.title')}
          </PixelButton>
        </View>

        <View className="mt-3">
          <PixelButton
            variant="secondary"
            onPress={() => router.push(`/(modals)/checklist/${trip.id}`)}
            fullWidth
          >
            {t('checklists.title')}
          </PixelButton>
        </View>

        <View className="mt-3">
          <ExportTripButton trip={trip} milestones={milestones} />
        </View>

        <View className="mt-6">
          <InviteMemberForm tripId={trip.id} />
        </View>

        <View className="mt-8">
          <PixelButton
            variant="danger"
            onPress={confirmDelete}
            loading={del.isPending}
            fullWidth
            className="mb-3"
          >
            {t('common.delete')}
          </PixelButton>
          {deleteError ? (
            <PixelText size="caption" className="mb-2 text-center text-error">
              {deleteError}
            </PixelText>
          ) : null}
          <PixelButton variant="ghost" onPress={() => router.back()} fullWidth>
            {t('common.back')}
          </PixelButton>
        </View>
      </ScrollView>

      <MilestoneCreationSheet ref={sheetRef} tripId={tripId} />

      <CheckinAnim visible={animMilestoneId !== null} onComplete={() => setAnimMilestoneId(null)} />

      <BossClearPresenter cutscene={bossCutscene} />
    </View>
  );
}
