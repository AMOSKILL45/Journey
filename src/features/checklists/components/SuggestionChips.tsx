import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import type { ItemScope } from '../api/checklists';

const SUGGESTIONS: { key: string; label: string; scope: ItemScope }[] = [
  { key: 'passport', label: 'Passport', scope: 'per_traveler' },
  { key: 'insurance', label: 'Travel insurance', scope: 'per_traveler' },
  { key: 'flights', label: 'Book flights', scope: 'shared' },
  { key: 'accommodation', label: 'Book stay', scope: 'shared' },
  { key: 'chargers', label: 'Chargers', scope: 'per_traveler' },
];

export interface SuggestionChipsProps {
  dismissed: string[];
  onAdd: (label: string, scope: ItemScope) => void;
  onDismiss: (key: string) => void;
}

export function SuggestionChips({ dismissed, onAdd, onDismiss }: SuggestionChipsProps) {
  const { t } = useTranslation();
  const visible = SUGGESTIONS.filter((s) => !dismissed.includes(s.key));
  if (visible.length === 0) return null;
  return (
    <View className="mb-4">
      <PixelText size="small" family="body-medium" className="mb-2 text-text-secondary">
        {t('checklists.suggestions.title')}
      </PixelText>
      <View className="flex-row flex-wrap gap-2">
        {visible.map((s) => (
          <Pressable
            key={s.key}
            onPress={() => onAdd(s.label, s.scope)}
            onLongPress={() => onDismiss(s.key)}
            accessibilityRole="button"
            accessibilityLabel={s.label}
            className="rounded-full border-2 border-border bg-surface-alt px-3 py-1.5"
          >
            <PixelText size="caption" family="body-medium">
              + {s.label}
            </PixelText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
