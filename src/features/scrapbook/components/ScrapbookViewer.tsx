import { Image } from 'expo-image';
import { useState } from 'react';
import { Alert, Modal, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTranslation } from '@core/i18n';
import { haptics } from '@features/feedback';
import { PixelButton } from '@shared/components/PixelButton';
import { PixelText } from '@shared/components/PixelText';

import { shareScrapbookArtifact, type ScrapbookArtifact } from '../api';

export interface ScrapbookViewerProps {
  /** Signed URL of the rendered PNG story card (preview + share source). */
  pngUrl: string | null;
  /** Signed URL of the PDF album (share source). */
  pdfUrl: string | null;
  visible: boolean;
  onClose: () => void;
}

/**
 * Full-screen preview of a generated scrapbook: the PNG story card plus actions to share the
 * PNG or the PDF album via the OS share sheet (expo-sharing, reused from 4A). Both share paths
 * download the signed URL to the cache dir first; failures surface a localized alert.
 */
export function ScrapbookViewer({ pngUrl, pdfUrl, visible, onClose }: ScrapbookViewerProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState<ScrapbookArtifact | null>(null);

  const share = async (artifact: ScrapbookArtifact, url: string | null) => {
    if (busy || !url) return;
    setBusy(artifact);
    try {
      await shareScrapbookArtifact(url, artifact);
      haptics.success();
    } catch {
      Alert.alert(t('scrapbook.errors.shareTitle'), t('scrapbook.errors.shareBody'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-text-primary">
        <ScrollView
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
        >
          <View className="mb-3 flex-row items-center justify-between px-4">
            <PixelText size="h3" className="text-surface">
              {t('scrapbook.viewer.title')}
            </PixelText>
            <PixelButton variant="ghost" size="sm" onPress={onClose} className="bg-surface">
              {t('common.done')}
            </PixelButton>
          </View>

          {pngUrl ? (
            <Image
              source={{ uri: pngUrl }}
              style={{ width: '100%', aspectRatio: 4 / 5 }}
              contentFit="contain"
              transition={150}
              accessibilityLabel={t('scrapbook.viewer.previewA11y')}
            />
          ) : (
            <View className="items-center py-12">
              <PixelText size="body" className="text-surface">
                {t('scrapbook.viewer.noPreview')}
              </PixelText>
            </View>
          )}

          <View className="gap-3 px-4 pt-4">
            <PixelButton
              variant="primary"
              onPress={() => void share('png', pngUrl)}
              loading={busy === 'png'}
              disabled={!pngUrl || busy !== null}
              fullWidth
            >
              {t('scrapbook.viewer.sharePng')}
            </PixelButton>
            <PixelButton
              variant="secondary"
              onPress={() => void share('pdf', pdfUrl)}
              loading={busy === 'pdf'}
              disabled={!pdfUrl || busy !== null}
              fullWidth
            >
              {pdfUrl ? t('scrapbook.viewer.sharePdf') : t('scrapbook.viewer.pdfPending')}
            </PixelButton>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
