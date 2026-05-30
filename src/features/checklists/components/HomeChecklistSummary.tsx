import { useEffect, useState } from 'react';

import { useTranslation } from '@core/i18n';
import { supabase } from '@core/supabase/client';
import { PixelCard } from '@shared/components/PixelCard';
import { PixelText } from '@shared/components/PixelText';

import { useChecklistItems, useCompletions } from '../hooks/useChecklist';
import { useReadiness } from '../hooks/useReadiness';

/** Compact "what I still owe" card for a single trip, shown on Home. Renders null when nothing is due. */
export function HomeChecklistSummary({ tripId }: { tripId: string }) {
  const { t } = useTranslation();
  const { data: items = [] } = useChecklistItems(tripId);
  const { data: completions = [] } = useCompletions(tripId);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const readiness = useReadiness(tripId, items, completions, userId);
  const count = readiness.mine.length;
  if (count === 0) return null;

  return (
    <PixelCard className="mb-4">
      <PixelText size="small" family="body-medium" className="mb-1 text-text-secondary">
        {t('checklists.readiness.homeTitle')}
      </PixelText>
      <PixelText size="body">{t('checklists.readiness.homeCount', { count })}</PixelText>
    </PixelCard>
  );
}
