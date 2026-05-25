import { useRouter } from 'expo-router';

import { useTranslation } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import type { Trip } from '../api/trips';

const localeFor = (l: string) => (l === 'fr' ? 'fr-FR' : 'en-US');

function formatDateRange(start: string | null, end: string | null, locale: string): string {
  if (!start && !end) return '—';
  const fmt = new Intl.DateTimeFormat(localeFor(locale), {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  if (start && end) return `${fmt.format(new Date(start))} → ${fmt.format(new Date(end))}`;
  return fmt.format(new Date((start ?? end) as string));
}

export function TripCard({ trip }: { trip: Trip }) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const dateRange = formatDateRange(trip.start_date, trip.end_date, locale);
  return (
    <PixelCard
      onPress={() => router.push(`/(modals)/trip/${trip.id}`)}
      variant="default"
      padding="md"
      className="mb-3"
      accessibilityLabel={t('trips.list.cardLabel', { name: trip.name, dateRange })}
    >
      <PixelText size="h3" family="heading">
        {trip.name}
      </PixelText>
      <PixelText size="small" className="mt-1 text-text-secondary">
        {dateRange}
      </PixelText>
      {trip.destination_country ? (
        <PixelText size="small" className="mt-1 text-text-secondary">
          📍 {trip.destination_country}
        </PixelText>
      ) : null}
    </PixelCard>
  );
}
