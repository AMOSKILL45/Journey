import { forwardRef } from 'react';
import { View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelBottomSheet, type PixelBottomSheetRef } from '@shared/components/PixelBottomSheet';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

import type { PermissionKind } from '../prePermission';

import { PrePermissionSprite } from './PrePermissionSprite';

const SNAP_POINTS = ['45%'];

export interface PrePermissionSheetProps {
  /** Which permission is being primed; null when the sheet is closed. */
  kind: PermissionKind | null;
  /** User tapped "Allow" → proceed to the OS prompt. */
  onAllow: () => void;
  /** User tapped "Not now" or dismissed the sheet. */
  onDismiss: () => void;
}

/**
 * Reusable pre-permission priming sheet (10A, UI spec §1): a sprite + a
 * value-framed message + "Allow" (primary) / "Not now" (ghost) buttons, shown
 * BEFORE the OS prompt. Copy is keyed by permission kind
 * (`onboarding.priming.<kind>.*`). No emoji — uses an existing sprite.
 */
export const PrePermissionSheet = forwardRef<PixelBottomSheetRef, PrePermissionSheetProps>(
  ({ kind, onAllow, onDismiss }, ref) => {
    const { t } = useTranslation();
    return (
      <PixelBottomSheet
        ref={ref}
        snapPoints={SNAP_POINTS}
        scrollable={false}
        onChange={(i) => {
          if (i === -1) onDismiss();
        }}
      >
        <View className="items-center gap-4" testID="pre-permission-sheet">
          {kind ? <PrePermissionSprite kind={kind} /> : null}
          <PixelText size="h3" className="text-center">
            {kind ? t(`onboarding.priming.${kind}.title`) : ''}
          </PixelText>
          <PixelText size="body" className="text-center text-text-secondary">
            {kind ? t(`onboarding.priming.${kind}.body`) : ''}
          </PixelText>
          <View className="mt-2 w-full gap-3">
            <PixelButton
              onPress={onAllow}
              fullWidth
              accessibilityLabel={t('onboarding.priming.allow')}
              testID="pre-permission-allow"
            >
              {t('onboarding.priming.allow')}
            </PixelButton>
            <PixelButton
              variant="ghost"
              onPress={onDismiss}
              fullWidth
              accessibilityLabel={t('onboarding.priming.notNow')}
              testID="pre-permission-not-now"
            >
              {t('onboarding.priming.notNow')}
            </PixelButton>
          </View>
        </View>
      </PixelBottomSheet>
    );
  },
);

PrePermissionSheet.displayName = 'PrePermissionSheet';
