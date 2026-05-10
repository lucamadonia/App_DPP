-- ================================================================
-- pg_cron jobs: read service-role JWT from Supabase Vault
-- Migration: 20260510_pgcron_use_vault.sql
--
-- Before this migration, the DHL tracking cron (and the freshly
-- minted Shopify sync cron) embedded the raw service-role JWT in the
-- cron.job.command column — readable by anyone with admin DB access.
--
-- This migration drops the offending jobs and recreates them with a
-- vault.decrypted_secrets lookup, so the JWT lives only in vault.
-- The vault secret named 'service_role_jwt' must already be present
-- (bootstrapped via Management API; never committed to git).
--
-- Idempotent: cron.unschedule is safe to call on missing jobs only via
-- a guard. Re-running this migration replaces the jobs unconditionally.
-- ================================================================

-- Sanity: secret must exist before we can wire the crons to it.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_jwt'
    ) THEN
        RAISE EXCEPTION 'Vault secret "service_role_jwt" not found. Bootstrap it first via Management API.';
    END IF;
END $$;

-- ─── Drop existing jobs we want to replace ───
DO $$
DECLARE
    j RECORD;
BEGIN
    FOR j IN
        SELECT jobid, jobname FROM cron.job
        WHERE jobname IN ('dhl-tracking-poll', 'commerce-shopify-sync')
    LOOP
        PERFORM cron.unschedule(j.jobid);
    END LOOP;
END $$;

-- ─── DHL: 3x daily at 00:00 / 08:00 / 16:00 UTC ───
SELECT cron.schedule(
    'dhl-tracking-poll',
    '0 0,8,16 * * *',
    $cron$
        SELECT net.http_post(
            url := 'https://xbnybrqzsjlbieqlwsas.supabase.co/functions/v1/dhl-shipping',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (
                    SELECT decrypted_secret FROM vault.decrypted_secrets
                    WHERE name = 'service_role_jwt' LIMIT 1
                )
            ),
            body := '{"action":"poll_all_tenants_cron"}'::jsonb
        ) AS request_id;
    $cron$
);

-- ─── Shopify: every 15 min, polls every tenant with auto_sync_enabled ───
SELECT cron.schedule(
    'commerce-shopify-sync',
    '*/15 * * * *',
    $cron$
        SELECT net.http_post(
            url := 'https://xbnybrqzsjlbieqlwsas.supabase.co/functions/v1/shopify-sync',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (
                    SELECT decrypted_secret FROM vault.decrypted_secrets
                    WHERE name = 'service_role_jwt' LIMIT 1
                )
            ),
            body := '{"action":"cron_sync_all_tenants"}'::jsonb
        ) AS request_id;
    $cron$
);
