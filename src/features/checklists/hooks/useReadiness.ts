import { useMemo } from 'react';

import { useTripMembers } from '@features/trips/hooks/useTripMembers';

import type { ChecklistCompletion, ChecklistItem, ItemScope } from '../api/checklists';
import {
  isTripReady,
  lateTravelers,
  myOutstanding,
  type ReadinessInput,
  type ReadinessItem,
} from '../utils/readiness';

const EDITOR_ROLES = ['owner', 'editor'];

export function useReadiness(
  tripId: string,
  items: ChecklistItem[],
  completions: ChecklistCompletion[],
  userId: string | null,
) {
  const { data: members = [] } = useTripMembers(tripId);

  return useMemo(() => {
    const travelerIds = members.filter((m) => EDITOR_ROLES.includes(m.role)).map((m) => m.user_id);
    const completionsByItem: Record<string, string[]> = {};
    for (const c of completions) {
      (completionsByItem[c.item_id] ??= []).push(c.user_id);
    }
    const readinessItems: ReadinessItem[] = items.map((i) => ({
      id: i.id,
      checklist_id: i.checklist_id,
      scope: i.scope as ItemScope,
      is_done: i.is_done,
      assigned_to: i.assigned_to,
    }));
    const input: ReadinessInput = { items: readinessItems, completionsByItem, travelerIds };
    return {
      input,
      ready: isTripReady(input),
      late: lateTravelers(input),
      mine: userId ? myOutstanding(input, userId) : [],
      travelerCount: travelerIds.length,
    };
  }, [members, items, completions, userId]);
}
