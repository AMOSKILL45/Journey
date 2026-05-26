import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { MapModeToggle, TripMapView, type MapMode } from '@features/map';
import {
  CheckinAnim,
  MilestoneCreationSheet,
  type MilestoneCreationSheetRef,
  PathView,
  createCheckin,
  tripCheckinsQueryKey,
  useMilestones,
  useTripCheckinMilestoneIds,
  milestonesQueryKey,
  type Milestone,
} from '@features/milestones';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { deleteTrip } from '../api/trips';
import { InviteMemberForm } from '../components/InviteMemberForm';
import { MembersList } from '../components/MembersList';
import { useTrip } from '../hooks/useTrip';
import { TRIPS_QUERY_KEY } from '../hooks/useTrips';

export function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tripId = id ?? '';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const sheetRef = useRef<MilestoneCreationSheetRef>(null);
  const { data: trip, isLoading } = useTrip(tripId);
  const { data: milestones = [] } = useMilestones(tripId);
  const { data: checkedInIds = [] } = useTripCheckinMilestoneIds(tripId);
  const checkedInSet = useMemo(() => new Set(checkedInIds), [checkedInIds]);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [animMilestoneId, setAnimMilestoneId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<MapMode>('path');

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
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: milestonesQueryKey(tripId) });
      void qc.invalidateQueries({ queryKey: tripCheckinsQueryKey(tripId) });
    },
  });

  if (isLoading || !trip) {
    return (
      <View
        className="flex-1 items-center justify-center bg-cream"
        style={{ paddingTop: insets.top }}
      >
        <PixelText>{t('common.loading')}</PixelText>
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
                📍 {trip.destination_country}
              </PixelText>
            ) : null}
          </View>
        </PixelCard>

        {milestones.length === 0 ? (
          <PixelCard className="mb-6 items-center">
            <PixelText size="h2" className="mb-2">
              {t('milestones.empty.title')}
            </PixelText>
            <PixelText size="body" className="mb-4 text-center text-text-secondary">
              {t('milestones.empty.body')}
            </PixelText>
            <PixelButton variant="primary" onPress={() => sheetRef.current?.open()}>
              {t('milestones.addCta')}
            </PixelButton>
          </PixelCard>
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
                onNodeLongPress={handleNodeLongPress}
              />
            )}
            <View className="mt-4 items-center">
              <PixelButton variant="primary" onPress={() => sheetRef.current?.open()}>
                {t('milestones.addCta')}
              </PixelButton>
            </View>
          </View>
        )}

        <PixelText size="h2" className="mb-2 mt-2">
          {t('trips.detail.members')}
        </PixelText>
        <MembersList tripId={trip.id} />

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
    </View>
  );
}
