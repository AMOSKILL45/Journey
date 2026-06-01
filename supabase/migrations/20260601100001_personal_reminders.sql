-- Phase 4E: trip-independent life reminders. Manual rows = user CRUD; auto rows = trigger/service-role.
CREATE TABLE IF NOT EXISTS public.personal_reminders (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type         text NOT NULL
                          CHECK (reminder_type IN ('passport_expiry','visa_expiry','esta_expiry',
                                                    'driving_license_expiry','travel_insurance_expiry','custom')),
  related_document_id   uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  target_date           date NOT NULL,
  i18n_key              text,                       -- auto types; NULL for 'custom'
  title                 text,                       -- 'custom' (user-entered)
  body                  text,
  lead_times            int[] NOT NULL DEFAULT '{60,30,7}',
  status                text NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','snoozed','dismissed','completed')),
  snooze_until          timestamptz,
  source                text NOT NULL DEFAULT 'manual'
                          CHECK (source IN ('auto_passport','auto_document','manual')),
  notifications_sent_at timestamptz[] NOT NULL DEFAULT '{}',
  fired_lead_times      int[] NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT label_present CHECK (i18n_key IS NOT NULL OR title IS NOT NULL)
);

-- Dedup auto rows only. NULLS NOT DISTINCT (PG15+) so passport rows (related_document_id IS NULL)
-- dedupe to one per user; without it two NULLs count distinct and duplicate every profile update.
CREATE UNIQUE INDEX IF NOT EXISTS uq_personal_reminders_auto
  ON public.personal_reminders(user_id, reminder_type, related_document_id)
  NULLS NOT DISTINCT WHERE source <> 'manual';
CREATE INDEX IF NOT EXISTS idx_personal_reminders_user_date
  ON public.personal_reminders(user_id, target_date);

ALTER TABLE public.personal_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own personal reminders SELECT" ON public.personal_reminders;
CREATE POLICY "Own personal reminders SELECT" ON public.personal_reminders FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Own manual reminders INSERT" ON public.personal_reminders;
CREATE POLICY "Own manual reminders INSERT" ON public.personal_reminders FOR INSERT
  WITH CHECK (user_id = auth.uid() AND source = 'manual');

DROP POLICY IF EXISTS "Own personal reminders UPDATE" ON public.personal_reminders;
CREATE POLICY "Own personal reminders UPDATE" ON public.personal_reminders FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Own personal reminders DELETE" ON public.personal_reminders;
CREATE POLICY "Own personal reminders DELETE" ON public.personal_reminders FOR DELETE
  USING (user_id = auth.uid());
