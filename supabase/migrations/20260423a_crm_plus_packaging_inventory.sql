-- ============================================
-- CRM Foundation + Packaging Inventory
-- 2026-04-23
--
-- Fügt:
--   1. rh_customers Aggregate + RFM-Felder
--   2. refresh_customer_stats() DB-Function
--   3. compute_rfm_scores() DB-Function
--   4. Trigger: Shipment-Change → refresh_customer_stats
--   5. wh_packaging_types Bestands-Felder
--   6. wh_packaging_transactions Tabelle
--   7. Trigger: Shipment-Save mit packaging_type_id → Verbrauch buchen
-- ============================================

-- ===== 1. rh_customers Aggregate + RFM =====
ALTER TABLE rh_customers
  ADD COLUMN IF NOT EXISTS total_orders INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_order_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS avg_order_value NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rfm_recency_score SMALLINT,
  ADD COLUMN IF NOT EXISTS rfm_frequency_score SMALLINT,
  ADD COLUMN IF NOT EXISTS rfm_monetary_score SMALLINT,
  ADD COLUMN IF NOT EXISTS rfm_combined_score SMALLINT,
  ADD COLUMN IF NOT EXISTS rfm_segment TEXT,
  ADD COLUMN IF NOT EXISTS stats_refreshed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_rh_customers_email_tenant
  ON rh_customers (tenant_id, LOWER(email))
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rh_customers_rfm_segment
  ON rh_customers (tenant_id, rfm_segment) WHERE rfm_segment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rh_customers_last_order
  ON rh_customers (tenant_id, last_order_at DESC NULLS LAST);

-- ===== 2. refresh_customer_stats =====
CREATE OR REPLACE FUNCTION refresh_customer_stats(p_customer_id UUID) RETURNS void AS $$
DECLARE
  v_total_orders INT;
  v_total_spent NUMERIC;
  v_first_order TIMESTAMPTZ;
  v_last_order TIMESTAMPTZ;
BEGIN
  SELECT
    COUNT(*)::INT,
    COALESCE(SUM(
      (SELECT COALESCE(SUM(quantity * COALESCE(unit_price, 0)), 0)
       FROM wh_shipment_items WHERE shipment_id = ws.id)
    ), 0),
    MIN(ws.created_at),
    MAX(ws.created_at)
  INTO v_total_orders, v_total_spent, v_first_order, v_last_order
  FROM wh_shipments ws
  WHERE ws.customer_id = p_customer_id
    AND ws.status != 'cancelled';

  UPDATE rh_customers SET
    total_orders      = v_total_orders,
    total_spent       = v_total_spent,
    first_order_at    = v_first_order,
    last_order_at     = v_last_order,
    avg_order_value   = CASE WHEN v_total_orders > 0 THEN v_total_spent / v_total_orders ELSE 0 END,
    stats_refreshed_at = NOW()
  WHERE id = p_customer_id;
END;
$$ LANGUAGE plpgsql;

-- ===== 3. compute_rfm_scores =====
-- Berechnet für alle Kunden eines Tenants RFM-Scores (1..5 Quintile) und
-- leitet davon das Segment ab. Ausgeführt täglich via pg_cron.
CREATE OR REPLACE FUNCTION compute_rfm_scores(p_tenant_id UUID) RETURNS INT AS $$
DECLARE
  v_updated INT;
BEGIN
  -- Temp-Table mit Quintil-Scores
  WITH ranked AS (
    SELECT
      id,
      -- Recency: Tage seit last_order, kleiner = besser → ntile INVERTED
      NTILE(5) OVER (
        ORDER BY COALESCE(EXTRACT(EPOCH FROM (NOW() - last_order_at)) / 86400, 999999) DESC
      ) AS recency,
      -- Frequency: total_orders, größer = besser
      NTILE(5) OVER (ORDER BY total_orders ASC) AS frequency,
      -- Monetary: total_spent, größer = besser
      NTILE(5) OVER (ORDER BY total_spent ASC) AS monetary
    FROM rh_customers
    WHERE tenant_id = p_tenant_id
      AND total_orders > 0
  ),
  scored AS (
    SELECT
      id,
      recency::SMALLINT AS r,
      frequency::SMALLINT AS f,
      monetary::SMALLINT AS m,
      (recency + frequency + monetary)::SMALLINT AS combined,
      CASE
        WHEN recency >= 4 AND frequency >= 4 AND monetary >= 4 THEN 'champion'
        WHEN recency >= 3 AND frequency >= 3 AND monetary >= 3 THEN 'loyal'
        WHEN recency >= 4 AND frequency <= 2                    THEN 'new'
        WHEN recency <= 2 AND monetary   >= 3                    THEN 'at_risk'
        WHEN recency <= 1 AND frequency  <= 1                    THEN 'lost'
        WHEN recency <= 2                                        THEN 'hibernating'
        ELSE 'potential'
      END AS segment
    FROM ranked
  )
  UPDATE rh_customers c SET
    rfm_recency_score   = s.r,
    rfm_frequency_score = s.f,
    rfm_monetary_score  = s.m,
    rfm_combined_score  = s.combined,
    rfm_segment         = s.segment
  FROM scored s
  WHERE c.id = s.id;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ===== 4. Trigger: Shipment-Change → refresh_customer_stats =====
CREATE OR REPLACE FUNCTION trigger_refresh_customer_stats() RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    IF OLD.customer_id IS NOT NULL THEN PERFORM refresh_customer_stats(OLD.customer_id); END IF;
    RETURN OLD;
  END IF;
  IF NEW.customer_id IS NOT NULL THEN
    PERFORM refresh_customer_stats(NEW.customer_id);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.customer_id IS NOT NULL AND OLD.customer_id IS DISTINCT FROM NEW.customer_id THEN
    PERFORM refresh_customer_stats(OLD.customer_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS refresh_customer_stats_on_shipment ON wh_shipments;
CREATE TRIGGER refresh_customer_stats_on_shipment
  AFTER INSERT OR UPDATE OF status, customer_id OR DELETE ON wh_shipments
  FOR EACH ROW EXECUTE FUNCTION trigger_refresh_customer_stats();

-- ===== 5. wh_packaging_types Bestands-Felder =====
ALTER TABLE wh_packaging_types
  ADD COLUMN IF NOT EXISTS stock_on_hand INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stock_threshold INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS stock_tracked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_restocked_at TIMESTAMPTZ;

-- ===== 6. wh_packaging_transactions =====
CREATE TABLE IF NOT EXISTS wh_packaging_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  packaging_type_id UUID NOT NULL REFERENCES wh_packaging_types(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('goods_receipt','consumption','adjustment','stocktake')),
  quantity_change INTEGER NOT NULL,
  quantity_before INTEGER,
  quantity_after INTEGER,
  shipment_id UUID REFERENCES wh_shipments(id) ON DELETE SET NULL,
  notes TEXT,
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_packaging_transactions_type
  ON wh_packaging_transactions (tenant_id, packaging_type_id, created_at DESC);

ALTER TABLE wh_packaging_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wh_packaging_transactions_select" ON wh_packaging_transactions;
CREATE POLICY "wh_packaging_transactions_select"
  ON wh_packaging_transactions FOR SELECT TO authenticated
  USING (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

DROP POLICY IF EXISTS "wh_packaging_transactions_insert" ON wh_packaging_transactions;
CREATE POLICY "wh_packaging_transactions_insert"
  ON wh_packaging_transactions FOR INSERT TO authenticated
  WITH CHECK (tenant_id IN (SELECT p.tenant_id FROM profiles p WHERE p.id = auth.uid()));

-- ===== 7. Trigger: Shipment-Save → Packaging verbrauchen =====
CREATE OR REPLACE FUNCTION consume_packaging_on_shipment() RETURNS TRIGGER AS $$
DECLARE
  v_tracked BOOLEAN;
  v_current INTEGER;
BEGIN
  -- Nichts tun wenn kein Packaging zugeordnet oder cancelled
  IF NEW.packaging_type_id IS NULL OR NEW.status = 'cancelled' THEN RETURN NEW; END IF;

  -- Bei UPDATE nur reagieren wenn sich packaging oder status geändert hat
  IF TG_OP = 'UPDATE' THEN
    IF OLD.packaging_type_id IS NOT DISTINCT FROM NEW.packaging_type_id
       AND OLD.status = NEW.status THEN RETURN NEW; END IF;
    -- Wenn zuvor ein anderes Packaging zugeordnet war und getrackt → zurückbuchen
    IF OLD.packaging_type_id IS NOT NULL
       AND OLD.packaging_type_id IS DISTINCT FROM NEW.packaging_type_id THEN
      DECLARE
        o_tracked BOOLEAN;
        o_current INTEGER;
      BEGIN
        SELECT stock_tracked, stock_on_hand INTO o_tracked, o_current
        FROM wh_packaging_types WHERE id = OLD.packaging_type_id;
        IF o_tracked THEN
          UPDATE wh_packaging_types SET stock_on_hand = stock_on_hand + 1
          WHERE id = OLD.packaging_type_id;
          INSERT INTO wh_packaging_transactions
            (tenant_id, packaging_type_id, type, quantity_change, quantity_before, quantity_after, shipment_id, notes)
          VALUES
            (NEW.tenant_id, OLD.packaging_type_id, 'adjustment', 1, o_current, o_current + 1, NEW.id, 'Packaging geändert — zurückgebucht');
        END IF;
      END;
    END IF;
  END IF;

  -- Neues Packaging verbuchen
  SELECT stock_tracked, stock_on_hand INTO v_tracked, v_current
  FROM wh_packaging_types WHERE id = NEW.packaging_type_id;
  IF NOT v_tracked THEN RETURN NEW; END IF;

  UPDATE wh_packaging_types SET stock_on_hand = stock_on_hand - 1
  WHERE id = NEW.packaging_type_id;
  INSERT INTO wh_packaging_transactions
    (tenant_id, packaging_type_id, type, quantity_change, quantity_before, quantity_after, shipment_id)
  VALUES
    (NEW.tenant_id, NEW.packaging_type_id, 'consumption', -1, v_current, v_current - 1, NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS consume_packaging_on_shipment_trigger ON wh_shipments;
CREATE TRIGGER consume_packaging_on_shipment_trigger
  AFTER INSERT OR UPDATE ON wh_shipments
  FOR EACH ROW EXECUTE FUNCTION consume_packaging_on_shipment();
