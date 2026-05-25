import { useState } from 'react';
import { Share, View } from 'react-native';
import { z } from 'zod';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';

import { buildInvitationLink } from '../api/members';
import { useCreateInvitation } from '../hooks/useTripMembers';

const emailSchema = z.string().email();

export function InviteMemberForm({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const create = useCreateInvitation(tripId);

  const handleCreate = async (withEmail: boolean) => {
    setValidationError(null);
    let normalizedEmail: string | null = null;
    if (withEmail) {
      const parsed = emailSchema.safeParse(email.trim());
      if (!parsed.success) {
        setValidationError(t('auth.signIn.emailInvalid'));
        return;
      }
      normalizedEmail = parsed.data;
    }
    try {
      const invitation = await create.mutateAsync(normalizedEmail);
      setLastLink(buildInvitationLink(invitation.token));
      setEmail('');
    } catch (e) {
      setValidationError(e instanceof Error ? e.message : t('common.error'));
    }
  };

  const share = async () => {
    if (!lastLink) return;
    await Share.share({ message: t('trips.invite.shareMessage', { link: lastLink }) });
  };

  return (
    <View className="gap-3">
      <PixelText size="h3">{t('trips.invite.title')}</PixelText>
      <PixelText size="small" className="text-text-secondary">
        {t('trips.invite.subtitle')}
      </PixelText>

      <PixelInput
        label={t('trips.invite.emailLabel')}
        placeholder={t('auth.signIn.emailPlaceholder')}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        errorText={validationError ?? undefined}
      />
      <PixelButton onPress={() => handleCreate(true)} loading={create.isPending} fullWidth>
        {t('trips.invite.sendButton')}
      </PixelButton>
      <PixelButton
        variant="ghost"
        onPress={() => handleCreate(false)}
        loading={create.isPending}
        fullWidth
      >
        {t('trips.invite.linkOnlyButton')}
      </PixelButton>

      {lastLink ? (
        <View className="mt-2 gap-2 rounded border-pixel border-secondary-700 bg-surface-alt p-3">
          <PixelText size="caption" family="body-medium" className="text-secondary-700">
            {t('trips.invite.linkReady')}
          </PixelText>
          <PixelText size="small" selectable>
            {lastLink}
          </PixelText>
          <PixelButton size="sm" variant="secondary" onPress={share}>
            {t('trips.invite.shareButton')}
          </PixelButton>
        </View>
      ) : null}
    </View>
  );
}
