-- Migration: Enable public ticket creation from DPP pages
-- Created: 2026-02-04
-- Description: Allows anonymous users to create support tickets from public product pages

-- =====================================================
-- 1. Allow anon users to SELECT from rh_customers (email lookup)
-- =====================================================

CREATE POLICY "Allow anon to lookup customer by email"
ON rh_customers
FOR SELECT
TO anon
USING (true);

-- =====================================================
-- 2. Allow anon users to INSERT into rh_customers
-- =====================================================

CREATE POLICY "Allow anon to create customer records"
ON rh_customers
FOR INSERT
TO anon
WITH CHECK (true);

-- =====================================================
-- 3. Allow anon users to INSERT into rh_tickets
-- =====================================================

CREATE POLICY "Allow anon to create tickets"
ON rh_tickets
FOR INSERT
TO anon
WITH CHECK (true);

-- =====================================================
-- 4. Allow anon users to INSERT into rh_ticket_messages
-- =====================================================

CREATE POLICY "Allow anon to create ticket messages"
ON rh_ticket_messages
FOR INSERT
TO anon
WITH CHECK (true);

-- =====================================================
-- Notes:
-- =====================================================
-- These policies allow anonymous users to:
-- 1. Look up existing customers by email (for deduplication)
-- 2. Create new customer records
-- 3. Create support tickets
-- 4. Create initial ticket messages
--
-- Security considerations:
-- - Tenant isolation is enforced in application logic
-- - Rate limiting should be implemented at application/edge level
-- - Email validation is handled in application layer
-- - No UPDATE or DELETE permissions for anon users
