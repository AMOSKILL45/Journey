import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { pickWorldTheme, WORLD_THEMES } from '@features/map/utils/worldThemes';
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
  // Colour-code each card by its destination's world theme (Phase-3 overworld palette).
  const theme = WORLD_THEMES[pickWorldTheme(trip.destination_country)];

  return (
    <PixelCard
      onPress={() => router.push(`/(modals)/trip/${trip.id}`)}
      variant="default"
      padding="md"
      className="mb-3"
      accessibilityLabel={t('trips.list.cardLabel', { name: trip.name, dateRange })}
    >
      <View className="flex-row items-center gap-3">
        {/* Mini-overworld swatch: sky over ground — a pixel-art nod to the trip's world. */}
        <View
          className="h-12 w-12 overflow-hidden rounded-md border-pixel border-border"
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <View style={{ flex: 1, backgroundColor: theme.skyTopColor }} />
          <View style={{ flex: 1, backgroundColor: theme.groundColor }} />
        </View>

        <View className="flex-1">
          <PixelText size="h3" family="heading" numberOfLines={1}>
            {trip.name}
          </PixelText>
          <PixelText size="small" className="mt-1 text-text-secondary">
            {dateRange}
          </PixelText>
        </View>

        {trip.destination_country ? (
          <View className="self-center rounded-sm border-pixel border-border bg-surface-alt px-2 py-1">
            <PixelText size="caption" family="body-semibold" numberOfLines={1}>
              {trip.destination_country}
            </PixelText>
          </View>
        ) : null}
      </View>
    </PixelCard>
  );
}
