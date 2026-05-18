-- Public tenant products with gallery fallback for the Returns Hub wizard.
--
-- publicGetTenantProducts in src/services/supabase/returns.ts was reading
-- products.image_url directly, which is empty for tenants (like Fambliss)
-- that manage images through the product_images gallery. Wrap the lookup
-- in a SECURITY DEFINER RPC that falls back to the primary gallery image,
-- then the lowest sort_order gallery image, then the legacy image_url.

CREATE OR REPLACE FUNCTION get_public_tenant_products(p_tenant_slug TEXT)
RETURNS TABLE (
  id         UUID,
  name       TEXT,
  gtin       TEXT,
  image_url  TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT
    p.id,
    p.name,
    p.gtin,
    COALESCE(
      -- primary gallery image
      (SELECT url FROM product_images
         WHERE product_id = p.id AND is_primary = true
         ORDER BY sort_order, created_at LIMIT 1),
      -- first non-primary gallery image
      (SELECT url FROM product_images
         WHERE product_id = p.id
         ORDER BY sort_order, created_at LIMIT 1),
      -- legacy single image_url
      p.image_url
    ) AS image_url
  FROM tenants t
  JOIN products p ON p.tenant_id = t.id
  WHERE t.slug = p_tenant_slug
  ORDER BY p.name;
$$;

GRANT EXECUTE ON FUNCTION get_public_tenant_products(TEXT) TO anon, authenticated;
