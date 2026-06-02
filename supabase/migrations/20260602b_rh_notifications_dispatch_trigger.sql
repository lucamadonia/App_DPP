-- =============================================================================
-- Migration: rh_notifications server-side dispatch trigger
-- Date: 2026-06-02 (suffix b)
--
-- Problem: Trackbliss customer mails sat 'pending' forever — the send was
-- triggered client-side (browser) but neither the Family-Joy mail-event-receiver
-- nor the local send-email function accept browser calls (no CORS). Server-created
-- rows (e.g. shipment_label_ready from dhl-shipping) had no trigger at all.
--
-- Fix: an AFTER INSERT trigger forwards every new pending email notification
-- server-to-server to the notify-dispatch edge function, which routes per tenant
-- (Fambliss → Family-Joy passthrough, others → local send-email/SMTP) and updates
-- the row status. Same proven pg_net + vault pattern as the engagement/DHL crons.
--
-- Prerequisites:
--   1. Edge Function notify-dispatch deployed:
--        supabase functions deploy notify-dispatch --project-ref xbnybrqzsjlbieqlwsas
--   2. Vault secret 'service_role_jwt' bootstrapped (already done for the
--      DHL/Shopify/engagement crons — see 20260510_pgcron_use_vault.sql).
--
-- Only fires for NEW inserts — the existing 'pending' backlog is NOT auto-sent.
-- Idempotent: re-running replaces the function + trigger.
-- =============================================================================

-- Sanity: vault secret must exist.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_jwt') THEN
        RAISE EXCEPTION 'Vault secret "service_role_jwt" not found. Bootstrap it before running this migration.';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION rh_notifications_dispatch()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only outbound email rows awaiting delivery. net.http_post is async, so it
    -- never blocks the INSERT. notify-dispatch flips status to sent/failed.
    IF NEW.channel = 'email' AND NEW.status = 'pending' THEN
        PERFORM net.http_post(
            url := 'https://xbnybrqzsjlbieqlwsas.supabase.co/functions/v1/notify-dispatch',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || (
                    SELECT decrypted_secret FROM vault.decrypted_secrets
                    WHERE name = 'service_role_jwt' LIMIT 1
                )
            ),
            body := jsonb_build_object('notificationId', NEW.id)
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rh_notifications_dispatch ON rh_notifications;
CREATE TRIGGER trg_rh_notifications_dispatch
    AFTER INSERT ON rh_notifications
    FOR EACH ROW
    EXECUTE FUNCTION rh_notifications_dispatch();

-- =============================================================================
-- Verification:
--   -- Trigger present:
--   SELECT tgname FROM pg_trigger WHERE tgrelid = 'rh_notifications'::regclass AND NOT tgisinternal;
--
--   -- After a test send (e.g. "Kunde kontaktieren" to your own address):
--   SELECT id, template, recipient_email, status, created_at
--   FROM rh_notifications ORDER BY created_at DESC LIMIT 5;   -- expect status='sent'
--
--   -- pg_net response of the dispatch call:
--   SELECT id, status_code, content FROM net._http_response ORDER BY id DESC LIMIT 5;
--
--   -- On Family-Joy: SELECT trigger_event, recipient_email, status FROM email_send_log ORDER BY created_at DESC LIMIT 5;
-- =============================================================================
