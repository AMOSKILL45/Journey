import { Image, Modal, Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelText } from '@shared/components/PixelText';

export interface DocumentViewerProps {
  visible: boolean;
  uri: string | null;
  onClose: () => void;
}

export function DocumentViewer({ visible, uri, onClose }: DocumentViewerProps) {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-text-primary p-4">
        {uri ? (
          <Image
            source={{ uri }}
            resizeMode="contain"
            className="h-3/4 w-full"
            accessibilityLabel={t('documents.title')}
          />
        ) : null}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={t('common.done')}
          className="mt-4 rounded border-2 border-border bg-surface px-4 py-2"
        >
          <PixelText size="body" family="body-medium">
            {t('common.done')}
          </PixelText>
        </Pressable>
      </View>
    </Modal>
  );
}
