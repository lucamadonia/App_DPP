-- Trackbliss bookkeeping dimensions and Stripe source references.
-- The Stripe invoice number remains the sole customer-facing invoice number.
ALTER TABLE public.billing_invoices
  ADD COLUMN IF NOT EXISTS project_code text,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
  ADD COLUMN IF NOT EXISTS stripe_created_at timestamptz;

-- This table contains only invoices of Trackbliss tenants. Historical Stripe
-- numbers and payment IDs require a separate Stripe API backfill/reconciliation.
UPDATE public.billing_invoices SET project_code = 'TRACK' WHERE project_code IS NULL;
ALTER TABLE public.billing_invoices ALTER COLUMN project_code SET DEFAULT 'TRACK';
ALTER TABLE public.billing_invoices ALTER COLUMN project_code SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'billing_invoices_project_code_track'
      AND conrelid = 'public.billing_invoices'::regclass
  ) THEN
    ALTER TABLE public.billing_invoices
      ADD CONSTRAINT billing_invoices_project_code_track CHECK (project_code = 'TRACK');
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS billing_invoices_project_created_idx
  ON public.billing_invoices (project_code, created_at DESC);
CREATE INDEX IF NOT EXISTS billing_invoices_subscription_idx
  ON public.billing_invoices (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
