-- =============================================================================
-- Migration: Fambliss+ Welcome Mail Trigger (after email confirmation)
-- Date: 2026-05-21
--
-- Description:
--   Fires `fambliss_plus.welcome` to the central mail-hub the first time a
--   user confirms their email address. The trigger watches auth.users for
--   UPDATEs where email_confirmed_at transitions from NULL → NOT NULL, then
--   POSTs an HMAC-signed envelope to Family-Joy's mail-event-receiver via
--   pg_net.http_post. Both pg_net and pgcrypto are required.
--
--   The HMAC secret is read from vault.decrypted_secrets (name:
--   'mail_hub_secret') so we never embed it in source. The receiver
--   URL is read from vault.decrypted_secrets (name: 'mail_hub_url'),
--   falling back to the production URL if absent.
--
-- ─── MANUAL STEPS (must run on Supabase before applying this migration) ───
--
--   1. Ensure pg_net + pgcrypto extensions are enabled:
--        CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
--        CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
--
--   2. Bootstrap the vault secrets (Management API or Dashboard → Vault):
--        SELECT vault.create_secret(
--          '<same hex value as Family-Joy MAIL_EVENT_RECEIVER_SECRET>',
--          'mail_hub_secret'
--        );
--        SELECT vault.create_secret(
--          'https://bkaaepzqejzdczivquoh.supabase.co/functions/v1/mail-event-receiver',
--          'mail_hub_url'
--        );
--
-- Apply via:
--   - Dashboard → SQL Editor (run the whole file), or
--   - supabase db push (if migrations are wired to the project)
--
-- Idempotent: re-running drops + recreates the trigger and function.
-- =============================================================================

-- ─── Sanity: required extensions ────────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN
        RAISE EXCEPTION
            'pg_net extension not installed. Run: CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto') THEN
        RAISE EXCEPTION
            'pgcrypto extension not installed. Run: CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;';
    END IF;
END $$;

-- ─── Sanity: vault secret must exist ────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'mail_hub_secret') THEN
        RAISE EXCEPTION
            'Vault secret "mail_hub_secret" not found. Bootstrap it before applying this migration. '
            'It must equal Family-Joy MAIL_EVENT_RECEIVER_SECRET.';
    END IF;
END $$;

-- ─── Function: fire welcome mail on first email confirmation ────────────────
CREATE OR REPLACE FUNCTION public.fambliss_plus_fire_welcome_mail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
    v_url            text;
    v_secret         text;
    v_first_name     text;
    v_portal_url     text;
    v_body           text;
    v_signature      text;
    v_first_steps    text;
BEGIN
    -- Resolve secret + URL from vault. URL is optional; secret is required.
    SELECT decrypted_secret INTO v_secret
      FROM vault.decrypted_secrets WHERE name = 'mail_hub_secret' LIMIT 1;
    IF v_secret IS NULL OR length(v_secret) = 0 THEN
        RAISE WARNING 'fambliss_plus_fire_welcome_mail: mail_hub_secret missing — skipping';
        RETURN NEW;
    END IF;

    SELECT decrypted_secret INTO v_url
      FROM vault.decrypted_secrets WHERE name = 'mail_hub_url' LIMIT 1;
    IF v_url IS NULL OR length(v_url) = 0 THEN
        v_url := 'https://bkaaepzqejzdczivquoh.supabase.co/functions/v1/mail-event-receiver';
    END IF;

    -- Extract first name from raw_user_meta_data; gracefully fall back.
    v_first_name := COALESCE(
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'firstName',
        split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), ' ', 1),
        ''
    );

    v_portal_url := 'https://app.fambliss.eu';

    -- Onboarding hint list (HTML <ul>); the template can <ul>{{first_steps}}</ul>.
    v_first_steps := concat(
        '<li>Vervollständige dein Profil im Account-Bereich</li>',
        '<li>Verbinde deinen Shop (Shopify, WooCommerce o.&nbsp;ä.)</li>',
        '<li>Importiere deine ersten Produkte für die DPP-Konformität</li>',
        '<li>Lade deine Marken-Assets hoch und starte die erste Sendung</li>'
    );

    -- Build the receiver envelope. Field names mirror PostToMailHubArgs in
    -- supabase/functions/_shared/mail-hub.ts so the receiver contract stays
    -- canonical across all callers.
    v_body := jsonb_build_object(
        'eventType',       'fambliss_plus.welcome',
        'source',          'fambliss-plus',
        'sourceEventId',   concat('fambliss_plus.welcome:', NEW.id::text),
        'recipientEmail',  NEW.email,
        'language',        CASE
                              WHEN COALESCE(NEW.raw_user_meta_data->>'locale', 'de') ILIKE 'en%' THEN 'en'
                              ELSE 'de'
                           END,
        'userType',        'fambliss_plus',
        'context',         jsonb_build_object(
            'customer_first_name', v_first_name,
            'portal_url',          v_portal_url,
            'first_steps',         v_first_steps
        ),
        'metadata',        jsonb_build_object(
            'user_id',       NEW.id,
            'trigger_source','postgres.auth.users.email_confirmed_at',
            'confirmed_at',  NEW.email_confirmed_at
        )
    )::text;

    -- HMAC-SHA256 hex over the raw JSON body. Matches the receiver's
    -- verifySignature() which accepts an optional "sha256=" prefix; we
    -- send the bare hex form.
    v_signature := encode(extensions.hmac(v_body, v_secret, 'sha256'), 'hex');

    -- Fire-and-forget POST. We do NOT await or surface the response —
    -- a failed mail must never block an email confirmation.
    PERFORM net.http_post(
        url     := v_url,
        headers := jsonb_build_object(
            'Content-Type',      'application/json',
            'X-Hook-Signature',  v_signature
        ),
        body    := v_body::jsonb
    );

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Hard guard: any error must NOT abort the auth UPDATE. Worst case
    -- the user just doesn't get a welcome mail (recoverable via manual fire).
    RAISE WARNING 'fambliss_plus_fire_welcome_mail failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- ─── Trigger wiring ────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS fambliss_plus_welcome_on_email_confirm ON auth.users;

CREATE TRIGGER fambliss_plus_welcome_on_email_confirm
    AFTER UPDATE OF email_confirmed_at ON auth.users
    FOR EACH ROW
    WHEN (
        OLD.email_confirmed_at IS NULL
        AND NEW.email_confirmed_at IS NOT NULL
    )
    EXECUTE FUNCTION public.fambliss_plus_fire_welcome_mail();

-- =============================================================================
-- Verification:
--
--   -- 1. Confirm the trigger exists:
--   SELECT tgname, tgrelid::regclass, tgenabled
--   FROM pg_trigger
--   WHERE tgname = 'fambliss_plus_welcome_on_email_confirm';
--
--   -- 2. Smoke test against a confirmed user (use a test mailbox!):
--   UPDATE auth.users
--      SET email_confirmed_at = NULL
--      WHERE id = '<test-user-uuid>'; -- temporary, only for the test
--   UPDATE auth.users
--      SET email_confirmed_at = now()
--      WHERE id = '<test-user-uuid>';
--   -- expect: a row in Family-Joy email_send_log with trigger_event = 'fambliss_plus.welcome'.
--
--   -- 3. Confirm pg_net delivered (Supabase Dashboard → Network Requests):
--   SELECT id, status_code, created
--   FROM net._http_response
--   ORDER BY created DESC LIMIT 5;
-- =============================================================================
