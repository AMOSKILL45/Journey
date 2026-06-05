import { Eye, Link2, Lock } from 'lucide-react-native';
import { useState, type ComponentType } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { haptics } from '@features/feedback';
import { PixelChip } from '@shared/components/PixelChip';
import { PixelDialog } from '@shared/components/PixelDialog';
import { PixelText } from '@shared/components/PixelText';
import { cn } from '@shared/utils/cn';

import type { TripVisibility } from '../api/trips';
import { buildPublicTripLink } from '../utils/publicLink';

const ICON_SIZE = 16;
const ICON_ON_ACTIVE = '#FFFFFF';
const ICON_ON_IDLE = '#0F1A2E'; // text-primary
const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
const noop = () => {};

/** The three user-selectable levels (open_to_join is reserved for v1.1). */
const SELECTABLE: readonly {
  value: Exclude<TripVisibility, 'open_to_join'>;
  icon: ComponentType<{ size?: number; color?: string }>;
  /** i18n key — also used verbatim as the accessibilityLabel (Phase 9 a11y contract). */
  labelKey: string;
}[] = [
  { value: 'private', icon: Lock, labelKey: 'social.visibility.private' },
  { value: 'unlisted', icon: Link2, labelKey: 'social.visibility.unlisted' },
  { value: 'public_view', icon: Eye, labelKey: 'social.visibility.publicView' },
];

export interface VisibilityControlProps {
  visibility: TripVisibility;
  shareToken: string | null;
  onChange: (next: TripVisibility) => void;
}

/**
 * Owner/editor trip visibility picker (Phase 9, UI spec §9A).
 *
 * Trust/privacy-first: every state pairs a Lucide icon + label (never color-only); moving
 * from `private` → public opens a confirm dialog that lists the safe subset before applying
 * (no silent privacy change); the copy-link affordance only appears once the trip is shareable.
 * `open_to_join` is shown disabled as a v1.1 affordance.
 */
export function VisibilityControl({ visibility, shareToken, onChange }: VisibilityControlProps) {
  const { t } = useTranslation();
  const [pendingPublic, setPendingPublic] = useState<Exclude<
    TripVisibility,
    'open_to_join' | 'private'
  > | null>(null);

  const isPublic = visibility !== 'private';

  const select = (next: Exclude<TripVisibility, 'open_to_join'>) => {
    if (next === visibility) return;
    haptics.selection();
    // Going from private -> shareable is a meaningful privacy change: confirm first.
    if (visibility === 'private' && next !== 'private') {
      setPendingPublic(next);
      return;
    }
    onChange(next);
  };

  const confirmGoPublic = () => {
    if (!pendingPublic) return;
    const next = pendingPublic;
    setPendingPublic(null);
    onChange(next);
  };

  const copyLink = async () => {
    if (!shareToken) return;
    haptics.selection();
    const link = buildPublicTripLink(shareToken);
    try {
      // Lazy require so a build without expo-clipboard degrades to a no-op instead of a
      // hard Metro/native failure (the 6C lazy-native pattern).
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Clipboard = require('expo-clipboard') as {
        setStringAsync: (value: string) => Promise<boolean>;
      };
      await Clipboard.setStringAsync(link);
      Alert.alert(t('social.visibility.linkCopied'));
    } catch {
      // Surface the link so the user can still copy it manually if clipboard is unavailable.
      Alert.alert(t('social.visibility.copyLink'), link);
    }
  };

  return (
    <View>
      <PixelText size="small" family="body-medium" className="mb-2 text-text-primary">
        {t('trips.detail.visibility')}
      </PixelText>

      <View className="flex-row flex-wrap gap-2">
        {SELECTABLE.map(({ value, icon: Icon, labelKey }) => {
          const active = value === visibility;
          return (
            <Pressable
              key={value}
              onPress={() => select(value)}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={labelKey}
              accessibilityState={{ selected: active }}
              className={cn(
                'min-h-[44px] flex-row items-center gap-1.5 rounded-full border-2 border-border px-3 py-2',
                active ? 'bg-primary-500' : 'bg-surface-alt',
              )}
            >
              <Icon size={ICON_SIZE} color={active ? ICON_ON_ACTIVE : ICON_ON_IDLE} />
              <PixelText
                size="small"
                family="body-medium"
                className={active ? 'text-white' : 'text-text-primary'}
              >
                {t(labelKey)}
              </PixelText>
            </Pressable>
          );
        })}

        {/* open_to_join — reserved for v1.1 discovery, visibly disabled (non-interactive). */}
        <PixelChip
          label={t('social.visibility.openToJoinSoon')}
          disabled
          onPress={noop}
          accessibilityLabel="social.visibility.openToJoinSoon"
        />
      </View>

      <PixelText size="caption" className="mt-2 text-text-secondary">
        {t('social.visibility.explainer')}
      </PixelText>

      {isPublic && shareToken ? (
        <Pressable
          onPress={copyLink}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="social.visibility.copyLink"
          className="mt-3 min-h-[44px] flex-row items-center justify-center gap-2 self-start rounded-full border-2 border-border bg-secondary-700 px-4 py-2"
        >
          <Link2 size={ICON_SIZE} color={ICON_ON_ACTIVE} />
          <PixelText size="small" family="body-medium" className="text-white">
            {t('social.visibility.copyLink')}
          </PixelText>
        </Pressable>
      ) : null}

      <PixelDialog
        visible={pendingPublic !== null}
        title={t('social.visibility.confirmTitle')}
        confirmLabel={t('common.done')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmGoPublic}
        onCancel={() => setPendingPublic(null)}
      >
        <PixelText size="body" className="text-text-secondary">
          {t('social.visibility.confirmBody')}
        </PixelText>
      </PixelDialog>
    </View>
  );
}
