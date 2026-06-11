-- Migration: Tighten overly permissive anon RLS policies
-- Date: 2026-06-11
-- Fixes critical security findings:
--   1. rh_customers: anon SELECT USING(true) allowed cross-tenant e-mail/PII
--      enumeration. Replaced with a SECURITY DEFINER lookup function that
--      returns ONLY the customer id for an exact (tenant_id, email) match.
--   2. rh_returns: anon UPDATE was effectively unrestricted (the 20260215
--      "fix" used lowercase status values that never match the uppercase
--      CHECK-constrained values, and the original 20260212 policy was
--      USING(true) WITH CHECK(true)). Now anon can only flip a return in a
--      cancellable status to CANCELLED (public cancel flow).
--   3. rh_customers / rh_tickets / rh_ticket_messages / rh_notifications:
--      anon INSERT WITH CHECK(true) hardened with tenant-existence checks
--      and column constraints matching what the public portals actually send.
--   4. rh_workflow_rules: anon SELECT restricted to active rules.
--   5. rh_email_templates: anon SELECT restricted to enabled templates.
--
-- Public flows that must keep working (verified against client code):
--   - returns.ts publicCreateReturn()            (customer lookup + insert)
--   - returns.ts publicCancelReturn()            (status -> CANCELLED + updated_at)
--   - customer-portal.ts createPublicProductTicket()  (customer lookup + customer/ticket/message insert)
--   - customer-portal.ts createPublicReturnTicket()   (same)
--   - rh-notification-trigger.ts triggerPublicEmailNotification()
--       (insert channel='email', status='pending')
--   - rh-workflow-engine.ts executeWorkflowsForEvent() (reads only active=true rules)
--   - rh-email-templates.ts getRhEmailTemplateByTenantId() (caller skips disabled templates anyway)

-- =====================================================
-- 1. rh_customers: remove anon SELECT, add SECURITY DEFINER lookup
-- =====================================================

-- Original policy from 20260204_public_ticket_creation.sql
DROP POLICY IF EXISTS "Allow anon to lookup customer by email" ON rh_customers;
-- Replacement (still USING(true)) from 20260215_security_rls_fixes.sql
DROP POLICY IF EXISTS "Anon can lookup customer by email" ON rh_customers;
-- Legacy names from ad-hoc SQL editor runs (already dropped in 20260205, kept for safety)
DROP POLICY IF EXISTS "Public read customers" ON rh_customers;
DROP POLICY IF EXISTS "rh_customers_anon_read" ON rh_customers;

-- Minimal lookup for the public portals: returns ONLY the customer id when
-- tenant + e-mail match exactly. No other PII leaves the database, and no
-- enumeration is possible without already knowing the e-mail address.
CREATE OR REPLACE FUNCTION public_lookup_customer(p_tenant_id UUID, p_email TEXT)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
  SELECT id
  FROM rh_customers
  WHERE tenant_id = p_tenant_id
    AND LOWER(email) = LOWER(TRIM(COALESCE(p_email, '')))
    AND POSITION('@' IN COALESCE(p_email, '')) > 1
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public_lookup_customer(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public_lookup_customer(UUID, TEXT) TO anon, authenticated;

-- =====================================================
-- 2. rh_returns: anon UPDATE only for public cancellation
-- =====================================================
-- Client (publicCancelReturn) sets exactly: status='CANCELLED', updated_at.
-- USING limits which rows anon may touch (client-side CANCELLABLE_STATUSES),
-- WITH CHECK forces the new row state to be a cancellation.

DROP POLICY IF EXISTS "Public cancel returns" ON rh_returns;
CREATE POLICY "Public cancel returns"
ON rh_returns FOR UPDATE
TO anon
USING (status IN ('CREATED', 'PENDING_APPROVAL', 'APPROVED', 'LABEL_GENERATED'))
WITH CHECK (status = 'CANCELLED');

-- =====================================================
-- 3a. rh_customers: hardened anon INSERT
-- =====================================================
-- tenants is anon-readable (USING(true) policy), so the EXISTS check works
-- inside an anon policy expression.

DROP POLICY IF EXISTS "Allow anon to create customer records" ON rh_customers;
DROP POLICY IF EXISTS "Public insert customers" ON rh_customers;
CREATE POLICY "Allow anon to create customer records"
ON rh_customers FOR INSERT
TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM tenants WHERE tenants.id = rh_customers.tenant_id)
  AND email IS NOT NULL
  AND POSITION('@' IN email) > 1
);

-- =====================================================
-- 3b. rh_tickets: hardened anon INSERT
-- =====================================================
-- Public flows always create open, unassigned tickets.

DROP POLICY IF EXISTS "Allow anon to create tickets" ON rh_tickets;
CREATE POLICY "Allow anon to create tickets"
ON rh_tickets FOR INSERT
TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM tenants WHERE tenants.id = rh_tickets.tenant_id)
  AND status = 'open'
  AND assigned_to IS NULL
);

-- =====================================================
-- 3c. rh_ticket_messages: hardened anon INSERT
-- =====================================================
-- Public flows only ever write customer-sent, non-internal messages.

DROP POLICY IF EXISTS "Allow anon to create ticket messages" ON rh_ticket_messages;
CREATE POLICY "Allow anon to create ticket messages"
ON rh_ticket_messages FOR INSERT
TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM tenants WHERE tenants.id = rh_ticket_messages.tenant_id)
  AND sender_type = 'customer'
  AND is_internal IS NOT TRUE
);

-- =====================================================
-- 3d. rh_notifications: hardened anon INSERT
-- =====================================================
-- triggerPublicEmailNotification() only ever inserts channel='email',
-- status='pending'. Also drop the duplicate unrestricted policy
-- "rh_notifications_anon_insert" (FOR INSERT WITH CHECK(true), created in
-- migration-email-notifications.sql) — leaving it in place would OR away the
-- hardened check. Authenticated inserts are covered by the FOR ALL
-- "Tenant isolation for rh_notifications" policy.

DROP POLICY IF EXISTS "Allow anon to create notifications" ON rh_notifications;
DROP POLICY IF EXISTS "rh_notifications_anon_insert" ON rh_notifications;
CREATE POLICY "Allow anon to create notifications"
ON rh_notifications FOR INSERT
TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM tenants WHERE tenants.id = rh_notifications.tenant_id)
  AND channel = 'email'
  AND status = 'pending'
);

-- =====================================================
-- 4. rh_workflow_rules: anon SELECT only for active rules
-- =====================================================
-- Engine already filters .eq('active', true); inactive rules (drafts,
-- disabled automations) are no longer visible to anon.

DROP POLICY IF EXISTS "Anon read workflow rules" ON rh_workflow_rules;
CREATE POLICY "Anon read workflow rules"
ON rh_workflow_rules FOR SELECT
TO anon
USING (active = true);

-- =====================================================
-- 5. rh_email_templates: anon SELECT only for enabled templates
-- =====================================================
-- triggerPublicEmailNotification() skips disabled templates anyway
-- ("template.enabled" check), so hiding them from anon is behavior-neutral.

DROP POLICY IF EXISTS "rh_email_templates_anon_select" ON rh_email_templates;
CREATE POLICY "rh_email_templates_anon_select"
ON rh_email_templates FOR SELECT
TO anon
USING (enabled = true);
