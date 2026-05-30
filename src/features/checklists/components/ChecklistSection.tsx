import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { openDocument, useTripDocuments } from '@features/documents';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelChip } from '@shared/components/PixelChip';
import { PixelText } from '@shared/components/PixelText';

import type { ChecklistItem } from '../api/checklists';
import { useChecklistMutations, useDismissals } from '../hooks/useChecklist';
import {
  checklistProgress,
  isItemComplete,
  itemProgress,
  type ReadinessInput,
  type ReadinessItem,
} from '../utils/readiness';

import { AddItemSheet, type AddItemSheetRef } from './AddItemSheet';
import { ChecklistItemRow } from './ChecklistItemRow';
import { SuggestionChips } from './SuggestionChips';
import { TemplatePickerSheet, type TemplatePickerSheetRef } from './TemplatePickerSheet';

export interface ChecklistSectionProps {
  tripId: string;
  checklistId: string;
  items: ChecklistItem[];
  readiness: ReadinessInput;
  userId: string | null;
  canManage: boolean;
  onApplied: () => void;
}

function toReadinessItem(i: ChecklistItem): ReadinessItem {
  return {
    id: i.id,
    checklist_id: i.checklist_id,
    scope: i.scope as 'shared' | 'per_traveler',
    is_done: i.is_done,
    assigned_to: i.assigned_to,
  };
}

export function ChecklistSection({
  tripId,
  checklistId,
  items,
  readiness,
  userId,
  canManage,
  onApplied,
}: ChecklistSectionProps) {
  const { t } = useTranslation();
  const addRef = useRef<AddItemSheetRef>(null);
  const templateRef = useRef<TemplatePickerSheetRef>(null);
  const { setShared, toggleMine, addItem, dismiss } = useChecklistMutations(tripId);
  const { data: dismissed = [] } = useDismissals(tripId);
  const { data: docs = [] } = useTripDocuments(tripId);
  const [mineOnly, setMineOnly] = useState(false);

  const sectionItems = useMemo(() => {
    let list = items.filter((i) => i.checklist_id === checklistId);
    if (mineOnly && userId) {
      list = list.filter(
        (i) =>
          (i.scope === 'per_traveler' &&
            !(readiness.completionsByItem[i.id] ?? []).includes(userId)) ||
          (i.scope === 'shared' && i.assigned_to === userId && !i.is_done),
      );
    }
    return list;
  }, [items, checklistId, mineOnly, userId, readiness]);

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const i of sectionItems) {
      map.set(i.category || 'other', [...(map.get(i.category || 'other') ?? []), i]);
    }
    return Array.from(map.entries());
  }, [sectionItems]);

  const prog = checklistProgress(readiness, checklistId);

  const myChecked = (i: ChecklistItem): boolean =>
    i.scope === 'shared'
      ? i.is_done
      : Boolean(userId && (readiness.completionsByItem[i.id] ?? []).includes(userId));

  const toggle = (i: ChecklistItem) => {
    const next = !myChecked(i);
    if (i.scope === 'shared') setShared.mutate({ id: i.id, done: next });
    else toggleMine.mutate({ itemId: i.id, done: next });
  };

  const openDoc = (i: ChecklistItem) => {
    const doc = docs.find((d) => d.id === i.document_id);
    if (doc) void openDocument(doc);
  };

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <PixelText size="body" family="body-medium">
          {t('checklists.progress', { done: prog.done, total: prog.total })}
        </PixelText>
        <View className="flex-row gap-2">
          <PixelChip
            label={t('checklists.all')}
            selected={!mineOnly}
            onPress={() => setMineOnly(false)}
          />
          <PixelChip
            label={t('checklists.mine')}
            selected={mineOnly}
            onPress={() => setMineOnly(true)}
          />
        </View>
      </View>

      {canManage ? (
        <SuggestionChips
          dismissed={dismissed}
          onAdd={(label, scope) => addItem.mutate({ checklistId, tripId, label, scope })}
          onDismiss={(key) => dismiss.mutate(key)}
        />
      ) : null}

      {grouped.map(([cat, list]) => (
        <View key={cat} className="mb-4">
          <PixelText size="small" family="body-medium" className="mb-2 text-text-secondary">
            {cat}
          </PixelText>
          {list.map((i) => {
            const ri = toReadinessItem(i);
            const p = itemProgress(ri, readiness.completionsByItem, readiness.travelerIds);
            return (
              <ChecklistItemRow
                key={i.id}
                item={i}
                complete={isItemComplete(ri, readiness.completionsByItem, readiness.travelerIds)}
                progressLabel={
                  i.scope === 'per_traveler'
                    ? t('checklists.scope.count', { x: p.x, n: p.n })
                    : null
                }
                checked={myChecked(i)}
                canManage={canManage}
                onToggle={() => toggle(i)}
                onEdit={() => addRef.current?.open(checklistId, i)}
                onOpenDoc={() => openDoc(i)}
              />
            );
          })}
        </View>
      ))}

      {canManage ? (
        <View className="gap-2">
          <PixelButton
            variant="primary"
            onPress={() => addRef.current?.open(checklistId)}
            fullWidth
          >
            {t('checklists.addCta')}
          </PixelButton>
          <PixelButton variant="ghost" onPress={() => templateRef.current?.open()} fullWidth>
            {t('checklists.startFromTemplate')}
          </PixelButton>
        </View>
      ) : null}

      <AddItemSheet ref={addRef} tripId={tripId} />
      <TemplatePickerSheet ref={templateRef} tripId={tripId} onApplied={onApplied} />
    </View>
  );
}
