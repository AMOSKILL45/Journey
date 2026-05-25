import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import { useTripMembers } from '../hooks/useTripMembers';

export function MembersList({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const { data: members = [], isLoading } = useTripMembers(tripId);

  if (isLoading) {
    return (
      <PixelText size="small" className="text-text-secondary">
        {t('common.loading')}
      </PixelText>
    );
  }

  if (members.length === 0) {
    return (
      <PixelText size="small" className="text-text-secondary">
        {t('trips.members.empty')}
      </PixelText>
    );
  }

  return (
    <View className="gap-2">
      {members.map((m) => (
        <PixelCard key={m.user_id} padding="sm" variant="flat">
          <View className="flex-row items-center gap-3">
            <View
              className="h-8 w-8 rounded-full border-2 border-border"
              style={{ backgroundColor: m.profile?.avatar_color ?? '#E63946' }}
            />
            <View className="flex-1">
              <PixelText size="body" family="body-medium">
                {m.profile?.display_name ?? t('profile.anonymous')}
              </PixelText>
              <PixelText size="caption" className="text-text-secondary">
                {m.role}
              </PixelText>
            </View>
          </View>
        </PixelCard>
      ))}
    </View>
  );
}
