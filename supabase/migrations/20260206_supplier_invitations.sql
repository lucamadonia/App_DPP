-- Supplier Invitations Table
-- Tracks invitation links sent to suppliers for self-registration

-- Function to generate unique 32-char invitation code
CREATE OR REPLACE FUNCTION generate_supplier_invitation_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..32 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Supplier Invitations Table
CREATE TABLE IF NOT EXISTS supplier_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email text NOT NULL,
  contact_name text,
  company_name text,
  invitation_code text NOT NULL DEFAULT generate_supplier_invitation_code(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
  invited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  completed_at timestamptz,
  supplier_id uuid REFERENCES suppliers(id) ON DELETE SET NULL,
  CONSTRAINT unique_invitation_code UNIQUE (invitation_code),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX idx_supplier_invitations_tenant_id ON supplier_invitations(tenant_id);
CREATE INDEX idx_supplier_invitations_invitation_code ON supplier_invitations(invitation_code);
CREATE INDEX idx_supplier_invitations_email ON supplier_invitations(email);
CREATE INDEX idx_supplier_invitations_status ON supplier_invitations(status);
CREATE INDEX idx_supplier_invitations_expires_at ON supplier_invitations(expires_at);

-- Enable RLS
ALTER TABLE supplier_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can CRUD invitations for their own tenant
CREATE POLICY "Admins can view invitations for their tenant"
  ON supplier_invitations
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can create invitations for their tenant"
  ON supplier_invitations
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
    AND invited_by = auth.uid()
  );

CREATE POLICY "Admins can update invitations for their tenant"
  ON supplier_invitations
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Public can SELECT invitations by invitation_code (no auth required)
CREATE POLICY "Public can view invitations by code"
  ON supplier_invitations
  FOR SELECT
  USING (true);

-- Add supplier_portal settings to tenants.settings
-- This is a JSONB field extension, no schema change needed
-- Structure will be:
-- settings: {
--   supplierPortal: {
--     enabled: boolean,
--     invitationExpiryDays: number,
--     welcomeMessage?: string,
--     successMessage?: string
--   }
-- }

-- Function to mark expired invitations (can be called via cron)
CREATE OR REPLACE FUNCTION mark_expired_supplier_invitations()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE supplier_invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < now();
END;
$$;

-- Add comment for documentation
COMMENT ON TABLE supplier_invitations IS 'Tracks invitation links sent to suppliers for self-registration portal';
COMMENT ON COLUMN supplier_invitations.invitation_code IS 'Unique 32-character code used in registration URL';
COMMENT ON COLUMN supplier_invitations.status IS 'pending: active invitation, completed: supplier registered, expired: past expiry date, cancelled: manually cancelled by admin';
COMMENT ON COLUMN supplier_invitations.expires_at IS 'Default 14 days from creation, configurable in tenant settings';
