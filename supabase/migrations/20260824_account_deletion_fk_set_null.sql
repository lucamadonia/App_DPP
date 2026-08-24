-- ============================================
-- Account deletion: make the 13 outlier FKs onto auth.users SET NULL
-- 2026-08-24
--
-- PROBLEM
-- The in-app account deletion (App Store guideline 5.1.1 v) ends in
-- auth.admin.deleteUser(). 35 foreign keys reference auth.users:
--
--   10x CASCADE    - auth-internal tables + profiles.id, rh_customer_profiles.id
--   12x SET NULL   - admin_audit_log.admin_id, compliance_audit_log.performed_by,
--                    feedback_*, rh_customer_notes.author_id, ...
--   13x NO ACTION  - the ones fixed here
--
-- Those 13 BLOCK the delete with a foreign-key violation as soon as the user has
-- uploaded a document, created a supplier, invited someone, or consumed AI
-- credits — i.e. for essentially every real admin. The profile row is deleted
-- first, so the failure left the account half-deleted: no profile, but still
-- able to sign in. Verified against the live schema, not assumed.
--
-- DECISION: SET NULL. Not CASCADE, and not blocking the deletion.
--
-- The business record must survive — §147 AO / §257 HGB require retention of
-- commercial and tax-relevant records, and a document or a credit transaction is
-- not the user's personal data merely because they touched it. What must go is
-- the personal attribution. Severing the link while keeping the record is
-- exactly that, and it is what GDPR Art. 17 erasure means in the presence of a
-- retention obligation.
--
-- This is not a new policy. 12 other FKs onto auth.users ALREADY do this
-- (audit logs, compliance logs, feedback authorship). These 13 were simply
-- inconsistent with the rule the schema had already settled on.
--
-- All 13 columns were confirmed nullable before writing this, so SET NULL
-- cannot fail against a NOT NULL constraint.
--
-- CASCADE would have been wrong: deleting one admin would take their uploaded
-- documents, the suppliers they created and the billing history with them.
-- Blocking the deletion would have been wrong too: it makes an App Store
-- requirement unfulfillable for any user who has ever done anything.
--
-- SAFE TO RE-RUN. Changes only the ON DELETE rule; no columns, no data and no
-- values are touched. Existing rows keep their current uploaded_by/created_by.
-- ============================================

BEGIN;

-- documents + versions: the document is retained, its uploader is forgotten.
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_uploaded_by_fkey,
  ADD CONSTRAINT documents_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.document_versions
  DROP CONSTRAINT IF EXISTS document_versions_uploaded_by_fkey,
  ADD CONSTRAINT document_versions_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Billing: financial history is retention-relevant and must not be deleted,
-- but it does not need to name a person.
ALTER TABLE public.billing_credit_transactions
  DROP CONSTRAINT IF EXISTS billing_credit_transactions_user_id_fkey,
  ADD CONSTRAINT billing_credit_transactions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.billing_usage_logs
  DROP CONSTRAINT IF EXISTS billing_usage_logs_user_id_fkey,
  ADD CONSTRAINT billing_usage_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Compliance evidence: the check result is the record, not who started it.
ALTER TABLE public.ai_compliance_checks
  DROP CONSTRAINT IF EXISTS ai_compliance_checks_created_by_fkey,
  ADD CONSTRAINT ai_compliance_checks_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.checklist_progress
  DROP CONSTRAINT IF EXISTS checklist_progress_updated_by_fkey,
  ADD CONSTRAINT checklist_progress_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Suppliers: the supplier belongs to the tenant, not to whoever entered it.
ALTER TABLE public.suppliers
  DROP CONSTRAINT IF EXISTS suppliers_created_by_fkey,
  ADD CONSTRAINT suppliers_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.suppliers
  DROP CONSTRAINT IF EXISTS suppliers_verified_by_fkey,
  ADD CONSTRAINT suppliers_verified_by_fkey
    FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Invitations: keep the record of who joined, drop who invited them.
ALTER TABLE public.invitations
  DROP CONSTRAINT IF EXISTS invitations_invited_by_fkey,
  ADD CONSTRAINT invitations_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_invited_by_fkey,
  ADD CONSTRAINT profiles_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Tenant assets and campaigns.
ALTER TABLE public.tenant_pictograms
  DROP CONSTRAINT IF EXISTS tenant_pictograms_uploaded_by_fkey,
  ADD CONSTRAINT tenant_pictograms_uploaded_by_fkey
    FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.wh_campaigns
  DROP CONSTRAINT IF EXISTS wh_campaigns_created_by_fkey,
  ADD CONSTRAINT wh_campaigns_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.wh_campaign_events
  DROP CONSTRAINT IF EXISTS wh_campaign_events_actor_id_fkey,
  ADD CONSTRAINT wh_campaign_events_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMIT;

-- VERIFY (must return 0 rows after this migration):
--   SELECT cl.relname, a.attname
--   FROM pg_constraint c
--   JOIN pg_class cl ON cl.oid = c.conrelid
--   JOIN pg_class rf ON rf.oid = c.confrelid
--   JOIN pg_attribute a ON a.attrelid = cl.oid AND a.attnum = ANY(c.conkey)
--   WHERE c.contype = 'f'
--     AND rf.relname = 'users'
--     AND rf.relnamespace::regnamespace::text = 'auth'
--     AND cl.relnamespace::regnamespace::text = 'public'
--     AND c.confdeltype = 'a';
