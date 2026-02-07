-- Migration: Allow anon SELECT on rh_email_templates
-- Created: 2026-02-12
-- Description: Public portal needs to read email templates to render notification emails
--              when a return is created via the public return registration wizard.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'rh_email_templates' AND policyname = 'rh_email_templates_anon_select'
    ) THEN
        CREATE POLICY "rh_email_templates_anon_select"
        ON rh_email_templates
        FOR SELECT
        TO anon
        USING (true);
    END IF;
END $$;
