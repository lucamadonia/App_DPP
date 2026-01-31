-- ============================================
-- Migration: Users, Invitations & Storage Policies
-- ============================================
-- Fixes:
-- 1. Adds missing columns to profiles (status, last_login, invited_by, invited_at)
-- 2. Creates invitations table with RLS
-- 3. Adds admin RLS policies for managing other users' profiles
-- 4. Recreates storage policies for branding bucket (fixes upload permission error)
-- ============================================
-- Run this in the Supabase SQL Editor AFTER schema.sql
-- ============================================

-- ============================================
-- 1. PROFILES: Add missing columns
-- ============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- Set all existing profiles to 'active' if status is NULL
UPDATE profiles SET status = 'active' WHERE status IS NULL;

-- ============================================
-- 2. INVITATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'editor', 'viewer')),
    name TEXT,
    message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    invited_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
    UNIQUE(tenant_id, email, status)
);

CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- Enable RLS
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Invitations policies
DROP POLICY IF EXISTS "Users can view invitations in their tenant" ON invitations;
CREATE POLICY "Users can view invitations in their tenant"
    ON invitations FOR SELECT
    USING (tenant_id = get_user_tenant_id());

DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
CREATE POLICY "Admins can create invitations"
    ON invitations FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can update invitations" ON invitations;
CREATE POLICY "Admins can update invitations"
    ON invitations FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
CREATE POLICY "Admins can delete invitations"
    ON invitations FOR DELETE
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================
-- 3. PROFILES: Admin policies for managing users
-- ============================================

-- Allow admins to view all profiles in their tenant (already exists, but ensure it)
-- The existing "Users can view profiles in their tenant" policy handles SELECT

-- Allow admins to update other users' profiles (role changes, deactivation)
DROP POLICY IF EXISTS "Admins can update profiles in their tenant" ON profiles;
CREATE POLICY "Admins can update profiles in their tenant"
    ON profiles FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to delete profiles in their tenant (remove user)
DROP POLICY IF EXISTS "Admins can delete profiles in their tenant" ON profiles;
CREATE POLICY "Admins can delete profiles in their tenant"
    ON profiles FOR DELETE
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Allow admins to insert new profiles (for invited users)
DROP POLICY IF EXISTS "Admins can insert profiles in their tenant" ON profiles;
CREATE POLICY "Admins can insert profiles in their tenant"
    ON profiles FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================
-- 4. STORAGE: Recreate branding bucket policies
-- ============================================

-- Ensure branding bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'branding',
    'branding',
    true,
    2097152, -- 2MB limit
    ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon', 'image/webp'];

-- Drop existing policies (if any) and recreate
DROP POLICY IF EXISTS "Public can view branding assets" ON storage.objects;
CREATE POLICY "Public can view branding assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Users can upload branding assets" ON storage.objects;
CREATE POLICY "Users can upload branding assets"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
);

DROP POLICY IF EXISTS "Users can update branding assets" ON storage.objects;
CREATE POLICY "Users can update branding assets"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
);

DROP POLICY IF EXISTS "Users can delete branding assets" ON storage.objects;
CREATE POLICY "Users can delete branding assets"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'branding'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
);

-- ============================================
-- 5. STORAGE: Ensure other bucket policies exist too
-- ============================================

-- Documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    52428800,
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can view own tenant documents" ON storage.objects;
CREATE POLICY "Users can view own tenant documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can upload to own tenant folder" ON storage.objects;
CREATE POLICY "Users can upload to own tenant folder"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
);

DROP POLICY IF EXISTS "Users can delete own tenant documents" ON storage.objects;
CREATE POLICY "Users can delete own tenant documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
);

-- Product images bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Users can upload product images" ON storage.objects;
CREATE POLICY "Users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
);

DROP POLICY IF EXISTS "Users can update product images" ON storage.objects;
CREATE POLICY "Users can update product images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
);

DROP POLICY IF EXISTS "Users can delete product images" ON storage.objects;
CREATE POLICY "Users can delete product images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
);

-- ============================================
-- DONE
-- ============================================
SELECT 'Migration erfolgreich! Profiles erweitert, Invitations-Tabelle erstellt, Storage-Policies aktualisiert.' AS status;
