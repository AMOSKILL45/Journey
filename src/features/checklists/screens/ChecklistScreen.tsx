import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { supabase } from '@core/supabase/client';
import { useTripMembers } from '@features/trips/hooks/useTripMembers';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingState } from '@shared/components/LoadingState';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { ensureDefaultChecklist } from '../api/checklists';
import { ChecklistPicker } from '../components/ChecklistPicker';
import { ChecklistSection } from '../components/ChecklistSection';
import { useChecklistItems, useChecklists, useCompletions } from '../hooks/useChecklist';
import { useReadiness } from '../hooks/useReadiness';

const EDITOR_ROLES = ['owner', 'editor'];

export function ChecklistScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const id = tripId ?? '';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    data: checklists = [],
    refetch: refetchLists,
    isLoading: listsLoading,
    isError: listsError,
  } = useChecklists(id);
  const { data: items = [] } = useChecklistItems(id);
  const { data: completions = [] } = useCompletions(id);
  const { data: members = [] } = useTripMembers(id);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  // Auto-create a default checklist on first open.
  useEffect(() => {
    if (id) void ensureDefaultChecklist(id).then(() => void refetchLists());
  }, [id, refetchLists]);

  useEffect(() => {
    if (!selectedId && checklists.length > 0) setSelectedId(checklists[0].id);
  }, [checklists, selectedId]);

  const readiness = useReadiness(id, items, completions, userId);
  const myRole = members.find((m) => m.user_id === userId)?.role ?? null;
  const canManage = myRole !== null && EDITOR_ROLES.includes(myRole);

  return (
    <View className="flex-1 bg-cream">
      <ScrollView
        contentContainerStyle={{
          padding: SCREEN_PADDING,
          paddingTop: insets.top + SCREEN_PADDING,
          paddingBottom: 120,
        }}
      >
        <PixelText size="h1" className="mb-4">
          {t('checklists.title')}
        </PixelText>
        {listsError ? (
          <ErrorState
            testID="checklist-error"
            title={t('common.error')}
            body={t('common.somethingWentWrong')}
            onRetry={() => void refetchLists()}
          />
        ) : listsLoading ? (
          <LoadingState testID="checklist-loading" variant="skeleton" label={t('common.loading')} />
        ) : (
          <>
            <ChecklistPicker
              checklists={checklists}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
            {selectedId ? (
              <ChecklistSection
                tripId={id}
                checklistId={selectedId}
                items={items}
                readiness={readiness.input}
                userId={userId}
                canManage={canManage}
                onApplied={() => void refetchLists()}
              />
            ) : null}
          </>
        )}
        <View className="mt-8">
          <PixelButton variant="ghost" onPress={() => router.back()} fullWidth>
            {t('common.back')}
          </PixelButton>
        </View>
      </ScrollView>
    </View>
  );
}
