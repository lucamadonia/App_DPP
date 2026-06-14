-- Feedback form: resolve product images from the gallery, not just the legacy field.
--
-- get_feedback_request_by_token() returned products.image_url directly. That
-- column is a legacy scalar; modern products store their images in the
-- product_images gallery and leave image_url empty. As a result every feedback
-- form for gallery-only products (e.g. all current Fambliss products) rendered
-- with no product image.
--
-- Fix: COALESCE image_url with the product's primary gallery image
-- (is_primary first, then lowest sort_order). Mirrors the client-side
-- enrichProductImage() fallback in services/supabase/products.ts.

CREATE OR REPLACE FUNCTION get_feedback_request_by_token(p_token TEXT)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_req feedback_requests%ROWTYPE;
  v_tenant_name TEXT;
  v_tenant_slug TEXT;
  v_tenant_settings JSONB;
  v_product RECORD;
  v_items JSONB;
BEGIN
  -- Find request by token
  SELECT * INTO v_req FROM feedback_requests WHERE token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'not_found');
  END IF;

  IF v_req.expires_at < NOW() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  IF v_req.status = 'submitted' THEN
    RETURN jsonb_build_object('error', 'already_submitted');
  END IF;

  -- Touch opened_at
  IF v_req.opened_at IS NULL THEN
    UPDATE feedback_requests
      SET opened_at = NOW(), status = 'opened'
      WHERE id = v_req.id;
  END IF;

  -- Tenant info
  SELECT name, slug, settings INTO v_tenant_name, v_tenant_slug, v_tenant_settings
    FROM tenants WHERE id = v_req.tenant_id;

  -- Sibling requests for the same shipment (same customer journey,
  -- multiple variants → one form for everything)
  SELECT jsonb_agg(jsonb_build_object(
      'request_id', fr.id,
      'product_id', fr.product_id,
      'batch_id', fr.batch_id,
      'variant_title', fr.variant_title,
      'product_name', p.name,
      'product_image', COALESCE(
        NULLIF(p.image_url, ''),
        (SELECT pi.url
           FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC NULLS LAST, pi.sort_order ASC NULLS LAST
          LIMIT 1)
      ),
      'is_self', fr.token = p_token
    ) ORDER BY p.name)
    INTO v_items
    FROM feedback_requests fr
    JOIN products p ON p.id = fr.product_id
    WHERE fr.shipment_id = v_req.shipment_id
      AND fr.status IN ('pending','opened');

  RETURN jsonb_build_object(
    'request_id', v_req.id,
    'token', v_req.token,
    'tenant_id', v_req.tenant_id,
    'tenant_name', v_tenant_name,
    'tenant_slug', v_tenant_slug,
    'tenant_branding', v_tenant_settings->'branding',
    'customer_name', v_req.customer_name,
    'customer_email', v_req.customer_email,
    'expires_at', v_req.expires_at,
    'items', COALESCE(v_items, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_feedback_request_by_token(TEXT) TO anon, authenticated;
