-- =============================================================================
-- Migration: Add feedback_* modules to billing_module_subscriptions CHECK constraint
-- Date: 2026-05-19 (suffix c)
--
-- Schema-drift fix: src/types/billing.ts declares three feedback tiers
--   ('feedback_starter', 'feedback_professional', 'feedback_business')
-- but the DB CHECK constraint (last updated in 20260426_commerce_channels.sql)
-- doesn't list them. As a result:
--   - INSERTing a feedback subscription via standard service code fails.
--   - feedback-requests.ts hasModule('feedback_starter') always returns false.
--   - engagement-mail-cron's tenant filter finds zero eligible tenants.
--
-- This migration drops + re-adds the constraint with the three feedback modules
-- included, mirroring the TypeScript ModuleId union exactly.
--
-- Idempotent: re-running is a no-op (CONSTRAINT IF EXISTS guard).
-- =============================================================================

ALTER TABLE billing_module_subscriptions
    DROP CONSTRAINT IF EXISTS billing_module_subscriptions_module_id_check;

ALTER TABLE billing_module_subscriptions
    ADD CONSTRAINT billing_module_subscriptions_module_id_check
    CHECK (module_id IN (
        'returns_hub_starter', 'returns_hub_professional', 'returns_hub_business',
        'supplier_portal', 'customer_portal', 'custom_domain',
        'warehouse_starter', 'warehouse_professional', 'warehouse_business',
        'commerce_hub_starter', 'commerce_hub_professional', 'commerce_hub_business',
        'feedback_starter', 'feedback_professional', 'feedback_business'
    ));

-- =============================================================================
-- Verification:
--
--   SELECT pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conname = 'billing_module_subscriptions_module_id_check';
--   -- expect: CHECK clause listing all 15 modules including 'feedback_starter'.
-- =============================================================================
