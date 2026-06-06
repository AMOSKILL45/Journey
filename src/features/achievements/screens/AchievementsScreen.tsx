import { useRouter } from 'expo-router';
import { FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingState } from '@shared/components/LoadingState';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { mergeStatus, unlockedCount } from '../achievementStatus';
import { AchievementBadge } from '../components/AchievementBadge';
import { useAchievementDefinitions, useMyAchievements } from '../hooks/useAchievements';

const NUM_COLUMNS = 3;
const LIST_GAP = 8;
const LIST_BOTTOM_PADDING = 120;

export function AchievementsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const defsQuery = useAchievementDefinitions();
  const mineQuery = useMyAchievements();

  const defs = defsQuery.data ?? [];
  const mine = mineQuery.data ?? [];
  const list = mergeStatus(defs, mine);
  const count = unlockedCount(list);
  const isLoading = defsQuery.isLoading || mineQuery.isLoading;
  const isError = defsQuery.isError || mineQuery.isError;

  const retry = () => {
    void defsQuery.refetch();
    void mineQuery.refetch();
  };

  const renderBody = () => {
    if (isLoading) {
      return (
        <LoadingState
          variant="skeleton"
          label={t('common.loading')}
          testID="achievements-loading"
        />
      );
    }
    if (isError) {
      return (
        <ErrorState
          title={t('common.somethingWentWrong')}
          body={t('common.error')}
          onRetry={retry}
          testID="achievements-error"
        />
      );
    }
    return (
      <FlatList
        data={list}
        keyExtractor={(d) => d.id}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={{ gap: LIST_GAP }}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: LIST_BOTTOM_PADDING,
          gap: LIST_GAP,
        }}
        renderItem={({ item }) => <AchievementBadge def={item} />}
        ListEmptyComponent={
          <EmptyState
            title={t('emptyStates.achievements.title')}
            body={t('emptyStates.achievements.body')}
            actionLabel={t('emptyStates.achievements.action')}
            onAction={() => router.replace('/(tabs)/trips')}
            testID="achievements-empty"
          />
        }
      />
    );
  };

  return (
    <View className="flex-1 bg-cream" style={{ paddingTop: insets.top + SCREEN_PADDING }}>
      <PixelText size="h1" className="px-6">
        {t('achievements.screen.title')}
      </PixelText>
      <PixelText size="body" className="mb-4 px-6 text-text-secondary">
        {t('achievements.screen.count', { count, total: list.length })}
      </PixelText>
      {renderBody()}
    </View>
  );
}
