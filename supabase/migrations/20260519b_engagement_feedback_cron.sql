-- =============================================================================
-- Migration: Engagement Feedback Cron (Day-7 feedback_request mails)
-- Date: 2026-05-19 (suffix b — second migration of the day)
--
-- Description:
--   Schedules a pg_cron job that hits the engagement-mail-cron Edge Function
--   daily at 09:00 UTC. The Edge Function:
--     1. Finds wh_shipments where delivered_at falls inside the UTC day exactly
--        7 days ago,
--     2. Filters by tenants with the feedback_starter module active,
--     3. Creates feedback_requests rows (one per variant) per shipment, and
--     4. POSTs a feedback_request event to Family-Joy mail-event-receiver,
--        which renders the existing 30KB feedback_request template and sends
--        the mail via SMTP.
--
--   Until this migration ran, the only path that fired feedback_request mails
--   was a manual admin click. Now Day-7 mails go out automatically.
--
-- Prerequisites:
--   1. Edge Function engagement-mail-cron deployed:
--        supabase functions deploy engagement-mail-cron --project-ref xbnybrqzsjlbieqlwsas
--   2. Edge Function secrets configured (Dashboard → Edge Functions → Secrets):
--        MAIL_HUB_URL    = https://bkaaepzqejzdczivquoh.supabase.co/functions/v1/mail-event-receiver
--        MAIL_HUB_SECRET = <same hex value as Family-Joy MAIL_EVENT_RECEIVER_SECRET>
--   3. Vault secret 'service_role_jwt' already bootstrapped (was set up for
--      the DHL + Shopify crons — see 20260510_pgcron_use_vault.sql).
--
-- Idempotent: re-running this migration unschedules and re-creates the job.
-- =============================================================================

-- Sanity: vault secret must exist before we can wire the cron to it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_jwt'
    ) THEN
        RAISE EXCEPTION 'Vault secret "service_role_jwt" not found. Bootstrap it via Management API before running this migration.';
    END IF;
END $$;

-- Drop existing job if present (allow re-runs).
DO $$
DECLARE
    j RECORD;
BEGIN
    FOR j IN
        SELECT jobid FROM cron.job WHERE jobname = 'engagement-feedback-day-7'
    LOOP
        PERFORM cron.unschedule(j.jobid);
    END LOOP;
END $$;

-- ─── Engagement Feedback (Day-7): daily at 09:00 UTC ───
SELECT cron.schedule(
    'engagement-feedback-day-7',
    '0 9 * * *',
    $cron$
        SELECT net.http_post(
            url := 'https://xbnybrqzsjlbieqlwsas.supabase.co/functions/v1/engagement-mail-cron',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (
                    SELECT decrypted_secret FROM vault.decrypted_secrets
                    WHERE name = 'service_role_jwt' LIMIT 1
                )
            ),
            body := '{"action":"fire_feedback_day_7"}'::jsonb
        ) AS request_id;
    $cron$
);

-- =============================================================================
-- Verification:
--
--   SELECT jobid, jobname, schedule, active
--   FROM cron.job WHERE jobname = 'engagement-feedback-day-7';
--   -- expect: one row, schedule = '0 9 * * *', active = true
--
--   -- Manually trigger (no need to wait until 09:00 UTC):
--   SELECT net.http_post(
--     url := 'https://xbnybrqzsjlbieqlwsas.supabase.co/functions/v1/engagement-mail-cron',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_jwt' LIMIT 1)
--     ),
--     body := '{"action":"fire_feedback_day_7"}'::jsonb
--   ) AS request_id;
--
--   -- After a run, check on Family-Joy:
--   SELECT trigger_event, recipient_email, status, created_at
--   FROM email_send_log
--   WHERE trigger_event = 'feedback_request'
--   ORDER BY created_at DESC LIMIT 10;
-- =============================================================================
