-- Clean up duplicate RLS policies on customer portal tables
-- The original migration-customer-portal.sql and FINAL_COMPLETE_MIGRATION.sql
-- created overlapping policies. Keep the more specific ones.

-- rh_customer_profiles: remove duplicates (keep authenticated-role versions)
DROP POLICY IF EXISTS "Customers can view own profile" ON rh_customer_profiles;
DROP POLICY IF EXISTS "Customers can update own profile" ON rh_customer_profiles;
-- Keep: "Users can read own customer profile" (authenticated)
-- Keep: "Users can update own customer profile" (authenticated)
-- Keep: "Admins can view customer profiles in tenant" (for admin dashboard)

-- rh_customers: remove duplicate anon policies
DROP POLICY IF EXISTS "Public insert customers" ON rh_customers;
DROP POLICY IF EXISTS "Public read customers" ON rh_customers;
-- Keep: "Allow anon to lookup customer by email" (anon SELECT)
-- Keep: "Allow anon to create customer records" (anon INSERT)
-- Keep: "Tenant isolation for rh_customers" (admin access)
-- Keep: "Users can read own customer data" (authenticated customer)
-- Keep: "Users can update own customer data" (authenticated customer)
-- Keep: "Customers can view own customer record" (via is_customer())
-- Keep: "Customers can update own customer record" (via is_customer())
