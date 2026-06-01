-- Phase 4E: when passport_expires_at is set/changed AND the user opted in, upsert a passport reminder.
-- Opt-in lives in profiles.preferences->'reminders'->>'passportAutoReminder' (default true).
CREATE OR REPLACE FUNCTION public.upsert_passport_reminder() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.passport_expires_at IS NULL THEN RETURN NEW; END IF;
  IF COALESCE((NEW.preferences->'reminders'->>'passportAutoReminder')::boolean, true) = false THEN
    RETURN NEW;
  END IF;

  UPDATE public.personal_reminders
     SET target_date = NEW.passport_expires_at, status = 'active', updated_at = now()
   WHERE user_id = NEW.id AND reminder_type = 'passport_expiry' AND source = 'auto_passport';

  IF NOT FOUND THEN
    INSERT INTO public.personal_reminders
      (user_id, reminder_type, target_date, i18n_key, lead_times, source)
    VALUES
      (NEW.id, 'passport_expiry', NEW.passport_expires_at,
       'lifeReminders.types.passport_expiry', '{180,90,30,7}', 'auto_passport');
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.upsert_passport_reminder() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_passport_expiry_set ON public.profiles;
CREATE TRIGGER on_passport_expiry_set
  AFTER INSERT OR UPDATE OF passport_expires_at ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.upsert_passport_reminder();
