import { ActivityIndicator, FlatList, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { mergeStatus, unlockedCount } from '../achievementStatus';
import { AchievementBadge } from '../components/AchievementBadge';
import { useAchievementDefinitions, useMyAchievements } from '../hooks/useAchievements';

const NUM_COLUMNS = 3;

export function AchievementsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data: defs = [], isLoading: defsLoading } = useAchievementDefinitions();
  const { data: mine = [], isLoading: mineLoading } = useMyAchievements();

  const list = mergeStatus(defs, mine);
  const count = unlockedCount(list);
  const isLoading = defsLoading || mineLoading;

  return (
    <View className="flex-1 bg-cream" style={{ paddingTop: insets.top + SCREEN_PADDING }}>
      <PixelText size="h1" className="px-6">
        {t('achievements.screen.title')}
      </PixelText>
      <PixelText size="body" className="mb-4 px-6 text-text-secondary">
        {t('achievements.screen.count', { count, total: list.length })}
      </PixelText>
      {isLoading ? (
        <ActivityIndicator className="mt-8" testID="achievements-loading" />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(d) => d.id}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={{ gap: 8 }}
          contentContainerStyle={{
            paddingHorizontal: SCREEN_PADDING,
            paddingBottom: 120,
            gap: 8,
          }}
          renderItem={({ item }) => <AchievementBadge def={item} />}
          ListEmptyComponent={
            <PixelText size="body" className="mt-8 text-center text-text-secondary">
              {t('achievements.screen.empty')}
            </PixelText>
          }
        />
      )}
    </View>
  );
}
