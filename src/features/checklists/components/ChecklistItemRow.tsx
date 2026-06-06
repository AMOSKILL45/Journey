import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

import type { ChecklistItem } from '../api/checklists';

export interface ChecklistItemRowProps {
  item: ChecklistItem;
  complete: boolean;
  /** "X/N" for per-traveler items, else null */
  progressLabel: string | null;
  /** my checkbox state (shared: is_done; per-traveler: my completion) */
  checked: boolean;
  canManage: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onOpenDoc: () => void;
}

export function ChecklistItemRow({
  item,
  complete,
  progressLabel,
  checked,
  canManage,
  onToggle,
  onEdit,
  onOpenDoc,
}: ChecklistItemRowProps) {
  const { t } = useTranslation();
  return (
    <View className="mb-2 flex-row items-center gap-3 rounded border-2 border-border bg-surface p-3">
      <Pressable
        onPress={onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={item.label}
        className={`h-7 w-7 items-center justify-center rounded border-2 border-border ${
          checked ? 'bg-success' : 'bg-surface-alt'
        }`}
      >
        {checked ? (
          <PixelText
            size="caption"
            className="text-surface"
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            ✓
          </PixelText>
        ) : null}
      </Pressable>

      <Pressable onPress={canManage ? onEdit : undefined} className="flex-1">
        <PixelText
          size="body"
          family="body-medium"
          className={complete ? 'text-text-secondary line-through' : ''}
          numberOfLines={2}
        >
          {item.label}
        </PixelText>
        <View className="mt-1 flex-row flex-wrap items-center gap-2">
          <PixelText size="caption" className="text-text-secondary">
            {item.scope === 'per_traveler'
              ? t('checklists.scope.perTraveler')
              : t('checklists.scope.shared')}
          </PixelText>
          {progressLabel ? (
            <PixelText size="caption" className="text-secondary-700">
              {progressLabel}
            </PixelText>
          ) : null}
          {item.due_date ? (
            <PixelText
              size="caption"
              className="text-text-secondary"
              accessibilityLabel={`${t('checklists.fields.dueDate')} ${item.due_date}`}
            >
              ⏰ {item.due_date}
            </PixelText>
          ) : null}
          {item.document_id ? (
            <Pressable
              testID="checklist-doc-badge"
              onPress={onOpenDoc}
              accessibilityRole="button"
              accessibilityLabel={t('checklists.linkedDoc')}
            >
              <PixelText size="caption" className="text-sky-700">
                {t('checklists.linkedDoc')}
              </PixelText>
            </Pressable>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}
