-- Migration: Allow anon INSERT + SELECT on rh_notifications
-- Created: 2026-02-07
-- Description: Public portal needs to create notification records and read back the ID

-- =====================================================
-- 1. Allow anon users to INSERT into rh_notifications
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'rh_notifications' AND policyname = 'Allow anon to create notifications'
    ) THEN
        CREATE POLICY "Allow anon to create notifications"
        ON rh_notifications
        FOR INSERT
        TO anon
        WITH CHECK (true);
    END IF;
END $$;

-- =====================================================
-- 2. Allow anon users to SELECT from rh_notifications (for .select('id') after insert)
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'rh_notifications' AND policyname = 'Allow anon to read own notifications'
    ) THEN
        CREATE POLICY "Allow anon to read own notifications"
        ON rh_notifications
        FOR SELECT
        TO anon
        USING (true);
    END IF;
END $$;
