import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';

import type { MilestoneSpriteId } from '@assets/sprites/milestones/manifest';
import { useTranslation } from '@core/i18n';
import { PixelBottomSheet, type PixelBottomSheetRef } from '@shared/components/PixelBottomSheet';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelChip } from '@shared/components/PixelChip';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

import { GeocodingNotConfiguredError, searchPlaces, type GeocodingResult } from '../api/geocoding';
import { type MilestoneType } from '../api/milestones';
import { useCreateMilestone } from '../hooks/useMilestones';

import { SpritePicker } from './SpritePicker';

const MILESTONE_TYPES: MilestoneType[] = [
  'city',
  'hotel',
  'activity',
  'transport',
  'food',
  'landmark',
  'custom',
];

const SEARCH_DEBOUNCE_MS = 300;

export interface MilestoneCreationSheetRef {
  open: () => void;
  close: () => void;
}

export interface MilestoneCreationSheetProps {
  tripId: string;
  onCreated?: () => void;
}

export const MilestoneCreationSheet = forwardRef<
  MilestoneCreationSheetRef,
  MilestoneCreationSheetProps
>(({ tripId, onCreated }, ref) => {
  const { t } = useTranslation();
  const sheetRef = useRef<PixelBottomSheetRef>(null);
  const createMilestone = useCreateMilestone(tripId);

  const [type, setType] = useState<MilestoneType>('city');
  const [name, setName] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<GeocodingResult | null>(null);
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [spriteId, setSpriteId] = useState<MilestoneSpriteId | null>(null);
  const [isBoss, setIsBoss] = useState(false);
  const [showSpritePicker, setShowSpritePicker] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setType('city');
    setName('');
    setLocationQuery('');
    setSelectedLocation(null);
    setSearchResults([]);
    setIsSearching(false);
    setSearchError(null);
    setSpriteId(null);
    setIsBoss(false);
    setShowSpritePicker(false);
    setFormError(null);
  }, []);

  useImperativeHandle(ref, () => ({
    open: () => {
      reset();
      sheetRef.current?.open();
    },
    close: () => sheetRef.current?.close(),
  }));

  useEffect(() => {
    if (selectedLocation && locationQuery === selectedLocation.name) {
      return;
    }
    const query = locationQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }
    const controller = new AbortController();
    const handle = setTimeout(() => {
      setIsSearching(true);
      setSearchError(null);
      searchPlaces(query, { signal: controller.signal })
        .then((results) => {
          setSearchResults(results);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          if (err instanceof GeocodingNotConfiguredError) {
            setSearchError(t('milestones.create.locationNotConfigured'));
          } else {
            setSearchError(err instanceof Error ? err.message : t('common.error'));
          }
          setSearchResults([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [locationQuery, selectedLocation, t]);

  const handleSelectLocation = (result: GeocodingResult) => {
    setSelectedLocation(result);
    setLocationQuery(result.name);
    setSearchResults([]);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError(t('milestones.create.nameRequired'));
      return;
    }
    setFormError(null);
    try {
      await createMilestone.mutateAsync({
        type,
        name: trimmedName,
        sprite_id: spriteId,
        is_boss: isBoss,
        address: selectedLocation?.address ?? null,
        lat: selectedLocation?.lat ?? null,
        lng: selectedLocation?.lng ?? null,
      });
      reset();
      sheetRef.current?.close();
      onCreated?.();
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t('common.error'));
    }
  };

  return (
    <>
      <PixelBottomSheet ref={sheetRef} snapPoints={['75%', '95%']}>
        <View className="gap-4">
          <PixelText size="h2">{t('milestones.create.title')}</PixelText>

          <View>
            <PixelText size="small" family="body-medium" className="mb-2">
              {t('milestones.create.typeLabel')}
            </PixelText>
            <View className="flex-row flex-wrap gap-2">
              {MILESTONE_TYPES.map((mt) => (
                <PixelChip
                  key={mt}
                  label={t(`milestones.types.${mt}`)}
                  selected={type === mt}
                  onPress={() => setType(mt)}
                />
              ))}
            </View>
          </View>

          <PixelInput
            label={t('milestones.create.nameLabel')}
            placeholder={t('milestones.create.namePlaceholder')}
            value={name}
            onChangeText={setName}
            required
          />

          <View>
            <PixelInput
              label={t('milestones.create.locationLabel')}
              placeholder={t('milestones.create.locationPlaceholder')}
              value={locationQuery}
              onChangeText={(text) => {
                setLocationQuery(text);
                if (selectedLocation && text !== selectedLocation.name) {
                  setSelectedLocation(null);
                }
              }}
            />
            {isSearching ? (
              <View className="mt-2 flex-row items-center gap-2">
                <ActivityIndicator size="small" />
                <PixelText size="caption" className="text-text-secondary">
                  {t('milestones.create.locationSearching')}
                </PixelText>
              </View>
            ) : null}
            {searchError ? (
              <PixelText size="caption" className="mt-2 text-error">
                {searchError}
              </PixelText>
            ) : null}
            {searchResults.length > 0 ? (
              <View className="mt-2 gap-1 rounded border-2 border-border bg-surface-alt p-2">
                {searchResults.map((result) => (
                  <Pressable
                    key={result.id}
                    onPress={() => handleSelectLocation(result)}
                    accessibilityRole="button"
                    accessibilityLabel={result.address}
                    className="rounded px-2 py-2 active:bg-surface"
                  >
                    <PixelText size="body" family="body-medium">
                      {result.name}
                    </PixelText>
                    <PixelText size="caption" className="text-text-secondary">
                      {result.address}
                    </PixelText>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {locationQuery.length >= 2 &&
            !isSearching &&
            !searchError &&
            searchResults.length === 0 &&
            !selectedLocation ? (
              <PixelText size="caption" className="mt-2 text-text-secondary">
                {t('milestones.create.locationEmpty')}
              </PixelText>
            ) : null}
          </View>

          <Pressable
            onPress={() => setIsBoss((v) => !v)}
            accessibilityRole="switch"
            accessibilityLabel={t('milestones.create.bossLabel')}
            accessibilityState={{ checked: isBoss }}
            className="flex-row items-center gap-3"
          >
            <View
              className={`h-6 w-6 rounded border-2 border-border ${
                isBoss ? 'bg-accent-500' : 'bg-surface'
              } items-center justify-center`}
            >
              {isBoss ? (
                <PixelText size="caption" family="body-medium" className="text-text-primary">
                  ★
                </PixelText>
              ) : null}
            </View>
            <PixelText size="body">{t('milestones.create.bossLabel')}</PixelText>
          </Pressable>

          <View className="flex-row items-center gap-3">
            <PixelButton
              variant="ghost"
              onPress={() => setShowSpritePicker(true)}
              accessibilityLabel={t('milestones.create.spritePick')}
            >
              {spriteId ? spriteId.replace('milestones/', '') : t('milestones.create.spritePick')}
            </PixelButton>
          </View>

          {formError ? (
            <PixelText size="caption" className="text-error">
              {formError}
            </PixelText>
          ) : null}

          <PixelButton
            variant="primary"
            onPress={handleSave}
            loading={createMilestone.isPending}
            fullWidth
          >
            {t('milestones.create.saveButton')}
          </PixelButton>
        </View>
      </PixelBottomSheet>

      <SpritePicker
        visible={showSpritePicker}
        selectedSpriteId={spriteId}
        onSelect={(id) => {
          setSpriteId(id);
          setShowSpritePicker(false);
        }}
        onClose={() => setShowSpritePicker(false)}
      />
    </>
  );
});

MilestoneCreationSheet.displayName = 'MilestoneCreationSheet';
