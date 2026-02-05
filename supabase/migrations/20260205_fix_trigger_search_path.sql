-- Fix handle_new_user() trigger function search_path
--
-- Root cause: The supabase_auth_admin role (used by GoTrue) has
-- search_path=auth configured. When GoTrue fires the on_auth_user_created
-- trigger, the SECURITY DEFINER function inherited the calling session's
-- search_path=auth, making it unable to find tables in the public schema
-- (profiles, tenants, rh_customers, rh_customer_profiles).
--
-- This caused "Database error creating new user" (HTTP 500) on all
-- user signups via the Supabase Auth API.
--
-- Fix: Explicitly set search_path on the function so it always resolves
-- public schema tables regardless of the calling session's search_path.

ALTER FUNCTION handle_new_user() SET search_path = public, auth;
