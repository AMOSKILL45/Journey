import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { TripCard, useTrips } from '@features/trips';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

export default function TripsTab() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: trips = [], isLoading, error } = useTrips();

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-cream"
        style={{ paddingTop: insets.top }}
      >
        <PixelText>{t('common.loading')}</PixelText>
      </View>
    );
  }

  if (error) {
    return (
      <View
        className="flex-1 items-center justify-center bg-cream px-6"
        style={{ paddingTop: insets.top }}
      >
        <PixelText className="text-error">{t('common.error')}</PixelText>
      </View>
    );
  }

  if (trips.length === 0) {
    return (
      <View
        className="flex-1 items-center justify-center bg-cream px-6"
        style={{ paddingTop: insets.top }}
      >
        <PixelText size="h2" className="mb-2 text-center">
          {t('trips.list.empty.title')}
        </PixelText>
        <PixelText size="body" className="mb-6 text-center text-text-secondary">
          {t('trips.list.empty.subtitle')}
        </PixelText>
        <PixelButton onPress={() => router.push('/(modals)/create-trip')}>
          {t('trips.list.empty.cta')}
        </PixelButton>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-cream px-4" style={{ paddingTop: insets.top + 12 }}>
      <View className="mb-3 flex-row items-center justify-between">
        <PixelText size="h1">{t('trips.list.title')}</PixelText>
        <PixelButton size="sm" onPress={() => router.push('/(modals)/create-trip')}>
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
