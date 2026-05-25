import { useState } from 'react';
import { FlatList, Modal, Pressable, TextInput, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import { COUNTRIES, type Country, findCountry } from '../data/countries';

export interface CountryPickerProps {
  value: string | null;
  onChange: (code: string) => void;
  label?: string;
  helperText?: string;
}

export function CountryPicker({ value, onChange, label, helperText }: CountryPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = value ? findCountry(value) : undefined;
  const filtered = search
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.includes(search.toUpperCase()),
      )
    : COUNTRIES;

  return (
    <View>
      {label && (
        <PixelText size="small" family="body-medium" className="mb-1 text-text-primary">
          {label}
        </PixelText>
      )}
      <PixelCard
        onPress={() => setOpen(true)}
        variant="default"
        padding="md"
        accessibilityLabel={selected ? selected.name : t('profile.countryPicker.placeholder')}
      >
        <PixelText size="body" className={selected ? 'text-text-primary' : 'text-text-disabled'}>
          {selected ? `${selected.flag}  ${selected.name}` : t('profile.countryPicker.placeholder')}
        </PixelText>
      </PixelCard>
      {helperText && (
        <PixelText size="caption" className="mt-1 text-text-secondary">
          {helperText}
        </PixelText>
      )}

      <Modal
        visible={open}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpen(false)}
      >
        <View className="flex-1 bg-cream p-4">
          <TextInput
            placeholder={t('profile.countryPicker.searchPlaceholder')}
            value={search}
            onChangeText={setSearch}
            autoFocus
            accessibilityLabel={t('profile.countryPicker.searchPlaceholder')}
            className="mb-3 min-h-[48px] rounded border-pixel border-border bg-surface px-3 py-2 text-body"
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            renderItem={({ item }: { item: Country }) => (
              <Pressable
                onPress={() => {
                  onChange(item.code);
                  setOpen(false);
                  setSearch('');
                }}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                className="mb-1 flex-row items-center gap-3 rounded border-pixel border-border bg-surface px-3 py-3"
              >
                <PixelText size="lead">{item.flag}</PixelText>
                <PixelText size="body" className="flex-1">
                  {item.name}
                </PixelText>
                <PixelText size="caption" className="text-text-secondary">
                  {item.code}
                </PixelText>
              </Pressable>
            )}
          />
          <PixelButton variant="ghost" onPress={() => setOpen(false)} fullWidth className="mt-3">
            {t('common.cancel')}
          </PixelButton>
        </View>
      </Modal>
    </View>
  );
}
