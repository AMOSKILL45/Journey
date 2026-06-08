// Reasons a traveler can flag a KB rule. Mirrors the CHECK on kb_rule_reports.reason
// (migration 20260607090001) and the smartReminders.report.<reason> i18n keys.
export const REPORT_REASONS = ['outdated', 'incorrect', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
