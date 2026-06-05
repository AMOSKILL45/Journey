import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { colors } from '@core/theme';
import { countryName, flagFor } from '@features/passport/flags';
import { PixelAvatar } from '@shared/components/PixelAvatar';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelChip } from '@shared/components/PixelChip';
import { PixelText } from '@shared/components/PixelText';
import { SCREEN_PADDING } from '@shared/constants/layout';

import { fetchPublicProfile, type PublicProfile } from '../api/publicProfile';

const VERIFIED_ICON_SIZE = 20;
// PixelAvatar falls back to its first sprite for unknown ids; this constant just
// guarantees a non-null prop when a public profile has no avatar set.
const AVATAR_FALLBACK_SPRITE = 'avatars/adventurer_1';

export interface PublicProfileScreenProps {
  userId: string;
}

/** Reads a `badges` jsonb column into a flat list of display labels, defensively. */
function badgeLabels(badges: PublicProfile['badges']): string[] {
  if (!Array.isArray(badges)) return [];
  return badges
    .map((b) => {
      if (typeof b === 'string') return b;
      if (b && typeof b === 'object' && 'label' in b && typeof b.label === 'string') return b.label;
      return null;
    })
    .filter((label): label is string => label !== null);
}

/**
 * Read-only public profile, reached via `(modals)/profile/[id]` (e.g. tapping a
 * public trip's owner). Renders only the safe subset returned by the gated
 * `get_public_profile` RPC; a private/non-public profile shows a friendly empty
 * state, never raw PII.
 */
export function PublicProfileScreen({ userId }: PublicProfileScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => fetchPublicProfile(userId),
  });

  if (isLoading) {
    return (
      <View
        className="flex-1 items-center justify-center bg-cream"
        style={{ paddingTop: insets.top }}
      >
        <PixelText size="body" className="text-text-secondary">
          {t('common.loading')}
        </PixelText>
      </View>
    );
  }

  if (!data) {
    return (
      <View
        className="flex-1 items-center justify-center bg-cream px-8"
        style={{ paddingTop: insets.top }}
      >
        <PixelText size="body" className="text-center text-text-secondary">
          {t('social.profile.private')}
        </PixelText>
      </View>
    );
  }

  const countries = data.countries_visited ?? [];
  const badges = badgeLabels(data.badges);
  const name = data.display_name ?? data.username ?? '';

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerStyle={{
        paddingHorizontal: SCREEN_PADDING,
        paddingTop: insets.top + SCREEN_PADDING,
        paddingBottom: 48,
      }}
    >
      <View className="mb-6 items-center gap-3">
        <PixelAvatar
          spriteId={data.avatar_sprite_id ?? AVATAR_FALLBACK_SPRITE}
          color={data.avatar_color ?? colors.border}
          label={name}
          size="md"
        />
        <View className="flex-row items-center gap-2">
          <PixelText size="h1">{name}</PixelText>
          {data.is_verified ? (
            <View className="flex-row items-center gap-1">
              <ShieldCheck size={VERIFIED_ICON_SIZE} color={colors.secondary[500]} />
              <PixelText size="caption" className="text-secondary-700">
                {t('social.profile.verified')}
              </PixelText>
            </View>
          ) : null}
        </View>
        {data.gender || data.age_range ? (
          <PixelText size="caption" className="text-text-secondary">
            {[data.gender, data.age_range].filter(Boolean).join(' · ')}
          </PixelText>
        ) : null}
      </View>

      {data.bio ? (
        <PixelCard padding="lg" className="mb-6">
          <PixelText size="body">{data.bio}</PixelText>
        </PixelCard>
      ) : null}

      {countries.length > 0 ? (
        <View className="mb-6">
          <PixelText size="h3" className="mb-3">
            {t('passport.screen.title')}
          </PixelText>
          <View className="flex-row flex-wrap gap-2">
            {countries.map((code) => (
              <PixelChip
                key={code}
                label={`${flagFor(code)} ${countryName(code) || code}`}
                accessibilityLabel={countryName(code) || code}
              />
            ))}
          </View>
        </View>
      ) : null}

      {badges.length > 0 ? (
        <View className="mb-6">
          <PixelText size="h3" className="mb-3">
            {t('achievements.screen.title')}
          </PixelText>
          <View className="flex-row flex-wrap gap-2">
            {badges.map((label) => (
              <PixelChip key={label} label={label} variant="accent" selected />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
