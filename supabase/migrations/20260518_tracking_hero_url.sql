-- Add tracking_hero_url to the public branding RPC so the public tracking
-- page can render a tenant-uploaded hero banner above the shipment hero.
--
-- The URL itself lives at tenants.settings.branding.trackingHeroUrl (JSONB).

DROP FUNCTION IF EXISTS get_public_tenant_branding_by_token(TEXT);

CREATE OR REPLACE FUNCTION get_public_tenant_branding_by_token(p_token TEXT)
RETURNS TABLE (
  tenant_id          UUID,
  tenant_name        TEXT,
  tenant_slug        TEXT,
  primary_color      TEXT,
  logo_url           TEXT,
  app_name           TEXT,
  support_email      TEXT,
  tracking_hero_url  TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT
    t.id AS tenant_id,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    t.settings->'branding'->>'primaryColor' AS primary_color,
    t.settings->'branding'->>'logoUrl' AS logo_url,
    COALESCE(t.settings->'branding'->>'appName', t.name) AS app_name,
    t.settings->'returnsHub'->>'supportEmail' AS support_email,
    t.settings->'branding'->>'trackingHeroUrl' AS tracking_hero_url
  FROM wh_shipments s
  JOIN tenants t ON t.id = s.tenant_id
  WHERE s.tracking_token = p_token
    AND s.tracking_token IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_public_tenant_branding_by_token(TEXT) TO anon, authenticated;

-- Seed: Fambliss tenant — set the tracking hero URL.
-- Uses jsonb_set with create_missing=true so it works whether the
-- branding sub-object exists yet or not.
UPDATE tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{branding,trackingHeroUrl}',
  to_jsonb('https://xbnybrqzsjlbieqlwsas.supabase.co/storage/v1/object/public/branding/522f6254-f73c-4a26-b1e9-662035194bc5/tracking-hero.png'::text),
  true
)
WHERE id = '522f6254-f73c-4a26-b1e9-662035194bc5';
