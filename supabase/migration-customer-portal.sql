-- ============================================
-- CUSTOMER PORTAL MIGRATION
-- rh_customer_profiles, helper functions, RLS policies, CRM columns
-- ============================================

-- 1. Customer Portal Profiles (links auth.users to rh_customers)
CREATE TABLE IF NOT EXISTS rh_customer_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES rh_customers(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    email_verified BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id)
);

CREATE INDEX IF NOT EXISTS idx_rh_customer_profiles_tenant ON rh_customer_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rh_customer_profiles_customer ON rh_customer_profiles(customer_id);

-- 2. CRM extension columns on rh_customers
ALTER TABLE rh_customers ADD COLUMN IF NOT EXISTS satisfaction_score NUMERIC(3,1);
ALTER TABLE rh_customers ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'active'
  CHECK (lifecycle_stage IN ('new', 'active', 'at_risk', 'churned', 'vip'));
ALTER TABLE rh_customers ADD COLUMN IF NOT EXISTS communication_preferences JSONB
  DEFAULT '{"email": true, "sms": false, "marketing": false}';

-- 3. Helper functions

-- Get tenant_id for the current customer user
CREATE OR REPLACE FUNCTION get_customer_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM rh_customer_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Get customer_id for the current customer user
CREATE OR REPLACE FUNCTION get_customer_id()
RETURNS UUID AS $$
  SELECT customer_id FROM rh_customer_profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if current user is a customer (not an admin)
CREATE OR REPLACE FUNCTION is_customer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM rh_customer_profiles WHERE id = auth.uid());
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- 4. Update handle_new_user trigger to support customer registration
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
BEGIN
  user_type := NEW.raw_user_meta_data->>'user_type';

  IF user_type = 'customer' THEN
    -- Customer registration
    meta_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
    meta_first_name := NEW.raw_user_meta_data->>'first_name';
    meta_last_name := NEW.raw_user_meta_data->>'last_name';

    -- Check if an rh_customers record exists for this email + tenant
    SELECT id INTO existing_customer_id
    FROM rh_customers
    WHERE email = NEW.email AND tenant_id = meta_tenant_id
    LIMIT 1;

    IF existing_customer_id IS NOT NULL THEN
      new_customer_id := existing_customer_id;
      -- Update name if not set
      UPDATE rh_customers
      SET first_name = COALESCE(first_name, meta_first_name),
          last_name = COALESCE(last_name, meta_last_name),
          updated_at = NOW()
      WHERE id = existing_customer_id;
    ELSE
      -- Create new rh_customers record
      INSERT INTO rh_customers (tenant_id, email, first_name, last_name)
      VALUES (meta_tenant_id, NEW.email, meta_first_name, meta_last_name)
      RETURNING id INTO new_customer_id;
    END IF;

    -- Create customer profile
    INSERT INTO rh_customer_profiles (id, customer_id, tenant_id, display_name, email_verified)
    VALUES (
      NEW.id,
      new_customer_id,
      meta_tenant_id,
      TRIM(COALESCE(meta_first_name, '') || ' ' || COALESCE(meta_last_name, '')),
      COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE)
    );

  ELSE
    -- Original admin/team user registration
    -- Check if a tenant already exists (invited user)
    SELECT tenant_id INTO new_tenant_id
    FROM profiles WHERE id = NEW.id;

    IF new_tenant_id IS NULL THEN
      -- Create new tenant
      INSERT INTO tenants (name, slug)
      VALUES (
        COALESCE(NEW.raw_user_meta_data->>'company_name', 'My Company'),
        LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'company_name', 'company-' || SUBSTR(NEW.id::TEXT, 1, 8)), ' ', '-'))
      )
      RETURNING id INTO new_tenant_id;
    END IF;

    -- Create or update profile
    INSERT INTO profiles (id, tenant_id, email, full_name, role)
    VALUES (
      NEW.id,
      new_tenant_id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      'admin'
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(EXCLUDED.full_name, profiles.full_name);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 5. RLS on rh_customer_profiles
ALTER TABLE rh_customer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own profile"
  ON rh_customer_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Customers can update own profile"
  ON rh_customer_profiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Admins can view customer profiles in tenant"
  ON rh_customer_profiles FOR SELECT
  USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 6. Additional RLS policies for customer portal access

-- rh_returns: customers can view their own returns
CREATE POLICY "Customers can view own returns"
  ON rh_returns FOR SELECT
  USING (
    is_customer()
    AND tenant_id = get_customer_tenant_id()
    AND customer_id = get_customer_id()
  );

-- rh_returns: customers can create returns
CREATE POLICY "Customers can create own returns"
  ON rh_returns FOR INSERT
  WITH CHECK (
    is_customer()
    AND tenant_id = get_customer_tenant_id()
    AND customer_id = get_customer_id()
  );

-- rh_return_items: customers can view own return items
CREATE POLICY "Customers can view own return items"
  ON rh_return_items FOR SELECT
  USING (
    is_customer()
    AND tenant_id = get_customer_tenant_id()
    AND return_id IN (SELECT id FROM rh_returns WHERE customer_id = get_customer_id())
  );

-- rh_return_items: customers can create own return items
CREATE POLICY "Customers can create own return items"
  ON rh_return_items FOR INSERT
  WITH CHECK (
    is_customer()
    AND tenant_id = get_customer_tenant_id()
    AND return_id IN (SELECT id FROM rh_returns WHERE customer_id = get_customer_id())
  );

-- rh_return_timeline: customers can view own timeline
CREATE POLICY "Customers can view own return timeline"
  ON rh_return_timeline FOR SELECT
  USING (
    is_customer()
    AND tenant_id = get_customer_tenant_id()
    AND return_id IN (SELECT id FROM rh_returns WHERE customer_id = get_customer_id())
  );

-- rh_tickets: customers can view own tickets
CREATE POLICY "Customers can view own tickets"
  ON rh_tickets FOR SELECT
  USING (
    is_customer()
    AND tenant_id = get_customer_tenant_id()
    AND customer_id = get_customer_id()
  );

-- rh_tickets: customers can create tickets
CREATE POLICY "Customers can create own tickets"
  ON rh_tickets FOR INSERT
  WITH CHECK (
    is_customer()
    AND tenant_id = get_customer_tenant_id()
    AND customer_id = get_customer_id()
  );

-- rh_ticket_messages: customers can view non-internal messages on own tickets
CREATE POLICY "Customers can view own ticket messages"
  ON rh_ticket_messages FOR SELECT
  USING (
    is_customer()
    AND tenant_id = get_customer_tenant_id()
    AND is_internal = FALSE
    AND ticket_id IN (SELECT id FROM rh_tickets WHERE customer_id = get_customer_id())
  );

-- rh_ticket_messages: customers can send messages on own tickets
CREATE POLICY "Customers can send own ticket messages"
  ON rh_ticket_messages FOR INSERT
  WITH CHECK (
    is_customer()
    AND tenant_id = get_customer_tenant_id()
    AND is_internal = FALSE
    AND sender_type = 'customer'
    AND ticket_id IN (SELECT id FROM rh_tickets WHERE customer_id = get_customer_id())
  );

-- rh_customers: customers can view and update own record
CREATE POLICY "Customers can view own customer record"
  ON rh_customers FOR SELECT
  USING (
    is_customer()
    AND id = get_customer_id()
  );

CREATE POLICY "Customers can update own customer record"
  ON rh_customers FOR UPDATE
  USING (
    is_customer()
    AND id = get_customer_id()
  );

-- rh_return_reasons: customers can read active reasons
CREATE POLICY "Customers can read active return reasons"
  ON rh_return_reasons FOR SELECT
  USING (
    is_customer()
    AND tenant_id = get_customer_tenant_id()
    AND active = TRUE
  );

-- 7. Update last_login tracking
CREATE OR REPLACE FUNCTION update_customer_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE rh_customer_profiles
  SET last_login_at = NOW(), updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
