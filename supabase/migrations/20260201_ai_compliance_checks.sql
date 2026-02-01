-- AI Compliance Checks table
-- Stores AI-generated compliance analysis results per product (optionally per batch)

CREATE TABLE IF NOT EXISTS ai_compliance_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
    overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    executive_summary TEXT NOT NULL,
    findings JSONB NOT NULL DEFAULT '[]',
    risk_matrix JSONB NOT NULL DEFAULT '[]',
    action_plan JSONB NOT NULL DEFAULT '[]',
    recommendations JSONB NOT NULL DEFAULT '[]',
    raw_responses JSONB,
    input_data_snapshot JSONB,
    model_used TEXT DEFAULT 'anthropic/claude-sonnet-4',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_compliance_checks_tenant ON ai_compliance_checks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_compliance_checks_product ON ai_compliance_checks(product_id);
CREATE INDEX IF NOT EXISTS idx_ai_compliance_checks_created ON ai_compliance_checks(created_at DESC);

-- RLS Policies
ALTER TABLE ai_compliance_checks ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own checks
CREATE POLICY "ai_compliance_checks_select" ON ai_compliance_checks
    FOR SELECT USING (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Tenant members can insert checks
CREATE POLICY "ai_compliance_checks_insert" ON ai_compliance_checks
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Only the creator or admins can delete checks
CREATE POLICY "ai_compliance_checks_delete" ON ai_compliance_checks
    FOR DELETE USING (
        created_by = auth.uid()
        OR tenant_id IN (
            SELECT tenant_id FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );
