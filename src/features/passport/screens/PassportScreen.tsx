import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { rebuildMyPassport } from '../api';
import { PassportStamp } from '../components/PassportStamp';
import { usePassport } from '../hooks/usePassport';
import { sortByDateDesc } from '../passport';

export function PassportScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch } = usePassport();
  const stamps = sortByDateDesc(data?.stamps ?? []);
  const countries = data?.countries ?? [];

  return (
    <View className="flex-1 bg-cream" style={{ paddingTop: insets.top + SCREEN_PADDING }}>
      <PixelText size="h1" className="mb-1 px-6">
        {t('passport.screen.title')}
      </PixelText>
      <PixelText size="caption" className="mb-4 px-6 text-text-secondary">
        {t('passport.screen.counts', { countries: countries.length, stamps: stamps.length })}
      </PixelText>
      <FlatList
        data={stamps}
        keyExtractor={(s) => s.milestone_id}
        numColumns={3}
        contentContainerStyle={{ paddingHorizontal: SCREEN_PADDING, paddingBottom: 16, gap: 8 }}
        columnWrapperStyle={{ gap: 8 }}
        renderItem={({ item }) => <PassportStamp stamp={item} />}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              void rebuildMyPassport().then(() => refetch());
            }}
          />
        }
        ListEmptyComponent={
          <PixelText size="body" className="mt-8 text-center text-text-secondary">
            {t('passport.screen.empty')}
          </PixelText>
        }
      />
    </View>
  );
}
