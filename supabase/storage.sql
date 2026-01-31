-- ============================================
-- DPP Manager - Storage Buckets Setup
-- ============================================
-- Führen Sie dieses SQL im Supabase SQL Editor aus,
-- NACHDEM Sie schema.sql ausgeführt haben.
-- Dieses Script ist idempotent (kann mehrfach ausgeführt werden).
-- ============================================

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Documents bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- Product images bucket (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Branding bucket (public) - for logos, favicons, and other branding assets
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

-- ============================================
-- STORAGE POLICIES
-- ============================================
-- Using DROP IF EXISTS + CREATE for idempotent execution

-- Documents bucket policies

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

-- Product images bucket policies

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
-- BRANDING BUCKET POLICIES
-- ============================================

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
-- FERTIG
-- ============================================

SELECT 'Storage buckets und policies erfolgreich erstellt!' AS status;
