-- ============================================
-- FIX: Customer Portal RLS Policies
-- ============================================
-- Problem: Authenticated customers cannot read their own profiles
-- Solution: Add SELECT policies for authenticated users
-- ============================================

-- 1. Allow authenticated users to read their own customer profile
DROP POLICY IF EXISTS "Users can read own customer profile" ON rh_customer_profiles;
CREATE POLICY "Users can read own customer profile"
ON rh_customer_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 2. Allow authenticated users to read their own customer data
DROP POLICY IF EXISTS "Users can read own customer data" ON rh_customers;
CREATE POLICY "Users can read own customer data"
ON rh_customers
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT customer_id
    FROM rh_customer_profiles
    WHERE id = auth.uid()
  )
);

-- 3. Allow authenticated users to update their own customer profile
DROP POLICY IF EXISTS "Users can update own customer profile" ON rh_customer_profiles;
CREATE POLICY "Users can update own customer profile"
ON rh_customer_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 4. Allow authenticated users to update their own customer data
DROP POLICY IF EXISTS "Users can update own customer data" ON rh_customers;
CREATE POLICY "Users can update own customer data"
ON rh_customers
FOR UPDATE
TO authenticated
USING (
  id IN (
    SELECT customer_id
    FROM rh_customer_profiles
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT customer_id
    FROM rh_customer_profiles
    WHERE id = auth.uid()
  )
);

-- 5. Allow authenticated customers to read their own returns
DROP POLICY IF EXISTS "Customers can read own returns" ON rh_returns;
CREATE POLICY "Customers can read own returns"
ON rh_returns
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT customer_id
    FROM rh_customer_profiles
    WHERE id = auth.uid()
  )
);

-- 6. Allow authenticated customers to read their own tickets
DROP POLICY IF EXISTS "Customers can read own tickets" ON rh_tickets;
CREATE POLICY "Customers can read own tickets"
ON rh_tickets
FOR SELECT
TO authenticated
USING (
  customer_id IN (
    SELECT customer_id
    FROM rh_customer_profiles
    WHERE id = auth.uid()
  )
);

-- 7. Allow authenticated customers to read their own ticket messages
DROP POLICY IF EXISTS "Customers can read own ticket messages" ON rh_ticket_messages;
CREATE POLICY "Customers can read own ticket messages"
ON rh_ticket_messages
FOR SELECT
TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM rh_tickets
    WHERE customer_id IN (
      SELECT customer_id
      FROM rh_customer_profiles
      WHERE id = auth.uid()
    )
  )
);

-- ============================================
-- DONE! Customer portal should now work
-- ============================================
