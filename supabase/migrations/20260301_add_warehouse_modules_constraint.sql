-- Migration: Add warehouse modules to CHECK constraint + activate all for luca@madonia-freiburg.de
-- Date: 2026-03-01

-- Step 1: Extend CHECK constraint to include warehouse modules
ALTER TABLE billing_module_subscriptions
  DROP CONSTRAINT IF EXISTS billing_module_subscriptions_module_id_check;

ALTER TABLE billing_module_subscriptions
  ADD CONSTRAINT billing_module_subscriptions_module_id_check
  CHECK (module_id IN (
    'returns_hub_starter', 'returns_hub_professional', 'returns_hub_business',
    'supplier_portal', 'customer_portal', 'custom_domain',
    'warehouse_starter', 'warehouse_professional', 'warehouse_business'
  ));

-- Step 2: Activate Enterprise plan for luca@madonia-freiburg.de
UPDATE billing_subscriptions
SET plan = 'enterprise', status = 'active', updated_at = NOW()
WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE email = 'luca@madonia-freiburg.de' LIMIT 1);

-- Step 3: Set 100 AI Credits/month
UPDATE billing_credits
SET monthly_allowance = 100, monthly_used = 0
WHERE tenant_id = (SELECT tenant_id FROM profiles WHERE email = 'luca@madonia-freiburg.de' LIMIT 1);

-- Step 4: Activate all 9 modules
INSERT INTO billing_module_subscriptions (tenant_id, module_id, status)
SELECT t.tenant_id, m.module_id, 'active'
FROM (SELECT tenant_id FROM profiles WHERE email = 'luca@madonia-freiburg.de' LIMIT 1) t
CROSS JOIN (VALUES
  ('returns_hub_starter'), ('returns_hub_professional'), ('returns_hub_business'),
  ('supplier_portal'), ('customer_portal'), ('custom_domain'),
  ('warehouse_starter'), ('warehouse_professional'), ('warehouse_business')
) AS m(module_id)
ON CONFLICT (tenant_id, module_id) DO UPDATE
SET status = 'active', canceled_at = NULL;
