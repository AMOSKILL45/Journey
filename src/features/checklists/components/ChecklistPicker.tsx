import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelChip } from '@shared/components/PixelChip';

import type { TripChecklist } from '../api/checklists';

export interface ChecklistPickerProps {
  checklists: TripChecklist[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ChecklistPicker({ checklists, selectedId, onSelect }: ChecklistPickerProps) {
  const { t } = useTranslation();
  if (checklists.length <= 1) return null;
  return (
    <View className="mb-3 flex-row flex-wrap gap-2">
      {checklists.map((c) => (
        <PixelChip
          key={c.id}
          label={c.title || t('checklists.defaultTitle')}
          selected={selectedId === c.id}
          onPress={() => onSelect(c.id)}
        />
      ))}
    </View>
  );
}
