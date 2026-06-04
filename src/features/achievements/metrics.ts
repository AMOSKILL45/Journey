export const METRIC_VOCAB = [
  'trips_created',
  'milestones_created',
  'checkins',
  'companions_invited',
  'documents_uploaded',
  'checklist_items_completed',
  'boss_checkins',
  'max_trip_members',
  'countries_visited',
  'completed_trips',
  'checklists_completed',
  'identity_verified',
] as const;
export type Metric = (typeof METRIC_VOCAB)[number];
