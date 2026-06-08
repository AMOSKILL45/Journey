import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { colors } from '@core/theme/tokens';
import { HomeChecklistSummary } from '@features/checklists';
import { PassportExpiryBanner } from '@features/identity';
import { useProfile } from '@features/profile';
import { useTrips } from '@features/trips';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingState } from '@shared/components/LoadingState';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function HomeTab() {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: trips = [], isLoading, error, refetch } = useTrips();

  const goCreate = () => router.push('/(modals)/create-trip');

  const greeting = profile?.display_name
    ? t('home.greeting', { name: profile.display_name })
    : t('home.greetingAnonymous');

  const upcoming = useMemo(() => {
    const now = Date.now();
    return trips.find((trip) => {
      if (!trip.start_date) return false;
      return new Date(trip.start_date).getTime() >= now;
    });
  }, [trips]);

  const daysUntil = (startDate: string): number => {
    const diff = new Date(startDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / ONE_DAY_MS));
  };

  const formatDate = (date: string): string => {
    const localeStr = locale === 'fr' ? 'fr-FR' : 'en-US';
    return new Date(date).toLocaleDateString(localeStr, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerStyle={{
        paddingHorizontal: SCREEN_PADDING,
        paddingTop: insets.top + SCREEN_PADDING,
        paddingBottom: insets.bottom + SCREEN_PADDING,
      }}
    >
      <View className="mb-6">
        <PixelText size="pixel" className="mb-2" style={{ color: colors.accent[700] }}>
          {t('home.eyebrow')}
        </PixelText>
        <PixelText size="h1">{greeting}</PixelText>
        <View
          className="mt-2 rounded-full"
          style={{ width: 44, height: 5, backgroundColor: colors.accent[500] }}
        />
        <PixelText size="body" className="mt-3 text-text-secondary">
          {t('app.tagline')}
        </PixelText>
      </View>

      <PassportExpiryBanner />

      {isLoading ? (
        <LoadingState variant="skeleton" label={t('common.loading')} />
      ) : error ? (
        <ErrorState
          title={t('common.somethingWentWrong')}
          body={t('trips.errors.loadFailed')}
          onRetry={() => void refetch()}
        />
      ) : trips.length === 0 ? (
        <EmptyState
          title={t('emptyStates.trips.title')}
          body={t('emptyStates.trips.body')}
          actionLabel={t('emptyStates.trips.action')}
          onAction={goCreate}
        />
      ) : (
        <>
          {upcoming && upcoming.start_date ? (
            <PixelCard
              onPress={() => router.push(`/(modals)/trip/${upcoming.id}`)}
              padding="lg"
              variant="elevated"
              accessibilityLabel={t('home.nextTripLabel', { name: upcoming.name })}
            >
              <PixelText size="caption" family="body-medium" className="text-text-secondary">
                {t('home.nextTrip')}
              </PixelText>
              <PixelText size="h2" family="heading-bold" className="mt-1">
                {upcoming.name}
              </PixelText>
              <PixelText size="small" className="mt-2 text-text-secondary">
                {formatDate(upcoming.start_date)}
              </PixelText>
              <PixelText size="small" className="mt-1 text-primary-600" family="body-medium">
                {t('home.inDays', { count: daysUntil(upcoming.start_date) })}
              </PixelText>
            </PixelCard>
          ) : (
            <PixelCard
              onPress={goCreate}
              padding="lg"
              accessibilityLabel={t('emptyStates.trips.action')}
            >
              <PixelText size="h3" className="mb-2">
                {t('emptyStates.trips.title')}
              </PixelText>
              <PixelText size="body" className="text-text-secondary">
                {t('emptyStates.trips.body')}
              </PixelText>
            </PixelCard>
          )}

          {upcoming ? (
            <View className="mt-4">
              <HomeChecklistSummary tripId={upcoming.id} />
            </View>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}
