-- Phase 4C: push infra. Tokens + generic notifications hub + event triggers + webhook to send_push.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token      text NOT NULL,
  platform   text NOT NULL CHECK (platform IN ('ios','android')),
  timezone   text,
  device_id  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user ON public.user_push_tokens(user_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   text NOT NULL,
  title      text NOT NULL,
  body       text NOT NULL,
  data       jsonb NOT NULL DEFAULT '{}',
  read_at    timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own tokens" ON public.user_push_tokens FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Own notifications SELECT" ON public.notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "Own notifications UPDATE" ON public.notifications FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own notifications DELETE" ON public.notifications FOR DELETE
  USING (user_id = auth.uid());
-- No INSERT policy: only SECURITY DEFINER triggers / service-role insert (anti-spam).

-- send_push verifies its x-webhook-secret header by asking this RPC (never exposes the secret).
CREATE OR REPLACE FUNCTION public.verify_webhook_secret(candidate text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'send_push_secret' AND decrypted_secret = candidate
  );
$$;
REVOKE EXECUTE ON FUNCTION public.verify_webhook_secret(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_webhook_secret(text) TO service_role;

-- Webhook: every inserted notification -> send_push (url/secret/anon from Vault; no-op if unset).
CREATE OR REPLACE FUNCTION public.notify_send_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE fn_url text; secret text; anon text;
BEGIN
  SELECT decrypted_secret INTO fn_url FROM vault.decrypted_secrets WHERE name = 'send_push_url';
  SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name = 'send_push_secret';
  SELECT decrypted_secret INTO anon  FROM vault.decrypted_secrets WHERE name = 'send_push_anon';
  IF fn_url IS NULL OR secret IS NULL THEN
    RETURN NEW; -- not configured: in-app notification still created, push skipped (no dead-end)
  END IF;
  PERFORM net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || COALESCE(anon, ''),
      'x-webhook-secret', secret
    ),
    body := jsonb_build_object('record', to_jsonb(NEW))
  );
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_send_push() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_notification_created AFTER INSERT ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.notify_send_push();

-- Event -> notification: trip member joined (one row per other member).
CREATE OR REPLACE FUNCTION public.notify_trip_join() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, category, title, body, data)
  SELECT m.user_id, 'join', 'New traveler', 'Someone joined your trip.',
         jsonb_build_object('tripId', NEW.trip_id)
  FROM public.trip_members m
  WHERE m.trip_id = NEW.trip_id AND m.user_id <> NEW.user_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_trip_join() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_trip_member_added AFTER INSERT ON public.trip_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_trip_join();

-- Event -> notification: check-in (one row per other member of the milestone's trip).
CREATE OR REPLACE FUNCTION public.notify_checkin() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_trip uuid;
BEGIN
  SELECT trip_id INTO v_trip FROM public.milestones WHERE id = NEW.milestone_id;
  IF v_trip IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.notifications (user_id, category, title, body, data)
  SELECT m.user_id, 'friends_checkin', 'Check-in', 'A traveler checked in.',
         jsonb_build_object('tripId', v_trip, 'milestoneId', NEW.milestone_id)
  FROM public.trip_members m
  WHERE m.trip_id = v_trip AND m.user_id <> NEW.user_id;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.notify_checkin() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_checkin_created AFTER INSERT ON public.checkins
  FOR EACH ROW EXECUTE FUNCTION public.notify_checkin();
