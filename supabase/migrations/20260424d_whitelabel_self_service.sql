-- Self-Service Whitelabeling:
-- Tenant-Admins dürfen ihre eigene Subdomain, SMTP-Config und
-- whitelabel_config verwalten. Custom Domain bleibt Super-Admin-gated
-- (wegen DNS-Verifikations-Token-Gen).

-- 1. tenant_smtp_config: Tenant-Admins dürfen für ihren Tenant schreiben
CREATE POLICY "smtp_tenant_admin_all" ON tenant_smtp_config FOR ALL TO authenticated
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. tenants: admin role darf subdomain/whitelabel_config für eigenen Tenant
--    (UPDATE policy existiert bereits für "Admins can update their own tenant"
--    — je nach Existenz überschreibe mit erweiterten Spalten).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='tenants' AND policyname='tenants_self_update_whitelabel') THEN
    CREATE POLICY "tenants_self_update_whitelabel" ON tenants FOR UPDATE TO authenticated
      USING (
        id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      )
      WITH CHECK (
        id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

-- 3. Helper für Self-Service Subdomain-Set (validiert Format + Unique)
CREATE OR REPLACE FUNCTION tenant_set_own_subdomain(p_subdomain TEXT)
  RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_role TEXT;
  v_clean TEXT;
  v_conflict UUID;
BEGIN
  SELECT tenant_id, role INTO v_tenant_id, v_role FROM profiles WHERE id = auth.uid();
  IF v_tenant_id IS NULL OR v_role != 'admin' THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_subdomain IS NULL OR btrim(p_subdomain) = '' THEN
    UPDATE tenants SET subdomain = NULL WHERE id = v_tenant_id;
    RETURN jsonb_build_object('subdomain', NULL, 'full_host', NULL);
  END IF;

  v_clean := lower(regexp_replace(p_subdomain, '[^a-z0-9-]', '', 'g'));
  v_clean := regexp_replace(v_clean, '^-+|-+$', '', 'g');

  IF length(v_clean) < 3 THEN
    RAISE EXCEPTION 'Subdomain zu kurz (min 3 Zeichen)' USING ERRCODE = '22000';
  END IF;

  SELECT id INTO v_conflict FROM tenants
    WHERE subdomain = v_clean AND id != v_tenant_id;
  IF v_conflict IS NOT NULL THEN
    RAISE EXCEPTION 'Subdomain "%" ist bereits vergeben', v_clean USING ERRCODE = '23505';
  END IF;

  UPDATE tenants SET subdomain = v_clean WHERE id = v_tenant_id;
  RETURN jsonb_build_object('subdomain', v_clean, 'full_host', v_clean || '.trackbliss.eu');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Helper für Self-Service Whitelabel-Config-Merge
CREATE OR REPLACE FUNCTION tenant_set_own_whitelabel_config(p_patch JSONB)
  RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_role TEXT;
  v_merged JSONB;
BEGIN
  SELECT tenant_id, role INTO v_tenant_id, v_role FROM profiles WHERE id = auth.uid();
  IF v_tenant_id IS NULL OR v_role != 'admin' THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(whitelabel_config, '{}'::jsonb) || p_patch INTO v_merged
    FROM tenants WHERE id = v_tenant_id;
  UPDATE tenants SET whitelabel_config = v_merged WHERE id = v_tenant_id;
  RETURN v_merged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
