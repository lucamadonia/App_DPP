// PGlite test for supabase/migrations/20261001i_public_dpp_visibility.sql and the
// staged supabase/20261001f_stage2_restrict_public_product_select.sql
// (go-live package B: RLS-5 server-side Visibility V2/V3 + F stage 2).
// Run: node scripts/test-public-dpp-visibility.mjs
//
// Builds the legacy policy state (blanket anon SELECT on the DPP tables), applies
// section 6 of 20261001f (resolve_public_dpp_product + the old 2-arg RPC), then
// 20261001i twice, then the stage-2 script twice, and simulates the client call
// sequence of the /p/:gtin/:serial and /01/:gtin/21/:serial routes.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const migF = read('../supabase/migrations/20261001f_supplier_portal_rpc.sql');
const migI = read('../supabase/migrations/20261001i_public_dpp_visibility.sql');
const stage2 = read('../supabase/20261001f_stage2_restrict_public_product_select.sql');

// Only section 6 of migration f (public DPP RPCs); the rest needs supplier tables.
const fStart = migF.indexOf('-- 6. Public DPP product RPCs');
if (fStart < 0) throw new Error('section 6 not found in 20261001f');
const fDpp = migF.slice(migF.lastIndexOf('-- ----', fStart));

const BASE_SCHEMA = `
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
CREATE TABLE tenants (id uuid primary key, name text, slug text unique, settings jsonb default '{}');
CREATE TABLE profiles (id uuid primary key, tenant_id uuid references tenants(id), email text);
CREATE FUNCTION get_user_tenant_id() RETURNS uuid AS $$ BEGIN RETURN (SELECT tenant_id FROM profiles WHERE id = auth.uid()); END; $$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TABLE products (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  name text, manufacturer text, gtin text, serial_number text, production_date date, expiration_date date,
  category text, description text, materials jsonb default '[]', certifications jsonb default '[]',
  carbon_footprint jsonb, recyclability jsonb, image_url text, hs_code text, batch_number text,
  country_of_origin text, net_weight numeric, gross_weight numeric, manufacturer_address text,
  manufacturer_eori text, manufacturer_vat text, registrations jsonb, support_resources jsonb,
  translations jsonb default '{}', manufacturer_supplier_id uuid, importer_supplier_id uuid,
  product_type text default 'single', aggregation_overrides jsonb default '{}',
  product_height_cm numeric, product_width_cm numeric, product_depth_cm numeric,
  packaging_type text, packaging_description text, unique_product_id text, importer_name text,
  importer_eori text, authorized_representative jsonb, dpp_responsible jsonb, substances_of_concern jsonb,
  recycled_content_percentage numeric, customs_value numeric, preference_proof text, dpp_registry_id text,
  is_electronic boolean default false, ear_brand text, status text default 'live',
  created_at timestamptz default now(), updated_at timestamptz default now());
CREATE TABLE product_batches (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  product_id uuid not null references products(id), batch_number text, serial_number text not null,
  production_date date, expiration_date date, net_weight numeric, gross_weight numeric, quantity int,
  status text default 'draft', notes text, supplier_id uuid, price_per_unit numeric, currency text,
  materials_override jsonb, certifications_override jsonb, carbon_footprint_override jsonb,
  recyclability_override jsonb, description_override text, created_at timestamptz default now());
CREATE TABLE supply_chain_entries (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  product_id uuid not null references products(id), batch_id uuid references product_batches(id),
  step int, location text, country text, date date, description text, supplier text, supplier_id uuid,
  risk_level text, verified boolean, coordinates text, process_type text, transport_mode text,
  status text, document_ids text[], emissions_kg numeric, duration_days int, notes text, cost numeric,
  currency text default 'EUR', created_at timestamptz default now());
CREATE TABLE product_components (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  parent_product_id uuid not null references products(id), component_product_id uuid not null references products(id),
  quantity int default 1, sort_order int default 0, notes text);
CREATE TABLE product_images (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  product_id uuid references products(id), url text, is_primary boolean default false, sort_order int default 0);
CREATE TABLE visibility_settings (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  product_id uuid references products(id), version int default 2, fields jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now());
CREATE TABLE documents (
  id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  product_id uuid references products(id), name text, file_url text, visibility text default 'internal');

-- Legacy policy state (schema.sql + 20260201/20260202/20260214 + feature pack)
ALTER TABLE products ENABLE ROW LEVEL SECURITY; ALTER TABLE product_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_chain_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE product_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY; ALTER TABLE visibility_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY; ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can view products in their tenant" ON products FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Public can view products by GTIN for DPP" ON products FOR SELECT USING (true);
CREATE POLICY "Public can view batches for DPP" ON product_batches FOR SELECT TO public USING (true);
CREATE POLICY "Public can view supply chain for DPP" ON supply_chain_entries FOR SELECT USING (true);
CREATE POLICY "product_components_public_read" ON product_components FOR SELECT USING (true);
CREATE POLICY "Public can view product images for DPP" ON product_images FOR SELECT TO public USING (true);
CREATE POLICY "Public can view visibility settings for DPP" ON visibility_settings FOR SELECT USING (true);
CREATE POLICY "legacy anon docs" ON documents FOR SELECT TO anon USING (visibility <> 'internal');
CREATE POLICY "docs tenant" ON documents FOR SELECT USING (tenant_id = get_user_tenant_id());
-- schema.sql 'Editors can create batches' (role check simplified): checks only the row's tenant_id.
CREATE POLICY "Editors can create batches" ON product_batches FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Editors can update batches" ON product_batches FOR UPDATE USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Editors can create products" ON products FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "Editors can update products" ON products FOR UPDATE USING (tenant_id = get_user_tenant_id())
  WITH CHECK (tenant_id = get_user_tenant_id());

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
`;

let pass = 0;
let fail = 0;
function expect(name, cond, detail) {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`, cond ? '' : JSON.stringify(detail ?? null).slice(0, 1500));
}

// ---- stage 2 refuses to run without 20261001i ------------------------------
{
  const early = new PGlite();
  await early.exec(BASE_SCHEMA);
  let err = null;
  try { await early.exec(stage2); } catch (e) { err = e.message; }
  expect('stage 2 aborts before 20261001i', /apply migrations\/20261001i/.test(err || ''), err);
  const { rows } = await early.query(`SELECT count(*)::int AS n FROM pg_policies WHERE policyname = 'Public can view products by GTIN for DPP'`);
  expect('aborted stage 2 left policies untouched', rows[0].n === 1, rows);
  await early.close();
}

const db = new PGlite();
await db.exec(BASE_SCHEMA);
await db.exec(fDpp);
await db.exec(migI);
await db.exec(migI); // idempotency
console.log('20261001f section 6 + 20261001i (twice) applied OK');

async function as(role, uid, sql, params = []) {
  await db.query('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false)`, [uid || '']);
  await db.exec(`SET ROLE ${role}`);
  try {
    const r = await db.query(sql, params);
    return { ok: true, rows: r.rows };
  } catch (e) {
    return { ok: false, err: e.message };
  } finally {
    await db.exec('RESET ROLE');
  }
}

// Mirror of src/lib/barcode-parser.ts gtinCandidates().
function gtinCandidates(gtin) {
  const set = new Set([gtin]);
  if (gtin.length === 14) { set.add(gtin.slice(1)); set.add(gtin.slice(0, 13)); }
  if (gtin.length === 13) { set.add('0' + gtin); set.add(gtin + '0'); }
  if (gtin.length === 8) { set.add(gtin.padStart(13, '0')); set.add(gtin.padStart(14, '0')); }
  return [...set];
}

// ---- fixtures ---------------------------------------------------------------
const T1 = '00000000-0000-0000-0000-0000000000a1';
const T2 = '00000000-0000-0000-0000-0000000000a2';
const U1 = '00000000-0000-0000-0000-0000000000b1';
const U2 = '00000000-0000-0000-0000-0000000000b2';
const P = '00000000-0000-0000-0000-0000000000c1'; // single product, batches
const PL = '00000000-0000-0000-0000-0000000000c2'; // legacy serial on product
const PS = '00000000-0000-0000-0000-0000000000c3'; // set
const PC = '00000000-0000-0000-0000-0000000000c4'; // component (T1)
const PX = '00000000-0000-0000-0000-0000000000c5'; // foreign component (T2)
const B1 = '00000000-0000-0000-0000-0000000000d1';
const B2 = '00000000-0000-0000-0000-0000000000d2';
const EAN = '4006381333931';
await db.exec(`
INSERT INTO tenants (id, name, slug) VALUES ('${T1}','Acme','acme'), ('${T2}','Other','other');
INSERT INTO profiles VALUES ('${U1}','${T1}','a@acme.de'), ('${U2}','${T2}','b@other.de');
INSERT INTO products (id, tenant_id, name, manufacturer, gtin, serial_number, category, description, hs_code,
  country_of_origin, net_weight, gross_weight, manufacturer_address, manufacturer_eori, manufacturer_vat,
  customs_value, preference_proof, importer_name, importer_eori, materials, recyclability, support_resources,
  translations, manufacturer_supplier_id, aggregation_overrides, ear_brand, registrations, dpp_registry_id)
VALUES ('${P}','${T1}','Lampe','Acme GmbH','${EAN}','MASTER-1','Lighting','Desc','940510','DE',100,150,'Hauptstr 1',
  'DE123456789012345','DE999999999',42.5,'EUR.1','Imp GmbH','DE-IMP-1','[{"name":"Steel"}]',
  '{"recyclablePercentage":80,"instructions":"Recycle"}',
  '{"instructions":"Use it","warranty":{"years":2},"faq":[{"q":"a"}],"repairInfo":{"x":1}}',
  '{"de":{"name":"Lampe DE","description":"Beschr","supportResources":{"warranty":{"years":3},"faq":[{"q":"b"}]}}}',
  '00000000-0000-0000-0000-00000000ffff','{"carbon":true}','BrandX','{"weee":"DE123"}','REG-1');
INSERT INTO product_batches (id, tenant_id, product_id, batch_number, serial_number, net_weight, notes, supplier_id,
  price_per_unit, currency, description_override, status, quantity)
VALUES ('${B1}','${T1}','${P}','LOT-1','SN-1',110,'secret batch note','00000000-0000-0000-0000-00000000fffe',9.99,'EUR','Batch desc','live',500),
       ('${B2}','${T1}','${P}','LOT-2','SN-2',111,'other note',NULL,NULL,NULL,NULL,'live',10);
INSERT INTO supply_chain_entries (tenant_id, product_id, batch_id, step, location, country, date, description, supplier,
  supplier_id, risk_level, process_type, transport_mode, status, emissions_kg, notes, cost)
VALUES ('${T1}','${P}',NULL,1,'Berlin','DE','2026-01-01','Assembly','Secret Supplier AG','00000000-0000-0000-0000-00000000fffd','high','assembly','truck','completed',12,'internal note',999),
       ('${T1}','${P}','${B1}',2,'Hamburg','DE','2026-02-01','Packing B1','S2',NULL,'low','packaging','ship','completed',3,'n',50),
       ('${T1}','${P}','${B2}',3,'Munich','DE','2026-03-01','Packing B2 only','S3',NULL,'low','packaging','rail','completed',1,'n',70);
INSERT INTO products (id, tenant_id, name, gtin, serial_number, customs_value) VALUES ('${PL}','${T1}','Legacy','4006381333948','LEG-1', 5);
INSERT INTO products (id, tenant_id, name, gtin, serial_number, product_type) VALUES ('${PS}','${T1}','Set','4006381333955','SET-1','set');
INSERT INTO products (id, tenant_id, name, gtin, serial_number, manufacturer, net_weight, materials, customs_value)
  VALUES ('${PC}','${T1}','Comp','4006381333962','C-1','Acme',20,'[{"name":"Wood"}]',77),
         ('${PX}','${T2}','Foreign','4006381333979','X-1','Other',30,'[]',88);
INSERT INTO product_components (tenant_id, parent_product_id, component_product_id, quantity, sort_order, notes)
  VALUES ('${T1}','${PS}','${PC}',2,0,'internal comp note');
-- Pre-existing cross-tenant row (written before the same-tenant trigger existed):
-- bypass triggers to simulate legacy data the RPC must still filter.
SET session_replication_role = replica;
INSERT INTO product_components (tenant_id, parent_product_id, component_product_id, quantity, sort_order, notes)
  VALUES ('${T1}','${PS}','${PX}',1,1,'cross tenant');
SET session_replication_role = origin;
INSERT INTO product_images (tenant_id, product_id, url, is_primary, sort_order)
  VALUES ('${T1}','${PL}','https://img/second.png',false,0), ('${T1}','${PL}','https://img/primary.png',true,5);
INSERT INTO documents (tenant_id, product_id, name, file_url, visibility) VALUES ('${T1}','${P}','DoC','t1/doc.pdf','customs');
`);

const RPC = `SELECT get_public_dpp_product($1::text[], $2, $3) AS r`;
async function dpp(role, gtin, serial, view, uid) {
  const res = await as(role, uid, RPC, [gtinCandidates(gtin), serial, view]);
  return res.ok ? res.rows[0].r : { __err: res.err };
}

// ---- baseline: legacy policies leak --------------------------------------------
let r = await as('anon', null, `SELECT customs_value FROM products WHERE id = '${P}'`);
expect('baseline: anon can read products before stage 2', r.ok && r.rows.length === 1, r);

// ---- old 2-arg signature is gone; 2-arg call = consumer ------------------------
r = await db.query(`SELECT count(*)::int AS n FROM pg_proc WHERE proname = 'get_public_dpp_product'`);
expect('only one get_public_dpp_product overload', r.rows[0].n === 1, r.rows);
r = await as('anon', null, `SELECT get_public_dpp_product($1::text[], $2) AS r`, [[EAN], 'SN-1']);
expect('2-arg call works and defaults to consumer', r.ok && r.rows[0].r.view === 'consumer', r);

// ---- consumer view, defaults (no visibility_settings rows) ----------------------
// Route /p/:gtin/:serial -> EAN-13 as in the QR code.
let c = await dpp('anon', EAN, 'SN-1', 'consumer');
const cp = c?.product || {};
expect('consumer: product found via /p/ (EAN-13)', c && cp.id === P && c.tenant_id === T1, c);
expect('consumer: name/manufacturer/description/materials present',
  cp.name === 'Lampe' && cp.manufacturer === 'Acme GmbH' && cp.description === 'Desc' && Array.isArray(cp.materials), cp);
const consumerHidden = ['customs_value', 'preference_proof', 'manufacturer_eori', 'manufacturer_vat', 'hs_code',
  'country_of_origin', 'net_weight', 'gross_weight', 'manufacturer_address', 'importer_name', 'importer_eori',
  'registrations', 'dpp_registry_id', 'batch_number'];
expect('consumer: customs-only product fields absent', consumerHidden.every((k) => !(k in cp)),
  consumerHidden.filter((k) => k in cp));
const neverFields = ['manufacturer_supplier_id', 'importer_supplier_id', 'aggregation_overrides', 'ear_brand',
  'is_electronic', 'status', 'created_at', 'updated_at'];
expect('consumer: internal product columns never returned', neverFields.every((k) => !(k in cp)),
  neverFields.filter((k) => k in cp));
expect('consumer: gtin + serial are the lookup key', cp.gtin === EAN && cp.serial_number === 'SN-1', cp);
const cb = c?.batch || {};
expect('consumer: batch has no notes/price/supplier/status/quantity',
  ['notes', 'price_per_unit', 'currency', 'supplier_id', 'status', 'quantity', 'id', 'batch_number', 'net_weight']
    .every((k) => !(k in cb)) && cb.serial_number === 'SN-1' && cb.description_override === 'Batch desc', cb);
const sc = c?.supply_chain || [];
expect('consumer: supply chain = product-level + own batch only', sc.length === 2
  && sc.map((e) => e.step).join() === '1,2', sc);
expect('consumer: supply chain without supplier/risk/notes/cost/date/transport',
  sc.every((e) => ['supplier', 'supplier_id', 'risk_level', 'notes', 'cost', 'currency', 'date', 'transport_mode',
    'coordinates', 'verified'].every((k) => !(k in e))), sc);
expect('consumer: supply chain keeps description/location/process/emissions',
  sc[0].description === 'Assembly' && sc[0].location === 'Berlin' && sc[0].process_type === 'assembly' && sc[0].emissions_kg === 12, sc[0]);
expect('consumer: visibility map returned (V3)', c.visibility?.version === 3
  && c.visibility.fields.customsValue.consumer === false && c.visibility.fields.name.consumer === true, c.visibility);
expect('consumer: translations kept for visible fields', cp.translations?.de?.name === 'Lampe DE', cp.translations);

// ---- customs view, defaults --------------------------------------------------------
// Route /01/:gtin/21/:serial -> GTIN-14 with indicator digit.
let k = await dpp('anon', '0' + EAN, 'SN-1', 'customs');
const kp = k?.product || {};
expect('customs: product found via /01/ (GTIN-14 candidates)', kp.id === P && k.view === 'customs', k);
expect('customs: customs fields present', kp.customs_value === 42.5 && kp.manufacturer_eori === 'DE123456789012345'
  && kp.manufacturer_vat === 'DE999999999' && kp.hs_code === '940510' && kp.preference_proof === 'EUR.1', kp);
expect('customs: internal columns still absent', neverFields.every((k2) => !(k2 in kp)), kp);
expect('customs: batch net weight + number, still no notes/price', k.batch.net_weight === 110
  && k.batch.batch_number === 'LOT-1' && !('notes' in k.batch) && !('price_per_unit' in k.batch), k.batch);
const ksc = k.supply_chain;
expect('customs: supply chain has date + transport, no cost (internal by default)',
  ksc[0].date === '2026-01-01' && ksc[0].transport_mode === 'truck' && !('cost' in ksc[0]) && !('supplier' in ksc[0]), ksc);

// view 'internal' is never honoured
let iv = await dpp('anon', EAN, 'SN-1', 'internal');
expect("view 'internal' falls back to consumer", iv.view === 'consumer' && !('customs_value' in iv.product), iv.view);

// ---- tenant V3 config + product-level V2 override --------------------------------
await db.exec(`INSERT INTO visibility_settings (tenant_id, product_id, version, fields) VALUES ('${T1}', NULL, 3,
  '{"customsValue":{"consumer":false,"customs":false},"supplyChainCost":{"consumer":false,"customs":true},
    "manufacturerVAT":{"consumer":true,"customs":true},"supportWarranty":{"consumer":false,"customs":true}}')`);
k = await dpp('anon', EAN, 'SN-1', 'customs');
expect('tenant V3: customsValue internal -> absent in customs', !('customs_value' in k.product), k.product.customs_value);
expect('tenant V3: supplyChainCost customs -> cost visible to customs', k.supply_chain[0].cost === 999
  && k.supply_chain[0].currency === 'EUR', k.supply_chain[0]);
c = await dpp('anon', EAN, 'SN-1', 'consumer');
expect('tenant V3: VAT released to consumer, EORI still hidden', c.product.manufacturer_vat === 'DE999999999'
  && !('manufacturer_eori' in c.product), c.product);
expect('tenant V3: consumer cost still hidden', c.supply_chain.every((e) => !('cost' in e)), c.supply_chain);
expect('tenant V3: warranty stripped from support_resources + translations (consumer)',
  !('warranty' in c.product.support_resources) && c.product.support_resources.faq?.length === 1
  && !('warranty' in c.product.translations.de.supportResources) && c.product.translations.de.supportResources.faq, c.product);

await db.exec(`INSERT INTO visibility_settings (tenant_id, product_id, version, fields) VALUES ('${T1}', '${P}', 2,
  '{"hsCode":"consumer","manufacturerEORI":"internal","name":"internal","supplyChainSimple":"internal","supplyChainFull":"internal"}')`);
c = await dpp('anon', EAN, 'SN-1', 'consumer');
k = await dpp('anon', EAN, 'SN-1', 'customs');
expect('product V2 overrides tenant: hs_code released to consumer', c.product.hs_code === '940510', c.product);
expect('product V2: EORI internal -> absent in customs', !('manufacturer_eori' in k.product), k.product);
expect('product V2: name internal -> absent everywhere, translations name stripped',
  !('name' in c.product) && !('name' in k.product) && !('name' in c.product.translations.de), c.product);
expect('product V2: tenant V3 row ignored (VAT back to customs-only default)', !('manufacturer_vat' in c.product)
  && k.product.manufacturer_vat === 'DE999999999', { c: c.product.manufacturer_vat, k: k.product.manufacturer_vat });
expect('product V2: supply chain internal -> empty for both views', c.supply_chain.length === 0 && k.supply_chain.length === 0, k.supply_chain);
expect('product V2: migrated V3 map returned', c.visibility.fields.hsCode.consumer === true
  && c.visibility.fields.manufacturerEORI.customs === false && c.visibility.fields.dppRegistryId.customs === true, c.visibility.fields);
await db.exec(`DELETE FROM visibility_settings`);

// ---- legacy serial + image fallback -------------------------------------------------
let l = await dpp('anon', '4006381333948', 'LEG-1', 'consumer');
expect('legacy products.serial_number lookup, batch null', l.product.id === PL && l.batch === null, l);
expect('image fallback = primary product_images url', l.product.image_url === 'https://img/primary.png', l.product);
expect('legacy consumer: customs_value absent', !('customs_value' in l.product), l.product);

// ---- set components ------------------------------------------------------------------
let s = await dpp('anon', '4006381333955', 'SET-1', 'consumer');
expect('set: only same-tenant components', s.components.length === 2
  && s.components[0].component_product.name === 'Comp' && s.components[1].component_product === null, s.components);
expect('set: no component notes, no hidden component fields (consumer)', s.components.every((x) => !('notes' in x))
  && !('net_weight' in s.components[0].component_product) && !('customs_value' in s.components[0].component_product)
  && s.components[0].component_product.materials[0].name === 'Wood', s.components[0]);
s = await dpp('anon', '4006381333955', 'SET-1', 'customs');
expect('set customs: component net_weight visible, customs_value never', s.components[0].component_product.net_weight === 20
  && !('customs_value' in s.components[0].component_product), s.components[0]);

// ---- not found / input validation ---------------------------------------------------
expect('unknown serial -> null', (await dpp('anon', EAN, 'NOPE', 'consumer')) === null);
r = await as('anon', null, RPC, [Array.from({ length: 11 }, () => EAN), 'SN-1', 'consumer']);
expect('more than 10 GTIN candidates -> null', r.ok && r.rows[0].r === null, r);

// ---- helpers are not callable by clients --------------------------------------------
for (const fn of [`_dpp_effective_visibility('${T1}'::uuid, '${P}'::uuid)`, `_dpp_visibility_default_v3()`,
  `_dpp_pick('{}'::jsonb, ARRAY['a'])`, `_dpp_visible('{}'::jsonb, 'a', 'consumer')`]) {
  r = await as('anon', null, `SELECT ${fn}`);
  expect(`anon cannot call ${fn.split('(')[0]}`, !r.ok, r);
}

// ---- PublicLayout / tenants.ts sequence: resolve -> tenant id ---------------------
r = await as('anon', null, `SELECT resolve_public_dpp_product($1::text[], $2) AS r`, [gtinCandidates('0' + EAN), 'SN-1']);
expect('resolve_public_dpp_product gives tenant for layout/QR/design lookups', r.ok && r.rows[0].r.tenant_id === T1, r);

// ---- cross-tenant batch injection (attacker T2 targets victim T1) ---------------------
const EVIL = `'[{"name":"CE","certificateUrl":"https://evil.example/phish"}]'`;
r = await as('authenticated', U2, `INSERT INTO product_batches (tenant_id, product_id, serial_number, description_override)
  VALUES ('${T2}', '${PL}', 'LEG-1', 'PWNED') RETURNING id`);
expect('trigger: attacker cannot INSERT a batch on a foreign product', !r.ok && /does not belong/.test(r.err), r);
r = await as('authenticated', U1, `INSERT INTO product_batches (tenant_id, product_id, serial_number)
  VALUES ('${T1}', '${P}', 'SN-OWN')`);
expect('trigger: tenant can still INSERT a batch on its own product', r.ok, r);
{
  let err = null;
  try { await db.query(`UPDATE product_batches SET product_id = '${PX}' WHERE id = '${B2}'`); } catch (e) { err = e.message; }
  expect('trigger: UPDATE re-pointing a batch to a foreign product rejected', /does not belong/.test(err || ''), err);
}
for (const [label, sql] of [
  ['supply_chain_entries product', `INSERT INTO supply_chain_entries (tenant_id, product_id, step, location, country, date, description) VALUES ('${T2}','${P}',1,'x','DE','2026-01-01','x')`],
  ['supply_chain_entries batch', `INSERT INTO supply_chain_entries (tenant_id, product_id, batch_id, step, location, country, date, description) VALUES ('${T2}','${PX}','${B1}',1,'x','DE','2026-01-01','x')`],
  ['product_components', `INSERT INTO product_components (tenant_id, parent_product_id, component_product_id) VALUES ('${T2}','${PX}','${PC}')`],
  ['product_images', `INSERT INTO product_images (tenant_id, product_id, url) VALUES ('${T2}','${P}','https://evil/img.png')`],
]) {
  let err = null;
  try { await db.query(sql); } catch (e) { err = e.message; }
  expect(`trigger (any role): cross-tenant ${label} rejected`, /does not belong/.test(err || ''), err);
}
// Legacy attacker rows that slipped in before the trigger: the RPC must ignore them.
await db.exec(`SET session_replication_role = replica;
INSERT INTO product_batches (tenant_id, product_id, serial_number, description_override, certifications_override, created_at)
VALUES ('${T2}','${PL}','LEG-1','PWNED legacy',${EVIL},'2000-01-01'),
       ('${T2}','${P}','SN-1','PWNED batch',${EVIL},'2000-01-01'),
       ('${T2}','${P}','MINTED-1','PWNED minted',${EVIL},'2000-01-01');
SET session_replication_role = origin;`);
l = await dpp('anon', '4006381333948', 'LEG-1', 'consumer');
expect('injection: legacy serial DPP not shadowed by foreign batch', l?.product?.id === PL && l.batch === null
  && !JSON.stringify(l).includes('PWNED') && !JSON.stringify(l).includes('evil.example'), l);
c = await dpp('anon', EAN, 'SN-1', 'consumer');
expect('injection: own batch wins over older foreign batch with same serial', c?.batch?.description_override === 'Batch desc'
  && !JSON.stringify(c).includes('PWNED'), c?.batch);
expect('injection: foreign tenant cannot mint new serials on victim product',
  (await dpp('anon', EAN, 'MINTED-1', 'consumer')) === null);
r = await as('anon', null, `SELECT resolve_public_dpp_product($1::text[], $2) AS r`, [[EAN], 'MINTED-1']);
expect('injection: resolve_public_dpp_product ignores foreign batch', r.ok && r.rows[0].r === null, r);
r = await as('anon', null, `SELECT resolve_public_dpp_product($1::text[], $2) AS r`, [['4006381333948'], 'LEG-1']);
expect('injection: resolve on legacy serial returns no batch_id', r.ok && r.rows[0].r.product_id === PL
  && r.rows[0].r.batch_id === null, r);

// ---- DPP-HIJACK-1: foreign product reusing the victim's GTIN ---------------------------
// GTIN helper mirrors the client candidate generation.
for (const g of [EAN, '0' + EAN, '40063813339310', '12345670']) {
  r = await db.query(`SELECT _dpp_gtin_candidates($1) AS c`, [g]);
  expect(`_dpp_gtin_candidates(${g}) == gtinCandidates()`, JSON.stringify([...r.rows[0].c].sort())
    === JSON.stringify(gtinCandidates(g).sort()), { sql: r.rows[0].c, js: gtinCandidates(g) });
}
for (const [label, gtin] of [['exact', EAN], ['GTIN-14 padded', '0' + EAN], ['EAN-13 + trailing digit', EAN + '0'],
  ['other EAN-13 sharing a scan form', '1' + EAN.slice(0, 12)]]) {
  r = await as('authenticated', U2, `INSERT INTO products (tenant_id, name, gtin, serial_number, created_at)
    VALUES ('${T2}', 'FAKE - call +49 000 for refund', $1, NULL, '2000-01-01') RETURNING id`, [gtin]);
  expect(`hijack: foreign tenant cannot create product with victim GTIN (${label})`,
    !r.ok && /already registered by another organization/.test(r.err), r);
}
r = await as('authenticated', U2, `UPDATE products SET gtin = '${EAN}' WHERE id = '${PX}' RETURNING id`);
expect('hijack: foreign tenant cannot move its product onto the victim GTIN', !r.ok && /already registered/.test(r.err), r);
r = await as('authenticated', U2, `UPDATE products SET name = 'Foreign v2' WHERE id = '${PX}' RETURNING id`);
expect('hijack guard: unrelated update of own product still works', r.ok && r.rows.length === 1, r);
r = await as('authenticated', U1, `INSERT INTO products (tenant_id, name, gtin, serial_number, created_at)
  VALUES ('${T1}', 'Lampe Variante', '${EAN}', 'MASTER-2', '2000-01-01') RETURNING id, created_at`);
expect('hijack guard: owner tenant can reuse its own GTIN', r.ok && r.rows.length === 1, r);
expect('created_at: client value ignored on product INSERT', r.ok && new Date(r.rows[0].created_at).getFullYear() > 2020, r.rows);
const PV = r.ok ? r.rows[0].id : null;
r = await as('authenticated', U1, `UPDATE products SET created_at = '2000-01-01' WHERE id = '${P}' RETURNING created_at`);
expect('created_at: client cannot rewrite product created_at', r.ok && new Date(r.rows[0].created_at).getFullYear() > 2020, r);
r = await as('authenticated', U1, `INSERT INTO product_batches (tenant_id, product_id, serial_number, created_at)
  VALUES ('${T1}', '${P}', 'SN-TS', '2000-01-01') RETURNING created_at`);
expect('created_at: client value ignored on batch INSERT', r.ok && new Date(r.rows[0].created_at).getFullYear() > 2020, r);
r = await as('authenticated', U1, `UPDATE product_batches SET created_at = '2000-01-01' WHERE id = '${B1}' RETURNING created_at`);
expect('created_at: client cannot rewrite batch created_at', r.ok && new Date(r.rows[0].created_at).getFullYear() > 2020, r);
{
  const rr = await db.query(`INSERT INTO products (tenant_id, name, gtin, created_at) VALUES ('${T1}', 'Import', '4006381339999', '2001-01-01') RETURNING created_at`);
  expect('created_at: service/migration writes keep their value', new Date(rr.rows[0].created_at).getFullYear() === 2001, rr.rows);
  let err = null;
  try { await db.query(`INSERT INTO products (tenant_id, name, gtin) VALUES ('${T2}', 'Svc', '${EAN}')`); } catch (e) { err = e.message; }
  expect('hijack guard applies to service/owner writes too', /already registered/.test(err || ''), err);
}
await db.exec(`DELETE FROM product_batches WHERE serial_number = 'SN-TS'; DELETE FROM products WHERE id = '${PV}' OR gtin = '4006381339999';`);

// Pre-existing cross-tenant GTIN rows (written before the trigger): exactly the
// reported attack. T2 product with the victim GTIN, NULL serial, old created_at,
// own batches carrying the victim's legacy serial and the victim's batch serial.
const PH = '00000000-0000-0000-0000-0000000000e1';
const PH2 = '00000000-0000-0000-0000-0000000000e2';
await db.exec(`SET session_replication_role = replica;
INSERT INTO products (id, tenant_id, name, gtin, serial_number, created_at) VALUES
  ('${PH}', '${T2}', 'FAKE - call +49 000 for refund', '4006381333948', NULL, '2000-01-01'),
  ('${PH2}', '${T2}', 'FAKE - call +49 000 for refund', '${EAN}', NULL, '2000-01-01');
INSERT INTO product_batches (tenant_id, product_id, serial_number, created_at) VALUES
  ('${T2}', '${PH}', 'LEG-1', '2000-01-01'), ('${T2}', '${PH2}', 'SN-2', '2000-01-01'),
  ('${T2}', '${PH2}', 'ONLY-T2', '2000-01-01');
SET session_replication_role = origin;`);
l = await dpp('anon', '4006381333948', 'LEG-1', 'consumer');
expect('hijack (legacy data): victim legacy serial still resolves to victim', l?.product?.id === PL && l.tenant_id === T1
  && !JSON.stringify(l).includes('FAKE'), l);
r = await as('anon', null, `SELECT resolve_public_dpp_product($1::text[], $2) AS r`, [gtinCandidates(EAN), 'SN-2']);
expect('hijack (legacy data): shared GTIN + batch serial fails closed', r.ok && r.rows[0].r === null, r);
expect('hijack (legacy data): get_public_dpp_product returns null, not the attacker',
  (await dpp('anon', EAN, 'SN-2', 'consumer')) === null);
r = await as('anon', null, `SELECT resolve_public_dpp_product($1::text[], $2) AS r`, [gtinCandidates('0' + EAN), 'SN-2']);
expect('hijack (legacy data): GTIN-14 route fails closed too', r.ok && r.rows[0].r === null, r);
c = await dpp('anon', EAN, 'SN-1', 'consumer');
expect('hijack (legacy data): unaffected victim serial still served', c?.product?.id === P && c.tenant_id === T1, c?.tenant_id);
r = await as('anon', null, `SELECT resolve_public_dpp_product($1::text[], $2) AS r`, [gtinCandidates(EAN), 'ONLY-T2']);
expect('single-tenant match still resolves (attacker-only serial)', r.ok && r.rows[0].r?.tenant_id === T2, r);
// Legacy serial of another tenant under a lookup-equivalent (non-exact) GTIN: no winner.
await db.exec(`SET session_replication_role = replica;
INSERT INTO products (tenant_id, name, gtin, serial_number, created_at) VALUES ('${T2}', 'FAKE', '0${EAN}', 'SN-1', '2000-01-01');
SET session_replication_role = origin;`);
r = await as('anon', null, `SELECT resolve_public_dpp_product($1::text[], $2) AS r`, [gtinCandidates(EAN), 'SN-1']);
expect('hijack (legacy data): non-exact foreign legacy serial makes the lookup fail closed', r.ok && r.rows[0].r === null, r);
await db.exec(`DELETE FROM products WHERE gtin = '0${EAN}' AND tenant_id = '${T2}';
SET session_replication_role = replica;
DELETE FROM product_batches WHERE product_id IN ('${PH}', '${PH2}'); DELETE FROM products WHERE id IN ('${PH}', '${PH2}');
SET session_replication_role = origin;`);
c = await dpp('anon', EAN, 'SN-2', 'consumer');
expect('after cleanup: victim batch serial resolves to victim again', c?.product?.id === P && c.batch?.serial_number === 'SN-2', c);

// ---- stage 2 -----------------------------------------------------------------------------
await db.exec(stage2);
await db.exec(stage2); // idempotency
console.log('stage 2 (twice) applied OK');

const TABLES = ['products', 'product_batches', 'supply_chain_entries', 'product_components', 'product_images',
  'visibility_settings', 'documents'];
for (const t of TABLES) {
  r = await as('anon', null, `SELECT * FROM ${t} LIMIT 1`);
  expect(`stage 2: anon SELECT ${t} denied`, !r.ok && /permission denied/i.test(r.err), r);
}
r = await db.query(`SELECT tablename, policyname FROM pg_policies WHERE tablename = ANY($1)
  AND cmd IN ('SELECT','ALL') AND ('anon' = ANY(roles) OR coalesce(btrim(qual),'') IN ('true','(true)'))`, [TABLES]);
expect('stage 2: no anon / USING(true) SELECT policy left', r.rows.length === 0, r.rows);

for (const t of TABLES) {
  r = await as('authenticated', U1, `SELECT count(*)::int AS n, count(*) FILTER (WHERE tenant_id <> '${T1}')::int AS foreign FROM ${t}`);
  expect(`stage 2: tenant member reads own ${t} only`, r.ok && r.rows[0].foreign === 0
    && (t === 'visibility_settings' || r.rows[0].n > 0), r);
}
r = await as('authenticated', U2, `SELECT count(*)::int AS n FROM products WHERE tenant_id = '${T1}'`);
expect('stage 2: other tenant cannot read T1 products', r.ok && r.rows[0].n === 0, r);
r = await as('authenticated', '00000000-0000-0000-0000-00000000eeee', `SELECT count(*)::int AS n FROM products`);
expect('stage 2: authenticated non-member (customer portal) sees no products', r.ok && r.rows[0].n === 0, r);

c = await dpp('anon', EAN, 'SN-1', 'consumer');
k = await dpp('anon', '0' + EAN, 'SN-1', 'customs');
expect('stage 2: /p/ consumer RPC still works for anon', c?.product?.id === P && c.supply_chain.length === 2, c);
expect('stage 2: /01/ customs RPC still works for anon', k?.product?.customs_value === 42.5, k?.product);
c = await dpp('authenticated', EAN, 'SN-1', 'consumer', U2);
expect('stage 2: RPC works for a logged-in user of another tenant', c?.product?.id === P, c);
r = await as('authenticated', U2, `INSERT INTO products (tenant_id, name, gtin, serial_number) VALUES ('${T2}', 'FAKE', '${EAN}', NULL)`);
expect('stage 2: GTIN guard still sees other tenants (SECURITY DEFINER)', !r.ok && /already registered/.test(r.err), r);
s = await dpp('anon', '4006381333955', 'SET-1', 'consumer');
expect('stage 2: set components still served via RPC', s.components[0].component_product.name === 'Comp', s.components);

await db.close();
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
