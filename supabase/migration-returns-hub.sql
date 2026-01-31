-- ============================================
-- Returns Hub - Database Migration
-- ============================================
-- Führen Sie dieses SQL im Supabase SQL Editor aus,
-- NACHDEM Sie schema.sql und storage.sql ausgeführt haben.
-- Dieses Script ist idempotent (kann mehrfach ausgeführt werden).
-- ============================================

-- ============================================
-- TABLES
-- ============================================

-- Kunden-Tabelle (Endkunden der Mandanten)
CREATE TABLE IF NOT EXISTS rh_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    external_id TEXT,
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    company TEXT,
    addresses JSONB DEFAULT '[]',
    payment_methods JSONB DEFAULT '[]',
    return_stats JSONB DEFAULT '{"totalReturns":0,"totalValue":0,"returnRate":0}',
    risk_score INTEGER DEFAULT 0,
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Haupttabelle Retouren
CREATE TABLE IF NOT EXISTS rh_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    return_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CREATED'
        CHECK (status IN (
            'CREATED','PENDING_APPROVAL','APPROVED','LABEL_GENERATED',
            'SHIPPED','DELIVERED','INSPECTION_IN_PROGRESS','REFUND_PROCESSING',
            'REFUND_COMPLETED','COMPLETED','REJECTED','CANCELLED'
        )),
    customer_id UUID REFERENCES rh_customers(id),
    order_id TEXT,
    order_date TIMESTAMPTZ,
    reason_category TEXT,
    reason_subcategory TEXT,
    reason_text TEXT,
    desired_solution TEXT CHECK (desired_solution IN ('refund','exchange','voucher','repair')),
    shipping_method TEXT,
    tracking_number TEXT,
    label_url TEXT,
    label_expires_at TIMESTAMPTZ,
    inspection_result JSONB,
    refund_amount NUMERIC(12,2),
    refund_method TEXT,
    refund_reference TEXT,
    refunded_at TIMESTAMPTZ,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    assigned_to UUID REFERENCES profiles(id),
    internal_notes TEXT,
    customs_data JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retouren-Positionen
CREATE TABLE IF NOT EXISTS rh_return_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES rh_returns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    sku TEXT,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(12,2),
    batch_number TEXT,
    serial_number TEXT,
    warranty_status TEXT,
    condition TEXT CHECK (condition IN ('new','like_new','used','damaged','defective')),
    approved BOOLEAN DEFAULT TRUE,
    refund_amount NUMERIC(12,2),
    photos TEXT[] DEFAULT '{}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Status-Timeline
CREATE TABLE IF NOT EXISTS rh_return_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    return_id UUID NOT NULL REFERENCES rh_returns(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    comment TEXT,
    actor_id UUID,
    actor_type TEXT DEFAULT 'system' CHECK (actor_type IN ('system','agent','customer')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM Tickets
CREATE TABLE IF NOT EXISTS rh_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    ticket_number TEXT NOT NULL,
    customer_id UUID REFERENCES rh_customers(id),
    return_id UUID REFERENCES rh_returns(id),
    category TEXT,
    subcategory TEXT,
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting','resolved','closed')),
    subject TEXT NOT NULL,
    assigned_to UUID REFERENCES profiles(id),
    sla_first_response_at TIMESTAMPTZ,
    sla_resolution_at TIMESTAMPTZ,
    first_responded_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket-Nachrichten
CREATE TABLE IF NOT EXISTS rh_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES rh_tickets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('agent','customer','system')),
    sender_id UUID,
    sender_name TEXT,
    sender_email TEXT,
    content TEXT NOT NULL,
    attachments TEXT[] DEFAULT '{}',
    is_internal BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Retourengründe (konfigurierbar pro Mandant)
CREATE TABLE IF NOT EXISTS rh_return_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    subcategories TEXT[] DEFAULT '{}',
    follow_up_questions JSONB DEFAULT '[]',
    requires_photos BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workflow-Regeln
CREATE TABLE IF NOT EXISTS rh_workflow_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    trigger_type TEXT NOT NULL,
    conditions JSONB NOT NULL DEFAULT '{}',
    actions JSONB NOT NULL DEFAULT '[]',
    active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification Log
CREATE TABLE IF NOT EXISTS rh_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    return_id UUID REFERENCES rh_returns(id),
    ticket_id UUID REFERENCES rh_tickets(id),
    customer_id UUID REFERENCES rh_customers(id),
    channel TEXT NOT NULL CHECK (channel IN ('email','sms','push','websocket')),
    template TEXT,
    subject TEXT,
    content TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed')),
    sent_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE rh_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_return_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_return_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_workflow_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================
-- Using DROP IF EXISTS + CREATE for idempotent execution
-- Tenant isolation via profiles subquery (same pattern as existing schema)

-- rh_customers
DROP POLICY IF EXISTS "Tenant isolation for rh_customers" ON rh_customers;
CREATE POLICY "Tenant isolation for rh_customers"
ON rh_customers FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- rh_returns
DROP POLICY IF EXISTS "Tenant isolation for rh_returns" ON rh_returns;
CREATE POLICY "Tenant isolation for rh_returns"
ON rh_returns FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- rh_return_items
DROP POLICY IF EXISTS "Tenant isolation for rh_return_items" ON rh_return_items;
CREATE POLICY "Tenant isolation for rh_return_items"
ON rh_return_items FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- rh_return_timeline
DROP POLICY IF EXISTS "Tenant isolation for rh_return_timeline" ON rh_return_timeline;
CREATE POLICY "Tenant isolation for rh_return_timeline"
ON rh_return_timeline FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- rh_tickets
DROP POLICY IF EXISTS "Tenant isolation for rh_tickets" ON rh_tickets;
CREATE POLICY "Tenant isolation for rh_tickets"
ON rh_tickets FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- rh_ticket_messages
DROP POLICY IF EXISTS "Tenant isolation for rh_ticket_messages" ON rh_ticket_messages;
CREATE POLICY "Tenant isolation for rh_ticket_messages"
ON rh_ticket_messages FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- rh_return_reasons
DROP POLICY IF EXISTS "Tenant isolation for rh_return_reasons" ON rh_return_reasons;
CREATE POLICY "Tenant isolation for rh_return_reasons"
ON rh_return_reasons FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- rh_workflow_rules
DROP POLICY IF EXISTS "Tenant isolation for rh_workflow_rules" ON rh_workflow_rules;
CREATE POLICY "Tenant isolation for rh_workflow_rules"
ON rh_workflow_rules FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- rh_notifications
DROP POLICY IF EXISTS "Tenant isolation for rh_notifications" ON rh_notifications;
CREATE POLICY "Tenant isolation for rh_notifications"
ON rh_notifications FOR ALL
USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- INDEXES
-- ============================================

-- rh_customers
CREATE INDEX IF NOT EXISTS idx_rh_customers_tenant ON rh_customers(tenant_id);

-- rh_returns
CREATE INDEX IF NOT EXISTS idx_rh_returns_tenant ON rh_returns(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rh_returns_number_tenant ON rh_returns(tenant_id, return_number);
CREATE INDEX IF NOT EXISTS idx_rh_returns_status ON rh_returns(status);
CREATE INDEX IF NOT EXISTS idx_rh_returns_customer ON rh_returns(customer_id);
CREATE INDEX IF NOT EXISTS idx_rh_returns_created_at ON rh_returns(created_at);

-- rh_return_items
CREATE INDEX IF NOT EXISTS idx_rh_return_items_tenant ON rh_return_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rh_return_items_return ON rh_return_items(return_id);

-- rh_return_timeline
CREATE INDEX IF NOT EXISTS idx_rh_return_timeline_tenant ON rh_return_timeline(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rh_return_timeline_return ON rh_return_timeline(return_id);

-- rh_tickets
CREATE INDEX IF NOT EXISTS idx_rh_tickets_tenant ON rh_tickets(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_rh_tickets_number_tenant ON rh_tickets(tenant_id, ticket_number);

-- rh_ticket_messages
CREATE INDEX IF NOT EXISTS idx_rh_ticket_messages_tenant ON rh_ticket_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rh_ticket_messages_ticket ON rh_ticket_messages(ticket_id);

-- rh_return_reasons
CREATE INDEX IF NOT EXISTS idx_rh_return_reasons_tenant ON rh_return_reasons(tenant_id);

-- rh_workflow_rules
CREATE INDEX IF NOT EXISTS idx_rh_workflow_rules_tenant ON rh_workflow_rules(tenant_id);

-- rh_notifications
CREATE INDEX IF NOT EXISTS idx_rh_notifications_tenant ON rh_notifications(tenant_id);

-- ============================================
-- TRIGGERS (updated_at)
-- ============================================
-- Reuses the existing update_updated_at() function from schema.sql

DROP TRIGGER IF EXISTS rh_customers_updated_at ON rh_customers;
CREATE TRIGGER rh_customers_updated_at
    BEFORE UPDATE ON rh_customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS rh_returns_updated_at ON rh_returns;
CREATE TRIGGER rh_returns_updated_at
    BEFORE UPDATE ON rh_returns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS rh_tickets_updated_at ON rh_tickets;
CREATE TRIGGER rh_tickets_updated_at
    BEFORE UPDATE ON rh_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS rh_workflow_rules_updated_at ON rh_workflow_rules;
CREATE TRIGGER rh_workflow_rules_updated_at
    BEFORE UPDATE ON rh_workflow_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Return photos bucket (private) - customer-uploaded return item photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'return-photos',
    'return-photos',
    false,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Return labels bucket (private) - shipping labels
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'return-labels',
    'return-labels',
    false,
    5242880, -- 5MB limit
    ARRAY['application/pdf', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf', 'image/png', 'image/jpeg'];

-- ============================================
-- STORAGE POLICIES
-- ============================================
-- Using DROP IF EXISTS + CREATE for idempotent execution

-- Return photos bucket policies

DROP POLICY IF EXISTS "Users can view own tenant return photos" ON storage.objects;
CREATE POLICY "Users can view own tenant return photos"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'return-photos'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can upload return photos" ON storage.objects;
CREATE POLICY "Users can upload return photos"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'return-photos'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
);

DROP POLICY IF EXISTS "Users can delete return photos" ON storage.objects;
CREATE POLICY "Users can delete return photos"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'return-photos'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
);

-- Return labels bucket policies

DROP POLICY IF EXISTS "Users can view own tenant return labels" ON storage.objects;
CREATE POLICY "Users can view own tenant return labels"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'return-labels'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can upload return labels" ON storage.objects;
CREATE POLICY "Users can upload return labels"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'return-labels'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
);

DROP POLICY IF EXISTS "Users can delete return labels" ON storage.objects;
CREATE POLICY "Users can delete return labels"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'return-labels'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM profiles WHERE id = auth.uid())
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'editor')
    )
);

-- ============================================
-- FERTIG
-- ============================================

SELECT 'Returns Hub Tabellen, Policies, Indizes und Storage erfolgreich erstellt!' AS status;
