-- 3-stage tracking hero: separate banner per shipment lifecycle stage.
--   stage-1 → order received (cart with products)
--   stage-2 → being packed (products entering parcel)
--   stage-3 → shipped / in transit / delivered (3-act journey w/ DHL van)
--
-- Stored at tenants.settings.branding.trackingHeroUrls.{stage1,stage2,stage3}.
-- Legacy trackingHeroUrl (single URL) stays in place as the unstaged fallback
-- so older clients still render something.

DROP FUNCTION IF EXISTS get_public_tenant_branding_by_token(TEXT);

CREATE OR REPLACE FUNCTION get_public_tenant_branding_by_token(p_token TEXT)
RETURNS TABLE (
  tenant_id              UUID,
  tenant_name            TEXT,
  tenant_slug            TEXT,
  primary_color          TEXT,
  logo_url               TEXT,
  app_name               TEXT,
  support_email          TEXT,
  tracking_hero_url      TEXT,
  tracking_hero_stage_1  TEXT,
  tracking_hero_stage_2  TEXT,
  tracking_hero_stage_3  TEXT
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
    t.settings->'branding'->>'trackingHeroUrl' AS tracking_hero_url,
    t.settings->'branding'->'trackingHeroUrls'->>'stage1' AS tracking_hero_stage_1,
    t.settings->'branding'->'trackingHeroUrls'->>'stage2' AS tracking_hero_stage_2,
    t.settings->'branding'->'trackingHeroUrls'->>'stage3' AS tracking_hero_stage_3
  FROM wh_shipments s
  JOIN tenants t ON t.id = s.tenant_id
  WHERE s.tracking_token = p_token
    AND s.tracking_token IS NOT NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_public_tenant_branding_by_token(TEXT) TO anon, authenticated;

-- Seed: Fambliss tenant — set all 3 stage URLs.
UPDATE tenants
SET settings = jsonb_set(
  COALESCE(settings, '{}'::jsonb),
  '{branding,trackingHeroUrls}',
  jsonb_build_object(
    'stage1', 'https://xbnybrqzsjlbieqlwsas.supabase.co/storage/v1/object/public/branding/522f6254-f73c-4a26-b1e9-662035194bc5/tracking-hero-stage-1.png',
    'stage2', 'https://xbnybrqzsjlbieqlwsas.supabase.co/storage/v1/object/public/branding/522f6254-f73c-4a26-b1e9-662035194bc5/tracking-hero-stage-2.png',
    'stage3', 'https://xbnybrqzsjlbieqlwsas.supabase.co/storage/v1/object/public/branding/522f6254-f73c-4a26-b1e9-662035194bc5/tracking-hero-stage-3.png'
  ),
  true
)
WHERE id = '522f6254-f73c-4a26-b1e9-662035194bc5';
