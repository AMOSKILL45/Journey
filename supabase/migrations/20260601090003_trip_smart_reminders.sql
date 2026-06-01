-- Phase 4D: per-user, per-trip actionable cards. Created by the cron (service role); user updates status.
CREATE TABLE IF NOT EXISTS public.trip_smart_reminders (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id                    uuid NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id                    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requirement_id             text NOT NULL REFERENCES public.country_requirements(id),
  status                     text NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','done','dismissed','snoozed','not_applicable')),
  snooze_until               timestamptz,
  marked_done_at             timestamptz,
  added_to_checklist_item_id uuid REFERENCES public.checklist_items(id) ON DELETE SET NULL,
  notifications_sent_at      timestamptz[] NOT NULL DEFAULT '{}',
  fired_lead_times           int[] NOT NULL DEFAULT '{}',
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trip_id, user_id, requirement_id)
);
CREATE INDEX IF NOT EXISTS idx_tsr_trip_user ON public.trip_smart_reminders(trip_id, user_id);

ALTER TABLE public.trip_smart_reminders ENABLE ROW LEVEL SECURITY;
-- Owner reads/updates own cards, scoped to trip membership. No client INSERT (cron/service-role only).
DROP POLICY IF EXISTS "Own smart reminders SELECT" ON public.trip_smart_reminders;
CREATE POLICY "Own smart reminders SELECT" ON public.trip_smart_reminders FOR SELECT
  USING (user_id = auth.uid() AND public.is_trip_member(trip_id, auth.uid()));
DROP POLICY IF EXISTS "Own smart reminders UPDATE" ON public.trip_smart_reminders;
CREATE POLICY "Own smart reminders UPDATE" ON public.trip_smart_reminders FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
