import { supabase } from '@core/supabase/client';

import { type ReportReason } from '../utils/reportReasons';

/** Public, client-readable metadata for a KB rule (RLS opens SELECT to all rows). */
export interface KbRuleMeta {
  id: string;
  verified: boolean;
  report_count: number;
  source_urls: string[];
  action_url: string | null;
}

export async function listKbRules(ids: string[]): Promise<KbRuleMeta[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from('country_requirements')
    .select('id, verified, report_count, source_urls, action_url')
    .in('id', ids);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    verified: r.verified,
    report_count: r.report_count,
    source_urls: r.source_urls,
    action_url: r.action_url,
  }));
}

/** Flag a rule as outdated/incorrect. reporter_id defaults to auth.uid() server-side. */
export async function reportKbRule(ruleId: string, reason: ReportReason): Promise<void> {
  const { error } = await supabase.from('kb_rule_reports').insert({ rule_id: ruleId, reason });
  // 23505 = already reported by this user (UNIQUE rule_id+reporter_id) — treat as success.
  if (error && error.code !== '23505') throw error;
}
