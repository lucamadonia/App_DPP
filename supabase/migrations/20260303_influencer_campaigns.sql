-- ============================================
-- Influencer & Campaign Management Migration
-- ============================================

-- 1. Extend wh_contacts with influencer fields
ALTER TABLE wh_contacts
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS tiktok_handle TEXT,
  ADD COLUMN IF NOT EXISTS youtube_handle TEXT,
  ADD COLUMN IF NOT EXISTS other_social_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_platform TEXT,
  ADD COLUMN IF NOT EXISTS follower_count INTEGER,
  ADD COLUMN IF NOT EXISTS engagement_rate NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS niche TEXT,
  ADD COLUMN IF NOT EXISTS influencer_tier TEXT;

-- Update CHECK constraint for contact type to include 'influencer'
ALTER TABLE wh_contacts DROP CONSTRAINT IF EXISTS wh_contacts_type_check;
ALTER TABLE wh_contacts ADD CONSTRAINT wh_contacts_type_check
  CHECK (type IN ('b2b', 'b2c', 'supplier', 'influencer', 'other'));

-- Check constraints for new fields
ALTER TABLE wh_contacts ADD CONSTRAINT wh_contacts_primary_platform_check
  CHECK (primary_platform IS NULL OR primary_platform IN ('instagram', 'tiktok', 'youtube', 'twitter', 'pinterest', 'other'));
ALTER TABLE wh_contacts ADD CONSTRAINT wh_contacts_influencer_tier_check
  CHECK (influencer_tier IS NULL OR influencer_tier IN ('nano', 'micro', 'mid', 'macro', 'mega'));

-- 2. Extend wh_shipments with sample_meta JSONB
ALTER TABLE wh_shipments
  ADD COLUMN IF NOT EXISTS sample_meta JSONB;

-- Update CHECK constraint for recipient_type to include 'influencer'
ALTER TABLE wh_shipments DROP CONSTRAINT IF EXISTS wh_shipments_recipient_type_check;
ALTER TABLE wh_shipments ADD CONSTRAINT wh_shipments_recipient_type_check
  CHECK (recipient_type IN ('customer', 'b2b_partner', 'warehouse', 'influencer', 'other'));

-- Expression indexes for querying sample_meta
CREATE INDEX IF NOT EXISTS idx_wh_shipments_sample_status
  ON wh_shipments ((sample_meta->>'sampleStatus'))
  WHERE sample_meta IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wh_shipments_campaign_id
  ON wh_shipments ((sample_meta->>'campaignId'))
  WHERE sample_meta IS NOT NULL;

-- 3. Create wh_campaigns table
CREATE TABLE IF NOT EXISTS wh_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  start_date DATE,
  end_date DATE,
  budget NUMERIC(12,2),
  currency TEXT NOT NULL DEFAULT 'EUR',
  goals TEXT,
  product_ids UUID[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for wh_campaigns
ALTER TABLE wh_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_campaigns_tenant_select" ON wh_campaigns
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wh_campaigns_tenant_insert" ON wh_campaigns
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wh_campaigns_tenant_update" ON wh_campaigns
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wh_campaigns_tenant_delete" ON wh_campaigns
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wh_campaigns_tenant ON wh_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_campaigns_status ON wh_campaigns(status);

-- Updated_at trigger
CREATE OR REPLACE TRIGGER wh_campaigns_updated_at
  BEFORE UPDATE ON wh_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Create wh_content_posts table
CREATE TABLE IF NOT EXISTS wh_content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shipment_id UUID NOT NULL REFERENCES wh_shipments(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES wh_campaigns(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES wh_contacts(id) ON DELETE SET NULL,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'youtube', 'twitter', 'pinterest', 'other')),
  post_url TEXT NOT NULL,
  posted_at TIMESTAMPTZ,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  engagement_rate NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for wh_content_posts
ALTER TABLE wh_content_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_content_posts_tenant_select" ON wh_content_posts
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wh_content_posts_tenant_insert" ON wh_content_posts
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wh_content_posts_tenant_update" ON wh_content_posts
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wh_content_posts_tenant_delete" ON wh_content_posts
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wh_content_posts_tenant ON wh_content_posts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_content_posts_shipment ON wh_content_posts(shipment_id);
CREATE INDEX IF NOT EXISTS idx_wh_content_posts_campaign ON wh_content_posts(campaign_id);

-- Updated_at trigger
CREATE OR REPLACE TRIGGER wh_content_posts_updated_at
  BEFORE UPDATE ON wh_content_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
