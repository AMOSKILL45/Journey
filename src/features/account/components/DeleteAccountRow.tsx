import { useState } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelInput } from '@shared/components/PixelInput';
import { PixelText } from '@shared/components/PixelText';
import { cn } from '@shared/utils/cn';

import { useDeleteAccount } from '../hooks/useDeleteAccount';
import { confirmWordForLocale, matchesConfirmWord } from '../utils/confirmWord';

/**
 * Destructive "Delete my account" entry + its typed-confirmation dialog (spec §6.1, UI spec §3
 * destructive separation). The row is danger-colored and meant to sit in its own, spatially
 * separated section. The dialog requires typing the locale magic word (DELETE / SUPPRIMER) before
 * the destructive CTA enables — a deliberate friction step. On success {@link useDeleteAccount}
 * signs out, clears caches, and routes to sign-in; on failure we surface `account.delete.error`.
 */
export function DeleteAccountRow() {
  const { t, locale } = useTranslation();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const remove = useDeleteAccount();

  const expectedWord = confirmWordForLocale(locale);
  const canConfirm = matchesConfirmWord(typed, locale) && !remove.isPending;

  const close = (): void => {
    if (remove.isPending) return;
    setOpen(false);
    setTyped('');
    remove.reset();
  };

  const onConfirm = (): void => {
    if (!canConfirm) return;
    remove.mutate(); // success → hook routes to sign-in; row unmounts with the profile screen
  };

  return (
    <>
      <PixelButton
        variant="danger"
        fullWidth
        accessibilityLabel={t('account.delete.entry')}
        onPress={() => setOpen(true)}
      >
        {t('account.delete.entry')}
      </PixelButton>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable
          className="flex-1 items-center justify-center bg-text-primary/60 px-6"
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('common.cancel')}
        >
          <Pressable
            onPress={(e) => e?.stopPropagation?.()}
            className={cn('w-full max-w-md rounded border-pixel border-border bg-surface p-6')}
            style={{
              shadowColor: '#0F1A2E',
              shadowOffset: { width: 6, height: 6 },
              shadowOpacity: 1,
              shadowRadius: 0,
            }}
          >
            <PixelText size="h2" className="mb-3">
              {t('account.delete.title')}
            </PixelText>
            <PixelText size="body" className="mb-4 text-text-secondary">
              {t('account.delete.warning')}
            </PixelText>
            <PixelInput
              label={t('account.delete.confirmLabel')}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!remove.isPending}
              placeholder={expectedWord}
              containerClassName="mb-2"
            />
            {remove.isError ? (
              <View accessibilityLiveRegion="polite">
                <PixelText size="small" className="mb-2 text-error">
                  {t('account.delete.error')}
                </PixelText>
              </View>
            ) : null}
            <View className="gap-2">
              <PixelButton
                variant="danger"
                fullWidth
                disabled={!canConfirm}
                loading={remove.isPending}
                accessibilityLabel={t('account.delete.confirmCta')}
                onPress={onConfirm}
              >
                {t('account.delete.confirmCta')}
              </PixelButton>
              <PixelButton
                variant="ghost"
                fullWidth
                disabled={remove.isPending}
                accessibilityLabel={t('account.delete.cancel')}
                onPress={close}
              >
                {t('account.delete.cancel')}
              </PixelButton>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
