-- ================================================================
-- pg_cron: poll DHL tracking for RETURN parcels
-- Migration: 20260617b_returns_tracking_cron.sql
--
-- Mirror of the 'dhl-tracking-poll' job (20260510_pgcron_use_vault.sql)
-- but for returns: calls dhl-shipping with poll_returns_tracking_cron.
-- Runs 3x daily at 01:00 / 09:00 / 17:00 UTC (offset 1h from the outbound
-- shipment poll so the two don't hammer the DHL API at the same minute).
-- Reads the service-role JWT from Supabase Vault (never committed).
-- ================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_jwt'
    ) THEN
        RAISE EXCEPTION 'Vault secret "service_role_jwt" not found. Bootstrap it first via Management API.';
    END IF;
END $$;

-- Replace any existing job of the same name (idempotent re-run).
DO $$
DECLARE
    j RECORD;
BEGIN
    FOR j IN SELECT jobid FROM cron.job WHERE jobname = 'returns-tracking-poll'
    LOOP
        PERFORM cron.unschedule(j.jobid);
    END LOOP;
END $$;

SELECT cron.schedule(
    'returns-tracking-poll',
    '0 1,9,17 * * *',
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
            body := '{"action":"poll_returns_tracking_cron"}'::jsonb
        ) AS request_id;
    $cron$
);
