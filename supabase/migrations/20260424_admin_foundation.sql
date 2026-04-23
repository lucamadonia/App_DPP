-- ============================================
-- ADMIN v2 Foundation
--   - admin_audit_log: every super-admin write is tracked
--   - tenant status + health score + internal notes
--   - admin_tenant_notes: admin-only freeform notes (pinned + tags)
--   - admin_feature_flags: rollout percentage + whitelist/blacklist
--   - compute_tenant_health() + refresh_all_tenant_health()
-- ============================================

-- ============================================
-- 1. admin_audit_log
-- ============================================
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  target_label TEXT,
  changes JSONB,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin ON admin_audit_log (admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log (action, created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only super-admins can read. Writes go via admin-api (service role).
CREATE POLICY "admin_audit_log_select_super_admin" ON admin_audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- Helper to log admin actions from SQL or the Edge Function.
-- Takes the admin identity as explicit params (since called via service role).
CREATE OR REPLACE FUNCTION log_admin_action(
  p_admin_id UUID,
  p_admin_email TEXT,
  p_action TEXT,
  p_target_type TEXT,
  p_target_id TEXT DEFAULT NULL,
  p_target_label TEXT DEFAULT NULL,
  p_changes JSONB DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO admin_audit_log (
    admin_id, admin_email, action, target_type, target_id, target_label,
    changes, reason, ip_address, user_agent
  ) VALUES (
    p_admin_id, p_admin_email, p_action, p_target_type, p_target_id, p_target_label,
    p_changes, p_reason, p_ip_address, p_user_agent
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 2. tenants: status + health + notes
-- ============================================
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_reason TEXT,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS health_score SMALLINT,
  ADD COLUMN IF NOT EXISTS health_factors JSONB,
  ADD COLUMN IF NOT EXISTS health_updated_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'tenants_status_check'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_status_check
      CHECK (status IN ('active', 'suspended', 'deleted', 'trial_expired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants (status) WHERE status != 'active';
CREATE INDEX IF NOT EXISTS idx_tenants_health ON tenants (health_score) WHERE health_score IS NOT NULL;

-- ============================================
-- 3. admin_tenant_notes — chronological admin-only notes
-- ============================================
CREATE TABLE IF NOT EXISTS admin_tenant_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_email TEXT,
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_tenant_notes_tenant
  ON admin_tenant_notes (tenant_id, pinned DESC, created_at DESC);

ALTER TABLE admin_tenant_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_tenant_notes_super_admin_select" ON admin_tenant_notes
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "admin_tenant_notes_super_admin_insert" ON admin_tenant_notes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "admin_tenant_notes_super_admin_update" ON admin_tenant_notes
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

CREATE POLICY "admin_tenant_notes_super_admin_delete" ON admin_tenant_notes
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- ============================================
-- 4. admin_feature_flags
-- ============================================
CREATE TABLE IF NOT EXISTS admin_feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  description TEXT,
  enabled_globally BOOLEAN DEFAULT FALSE,
  rollout_percentage SMALLINT DEFAULT 0 CHECK (rollout_percentage BETWEEN 0 AND 100),
  enabled_for_tenants UUID[] DEFAULT '{}',
  disabled_for_tenants UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_feature_flags ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (to determine if feature is on for them)
CREATE POLICY "admin_feature_flags_select_authenticated" ON admin_feature_flags
  FOR SELECT TO authenticated USING (true);

-- Only super-admins can write
CREATE POLICY "admin_feature_flags_super_admin_all" ON admin_feature_flags
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_super_admin = true));

-- Helper to check if a feature is enabled for a specific tenant
CREATE OR REPLACE FUNCTION is_feature_enabled(p_key TEXT, p_tenant_id UUID)
  RETURNS BOOLEAN AS $$
DECLARE
  v_flag admin_feature_flags%ROWTYPE;
  v_hash_bucket INT;
BEGIN
  SELECT * INTO v_flag FROM admin_feature_flags WHERE key = p_key;
  IF NOT FOUND THEN RETURN FALSE; END IF;
  -- Explicit disable wins
  IF p_tenant_id = ANY(v_flag.disabled_for_tenants) THEN RETURN FALSE; END IF;
  -- Explicit enable wins over rollout percentage
  IF p_tenant_id = ANY(v_flag.enabled_for_tenants) THEN RETURN TRUE; END IF;
  -- Global toggle
  IF v_flag.enabled_globally THEN RETURN TRUE; END IF;
  -- Rollout percentage (stable hash per tenant + feature key)
  IF v_flag.rollout_percentage > 0 THEN
    v_hash_bucket := abs(hashtext(p_key || p_tenant_id::text)) % 100;
    RETURN v_hash_bucket < v_flag.rollout_percentage;
  END IF;
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- 5. compute_tenant_health()
-- ============================================
CREATE OR REPLACE FUNCTION compute_tenant_health(p_tenant_id UUID)
  RETURNS INTEGER AS $$
DECLARE
  v_score INT := 100;
  v_factors JSONB := '{}'::jsonb;
  v_last_login TIMESTAMPTZ;
  v_payment_status TEXT;
  v_failed_webhooks INT := 0;
  v_open_tickets INT := 0;
  v_days_since_login INT;
  v_tenant_status TEXT;
BEGIN
  -- Suspended tenants: automatic low score
  SELECT status INTO v_tenant_status FROM tenants WHERE id = p_tenant_id;
  IF v_tenant_status = 'suspended' OR v_tenant_status = 'deleted' OR v_tenant_status = 'trial_expired' THEN
    UPDATE tenants SET
      health_score = 0,
      health_factors = jsonb_build_object('tenantStatus', v_tenant_status),
      health_updated_at = NOW()
    WHERE id = p_tenant_id;
    RETURN 0;
  END IF;

  -- 1. Recency of activity (up to -30)
  SELECT MAX(last_login) INTO v_last_login FROM profiles WHERE tenant_id = p_tenant_id;
  IF v_last_login IS NULL THEN
    v_score := v_score - 30;
    v_factors := v_factors || jsonb_build_object('noLogin', true);
  ELSE
    v_days_since_login := EXTRACT(EPOCH FROM (NOW() - v_last_login)) / 86400;
    v_factors := v_factors || jsonb_build_object('daysSinceLogin', v_days_since_login);
    IF v_days_since_login > 30 THEN v_score := v_score - 20;
    ELSIF v_days_since_login > 14 THEN v_score := v_score - 10;
    END IF;
  END IF;

  -- 2. Payment status (up to -40)
  SELECT status INTO v_payment_status FROM billing_subscriptions WHERE tenant_id = p_tenant_id;
  IF v_payment_status IS NOT NULL THEN
    v_factors := v_factors || jsonb_build_object('paymentStatus', v_payment_status);
    IF v_payment_status = 'past_due' THEN v_score := v_score - 30;
    ELSIF v_payment_status = 'canceled' THEN v_score := v_score - 40;
    ELSIF v_payment_status = 'incomplete' THEN v_score := v_score - 20;
    END IF;
  END IF;

  -- 3. Shopify webhook failures in last 7 days (up to -20)
  BEGIN
    SELECT COUNT(*) INTO v_failed_webhooks FROM shopify_webhook_events
      WHERE tenant_id = p_tenant_id AND status = 'failed'
        AND created_at > NOW() - INTERVAL '7 days';
    v_factors := v_factors || jsonb_build_object('failedWebhooks7d', v_failed_webhooks);
    IF v_failed_webhooks > 10 THEN v_score := v_score - 20;
    ELSIF v_failed_webhooks > 3 THEN v_score := v_score - 10;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    v_factors := v_factors || jsonb_build_object('shopifyWebhooks', 'unavailable');
  END;

  -- 4. Open support tickets (up to -10)
  BEGIN
    SELECT COUNT(*) INTO v_open_tickets FROM rh_tickets
      WHERE tenant_id = p_tenant_id AND status IN ('open', 'pending');
    v_factors := v_factors || jsonb_build_object('openTickets', v_open_tickets);
    IF v_open_tickets > 5 THEN v_score := v_score - 10;
    ELSIF v_open_tickets > 2 THEN v_score := v_score - 5;
    END IF;
  EXCEPTION WHEN undefined_table THEN
    v_factors := v_factors || jsonb_build_object('tickets', 'unavailable');
  END;

  v_score := GREATEST(0, LEAST(100, v_score));

  UPDATE tenants SET
    health_score = v_score,
    health_factors = v_factors,
    health_updated_at = NOW()
  WHERE id = p_tenant_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_all_tenant_health() RETURNS INTEGER AS $$
DECLARE
  t_id UUID;
  v_count INT := 0;
BEGIN
  FOR t_id IN SELECT id FROM tenants LOOP
    BEGIN
      PERFORM compute_tenant_health(t_id);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'compute_tenant_health failed for tenant %: %', t_id, SQLERRM;
    END;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
