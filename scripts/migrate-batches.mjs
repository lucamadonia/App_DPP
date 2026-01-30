/**
 * Migration: Product Batches System
 *
 * Creates the product_batches table, adds batch_id to documents and
 * supply_chain_entries, sets up indexes/RLS/triggers, and migrates
 * existing product data into batch records.
 *
 * Usage:
 *   node scripts/migrate-batches.mjs
 *
 * Environment variables (read from .env in project root):
 *   SUPABASE_URL              – e.g. https://xyzabc.supabase.co  (falls back to VITE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY – service-role secret (NOT the anon key)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadDotenv(filePath) {
  if (!existsSync(filePath)) return;
  const content = readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex < 0) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadDotenv(resolve(__dirname, '..', '.env'));

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Add SUPABASE_SERVICE_ROLE_KEY to your .env file (find it in Supabase Dashboard → Settings → API).');
  process.exit(1);
}

async function runSQL(sql, label) {
  console.log(`\n▶ ${label}...`);
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    // Try the pg_net / sql endpoint fallback
    console.error(`  REST /rpc failed (${res.status}): ${text}`);
    return false;
  }
  console.log(`  ✓ Done`);
  return true;
}

async function runSQLViaQuery(sql, label) {
  console.log(`\n▶ ${label}...`);

  // Use the Supabase Management API SQL endpoint
  // Extract project ref from URL
  const match = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    console.error('  Cannot extract project ref from URL');
    return false;
  }

  // Try using PostgREST RPC with a raw SQL function
  // First, try creating a temporary function to run SQL
  const wrappedSQL = `
    DO $$
    BEGIN
      ${sql.replace(/'/g, "''")}
    END $$;
  `;

  // Use the /sql endpoint (available with service role key)
  const res = await fetch(`${SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (res.ok) {
    console.log(`  ✓ Done`);
    return true;
  }

  // Fallback: try the /rest/v1/rpc/exec_sql pattern
  const text = await res.text();
  console.error(`  Query endpoint failed (${res.status}): ${text}`);
  return false;
}

// ---------------------------------------------------------------------------
// Migration Steps
// ---------------------------------------------------------------------------

const STEP_1_CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS product_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    batch_number TEXT,
    serial_number TEXT NOT NULL,
    production_date DATE NOT NULL,
    expiration_date DATE,
    net_weight NUMERIC,
    gross_weight NUMERIC,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'archived')),
    notes TEXT,
    materials_override JSONB,
    certifications_override JSONB,
    carbon_footprint_override JSONB,
    recyclability_override JSONB,
    description_override TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, product_id, serial_number)
);
`;

const STEP_2_ADD_BATCH_ID_COLUMNS = `
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'batch_id') THEN
        ALTER TABLE documents ADD COLUMN batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supply_chain_entries' AND column_name = 'batch_id') THEN
        ALTER TABLE supply_chain_entries ADD COLUMN batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL;
    END IF;
END $$;
`;

const STEP_3_INDEXES = `
CREATE INDEX IF NOT EXISTS idx_batches_tenant ON product_batches(tenant_id);
CREATE INDEX IF NOT EXISTS idx_batches_product ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON product_batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_serial_number ON product_batches(serial_number);
CREATE INDEX IF NOT EXISTS idx_batches_product_serial ON product_batches(product_id, serial_number);
CREATE INDEX IF NOT EXISTS idx_documents_batch ON documents(batch_id);
CREATE INDEX IF NOT EXISTS idx_supply_chain_batch ON supply_chain_entries(batch_id);
`;

const STEP_4_RLS = `
ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist (idempotent)
DROP POLICY IF EXISTS "Users can view batches in their tenant" ON product_batches;
DROP POLICY IF EXISTS "Public can view batches for DPP" ON product_batches;
DROP POLICY IF EXISTS "Editors can create batches" ON product_batches;
DROP POLICY IF EXISTS "Editors can update batches" ON product_batches;
DROP POLICY IF EXISTS "Admins can delete batches" ON product_batches;

CREATE POLICY "Users can view batches in their tenant"
    ON product_batches FOR SELECT
    USING (tenant_id = get_user_tenant_id());

CREATE POLICY "Public can view batches for DPP"
    ON product_batches FOR SELECT
    USING (true);

CREATE POLICY "Editors can create batches"
    ON product_batches FOR INSERT
    WITH CHECK (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Editors can update batches"
    ON product_batches FOR UPDATE
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'editor')
        )
    );

CREATE POLICY "Admins can delete batches"
    ON product_batches FOR DELETE
    USING (
        tenant_id = get_user_tenant_id()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
`;

const STEP_5_TRIGGER = `
CREATE TRIGGER product_batches_updated_at
    BEFORE UPDATE ON product_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
`;

const STEP_6_MIGRATE_DATA = `
INSERT INTO product_batches (tenant_id, product_id, batch_number, serial_number, production_date, expiration_date, net_weight, gross_weight, status)
SELECT
    tenant_id,
    id,
    batch_number,
    serial_number,
    production_date,
    expiration_date,
    net_weight,
    gross_weight,
    COALESCE(status, 'draft')
FROM products
WHERE serial_number IS NOT NULL AND serial_number != ''
ON CONFLICT (tenant_id, product_id, serial_number) DO NOTHING;
`;

const STEP_7_MIGRATE_DOCUMENTS = `
UPDATE documents d
SET batch_id = pb.id
FROM product_batches pb
WHERE d.product_id = pb.product_id
  AND d.batch_id IS NULL;
`;

const STEP_8_MIGRATE_SUPPLY_CHAIN = `
UPDATE supply_chain_entries sc
SET batch_id = pb.id
FROM product_batches pb
WHERE sc.product_id = pb.product_id
  AND sc.batch_id IS NULL;
`;

// ---------------------------------------------------------------------------
// Full migration as one SQL block (for Dashboard paste)
// ---------------------------------------------------------------------------

const FULL_MIGRATION = [
  '-- Step 1: Create product_batches table',
  STEP_1_CREATE_TABLE,
  '-- Step 2: Add batch_id columns to existing tables',
  STEP_2_ADD_BATCH_ID_COLUMNS,
  '-- Step 3: Indexes',
  STEP_3_INDEXES,
  '-- Step 4: RLS policies',
  STEP_4_RLS,
  '-- Step 5: Trigger',
  `DO $$ BEGIN ${STEP_5_TRIGGER} EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  '-- Step 6: Migrate existing products to batches',
  STEP_6_MIGRATE_DATA,
  '-- Step 7: Migrate document references',
  STEP_7_MIGRATE_DOCUMENTS,
  '-- Step 8: Migrate supply chain references',
  STEP_8_MIGRATE_SUPPLY_CHAIN,
].join('\n');

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== Product Batches Migration ===');
  console.log(`Target: ${SUPABASE_URL}\n`);

  // Try running via the pg/query endpoint first
  let success = await runSQLViaQuery(FULL_MIGRATION, 'Running full migration');

  if (!success) {
    console.log('\n--- Direct SQL endpoint not available. ---');
    console.log('Please paste the following SQL into your Supabase Dashboard SQL Editor:\n');
    console.log('Go to: https://supabase.com/dashboard → Your Project → SQL Editor → New Query\n');
    console.log('─'.repeat(60));
    console.log(FULL_MIGRATION);
    console.log('─'.repeat(60));
    console.log('\nAlternatively, add SUPABASE_SERVICE_ROLE_KEY to your .env and ensure the project supports the SQL API.');
  }
}

main().catch(console.error);
