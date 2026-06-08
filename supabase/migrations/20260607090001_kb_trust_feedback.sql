-- KB trust & collaborative feedback (2026-06-07).
-- See docs/superpowers/specs/2026-06-07-journey-kb-trust-feedback-design.md.

-- D1: `verified` is now a trust BADGE, not a visibility gate — open public read to all rows.
DROP POLICY IF EXISTS "Read country_requirements" ON public.country_requirements;
CREATE POLICY "Read country_requirements" ON public.country_requirements
  FOR SELECT USING (true);

-- D2: denormalized live report count (bumped by the trigger below; surfaced via Realtime).
ALTER TABLE public.country_requirements
  ADD COLUMN IF NOT EXISTS report_count integer NOT NULL DEFAULT 0;

-- D3: dedicated KB rule reports (freshness signals; NOT the Phase-9 user/content `reports` table).
CREATE TABLE IF NOT EXISTS public.kb_rule_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id     text NOT NULL REFERENCES public.country_requirements(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason      text NOT NULL CHECK (reason IN ('outdated', 'incorrect', 'other')),
  details     text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_id, reporter_id)
);
ALTER TABLE public.kb_rule_reports ENABLE ROW LEVEL SECURITY;
-- Insert/select own only. The aggregate count is exposed publicly via country_requirements.report_count.
DROP POLICY IF EXISTS "kb_rule_reports insert own" ON public.kb_rule_reports;
CREATE POLICY "kb_rule_reports insert own" ON public.kb_rule_reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());
DROP POLICY IF EXISTS "kb_rule_reports select own" ON public.kb_rule_reports;
CREATE POLICY "kb_rule_reports select own" ON public.kb_rule_reports
  FOR SELECT USING (reporter_id = auth.uid());

-- Denormalize the count onto the parent rule (the public, Realtime-published number).
CREATE OR REPLACE FUNCTION public._bump_kb_report_count()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.country_requirements
    SET report_count = report_count + 1
    WHERE id = NEW.rule_id;
  RETURN NEW;
END;
$$;
-- Grant-harden: not callable as an RPC (the trigger still fires regardless).
REVOKE EXECUTE ON FUNCTION public._bump_kb_report_count() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_kb_report_count ON public.kb_rule_reports;
CREATE TRIGGER trg_kb_report_count AFTER INSERT ON public.kb_rule_reports
  FOR EACH ROW EXECUTE FUNCTION public._bump_kb_report_count();

-- Realtime: publish country_requirements so clients live-update report_count (count is public).
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'country_requirements'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.country_requirements;
  END IF;
END $$;
