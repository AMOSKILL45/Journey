import { useEffect, useState } from 'react';

import { supabase } from '@core/supabase/client';
import { useTripMembers } from '@features/trips/hooks/useTripMembers';

import { useChecklistItems, useCompletions } from '../hooks/useChecklist';
import { useReadiness } from '../hooks/useReadiness';

import { ReadinessCard } from './ReadinessCard';

/** Self-contained readiness summary for a trip — drop-in for the trip detail screen. */
export function TripReadinessCard({ tripId }: { tripId: string }) {
  const { data: items = [] } = useChecklistItems(tripId);
  const { data: completions = [] } = useCompletions(tripId);
  const { data: members = [] } = useTripMembers(tripId);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const readiness = useReadiness(tripId, items, completions, userId);
  const lateNames = readiness.late.map(
    (uid) => members.find((m) => m.user_id === uid)?.profile?.display_name ?? '—',
  );

  return (
    <ReadinessCard
      ready={readiness.ready}
      readyX={readiness.travelerCount - readiness.late.length}
      readyN={readiness.travelerCount}
      lateNames={lateNames}
      hasItems={items.length > 0}
    />
  );
}
