import { ReactNode } from 'react';
import { Modal, Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { cn } from '@shared/utils/cn';

import { PixelButton } from '../PixelButton';
import { PixelText } from '../PixelText';

export interface PixelDialogProps {
  visible: boolean;
  title?: string;
  children?: ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function PixelDialog({
  visible,
  title,
  children,
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel,
  destructive = false,
}: PixelDialogProps) {
  const { t } = useTranslation();
  const close = onCancel ?? onConfirm ?? (() => {});

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable
        className="flex-1 items-center justify-center bg-text-primary/60 px-6"
        onPress={close}
        accessibilityRole="button"
        accessibilityLabel={t('common.cancel')}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className={cn('w-full max-w-md rounded border-pixel border-border bg-surface p-6')}
          style={{
            shadowColor: '#0F1A2E',
            shadowOffset: { width: 6, height: 6 },
            shadowOpacity: 1,
            shadowRadius: 0,
          }}
        >
          {title ? (
            <PixelText size="h2" className="mb-3">
              {title}
            </PixelText>
          ) : null}
          {children ? <View className="mb-4">{children}</View> : null}
          <View className="gap-2">
            {onConfirm ? (
              <PixelButton
                variant={destructive ? 'danger' : 'primary'}
                onPress={onConfirm}
                fullWidth
              >
                {confirmLabel ?? t('common.done')}
              </PixelButton>
            ) : null}
            {onCancel ? (
              <PixelButton variant="ghost" onPress={onCancel} fullWidth>
                {cancelLabel ?? t('common.cancel')}
              </PixelButton>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
