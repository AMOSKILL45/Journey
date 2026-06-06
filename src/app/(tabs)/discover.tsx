import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { EmptyState } from '@shared/components/EmptyState';
import { SCREEN_PADDING_TOP_EXTRA } from '@shared/constants/layout';

export default function DiscoverTab() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-cream" style={{ paddingTop: insets.top + SCREEN_PADDING_TOP_EXTRA }}>
      <EmptyState
        title={t('emptyStates.discover.title')}
        body={t('emptyStates.discover.body')}
        actionLabel={t('emptyStates.discover.action')}
        onAction={() => router.replace('/(tabs)/trips')}
      />
    </View>
  );
}
