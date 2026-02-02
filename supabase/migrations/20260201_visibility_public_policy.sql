-- Allow public (unauthenticated) access to visibility_settings for DPP public pages.
-- Without this policy, getPublicVisibilitySettings() silently fails and always
-- falls back to defaults, making user-configured visibility settings ineffective
-- on public product pages.

CREATE POLICY "Public can view visibility settings for DPP"
    ON visibility_settings FOR SELECT
    USING (true);
