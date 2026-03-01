-- ============================================
-- Influencer & Campaign Module V2 Migration
-- ============================================

-- 1. Extend wh_campaigns: add new statuses + budget_spent
ALTER TABLE wh_campaigns DROP CONSTRAINT IF EXISTS wh_campaigns_status_check;
ALTER TABLE wh_campaigns ADD CONSTRAINT wh_campaigns_status_check
  CHECK (status IN ('draft', 'planning', 'outreach', 'active', 'review', 'completed', 'cancelled'));

ALTER TABLE wh_campaigns
  ADD COLUMN IF NOT EXISTS budget_spent NUMERIC(12,2) DEFAULT 0;

-- 2. Extend wh_content_posts: add thumbnail_url, estimated_reach, content_type, shares
ALTER TABLE wh_content_posts
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS estimated_reach INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'post'
    CHECK (content_type IN ('post', 'story', 'reel', 'video', 'short', 'other')),
  ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;

-- 3. Create wh_campaign_influencers (Many-to-Many Junction + Per-Influencer Tracking)
CREATE TABLE IF NOT EXISTS wh_campaign_influencers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES wh_campaigns(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES wh_contacts(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('invited', 'accepted', 'negotiating', 'contracted', 'sample_sent', 'content_pending', 'content_delivered', 'completed', 'declined', 'cancelled')),
  budget_allocated NUMERIC(12,2) DEFAULT 0,
  budget_spent NUMERIC(12,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  deliverables JSONB DEFAULT '[]'::jsonb,
  compensation_type TEXT DEFAULT 'product_only'
    CHECK (compensation_type IN ('product_only', 'paid', 'affiliate', 'hybrid')),
  contract_terms TEXT,
  payment_terms TEXT,
  notes TEXT,
  invited_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  shipment_id UUID REFERENCES wh_shipments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, contact_id)
);

-- RLS for wh_campaign_influencers
ALTER TABLE wh_campaign_influencers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_campaign_influencers_tenant_select" ON wh_campaign_influencers
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wh_campaign_influencers_tenant_insert" ON wh_campaign_influencers
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wh_campaign_influencers_tenant_update" ON wh_campaign_influencers
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wh_campaign_influencers_tenant_delete" ON wh_campaign_influencers
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wh_campaign_influencers_tenant ON wh_campaign_influencers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_campaign_influencers_campaign ON wh_campaign_influencers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_wh_campaign_influencers_contact ON wh_campaign_influencers(contact_id);
CREATE INDEX IF NOT EXISTS idx_wh_campaign_influencers_status ON wh_campaign_influencers(status);

-- Updated_at trigger
CREATE OR REPLACE TRIGGER wh_campaign_influencers_updated_at
  BEFORE UPDATE ON wh_campaign_influencers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. Create wh_campaign_events (Campaign Timeline / Activity Log)
CREATE TABLE IF NOT EXISTS wh_campaign_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES wh_campaigns(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN (
      'campaign_created', 'campaign_updated', 'campaign_status_changed',
      'influencer_added', 'influencer_removed', 'influencer_status_changed',
      'sample_shipped', 'sample_delivered', 'sample_returned',
      'content_received', 'content_verified',
      'budget_updated', 'deadline_approaching', 'milestone_reached',
      'note_added'
    )),
  description TEXT,
  actor_id UUID REFERENCES auth.users(id),
  actor_type TEXT NOT NULL DEFAULT 'user' CHECK (actor_type IN ('system', 'user')),
  contact_id UUID REFERENCES wh_contacts(id) ON DELETE SET NULL,
  shipment_id UUID REFERENCES wh_shipments(id) ON DELETE SET NULL,
  content_post_id UUID REFERENCES wh_content_posts(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for wh_campaign_events
ALTER TABLE wh_campaign_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wh_campaign_events_tenant_select" ON wh_campaign_events
  FOR SELECT USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wh_campaign_events_tenant_insert" ON wh_campaign_events
  FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wh_campaign_events_tenant_update" ON wh_campaign_events
  FOR UPDATE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "wh_campaign_events_tenant_delete" ON wh_campaign_events
  FOR DELETE USING (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_wh_campaign_events_tenant ON wh_campaign_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wh_campaign_events_campaign ON wh_campaign_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_wh_campaign_events_campaign_time ON wh_campaign_events(campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wh_campaign_events_type ON wh_campaign_events(event_type);
