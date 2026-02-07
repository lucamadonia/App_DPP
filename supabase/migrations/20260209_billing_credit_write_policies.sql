-- ============================================
-- Fix: Allow authenticated users to consume credits
--
-- The billing tables only had SELECT policies, causing
-- consumeCredits() to silently fail from the browser.
-- Add UPDATE on billing_credits + INSERT on billing_credit_transactions
-- for the user's own tenant.
-- ============================================

-- Allow users to update their own tenant's credit balance
CREATE POLICY "billing_credits_update_own"
    ON billing_credits FOR UPDATE
    TO authenticated
    USING (tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ))
    WITH CHECK (tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- Allow users to insert credit transaction logs for their own tenant
CREATE POLICY "billing_credit_transactions_insert_own"
    ON billing_credit_transactions FOR INSERT
    TO authenticated
    WITH CHECK (tenant_id = (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));
