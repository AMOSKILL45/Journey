import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PassportExpiryBanner } from '@features/identity';
import { useProfile } from '@features/profile';
import { useTrips } from '@features/trips';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export default function HomeTab() {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile } = useProfile();
  const { data: trips = [] } = useTrips();

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
      <PixelText size="h1" className="mb-2">
        {greeting}
      </PixelText>
      <PixelText size="body" className="mb-6 text-text-secondary">
        {t('app.tagline')}
      </PixelText>

      <PassportExpiryBanner />

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
        <PixelCard padding="lg">
          <PixelText size="h3" className="mb-2">
            {t('home.emptyTitle')}
          </PixelText>
          <PixelText size="body" className="mb-4 text-text-secondary">
            {t('home.emptyBody')}
          </PixelText>
          <PixelButton onPress={() => router.push('/(modals)/create-trip')}>
            {t('home.createCta')}
          </PixelButton>
        </PixelCard>
      )}
    </ScrollView>
  );
}
