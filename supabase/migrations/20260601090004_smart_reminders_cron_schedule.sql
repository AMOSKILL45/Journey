-- Phase 4D: run smart_reminders_cron at 08:00 and 18:00 UTC. Secret + URL come from Vault.
-- Named schedule = idempotent upsert (pg_cron 1.6).
SELECT cron.schedule(
  'smart_reminders_cron',
  '0 8,18 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'smart_reminders_cron_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'send_push_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
