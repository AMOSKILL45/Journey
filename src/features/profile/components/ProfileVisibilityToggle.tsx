import { Eye, Lock } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { colors } from '@core/theme';
import { PixelDialog } from '@shared/components/PixelDialog';
import { PixelText } from '@shared/components/PixelText';

const ICON_SIZE = 18;

export type ProfileVisibility = 'public' | 'private';

export interface ProfileVisibilityToggleProps {
  visibility: ProfileVisibility;
  onChange: (next: ProfileVisibility) => void;
  showGender?: boolean;
  showAge?: boolean;
  onChangeGender?: (next: boolean) => void;
  onChangeAge?: (next: boolean) => void;
}

/** A 44pt switch row: icon + label + pill toggle, mirrored from FeedbackSettings. */
function SwitchRow({
  label,
  value,
  onToggle,
  leftIcon,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
  leftIcon?: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      className="min-h-[44px] flex-row items-center justify-between py-2"
    >
      <View className="flex-1 flex-row items-center gap-2">
        {leftIcon}
        <PixelText size="body">{label}</PixelText>
      </View>
      <View
        className={`h-6 w-11 rounded-full border-2 border-border ${
          value ? 'bg-secondary-500' : 'bg-surface-alt'
        }`}
      />
    </Pressable>
  );
}

/**
 * Profile public opt-in (settings). Private by default. Going private -> public
 * is privacy-significant, so it routes through a PixelDialog that lists exactly
 * what becomes visible (and what never does). Tightening back to private is
 * applied immediately. The optional gender/age sub-toggles appear only once the
 * profile is public (progressive disclosure).
 */
export function ProfileVisibilityToggle({
  visibility,
  onChange,
  showGender = false,
  showAge = false,
  onChangeGender,
  onChangeAge,
}: ProfileVisibilityToggleProps) {
  const { t } = useTranslation();
  const [confirming, setConfirming] = useState(false);
  const isPublic = visibility === 'public';

  const handlePress = () => {
    if (isPublic) {
      onChange('private');
      return;
    }
    setConfirming(true);
  };

  const confirmPublic = () => {
    setConfirming(false);
    onChange('public');
  };

  return (
    <View className="gap-1">
      <SwitchRow
        label={t('social.profile.makePublic')}
        value={isPublic}
        onToggle={handlePress}
        leftIcon={
          isPublic ? (
            <Eye size={ICON_SIZE} color={colors.secondary[500]} />
          ) : (
            <Lock size={ICON_SIZE} color={colors.textSecondary} />
          )
        }
      />

      <PixelText size="caption" className="text-text-secondary">
        {t('social.profile.publicNote')}
      </PixelText>

      {isPublic ? (
        <View className="mt-2 gap-1 border-t-2 border-border/20 pt-2">
          <SwitchRow
            label={t('social.profile.showGender')}
            value={showGender}
            onToggle={() => onChangeGender?.(!showGender)}
          />
          <SwitchRow
            label={t('social.profile.showAge')}
            value={showAge}
            onToggle={() => onChangeAge?.(!showAge)}
          />
        </View>
      ) : null}

      <PixelDialog
        visible={confirming}
        title={t('social.visibility.confirmTitle')}
        confirmLabel={t('social.profile.makePublic')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmPublic}
        onCancel={() => setConfirming(false)}
      >
        <PixelText size="body" className="text-text-secondary">
          {t('social.profile.publicNote')}
        </PixelText>
      </PixelDialog>
    </View>
  );
}
