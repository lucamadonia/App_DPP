-- ============================================
-- CRM v2 — Advanced: Notes, Actions, Health Score, Product Affinity
-- ============================================

-- 1. Customer notes (chronological, free-text with author)
CREATE TABLE IF NOT EXISTS rh_customer_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES rh_customers(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rh_customer_notes_customer ON rh_customer_notes (customer_id, created_at DESC);
ALTER TABLE rh_customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rh_customer_notes_select" ON rh_customer_notes FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY "rh_customer_notes_insert" ON rh_customer_notes FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY "rh_customer_notes_update" ON rh_customer_notes FOR UPDATE TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));
CREATE POLICY "rh_customer_notes_delete" ON rh_customer_notes FOR DELETE TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

-- 2. Customer Health Score (0-100) — weighted combo of RFM + activity + returns
ALTER TABLE rh_customers
  ADD COLUMN IF NOT EXISTS health_score SMALLINT,
  ADD COLUMN IF NOT EXISTS expected_next_order_days INTEGER,
  ADD COLUMN IF NOT EXISTS avg_days_between_orders NUMERIC(6, 1);

-- 3. Compute health + churn metrics function
CREATE OR REPLACE FUNCTION refresh_customer_metrics(p_customer_id UUID) RETURNS void AS $$
DECLARE
  v_total_orders INT;
  v_last_order TIMESTAMPTZ;
  v_first_order TIMESTAMPTZ;
  v_avg_gap NUMERIC;
  v_days_since_last INT;
  v_expected_days INT;
  v_health INT;
  v_rfm_combined SMALLINT;
  v_risk_score SMALLINT;
BEGIN
  -- Pull stats from rh_customers (already refreshed)
  SELECT total_orders, last_order_at, first_order_at, rfm_combined_score, risk_score
    INTO v_total_orders, v_last_order, v_first_order, v_rfm_combined, v_risk_score
  FROM rh_customers WHERE id = p_customer_id;

  -- Average days between orders (only if 2+ orders)
  IF v_total_orders >= 2 AND v_first_order IS NOT NULL AND v_last_order IS NOT NULL THEN
    v_avg_gap := EXTRACT(EPOCH FROM (v_last_order - v_first_order)) / 86400.0 / GREATEST(v_total_orders - 1, 1);
  ELSE
    v_avg_gap := NULL;
  END IF;

  -- Expected next order: avg_gap * 1.2 as tolerance
  IF v_avg_gap IS NOT NULL AND v_last_order IS NOT NULL THEN
    v_days_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_order)) / 86400.0;
    v_expected_days := GREATEST(0, (v_avg_gap * 1.2)::INT - v_days_since_last);
  ELSE
    v_expected_days := NULL;
  END IF;

  -- Health score 0-100:
  --   - 50% from RFM combined (3-15 scale → 0-50)
  --   - 30% recency factor (30 if recent, 0 if >180d old)
  --   - 20% order volume (20 if >= 5 orders, 0 if none)
  v_health := 0;
  IF v_rfm_combined IS NOT NULL THEN
    v_health := v_health + ((v_rfm_combined - 3)::FLOAT / 12 * 50)::INT;
  END IF;
  IF v_last_order IS NOT NULL THEN
    v_days_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_order)) / 86400.0;
    IF v_days_since_last <= 30 THEN v_health := v_health + 30;
    ELSIF v_days_since_last <= 90 THEN v_health := v_health + 20;
    ELSIF v_days_since_last <= 180 THEN v_health := v_health + 10;
    END IF;
  END IF;
  IF v_total_orders >= 5 THEN v_health := v_health + 20;
  ELSIF v_total_orders >= 2 THEN v_health := v_health + 10;
  ELSIF v_total_orders >= 1 THEN v_health := v_health + 5;
  END IF;
  v_health := LEAST(100, GREATEST(0, v_health));

  UPDATE rh_customers SET
    health_score = v_health,
    expected_next_order_days = v_expected_days,
    avg_days_between_orders = v_avg_gap
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Product Affinity function — top products a customer has bought
CREATE OR REPLACE FUNCTION get_customer_product_affinity(p_customer_id UUID, p_limit INT DEFAULT 5)
  RETURNS TABLE (
    product_id UUID,
    product_name TEXT,
    total_quantity BIGINT,
    total_revenue NUMERIC,
    order_count BIGINT
  ) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wsi.product_id,
    COALESCE(p.name, 'Unbekannt') AS product_name,
    SUM(wsi.quantity)::BIGINT AS total_quantity,
    COALESCE(SUM(wsi.quantity * COALESCE(wsi.unit_price, 0)), 0)::NUMERIC AS total_revenue,
    COUNT(DISTINCT wsi.shipment_id)::BIGINT AS order_count
  FROM wh_shipment_items wsi
  JOIN wh_shipments ws ON ws.id = wsi.shipment_id
  LEFT JOIN products p ON p.id = wsi.product_id
  WHERE ws.customer_id = p_customer_id
    AND ws.status != 'cancelled'
    AND wsi.product_id IS NOT NULL
  GROUP BY wsi.product_id, p.name
  ORDER BY total_revenue DESC, total_quantity DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Lifecycle Funnel counts per tenant
CREATE OR REPLACE FUNCTION get_lifecycle_funnel(p_tenant_id UUID)
  RETURNS TABLE (
    stage TEXT,
    customer_count BIGINT,
    revenue_sum NUMERIC
  ) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(rfm_segment, 'unassigned') AS stage,
    COUNT(*)::BIGINT AS customer_count,
    COALESCE(SUM(total_spent), 0)::NUMERIC AS revenue_sum
  FROM rh_customers
  WHERE tenant_id = p_tenant_id
  GROUP BY rfm_segment;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6. Tenant-wide health refresh (called by cron + after RFM refresh)
CREATE OR REPLACE FUNCTION refresh_tenant_health_scores(p_tenant_id UUID) RETURNS INTEGER AS $$
DECLARE
  v_count INT := 0;
  c_id UUID;
BEGIN
  FOR c_id IN SELECT id FROM rh_customers WHERE tenant_id = p_tenant_id LOOP
    BEGIN
      PERFORM refresh_customer_metrics(c_id);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      -- ignore individual failures, keep going
      NULL;
    END;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 7. Extend compute_rfm_scores to also refresh health via wrapper
CREATE OR REPLACE FUNCTION compute_rfm_and_health(p_tenant_id UUID) RETURNS INTEGER AS $$
DECLARE
  v_rfm_count INT;
  v_health_count INT;
BEGIN
  v_rfm_count := compute_rfm_scores(p_tenant_id);
  v_health_count := refresh_tenant_health_scores(p_tenant_id);
  RETURN GREATEST(v_rfm_count, v_health_count);
END;
$$ LANGUAGE plpgsql;

-- 8. Update the wrapper that the cron job calls
CREATE OR REPLACE FUNCTION crm_refresh_all_tenants() RETURNS INTEGER AS $$
DECLARE
  t_id UUID;
  total INTEGER := 0;
  cnt INTEGER;
BEGIN
  FOR t_id IN SELECT DISTINCT tenant_id FROM rh_customers LOOP
    BEGIN
      cnt := compute_rfm_and_health(t_id);
      total := total + COALESCE(cnt, 0);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'compute_rfm_and_health failed for tenant %: %', t_id, SQLERRM;
    END;
  END LOOP;
  RETURN total;
END;
$$ LANGUAGE plpgsql;
