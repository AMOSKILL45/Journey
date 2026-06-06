import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { TripCard, useTrips } from '@features/trips';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingState } from '@shared/components/LoadingState';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

export default function TripsTab() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: trips = [], isLoading, error, refetch } = useTrips();

  const goCreate = () => router.push('/(modals)/create-trip');

  if (isLoading) {
    return (
      <View className="flex-1 bg-cream" style={{ paddingTop: insets.top }}>
        <LoadingState variant="skeleton" label={t('common.loading')} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-cream" style={{ paddingTop: insets.top }}>
        <ErrorState
          title={t('common.somethingWentWrong')}
          body={t('trips.errors.loadFailed')}
          onRetry={() => void refetch()}
        />
      </View>
    );
  }

  if (trips.length === 0) {
    return (
      <View className="flex-1 bg-cream" style={{ paddingTop: insets.top }}>
        <EmptyState
          title={t('emptyStates.trips.title')}
          body={t('emptyStates.trips.body')}
          actionLabel={t('emptyStates.trips.action')}
          onAction={goCreate}
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream px-4" style={{ paddingTop: insets.top + 12 }}>
      <View className="mb-3 flex-row items-center justify-between">
        <PixelText size="h1">{t('trips.list.title')}</PixelText>
        <PixelButton
          size="sm"
          onPress={goCreate}
          accessibilityLabel={t('emptyStates.trips.action')}
        >
          {t('trips.list.newButton')}
        </PixelButton>
      </View>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <TripCard trip={item} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
      />
    </View>
  );
}
