-- ============================================
-- FIX: handle_new_user() trigger
-- ============================================
-- Bug 1: Used 'full_name' column which doesn't exist (column is 'name')
-- Bug 2: Never checked invitations table, so invited users got a new tenant
-- This migration fixes both issues.
-- ============================================

-- Index for fast invitation lookups during signup
CREATE INDEX IF NOT EXISTS idx_invitations_email_status
  ON invitations(email, status) WHERE status = 'pending';

-- Replace the trigger function with the corrected version
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_type TEXT;
  meta_tenant_id UUID;
  meta_first_name TEXT;
  meta_last_name TEXT;
  existing_customer_id UUID;
  new_customer_id UUID;
  new_tenant_id UUID;
  inv_tenant_id UUID;
  inv_role TEXT;
  inv_name TEXT;
BEGIN
  user_type := NEW.raw_user_meta_data->>'user_type';

  -- =============================================
  -- Path 1: Customer registration (unchanged)
  -- =============================================
  IF user_type = 'customer' THEN
    IF NEW.raw_user_meta_data->>'tenant_id' IS NULL OR NEW.raw_user_meta_data->>'tenant_id' = '' THEN
      RAISE EXCEPTION 'tenant_id is required for customer registration';
    END IF;

    meta_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
    meta_first_name := NEW.raw_user_meta_data->>'first_name';
    meta_last_name := NEW.raw_user_meta_data->>'last_name';

    SELECT id INTO existing_customer_id
    FROM rh_customers
    WHERE email = NEW.email AND tenant_id = meta_tenant_id
    LIMIT 1;

    IF existing_customer_id IS NOT NULL THEN
      new_customer_id := existing_customer_id;
      UPDATE rh_customers
      SET first_name = COALESCE(first_name, meta_first_name),
          last_name = COALESCE(last_name, meta_last_name),
          updated_at = NOW()
      WHERE id = existing_customer_id;
    ELSE
      INSERT INTO rh_customers (tenant_id, email, first_name, last_name)
      VALUES (meta_tenant_id, NEW.email, meta_first_name, meta_last_name)
      RETURNING id INTO new_customer_id;
    END IF;

    INSERT INTO rh_customer_profiles (id, customer_id, tenant_id, display_name, email_verified)
    VALUES (
      NEW.id,
      new_customer_id,
      meta_tenant_id,
      TRIM(COALESCE(meta_first_name, '') || ' ' || COALESCE(meta_last_name, '')),
      COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE)
    );

  ELSE
    -- =============================================
    -- Path 2: Check for pending invitation
    -- =============================================
    SELECT i.tenant_id, i.role, i.name
    INTO inv_tenant_id, inv_role, inv_name
    FROM invitations i
    WHERE i.email = NEW.email
      AND i.status = 'pending'
    ORDER BY i.created_at DESC
    LIMIT 1;

    IF inv_tenant_id IS NOT NULL THEN
      -- Invited user: join existing tenant with invited role
      INSERT INTO profiles (id, tenant_id, email, name, role)
      VALUES (
        NEW.id,
        inv_tenant_id,
        NEW.email,
        COALESCE(inv_name, NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(inv_role, 'viewer')
      )
      ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name),
        role = EXCLUDED.role;

      -- Mark invitation as accepted
      UPDATE invitations
      SET status = 'accepted'
      WHERE email = NEW.email
        AND tenant_id = inv_tenant_id
        AND status = 'pending';

    ELSE
      -- =============================================
      -- Path 3: Self-signup (no invitation) — new tenant
      -- =============================================
      INSERT INTO tenants (name, slug)
      VALUES (
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
        LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'company_name', 'company-' || SUBSTR(NEW.id::TEXT, 1, 8)), ' ', '-'))
      )
      RETURNING id INTO new_tenant_id;

      INSERT INTO profiles (id, tenant_id, email, name, role)
      VALUES (
        NEW.id,
        new_tenant_id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'admin'
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
