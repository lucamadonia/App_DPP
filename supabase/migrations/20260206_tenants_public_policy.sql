-- Migration: Add public read access to tenants table for DPP pages
-- Date: 2026-02-06
-- Purpose: Allow unauthenticated users to view QR codes and public product pages
--          This fixes critical bug where printed QR codes show "Product not Found"

-- Add public read policy for tenants table
-- This allows anonymous users to read tenant settings for branding/design on public DPP pages
CREATE POLICY "Public can read tenants for DPP"
    ON tenants FOR SELECT
    TO anon  -- Only for anonymous (unauthenticated) users
    USING (true);  -- All tenants readable for public DPP access

-- Note: This is safe because:
-- 1. Only SELECT access (no INSERT/UPDATE/DELETE)
-- 2. Only for 'anon' role (unauthenticated users)
-- 3. Authenticated users still use their restrictive policies
-- 4. Tenant settings contain only public branding/design data
-- 5. No sensitive data (API keys, etc.) exposed in settings JSONB
