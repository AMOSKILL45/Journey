import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { useTranslation } from '@core/i18n';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import type { ScrapbookWithUrls } from '../api';
import { useScrapbooks } from '../hooks/useScrapbook';

import { ScrapbookButton } from './ScrapbookButton';
import { ScrapbookViewer } from './ScrapbookViewer';

export interface ScrapbookSectionProps {
  tripId: string;
  /** Trip name, used as the generated story-card title. */
  tripName: string;
}

/** Format an ISO timestamp as a short localized date for the history list. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString();
}

/**
 * TripDetailScreen entry for the scrapbook feature: the on-demand create button plus a list of
 * previously generated recaps. Tapping a past recap reopens the viewer with fresh signed URLs.
 * The whole section self-hides nothing — `ScrapbookButton` decides whether the create action is
 * shown based on trip content, and the history simply stays empty until the first generation.
 */
export function ScrapbookSection({ tripId, tripName }: ScrapbookSectionProps) {
  const { t } = useTranslation();
  const { data: scrapbooks = [], isLoading } = useScrapbooks(tripId);
  const [active, setActive] = useState<ScrapbookWithUrls | null>(null);

  return (
    <View>
      <View className="mb-3">
        <PixelText size="h2">{t('scrapbook.title')}</PixelText>
        <PixelText size="caption" className="text-text-secondary">
          {t('scrapbook.subtitle')}
        </PixelText>
      </View>

      <View className="mb-3">
        <ScrapbookButton tripId={tripId} tripName={tripName} />
      </View>

      {isLoading ? (
        <PixelText size="body" className="text-text-secondary">
          {t('common.loading')}
        </PixelText>
      ) : scrapbooks.length === 0 ? (
        <PixelCard className="items-center">
          <PixelText size="body" className="text-center text-text-secondary">
            {t('scrapbook.empty')}
          </PixelText>
        </PixelCard>
      ) : (
        <View className="gap-2">
          {scrapbooks.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={t('scrapbook.openA11y')}
              onPress={() => setActive(s)}
            >
              <PixelCard className="flex-row items-center justify-between">
                <PixelText size="body" family="body-bold">
                  {t('scrapbook.recapLabel', { date: formatDate(s.generated_at) })}
                </PixelText>
                <PixelText size="caption" className="text-secondary-700">
                  {t('scrapbook.open')}
                </PixelText>
              </PixelCard>
            </Pressable>
          ))}
        </View>
      )}

      <ScrapbookViewer
        pngUrl={active?.pngUrl ?? null}
        pdfUrl={active?.pdfUrl ?? null}
        visible={active !== null}
        onClose={() => setActive(null)}
      />
    </View>
  );
}
