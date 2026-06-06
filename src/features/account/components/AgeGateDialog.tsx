import { useTranslation } from '@core/i18n';
import { PixelDialog } from '@shared/components/PixelDialog';
import { PixelText } from '@shared/components/PixelText';

export interface AgeGateDialogProps {
  visible: boolean;
  onConfirm: () => void;
  loading?: boolean;
}

/**
 * Minimal 13+ / 16-EU self-confirmation (spec §6.3). Intentionally has only a confirm CTA — there
 * is no decline path in v1.0; the user must confirm they meet the minimum age to proceed. No DOB
 * is collected.
 */
export function AgeGateDialog({ visible, onConfirm, loading = false }: AgeGateDialogProps) {
  const { t } = useTranslation();
  return (
    <PixelDialog
      visible={visible}
      title={t('account.ageGate.title')}
      confirmLabel={t('account.ageGate.confirm')}
      onConfirm={loading ? undefined : onConfirm}
    >
      <PixelText size="body" className="text-text-secondary">
        {t('account.ageGate.body')}
      </PixelText>
    </PixelDialog>
  );
}
