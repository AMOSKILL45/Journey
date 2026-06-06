import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { colors } from '@core/theme/tokens';
import { LoadingState } from '@shared/components/LoadingState';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import { useTripMembers } from '../hooks/useTripMembers';
import { isGhostUser } from '../utils/sentinel';

/** Constrains the inline skeleton so it does not stretch to fill the scroll view. */
const SKELETON_HEIGHT = 96;

export function MembersList({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const { data: members = [], isLoading, error } = useTripMembers(tripId);

  if (isLoading) {
    return (
      <View style={{ height: SKELETON_HEIGHT }}>
        <LoadingState variant="skeleton" label={t('common.loading')} />
      </View>
    );
  }

  if (error) {
    return (
      <PixelText size="small" className="text-error" accessibilityRole="alert">
        {t('common.error')}
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
      {members.map((m) => {
        const name = isGhostUser(m.user_id)
          ? t('account.ghostName')
          : (m.profile?.display_name ?? t('profile.anonymous'));
        return (
          <PixelCard
            key={m.user_id}
            padding="sm"
            variant="flat"
            accessible
            accessibilityLabel={`${name}, ${m.role}`}
          >
            <View className="flex-row items-center gap-3">
              <View
                className="h-8 w-8 rounded-full border-2 border-border"
                style={{ backgroundColor: m.profile?.avatar_color ?? colors.primary[500] }}
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
              <View className="flex-1">
                <PixelText size="body" family="body-medium">
                  {name}
                </PixelText>
                <PixelText size="caption" className="text-text-secondary">
                  {m.role}
                </PixelText>
              </View>
            </View>
          </PixelCard>
        );
      })}
    </View>
  );
}
