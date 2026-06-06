import { useTranslation } from '@core/i18n';
import { PixelAvatar } from '@shared/components/PixelAvatar';

import type { PermissionKind } from '../prePermission';

/** Placeholder sprite per permission (real pixel-art icon = asset task). */
const SPRITE_BY_KIND: Record<PermissionKind, string> = {
  notifications: 'avatars/adventurer_4',
  location: 'avatars/adventurer_3',
};

export interface PrePermissionSpriteProps {
  kind: PermissionKind;
}

/**
 * The priming sheet's sprite. Meaningful (illustrates the permission's value),
 * so it carries an accessibility label derived from the priming title.
 */
export function PrePermissionSprite({ kind }: PrePermissionSpriteProps) {
  const { t } = useTranslation();
  return (
    <PixelAvatar
      spriteId={SPRITE_BY_KIND[kind]}
      label={t(`onboarding.priming.${kind}.title`)}
      size="md"
    />
  );
}
