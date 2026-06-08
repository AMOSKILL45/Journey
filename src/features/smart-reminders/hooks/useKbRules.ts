import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@core/supabase/client';

import { listKbRules, reportKbRule, type KbRuleMeta } from '../api/kbRules';
import { type ReportReason } from '../utils/reportReasons';

const KB_RULES_KEY = 'kb-rules';
const keyFor = (ids: string[]) => [KB_RULES_KEY, [...ids].sort().join(',')] as const;

/**
 * KB rule metadata (verified badge + live report_count + source) for a set of rule ids.
 * Subscribes to Realtime postgres_changes on country_requirements so the report count updates
 * in real time across users (the report trigger bumps report_count → UPDATE → invalidate).
 */
export function useKbRules(ids: string[]) {
  const qc = useQueryClient();
  const k = keyFor(ids);
  const query = useQuery({ queryKey: k, queryFn: () => listKbRules(ids), enabled: ids.length > 0 });

  const keyTag = k[1];
  useEffect(() => {
    if (!ids.length) return undefined;
    const channel = supabase
      .channel(`kb-rules-counts:${keyTag}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'country_requirements' },
        () => {
          void qc.invalidateQueries({ queryKey: [KB_RULES_KEY] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc, keyTag]);

  const byId: Record<string, KbRuleMeta> = {};
  for (const r of query.data ?? []) byId[r.id] = r;
  return { ...query, byId };
}

export function useReportKbRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleId, reason }: { ruleId: string; reason: ReportReason }) =>
      reportKbRule(ruleId, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: [KB_RULES_KEY] }),
  });
}
