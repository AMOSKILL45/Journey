-- Phase 4E: run personal_reminders_cron daily at 09:00 UTC. Named schedule = idempotent upsert.
SELECT cron.schedule(
  'personal_reminders_cron',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'personal_reminders_cron_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'send_push_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
