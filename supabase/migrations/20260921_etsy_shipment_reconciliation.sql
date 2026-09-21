-- One transactional path for manual creation and Etsy sync. Invoker security
-- retains tenant RLS; locking the order serializes retries and concurrent syncs.
CREATE OR REPLACE FUNCTION public.reconcile_etsy_shipment(p_order_id uuid, p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  o commerce_orders%ROWTYPE;
  s wh_shipments%ROWTYPE;
  line record;
  location uuid;
  batch uuid;
  remaining integer;
  added integer := 0;
  item_count integer;
  reused boolean := false;
  reference text;
BEGIN
  SELECT * INTO o FROM commerce_orders
    WHERE id = p_order_id AND tenant_id = p_tenant_id FOR UPDATE;
  IF NOT FOUND OR o.platform <> 'etsy' THEN RAISE EXCEPTION 'Etsy order not found'; END IF;
  reference := 'Etsy ' || o.external_order_id;
  SELECT * INTO s FROM wh_shipments
    WHERE tenant_id = p_tenant_id AND order_reference = reference FOR UPDATE;
  reused := FOUND;
  IF reused AND s.status <> 'draft' AND NOT (
    s.status = 'picking' AND NOT EXISTS (
      SELECT 1 FROM wh_shipment_items WHERE shipment_id = s.id AND tenant_id = p_tenant_id
    )
  ) THEN
    RAISE EXCEPTION 'Only draft or empty picking shipments can be reconciled';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM commerce_order_items WHERE order_id = o.id AND tenant_id = p_tenant_id)
    OR EXISTS (SELECT 1 FROM commerce_order_items WHERE order_id = o.id AND tenant_id = p_tenant_id AND product_id IS NULL)
  THEN RAISE EXCEPTION 'Assign all order lines to products first'; END IF;

  SELECT id INTO location FROM wh_locations WHERE tenant_id = p_tenant_id ORDER BY created_at, id LIMIT 1;
  IF location IS NULL THEN RAISE EXCEPTION 'Create a warehouse location first'; END IF;

  IF NOT reused THEN
    IF coalesce(trim(concat_ws(' ', o.raw_payload->>'first_line', o.raw_payload->>'second_line')), '') = ''
      OR coalesce(o.raw_payload->>'city', o.customer_city, '') = ''
      OR coalesce(o.raw_payload->>'zip', o.customer_postal_code, '') = ''
    THEN RAISE EXCEPTION 'Order has no complete shipping address'; END IF;
    INSERT INTO wh_shipments (
      tenant_id, shipment_number, status, recipient_type, recipient_name, recipient_email,
      shipping_street, shipping_city, shipping_state, shipping_postal_code, shipping_country,
      total_items, order_reference, notes
    ) VALUES (
      p_tenant_id, 'SHP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 8)),
      'draft', 'customer', coalesce(o.raw_payload->>'name', o.customer_name, 'Etsy buyer'), o.customer_email,
      trim(concat_ws(' ', o.raw_payload->>'first_line', o.raw_payload->>'second_line')),
      coalesce(o.raw_payload->>'city', o.customer_city), o.raw_payload->>'state',
      coalesce(o.raw_payload->>'zip', o.customer_postal_code), coalesce(o.customer_country, 'DE'),
      0, reference, 'Etsy receipt ' || o.external_order_id
    ) RETURNING * INTO s;
  END IF;

  -- Legacy shipment rows have no source-line ID. Reconcile by product and price,
  -- covering repeated products without duplicating existing/manual positions.
  FOR line IN SELECT product_id, unit_price, sum(quantity)::integer AS quantity
    FROM commerce_order_items WHERE order_id = o.id AND tenant_id = p_tenant_id
    GROUP BY product_id, unit_price
  LOOP
    SELECT line.quantity - coalesce(sum(quantity), 0) INTO remaining
      FROM wh_shipment_items WHERE shipment_id = s.id AND tenant_id = p_tenant_id
        AND product_id = line.product_id AND unit_price IS NOT DISTINCT FROM line.unit_price;
    IF remaining <= 0 THEN CONTINUE; END IF;
    SELECT id INTO batch FROM product_batches WHERE product_id = line.product_id AND tenant_id = p_tenant_id
      ORDER BY created_at DESC, id LIMIT 1;
    -- Batch is intentionally nullable: importing an order must not require stock.
    INSERT INTO wh_shipment_items (tenant_id, shipment_id, product_id, batch_id, location_id, quantity, unit_price, currency)
      VALUES (p_tenant_id, s.id, line.product_id, batch, location, remaining, line.unit_price, o.currency);
    added := added + 1;
  END LOOP;
  SELECT count(*) INTO item_count FROM wh_shipment_items WHERE shipment_id = s.id AND tenant_id = p_tenant_id;
  UPDATE wh_shipments SET total_items = (
    SELECT coalesce(sum(quantity), 0) FROM wh_shipment_items WHERE shipment_id = s.id AND tenant_id = p_tenant_id
  ) WHERE id = s.id AND tenant_id = p_tenant_id;
  UPDATE commerce_orders SET metadata = coalesce(metadata, '{}'::jsonb)
    || jsonb_build_object('shipmentId', s.id, 'orderReference', reference)
    WHERE id = o.id AND tenant_id = p_tenant_id;
  RETURN jsonb_build_object('shipmentNumber', s.shipment_number, 'itemsCreated', added, 'itemCount', item_count, 'reused', reused);
END;
$$;
REVOKE ALL ON FUNCTION public.reconcile_etsy_shipment(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_etsy_shipment(uuid, uuid) TO authenticated, service_role;
