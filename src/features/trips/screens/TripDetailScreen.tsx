import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: trip, isLoading } = useTrip(id ?? '');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const del = useMutation({
    mutationFn: () => {
      if (!id) throw new Error('No trip id');
      return deleteTrip(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: TRIPS_QUERY_KEY });
      router.back();
    },
    onError: (e) => {
      setDeleteError(e instanceof Error ? e.message : t('common.error'));
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

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerStyle={{
        padding: SCREEN_PADDING,
        paddingTop: insets.top + SCREEN_PADDING,
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
      <PixelText size="body" className="mb-4 text-text-secondary">
        {t('trips.detail.pathComingSoon')}
      </PixelText>

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
  );
}
