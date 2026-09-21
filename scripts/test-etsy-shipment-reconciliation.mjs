import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

// Isolated PostgreSQL regression harness. Install the test-only runtime with:
// npm install --prefix tmp/etsy-qa --no-save --package-lock=false @electric-sql/pglite
const db = new PGlite();
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE commerce_orders (id uuid PRIMARY KEY, tenant_id uuid, platform text, external_order_id text,
 raw_payload jsonb, metadata jsonb, customer_name text, customer_email text, customer_city text,
 customer_postal_code text, customer_country text, currency text);
CREATE TABLE commerce_order_items (id uuid DEFAULT gen_random_uuid(), tenant_id uuid, order_id uuid,
 product_id uuid, quantity integer, unit_price numeric);
CREATE TABLE wh_locations (id uuid PRIMARY KEY, tenant_id uuid, created_at timestamptz DEFAULT now());
CREATE TABLE product_batches (id uuid PRIMARY KEY, product_id uuid, tenant_id uuid, created_at timestamptz DEFAULT now());
CREATE TABLE wh_shipments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid,
 shipment_number text, status text, recipient_type text, recipient_name text, recipient_email text,
 shipping_street text, shipping_city text, shipping_state text, shipping_postal_code text,
 shipping_country text, total_items integer, order_reference text, notes text);
CREATE TABLE wh_shipment_items (id uuid DEFAULT gen_random_uuid(), tenant_id uuid, shipment_id uuid,
 product_id uuid NOT NULL, batch_id uuid, location_id uuid NOT NULL, quantity integer CHECK(quantity > 0), unit_price numeric, currency text);
`);
await db.exec(await readFile(new URL('../supabase/migrations/20260921_etsy_shipment_reconciliation.sql', import.meta.url), 'utf8'));
const tenant = '00000000-0000-0000-0000-000000000001';
const other = '00000000-0000-0000-0000-000000000002';
const order = '00000000-0000-0000-0000-000000000003';
const product = '00000000-0000-0000-0000-000000000004';
const shipment = '00000000-0000-0000-0000-000000000005';
await db.query(`INSERT INTO commerce_orders VALUES ($1,$2,'etsy','4175972528','{"first_line":"Teststrasse 1","city":"Koeln","zip":"50996"}', '{"shopId":"keep-me"}', 'Test',null,'Koeln','50996','DE','EUR')`, [order, tenant]);
await db.query(`INSERT INTO wh_locations(id,tenant_id) VALUES ($1,$2)`, [tenant, tenant]);
await db.query(`INSERT INTO commerce_order_items(tenant_id,order_id,product_id,quantity,unit_price) VALUES ($1,$2,$3,1,20),($1,$2,$3,1,20)`, [tenant,order,product]);
await db.query(`INSERT INTO wh_shipments(id,tenant_id,shipment_number,status,total_items,order_reference) VALUES ($1,$2,'SHP-EXISTING','draft',2,'Etsy 4175972528')`, [shipment,tenant]);
const reconcile = async (tenantId = tenant) => (await db.query('SELECT reconcile_etsy_shipment($1,$2) AS result', [order,tenantId])).rows[0].result;
let result = await reconcile();
assert.equal(result.shipmentNumber, 'SHP-EXISTING');
assert.equal(result.reused, true);
assert.equal(result.itemsCreated, 1);
let rows = (await db.query('SELECT * FROM wh_shipment_items')).rows;
assert.equal(rows.length, 1);
assert.equal(rows[0].quantity, 2);
assert.equal(rows[0].batch_id, null);
assert.equal((await reconcile()).itemsCreated, 0);
assert.equal((await db.query('SELECT count(*)::int AS n FROM wh_shipments')).rows[0].n, 1);
assert.equal((await db.query('SELECT metadata FROM commerce_orders')).rows[0].metadata.shopId, 'keep-me');
console.log('PASS: empty legacy draft repaired, no batch required, repeated product quantities, retry idempotence, metadata preserved');
await db.query('UPDATE wh_shipment_items SET quantity = 1');
result = await reconcile();
assert.equal(result.itemsCreated, 1);
assert.equal((await db.query('SELECT sum(quantity)::int AS n FROM wh_shipment_items')).rows[0].n, 2);
console.log('PASS: partial shipment only receives missing quantity');
await db.query("UPDATE wh_shipments SET status = 'packed'");
await assert.rejects(reconcile(), /Only draft/);
await assert.rejects(reconcile(other), /not found/);
console.log('PASS: packed shipment and wrong tenant rejected');
await db.query("UPDATE wh_shipments SET status = 'draft'");
await db.query('UPDATE commerce_order_items SET product_id = null');
await assert.rejects(reconcile(), /Assign all/);
assert.equal((await db.query('SELECT sum(quantity)::int AS n FROM wh_shipment_items')).rows[0].n, 2);
await db.query('UPDATE commerce_order_items SET product_id = $1', [product]);
await db.exec('DELETE FROM wh_shipment_items; DELETE FROM wh_shipments; DELETE FROM wh_locations;');
await assert.rejects(reconcile(), /warehouse location/);
assert.equal((await db.query('SELECT count(*)::int AS n FROM wh_shipments')).rows[0].n, 0);
console.log('PASS: missing assignments/location cannot produce empty headers');
await db.query('INSERT INTO wh_locations(id,tenant_id) VALUES ($1,$2)',[tenant,tenant]);
result = await reconcile();
assert.equal(result.reused, false);
assert.equal(result.itemCount, 1);
assert.equal((await db.query('SELECT total_items FROM wh_shipments')).rows[0].total_items, 2);
console.log('PASS: fresh shipment is created with consistent quantity total');
await db.exec("DELETE FROM wh_shipment_items; UPDATE wh_shipments SET status = 'picking';");
assert.equal((await reconcile()).itemsCreated, 1);
assert.equal((await db.query('SELECT status FROM wh_shipments')).rows[0].status, 'picking');
await assert.rejects(reconcile(), /Only draft/);
console.log('PASS: empty picking shipment repaired without changing status; populated picking shipment protected');
// Invoker security must respect the calling tenant, even with a forged parameter.
await db.exec(`ALTER TABLE commerce_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_read ON commerce_orders USING (tenant_id::text = current_setting('test.tenant'));
GRANT SELECT, UPDATE ON commerce_orders TO authenticated;
SET ROLE authenticated;`);
await db.query("SELECT set_config('test.tenant', $1, false)", [other]);
await assert.rejects(reconcile(), /not found/);
await db.exec('RESET ROLE');
console.log('PASS: RLS prevents cross-tenant function calls');
await db.close();
