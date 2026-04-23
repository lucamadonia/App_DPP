-- Granulare Admin-Rollen:
--   super_admin      — Vollzugriff (alt: is_super_admin=true)
--   support_admin    — Tenants, Users, Support-Inbox, Impersonate (read+mutate)
--                       aber KEINE Billing/Refund/Feature-Flag/Audit-Delete
--   billing_admin    — Billing, Credits, Coupons, Refunds (read+mutate)
--                       kein User-Management, keine Impersonation
--   security_admin   — Audit-Log, Feature-Flags, System, MFA-Enforcement
--                       kein Billing, kein Impersonate

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS admin_role TEXT
    CHECK (admin_role IS NULL OR admin_role IN ('super_admin', 'support_admin', 'billing_admin', 'security_admin'));

-- Backfill: alle is_super_admin=true Profile bekommen admin_role='super_admin'
UPDATE profiles SET admin_role = 'super_admin'
  WHERE is_super_admin = true AND admin_role IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_admin_role ON profiles (admin_role) WHERE admin_role IS NOT NULL;

-- Helper: hat der aktuelle User irgendeine Admin-Rolle?
CREATE OR REPLACE FUNCTION current_admin_role() RETURNS TEXT AS $$
  SELECT admin_role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION has_admin_access() RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_super_admin OR admin_role IS NOT NULL FROM profiles WHERE id = auth.uid()),
    FALSE
  )
$$ LANGUAGE sql STABLE;

-- Hilfs-Funktion um pro Operation zu prüfen ob die Rolle erlaubt ist
CREATE OR REPLACE FUNCTION admin_role_allows(p_role TEXT, p_op TEXT) RETURNS BOOLEAN AS $$
BEGIN
  IF p_role = 'super_admin' THEN RETURN TRUE; END IF;

  -- Support ops
  IF p_role = 'support_admin' AND p_op IN (
    'list_tenants', 'get_tenant', 'list_users', 'update_user_role',
    'toggle_user_status', 'reset_user_password',
    'list_all_tickets', 'suspend_tenant', 'reactivate_tenant',
    'refresh_tenant_health', 'list_tenant_notes', 'create_tenant_note', 'delete_tenant_note',
    'impersonate_start', 'impersonate_end'
  ) THEN RETURN TRUE; END IF;

  -- Billing ops
  IF p_role = 'billing_admin' AND p_op IN (
    'list_tenants', 'get_tenant',
    'update_tenant_plan', 'toggle_module',
    'adjust_credits', 'set_monthly_allowance',
    'list_coupons', 'create_coupon', 'update_coupon', 'delete_coupon',
    'issue_refund', 'get_mrr_waterfall', 'get_feature_adoption', 'get_cohort_retention'
  ) THEN RETURN TRUE; END IF;

  -- Security ops
  IF p_role = 'security_admin' AND p_op IN (
    'list_audit_log', 'list_feature_flags', 'upsert_feature_flag', 'delete_feature_flag',
    'list_failed_webhooks', 'retry_webhook',
    'toggle_super_admin',
    'list_tenants', 'get_tenant'
  ) THEN RETURN TRUE; END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;
