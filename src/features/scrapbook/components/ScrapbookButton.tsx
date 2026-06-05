import { useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { haptics } from '@features/feedback';
import { PixelButton } from '@shared/components/PixelButton';

import type { ScrapbookResult } from '../api';
import { useGenerateScrapbook, useScrapbookInputs } from '../hooks/useScrapbook';
import { computeTripStats } from '../utils/stats';

import { ScrapbookCard, type CardMilestone, type ScrapbookCardHandle } from './ScrapbookCard';
import { ScrapbookViewer } from './ScrapbookViewer';

export interface ScrapbookButtonProps {
  tripId: string;
  /** Trip name, rendered as the story-card title. */
  tripName: string;
}

/** True once the trip has any content worth recapping. */
function hasContent(milestoneCount: number, photoCount: number): boolean {
  return milestoneCount > 0 || photoCount > 0;
}

/**
 * On-demand "Create scrapbook" action. Renders the trip's Skia story card off-screen, captures
 * it to a PNG on press, runs the hybrid generate pipeline (upload PNG → edge fn builds the PDF →
 * persists the row), and opens the viewer with both signed URLs. Hidden until the trip has at
 * least one milestone or photo; shows a spinner while generating.
 */
export function ScrapbookButton({ tripId, tripName }: ScrapbookButtonProps) {
  const { t } = useTranslation();
  const { data: inputs } = useScrapbookInputs(tripId);
  const generate = useGenerateScrapbook(tripId);
  const cardRef = useRef<ScrapbookCardHandle>(null);
  const [result, setResult] = useState<ScrapbookResult | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  if (!inputs) return null;
  const milestoneCount = inputs.milestones.length;
  if (!hasContent(milestoneCount, inputs.photoCount)) return null;

  const stats = computeTripStats(inputs.trip, inputs.milestones, inputs.legs, inputs.checkins);
  const cardMilestones: CardMilestone[] = inputs.milestones.map((m) => ({
    id: m.id,
    isBoss: Boolean(m.is_boss),
  }));

  const onPress = async () => {
    if (generate.isPending) return;
    const pngBase64 = cardRef.current?.renderToPngBase64() ?? null;
    if (!pngBase64) {
      Alert.alert(t('scrapbook.errors.renderTitle'), t('scrapbook.errors.renderBody'));
      return;
    }
    try {
      const res = await generate.mutateAsync({ tripId, pngBase64 });
      setResult(res);
      setViewerOpen(true);
      haptics.success();
    } catch {
      Alert.alert(t('scrapbook.errors.generateTitle'), t('scrapbook.errors.generateBody'));
    }
  };

  return (
    <View>
      <PixelButton
        variant="primary"
        onPress={onPress}
        loading={generate.isPending}
        accessibilityLabel={t('scrapbook.createA11y')}
        fullWidth
      >
        {generate.isPending ? t('scrapbook.generating') : t('scrapbook.create')}
      </PixelButton>

      {/* Off-screen render target for the PNG snapshot (kept out of layout + interaction). */}
      <View pointerEvents="none" style={styles.offscreen} accessibilityElementsHidden>
        <ScrapbookCard
          ref={cardRef}
          title={tripName}
          stats={stats}
          milestones={cardMilestones}
          photoCount={inputs.photoCount}
        />
      </View>

      <ScrapbookViewer
        pngUrl={result?.pngUrl ?? null}
        pdfUrl={result?.pdfUrl ?? null}
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    left: -10000,
    top: -10000,
    overflow: 'hidden',
  },
});
