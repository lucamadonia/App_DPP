-- ============================================
-- Billing & Credits System
-- Migration: 20260207_billing_tables.sql
--
-- Creates 6 billing tables + extends tenants:
-- 1. billing_subscriptions      — Stripe subscription tracking
-- 2. billing_module_subscriptions — Add-on module tracking
-- 3. billing_credits            — Credit balance per tenant
-- 4. billing_credit_transactions — Credit audit log
-- 5. billing_usage_logs         — Granular usage tracking
-- 6. billing_invoices           — Invoice history (Stripe mirror)
-- ============================================

-- Extend tenants table with Stripe customer ID
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;

-- ============================================
-- 1. billing_subscriptions
-- ============================================

CREATE TABLE IF NOT EXISTS billing_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_customer_id TEXT NOT NULL,
    stripe_subscription_id TEXT UNIQUE,
    plan TEXT NOT NULL DEFAULT 'free'
        CHECK (plan IN ('free', 'pro', 'enterprise')),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing', 'paused')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    trial_end TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id)
);

ALTER TABLE billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_subscriptions_select"
    ON billing_subscriptions FOR SELECT
    TO authenticated
    USING (tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- Write operations only via service role (webhooks)

-- ============================================
-- 2. billing_module_subscriptions
-- ============================================

CREATE TABLE IF NOT EXISTS billing_module_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL CHECK (module_id IN (
        'returns_hub_starter', 'returns_hub_professional', 'returns_hub_business',
        'supplier_portal', 'customer_portal', 'custom_domain'
    )),
    stripe_subscription_item_id TEXT,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'canceled', 'past_due')),
    activated_at TIMESTAMPTZ DEFAULT NOW(),
    canceled_at TIMESTAMPTZ,
    UNIQUE(tenant_id, module_id)
);

ALTER TABLE billing_module_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_module_subscriptions_select"
    ON billing_module_subscriptions FOR SELECT
    TO authenticated
    USING (tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- ============================================
-- 3. billing_credits
-- ============================================

CREATE TABLE IF NOT EXISTS billing_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    monthly_allowance INTEGER NOT NULL DEFAULT 3,
    monthly_used INTEGER NOT NULL DEFAULT 0,
    monthly_reset_at TIMESTAMPTZ,
    purchased_balance INTEGER NOT NULL DEFAULT 0,
    total_purchased INTEGER NOT NULL DEFAULT 0,
    total_consumed INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id)
);

ALTER TABLE billing_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_credits_select"
    ON billing_credits FOR SELECT
    TO authenticated
    USING (tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- ============================================
-- 4. billing_credit_transactions
-- ============================================

CREATE TABLE IF NOT EXISTS billing_credit_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'plan_allowance', 'purchase', 'consume', 'refund', 'monthly_reset', 'plan_change'
    )),
    amount INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    source TEXT NOT NULL DEFAULT 'monthly'
        CHECK (source IN ('monthly', 'purchased')),
    description TEXT,
    metadata JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_credit_tx_tenant ON billing_credit_transactions(tenant_id, created_at DESC);

ALTER TABLE billing_credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_credit_transactions_select"
    ON billing_credit_transactions FOR SELECT
    TO authenticated
    USING (tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- ============================================
-- 5. billing_usage_logs
-- ============================================

CREATE TABLE IF NOT EXISTS billing_usage_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    resource_type TEXT NOT NULL CHECK (resource_type IN (
        'product', 'batch', 'document', 'storage_bytes', 'supply_chain_entry',
        'admin_user', 'ai_credit', 'return', 'ticket', 'supplier_invitation',
        'workflow_rule', 'email_template'
    )),
    action TEXT NOT NULL CHECK (action IN ('create', 'delete', 'consume')),
    resource_id TEXT,
    quantity INTEGER DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_tenant_type ON billing_usage_logs(tenant_id, resource_type, created_at DESC);

ALTER TABLE billing_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_usage_logs_select"
    ON billing_usage_logs FOR SELECT
    TO authenticated
    USING (tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- ============================================
-- 6. billing_invoices
-- ============================================

CREATE TABLE IF NOT EXISTS billing_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT UNIQUE NOT NULL,
    stripe_invoice_url TEXT,
    stripe_pdf_url TEXT,
    amount_due INTEGER NOT NULL,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'eur',
    status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_invoices_select"
    ON billing_invoices FOR SELECT
    TO authenticated
    USING (tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- ============================================
-- Initialize billing_credits for all existing tenants (Free plan)
-- ============================================

INSERT INTO billing_credits (tenant_id, monthly_allowance, monthly_used, purchased_balance)
SELECT id, 3, 0, 0 FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;

-- Initialize billing_subscriptions for all existing tenants (Free plan)
INSERT INTO billing_subscriptions (tenant_id, stripe_customer_id, plan, status)
SELECT id, 'pending_' || id::text, 'free', 'active' FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;
