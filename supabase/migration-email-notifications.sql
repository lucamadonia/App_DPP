-- ============================================
-- Returns Hub - Email Notifications Migration
-- ============================================
-- Creates rh_email_templates table + RLS policies
-- Run this in your Supabase SQL Editor
-- ============================================

-- Email Templates (tenant-scoped)
CREATE TABLE IF NOT EXISTS rh_email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    enabled BOOLEAN DEFAULT true,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, event_type)
);

-- Add recipient_email column to rh_notifications if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'rh_notifications' AND column_name = 'recipient_email'
    ) THEN
        ALTER TABLE rh_notifications ADD COLUMN recipient_email TEXT;
    END IF;
END $$;

-- ============================================
-- RLS Policies for rh_email_templates
-- ============================================
ALTER TABLE rh_email_templates ENABLE ROW LEVEL SECURITY;

-- Tenant users can read their own templates
CREATE POLICY "rh_email_templates_select" ON rh_email_templates
    FOR SELECT USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- Tenant users can insert templates for their tenant
CREATE POLICY "rh_email_templates_insert" ON rh_email_templates
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- Tenant users can update their own templates
CREATE POLICY "rh_email_templates_update" ON rh_email_templates
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- Tenant users can delete their own templates
CREATE POLICY "rh_email_templates_delete" ON rh_email_templates
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    );

-- ============================================
-- RLS Policy for anon INSERT on rh_notifications
-- (Public Portal can create notifications)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'rh_notifications' AND policyname = 'rh_notifications_anon_insert'
    ) THEN
        CREATE POLICY "rh_notifications_anon_insert" ON rh_notifications
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_rh_email_templates_tenant ON rh_email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rh_email_templates_event ON rh_email_templates(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_rh_notifications_status ON rh_notifications(status) WHERE status = 'pending';
