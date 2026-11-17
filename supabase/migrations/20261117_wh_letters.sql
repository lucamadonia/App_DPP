-- Standalone letter mail (Deutsche Post INTERNETMARKE) — franked letters that
-- are not tied to a warehouse shipment, e.g. invoices sent by post.
--
-- Rows are written only by the dhl-shipping Edge Function (service role),
-- because every row corresponds to a real Portokasse purchase. Tenants read
-- their own history.

CREATE TABLE IF NOT EXISTS public.wh_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reference TEXT,
  recipient_name TEXT NOT NULL,
  recipient_additional_name TEXT,
  recipient_street TEXT NOT NULL,
  recipient_postal_code TEXT NOT NULL,
  recipient_city TEXT NOT NULL,
  recipient_country TEXT NOT NULL DEFAULT 'DEU',
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  shop_order_id TEXT,
  voucher_id TEXT,
  track_id TEXT,
  stamp_storage_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'purchased' CHECK (status IN ('purchased', 'refund_requested')),
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wh_letters_tenant_created
  ON public.wh_letters (tenant_id, created_at DESC);

ALTER TABLE public.wh_letters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wh_letters_tenant_select ON public.wh_letters;
CREATE POLICY wh_letters_tenant_select ON public.wh_letters
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

REVOKE ALL ON public.wh_letters FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.wh_letters FROM authenticated;
GRANT SELECT ON public.wh_letters TO authenticated;
