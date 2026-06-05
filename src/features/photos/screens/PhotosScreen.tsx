import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { supabase } from '@core/supabase/client';
import { useTrip } from '@features/trips';
import { PixelButton } from '@shared/components/PixelButton';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { PhotoSection } from '../components/PhotoSection';

export function PhotosScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const id = tripId ?? '';
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: trip } = useTrip(id);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  return (
    <View className="flex-1 bg-cream">
      <ScrollView
        contentContainerStyle={{
          padding: SCREEN_PADDING,
          paddingTop: insets.top + SCREEN_PADDING,
          paddingBottom: 120,
        }}
      >
        <PhotoSection tripId={id} currentUserId={userId} canManage={trip?.owner_id === userId} />
        <View className="mt-8">
          <PixelButton variant="ghost" onPress={() => router.back()} fullWidth>
            {t('common.back')}
          </PixelButton>
        </View>
      </ScrollView>
    </View>
  );
}
