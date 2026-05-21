-- =============================================================================
-- Migration: Engagement day-1/14/30 + Trial-Ending pg_cron jobs
-- Date: 2026-05-21
--
-- Description:
--   Schedules four additional pg_cron jobs:
--     - engagement-day-1-daily       09:05 UTC → engagement.day_1
--     - engagement-day-14-daily      09:10 UTC → engagement.day_14
--     - engagement-day-30-daily      09:15 UTC → engagement.day_30
--     - trial-ending-daily           09:20 UTC → subscription.trial_ending
--
--   Day-1/14/15/30 jobs hit the existing engagement-mail-cron Edge Function
--   with action=fire_engagement_day_<N>. The function was extended in this
--   same change-set to handle the new actions.
--
--   trial-ending-daily hits the new trial-ending-cron Edge Function which
--   scans billing_subscriptions for `trial_end` in [now+3d, now+4d]. This
--   is a BACKUP path for Stripe's customer.subscription.trial_will_end —
--   both code paths use the SAME source_event_id pattern
--   (`trial_ending:<subscription_id>`) so the mail-hub receiver's dedup
--   guarantees exactly one mail per trial-end.
--
-- ─── MANUAL STEPS (must run before applying this migration) ────────────────
--
--   1. Deploy the Edge Functions:
--        supabase functions deploy engagement-mail-cron --project-ref xbnybrqzsjlbieqlwsas
--        supabase functions deploy trial-ending-cron     --project-ref xbnybrqzsjlbieqlwsas
--   2. Ensure Edge Function secrets are set (Dashboard → Edge Functions → Secrets):
--        MAIL_HUB_URL              — central receiver URL
--        MAIL_HUB_SECRET           — same as Family-Joy MAIL_EVENT_RECEIVER_SECRET
--        TRACKBLISS_PUBLIC_URL     — optional override
--        FAMBLISS_PLUS_PORTAL_URL  — optional override (defaults to https://app.fambliss.eu)
--        FAMBLISS_SHOP_URL         — optional override (defaults to https://shop.fambliss.de)
--   3. Vault secret 'service_role_jwt' must already be bootstrapped — was
--      set up for the DHL + Shopify + feedback crons (see
--      20260510_pgcron_use_vault.sql + 20260519b_engagement_feedback_cron.sql).
--
-- Idempotent: re-running unschedules + recreates the jobs.
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

-- Drop any existing jobs we own (allow re-runs).
DO $$
DECLARE
    j RECORD;
BEGIN
    FOR j IN
        SELECT jobid FROM cron.job
        WHERE jobname IN (
            'engagement-day-1-daily',
            'engagement-day-14-daily',
            'engagement-day-30-daily',
            'trial-ending-daily'
        )
    LOOP
        PERFORM cron.unschedule(j.jobid);
    END LOOP;
END $$;

-- ─── Engagement Day-1: every day at 09:05 UTC ────────────────────────────────
SELECT cron.schedule(
    'engagement-day-1-daily',
    '5 9 * * *',
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
            body := '{"action":"fire_engagement_day_1"}'::jsonb
        ) AS request_id;
    $cron$
);

-- ─── Engagement Day-14: every day at 09:10 UTC ───────────────────────────────
SELECT cron.schedule(
    'engagement-day-14-daily',
    '10 9 * * *',
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
            body := '{"action":"fire_engagement_day_14"}'::jsonb
        ) AS request_id;
    $cron$
);

-- ─── Engagement Day-30: every day at 09:15 UTC ───────────────────────────────
SELECT cron.schedule(
    'engagement-day-30-daily',
    '15 9 * * *',
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
            body := '{"action":"fire_engagement_day_30"}'::jsonb
        ) AS request_id;
    $cron$
);

-- ─── Trial-Ending: every day at 09:20 UTC ────────────────────────────────────
SELECT cron.schedule(
    'trial-ending-daily',
    '20 9 * * *',
    $cron$
        SELECT net.http_post(
            url := 'https://xbnybrqzsjlbieqlwsas.supabase.co/functions/v1/trial-ending-cron',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (
                    SELECT decrypted_secret FROM vault.decrypted_secrets
                    WHERE name = 'service_role_jwt' LIMIT 1
                )
            ),
            body := '{}'::jsonb
        ) AS request_id;
    $cron$
);

-- =============================================================================
-- Verification:
--
--   -- 1. Confirm all four jobs are scheduled and active:
--   SELECT jobname, schedule, active
--   FROM cron.job
--   WHERE jobname IN (
--     'engagement-day-1-daily',
--     'engagement-day-14-daily',
--     'engagement-day-30-daily',
--     'trial-ending-daily'
--   )
--   ORDER BY jobname;
--
--   -- 2. Manually trigger an engagement run (without waiting for cron):
--   SELECT net.http_post(
--     url := 'https://xbnybrqzsjlbieqlwsas.supabase.co/functions/v1/engagement-mail-cron',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_jwt' LIMIT 1)
--     ),
--     body := '{"action":"fire_engagement_day_1"}'::jsonb
--   ) AS request_id;
--
--   -- 3. Manually trigger trial-ending:
--   SELECT net.http_post(
--     url := 'https://xbnybrqzsjlbieqlwsas.supabase.co/functions/v1/trial-ending-cron',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_jwt' LIMIT 1)
--     ),
--     body := '{}'::jsonb
--   ) AS request_id;
--
--   -- 4. After runs, verify mails landed on Family-Joy:
--   SELECT trigger_event, recipient_email, status, created_at
--   FROM email_send_log
--   WHERE trigger_event IN (
--     'engagement.day_1','engagement.day_14','engagement.day_30','subscription.trial_ending'
--   )
--   ORDER BY created_at DESC LIMIT 20;
-- =============================================================================
