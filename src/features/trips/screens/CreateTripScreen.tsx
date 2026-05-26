import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { IdentityGate } from '@features/identity';
import { CountryPicker, useProfile } from '@features/profile';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { createTrip } from '../api/trips';
import { TRIPS_QUERY_KEY } from '../hooks/useTrips';

const MIN_NAME_LENGTH = 2;

const toISODate = (d: Date | null): string | null => (d ? d.toISOString().slice(0, 10) : null);

export function CreateTripScreen() {
  const { t, locale } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useProfile();

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      createTrip({
        name: name.trim(),
        start_date: toISODate(startDate),
        end_date: toISODate(endDate),
        destination_country: country,
      }),
    onSuccess: (trip) => {
      void qc.invalidateQueries({ queryKey: TRIPS_QUERY_KEY });
      router.replace(`/(modals)/trip/${trip.id}`);
    },
    onError: (e) => {
      setSubmitError(e instanceof Error ? e.message : t('common.error'));
    },
  });

  const canSubmit = name.trim().length >= MIN_NAME_LENGTH;
  const localeStr = locale === 'fr' ? 'fr-FR' : 'en-US';
  const formatPick = (d: Date) => d.toLocaleDateString(localeStr);

  if (profileLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator />
      </View>
    );
  }

  if (!profile?.is_verified) {
    return (
      <ScrollView
        className="flex-1 bg-cream"
        contentContainerStyle={{
          padding: SCREEN_PADDING,
          paddingTop: insets.top + SCREEN_PADDING,
        }}
      >
        <PixelText size="h1" className="mb-4">
          {t('trips.create.title')}
        </PixelText>
        <IdentityGate onSkip={() => router.back()} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerStyle={{
        padding: SCREEN_PADDING,
        paddingTop: insets.top + SCREEN_PADDING,
      }}
    >
      <PixelText size="h1" className="mb-4">
        {t('trips.create.title')}
      </PixelText>

      <PixelInput
        label={t('trips.create.nameLabel')}
        placeholder={t('trips.create.namePlaceholder')}
        value={name}
        onChangeText={setName}
        required
        containerClassName="mb-4"
      />

      <PixelText size="small" family="body-medium" className="mb-1">
        {t('trips.create.startDateLabel')}
      </PixelText>
      <PixelButton variant="ghost" onPress={() => setShowStart(true)} fullWidth className="mb-4">
        {startDate ? formatPick(startDate) : t('trips.create.pickDate')}
      </PixelButton>
      {showStart && (
        <DateTimePicker
          value={startDate ?? new Date()}
          mode="date"
          onChange={(_, d) => {
            // iOS picker is inline (keep open until user dismisses); Android is a one-shot dialog
            setShowStart(Platform.OS === 'ios');
            if (d) setStartDate(d);
          }}
        />
      )}

      <PixelText size="small" family="body-medium" className="mb-1">
        {t('trips.create.endDateLabel')}
      </PixelText>
      <PixelButton variant="ghost" onPress={() => setShowEnd(true)} fullWidth className="mb-4">
        {endDate ? formatPick(endDate) : t('trips.create.pickDate')}
      </PixelButton>
      {showEnd && (
        <DateTimePicker
          value={endDate ?? new Date()}
          mode="date"
          minimumDate={startDate ?? undefined}
          onChange={(_, d) => {
            setShowEnd(Platform.OS === 'ios');
            if (d) setEndDate(d);
          }}
        />
      )}

      <View className="mb-6">
        <CountryPicker
          value={country}
          onChange={setCountry}
          label={t('trips.create.destinationLabel')}
        />
      </View>

      <PixelButton
        onPress={() => mutation.mutate()}
        disabled={!canSubmit}
        loading={mutation.isPending}
        fullWidth
        className="mb-3"
      >
        {t('trips.create.createButton')}
      </PixelButton>
      {submitError ? (
        <PixelText size="caption" className="mb-2 text-center text-error">
          {submitError}
        </PixelText>
      ) : null}
      <PixelButton variant="ghost" onPress={() => router.back()} fullWidth>
        {t('common.cancel')}
      </PixelButton>
    </ScrollView>
  );
}
