import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingState } from '@shared/components/LoadingState';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { rebuildMyPassport } from '../api';
import { PassportStamp } from '../components/PassportStamp';
import { usePassport } from '../hooks/usePassport';
import { sortByDateDesc } from '../passport';

const NUM_COLUMNS = 3;
const LIST_GAP = 8;
const LIST_BOTTOM_PADDING = 16;

export function PassportScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data, isLoading, isError, refetch } = usePassport();
  const stamps = sortByDateDesc(data?.stamps ?? []);
  const countries = data?.countries ?? [];

  const onRefresh = () => {
    void rebuildMyPassport().then(() => refetch());
  };

  const renderBody = () => {
    // Only show a full skeleton on the first load (no cached data yet); a refetch
    // with existing stamps keeps the list visible behind the RefreshControl.
    if (isLoading && !data) {
      return (
        <LoadingState variant="skeleton" label={t('common.loading')} testID="passport-loading" />
      );
    }
    if (isError && !data) {
      return (
        <ErrorState
          title={t('common.somethingWentWrong')}
          body={t('common.error')}
          onRetry={onRefresh}
          testID="passport-error"
        />
      );
    }
    return (
      <FlatList
        data={stamps}
        keyExtractor={(s) => s.milestone_id}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={{
          paddingHorizontal: SCREEN_PADDING,
          paddingBottom: LIST_BOTTOM_PADDING,
          gap: LIST_GAP,
        }}
        columnWrapperStyle={{ gap: LIST_GAP }}
        renderItem={({ item }) => <PassportStamp stamp={item} />}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            title={t('emptyStates.passport.title')}
            body={t('emptyStates.passport.body')}
            actionLabel={t('emptyStates.passport.action')}
            onAction={() => router.replace('/(tabs)/trips')}
            testID="passport-empty"
          />
        }
      />
    );
  };

  return (
    <View className="flex-1 bg-cream" style={{ paddingTop: insets.top + SCREEN_PADDING }}>
      <PixelText size="h1" className="mb-1 px-6">
        {t('passport.screen.title')}
      </PixelText>
      <PixelText size="caption" className="mb-4 px-6 text-text-secondary">
        {t('passport.screen.counts', { countries: countries.length, stamps: stamps.length })}
      </PixelText>
      {renderBody()}
    </View>
  );
}
