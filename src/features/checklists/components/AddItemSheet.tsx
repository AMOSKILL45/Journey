import DateTimePicker from '@react-native-community/datetimepicker';
import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { useTripDocuments } from '@features/documents';
import { useTripMembers } from '@features/trips';
import { PixelBottomSheet, type PixelBottomSheetRef } from '@shared/components/PixelBottomSheet';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelChip } from '@shared/components/PixelChip';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

import type { ChecklistItem, ItemScope } from '../api/checklists';
import { useChecklistMutations } from '../hooks/useChecklist';

const CATEGORIES = ['documents', 'lodging', 'transport', 'packing', 'activities', 'admin', 'fun'];

export interface AddItemSheetRef {
  open: (checklistId: string, existing?: ChecklistItem) => void;
  close: () => void;
}
export interface AddItemSheetProps {
  tripId: string;
}

export const AddItemSheet = forwardRef<AddItemSheetRef, AddItemSheetProps>(({ tripId }, ref) => {
  const { t } = useTranslation();
  const sheetRef = useRef<PixelBottomSheetRef>(null);
  const { addItem, editItem, removeItem } = useChecklistMutations(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  const { data: docs = [] } = useTripDocuments(tripId);

  const [checklistId, setChecklistId] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [scope, setScope] = useState<ItemScope>('shared');
  const [category, setCategory] = useState('documents');
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setEditingId(null);
    setLabel('');
    setScope('shared');
    setCategory('documents');
    setAssignedTo(null);
    setDueDate(null);
    setDocumentId(null);
    setShowDate(false);
    setError(null);
  }, []);

  useImperativeHandle(ref, () => ({
    open: (cid, existing) => {
      reset();
      setChecklistId(cid);
      if (existing) {
        setEditingId(existing.id);
        setLabel(existing.label);
        setScope(existing.scope as ItemScope);
        setCategory(existing.category || 'documents');
        setAssignedTo(existing.assigned_to);
        setDueDate(existing.due_date);
        setDocumentId(existing.document_id);
      }
      sheetRef.current?.open();
    },
    close: () => sheetRef.current?.close(),
  }));

  const save = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError(t('checklists.errors.labelRequired'));
      return;
    }
    try {
      if (editingId) {
        await editItem.mutateAsync({
          id: editingId,
          patch: {
            label: trimmed,
            scope,
            category,
            assigned_to: scope === 'shared' ? assignedTo : null,
            due_date: dueDate,
            document_id: documentId,
          },
        });
      } else {
        await addItem.mutateAsync({
          checklistId,
          tripId,
          label: trimmed,
          scope,
          category,
          assignedTo,
          dueDate,
          documentId,
        });
      }
      reset();
      sheetRef.current?.close();
    } catch {
      setError(t('common.error'));
    }
  };

  const onDelete = () => {
    if (!editingId) return;
    Alert.alert(t('checklists.delete.item'), t('checklists.delete.body'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => {
          removeItem.mutate(editingId);
          reset();
          sheetRef.current?.close();
        },
      },
    ]);
  };

  return (
    <PixelBottomSheet ref={sheetRef} snapPoints={['80%', '95%']}>
      <View className="gap-4">
        <PixelText size="h2">
          {editingId ? t('checklists.editItem') : t('checklists.addItem')}
        </PixelText>

        <PixelInput
          label={t('checklists.fields.label')}
          placeholder={t('checklists.fields.labelPlaceholder')}
          value={label}
          onChangeText={setLabel}
          required
        />

        <View>
          <PixelText size="small" family="body-medium" className="mb-2">
            {t('checklists.scope.label')}
          </PixelText>
          <View className="flex-row gap-2">
            <PixelChip
              label={t('checklists.scope.shared')}
              selected={scope === 'shared'}
              onPress={() => setScope('shared')}
            />
            <PixelChip
              label={t('checklists.scope.perTraveler')}
              selected={scope === 'per_traveler'}
              onPress={() => setScope('per_traveler')}
            />
          </View>
        </View>

        <View>
          <PixelText size="small" family="body-medium" className="mb-2">
            {t('checklists.fields.category')}
          </PixelText>
          <View className="flex-row flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <PixelChip
                key={c}
                label={c}
                selected={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </View>
        </View>

        {scope === 'shared' && members.length > 0 ? (
          <View>
            <PixelText size="small" family="body-medium" className="mb-2">
              {t('checklists.fields.assignee')}
            </PixelText>
            <View className="flex-row flex-wrap gap-2">
              <PixelChip
                label={t('checklists.fields.assigneeNone')}
                selected={assignedTo === null}
                onPress={() => setAssignedTo(null)}
              />
              {members.map((m) => (
                <PixelChip
                  key={m.user_id}
                  label={m.profile?.display_name ?? '—'}
                  selected={assignedTo === m.user_id}
                  onPress={() => setAssignedTo(m.user_id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View className="flex-row items-center gap-3">
          <PixelButton variant="ghost" onPress={() => setShowDate(true)}>
            {dueDate ? `⏰ ${dueDate}` : t('checklists.fields.dueDate')}
          </PixelButton>
          {dueDate ? (
            <Pressable
              onPress={() => setDueDate(null)}
              accessibilityRole="button"
              accessibilityLabel={t('common.delete')}
            >
              <PixelText size="caption" className="text-error">
                ✕
              </PixelText>
            </Pressable>
          ) : null}
        </View>
        {showDate ? (
          <DateTimePicker
            value={dueDate ? new Date(dueDate) : new Date()}
            mode="date"
            onChange={(_e, d) => {
              setShowDate(Platform.OS === 'ios');
              if (d) setDueDate(d.toISOString().slice(0, 10));
            }}
          />
        ) : null}

        {docs.length > 0 ? (
          <View>
            <PixelText size="small" family="body-medium" className="mb-2">
              {t('checklists.fields.document')}
            </PixelText>
            <View className="flex-row flex-wrap gap-2">
              <PixelChip
                label={t('checklists.fields.documentNone')}
                selected={documentId === null}
                onPress={() => setDocumentId(null)}
              />
              {docs.map((d) => (
                <PixelChip
                  key={d.id}
                  label={d.name}
                  selected={documentId === d.id}
                  onPress={() => setDocumentId(d.id)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {error ? (
          <PixelText size="caption" className="text-error">
            {error}
          </PixelText>
        ) : null}

        <PixelButton
          variant="primary"
          onPress={save}
          loading={addItem.isPending || editItem.isPending}
          fullWidth
        >
          {t('common.save')}
        </PixelButton>

        {editingId ? (
          <PixelButton variant="danger" onPress={onDelete} fullWidth>
            {t('common.delete')}
          </PixelButton>
        ) : null}
      </View>
    </PixelBottomSheet>
  );
});

AddItemSheet.displayName = 'AddItemSheet';
