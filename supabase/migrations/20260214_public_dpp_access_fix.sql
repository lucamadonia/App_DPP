-- Fix public DPP access: batches, tenants, and product_images need proper public SELECT policies.
-- Without these, unauthenticated QR code scans (or admins from other tenants) can't view products.

-- 1. product_batches: old policy was anon-only and required status='active'/'live'.
--    All batches are currently 'draft', so nobody external could see them.
DROP POLICY IF EXISTS "Public can view batches for DPP" ON product_batches;
CREATE POLICY "Public can view batches for DPP"
    ON product_batches FOR SELECT
    TO public
    USING (true);

-- 2. tenants: old policy was anon-only. Authenticated users from other tenants
--    couldn't load DPP design or QR settings.
DROP POLICY IF EXISTS "Public can read tenants for DPP" ON tenants;
CREATE POLICY "Public can read tenants for DPP"
    ON tenants FOR SELECT
    TO public
    USING (true);

-- 3. product_images: had no public policy at all. Product images were invisible
--    to anyone not in the same tenant.
CREATE POLICY "Public can view product images for DPP"
    ON product_images FOR SELECT
    TO public
    USING (true);
