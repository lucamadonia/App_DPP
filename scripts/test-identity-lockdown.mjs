// PGlite isolation test for supabase/migrations/20261001a_lockdown_profiles_storage_masterdata.sql
// (go-live package A: DB-01, DB-08, DB-09, DB-10, DB-11, DB-12). Run: node scripts/test-identity-lockdown.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
const mig = readFileSync(new URL('../supabase/migrations/20261001a_lockdown_profiles_storage_masterdata.sql', import.meta.url), 'utf8');

await db.exec(`
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth; CREATE SCHEMA storage;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
CREATE TABLE auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, email_confirmed_at timestamptz);
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$ SELECT string_to_array(name,'/') $$;
CREATE TABLE storage.objects (id serial, bucket_id text, name text);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE TABLE tenants (id uuid primary key default gen_random_uuid(), name text, slug text unique);
CREATE TABLE profiles (id uuid primary key references auth.users(id), tenant_id uuid not null references tenants(id), email text not null, name text, avatar_url text,
  role text default 'viewer' check (role in ('admin','editor','viewer')), status text default 'active', last_login timestamptz, invited_by uuid, invited_at timestamptz,
  is_super_admin boolean default false, admin_role text, created_at timestamptz default now(), updated_at timestamptz default now());
CREATE TABLE invitations (id uuid primary key default gen_random_uuid(), tenant_id uuid references tenants(id), email text, role text default 'viewer', name text, status text default 'pending', invited_by uuid, created_at timestamptz default now(), expires_at timestamptz default now()+interval '7 days');
CREATE TABLE rh_customers (id uuid primary key default gen_random_uuid(), tenant_id uuid references tenants(id), email text, first_name text, last_name text, phone text, company text, display_name text,
  addresses jsonb default '[]', communication_preferences jsonb, risk_score int default 0, tags text[] default '{}', notes text, updated_at timestamptz default now());
CREATE TABLE rh_customer_profiles (id uuid primary key references auth.users(id), customer_id uuid references rh_customers(id), tenant_id uuid references tenants(id), display_name text, avatar_url text, email_verified boolean default false, last_login_at timestamptz, updated_at timestamptz default now());
CREATE TABLE countries (id serial primary key, name text);
CREATE TABLE news_items (id serial primary key, title text);
CREATE FUNCTION get_user_tenant_id() RETURNS uuid AS $$ BEGIN RETURN (SELECT tenant_id FROM profiles WHERE id = auth.uid()); END; $$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE FUNCTION get_customer_id() RETURNS uuid AS $$ SELECT customer_id FROM rh_customer_profiles WHERE id = auth.uid(); $$ LANGUAGE sql SECURITY DEFINER STABLE;
CREATE FUNCTION log_admin_action(p_admin_id UUID, p_admin_email TEXT, p_action TEXT, p_target_type TEXT, p_target_id TEXT DEFAULT NULL, p_target_label TEXT DEFAULT NULL,
  p_changes JSONB DEFAULT NULL, p_reason TEXT DEFAULT NULL, p_ip_address TEXT DEFAULT NULL, p_user_agent TEXT DEFAULT NULL) RETURNS UUID AS $$ SELECT gen_random_uuid() $$ LANGUAGE sql SECURITY DEFINER;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE invitations ENABLE ROW LEVEL SECURITY; ALTER TABLE rh_customers ENABLE ROW LEVEL SECURITY; ALTER TABLE rh_customer_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can view profiles in their tenant" ON profiles FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can insert profiles in their tenant" ON profiles FOR INSERT WITH CHECK (tenant_id = get_user_tenant_id());
CREATE POLICY "invitations_tenant_insert" ON invitations FOR INSERT WITH CHECK (tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "inv_sel" ON invitations FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "Users can update own customer profile" ON rh_customer_profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can read own customer profile" ON rh_customer_profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "cust_upd" ON rh_customers FOR UPDATE TO authenticated USING (id = get_customer_id());
CREATE POLICY "cust_sel" ON rh_customers FOR SELECT TO authenticated USING (id = get_customer_id() OR tenant_id = get_user_tenant_id());
CREATE POLICY "staff_upd" ON rh_customers FOR UPDATE TO authenticated USING (tenant_id = get_user_tenant_id());
`);

await db.exec(`
CREATE FUNCTION handle_new_user() RETURNS trigger AS $$ BEGIN RETURN NEW; END $$ LANGUAGE plpgsql;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public, storage TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
`);
await db.exec(mig);
await db.exec(mig); // idempotency
console.log('migration applied twice OK');

let pass = 0, fail = 0;
async function as(role, uid, sql) {
  await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claim.sub', '${uid || ''}', false); SET ROLE ${role};`);
  try { const r = await db.query(sql); return { ok: true, r }; }
  catch (e) { return { ok: false, err: e.message }; }
  finally { await db.exec('RESET ROLE'); }
}
function expect(name, res, ok, extra) {
  const good = res.ok === ok && (extra ? extra(res) : true);
  good ? pass++ : fail++;
  console.log(`${good ? 'PASS' : 'FAIL'} ${name}`, good ? '' : JSON.stringify(res));
}

// signups
const A1 = '00000000-0000-0000-0000-0000000000a1', A2 = '00000000-0000-0000-0000-0000000000a2',
  V1 = '00000000-0000-0000-0000-0000000000b1', X = '00000000-0000-0000-0000-0000000000c1',
  C1 = '00000000-0000-0000-0000-0000000000d1', I1 = '00000000-0000-0000-0000-0000000000e1';
await db.exec(`INSERT INTO auth.users VALUES ('${A1}','a1@t.de','{"name":"Acme GmbH"}',now())`);
await db.exec(`INSERT INTO auth.users VALUES ('${X}','x@evil.de','{"name":"Acme GmbH"}',now())`);
const { rows: [{ tenant_id: T1 }] } = await db.query(`SELECT tenant_id FROM profiles WHERE id='${A1}'`);
const { rows: [{ tenant_id: TX, slug }] } = await db.query(`SELECT p.tenant_id, t.slug FROM profiles p JOIN tenants t ON t.id=p.tenant_id WHERE p.id='${X}'`);
expect('self-signup slug collision handled', { ok: slug === 'acme_gmbh_1' }, true);
// invitations
const INV_A2 = '00000000-0000-0000-0000-00000000f0a2', INV_V1 = '00000000-0000-0000-0000-00000000f0b1',
  INV_OLD = '00000000-0000-0000-0000-00000000f0e1', INV_SQ = '00000000-0000-0000-0000-00000000f0c1',
  INV_W = '00000000-0000-0000-0000-00000000f0f1';
await db.exec(`INSERT INTO invitations (id,tenant_id,email,role) VALUES ('${INV_A2}','${T1}','A2@t.de','admin'),('${INV_V1}','${T1}','v1@t.de','viewer'),('${INV_OLD}','${T1}','old@t.de','admin')`);
await db.exec(`UPDATE invitations SET expires_at = now() - interval '1 day' WHERE email='old@t.de'`);
const inv = (id) => JSON.stringify({ invitation_id: id });
await db.exec(`INSERT INTO auth.users VALUES ('${A2}','a2@t.de','${inv(INV_A2)}',null),('${V1}','v1@t.de','${inv(INV_V1)}',null),('${I1}','old@t.de','${inv(INV_OLD)}',null)`);
let r = await db.query(`SELECT id, tenant_id, role FROM profiles WHERE id IN ('${A2}','${V1}','${I1}') ORDER BY id`);
expect('invited admin (invitation_id) joins tenant', { ok: r.rows[0].tenant_id === T1 && r.rows[0].role === 'admin' }, true);
expect('invited viewer (invitation_id) joins tenant', { ok: r.rows[1].tenant_id === T1 && r.rows[1].role === 'viewer' }, true);
expect('expired invitation ignored', { ok: r.rows[2].tenant_id !== T1 }, true);
r = await db.query(`SELECT status FROM invitations WHERE id='${INV_A2}'`);
expect('used invitation marked accepted', { ok: r.rows[0].status === 'accepted' }, true);
// invitation squatting: attacker tenant TX invites the victim's email (admin-only policy allows it, own tenant)
expect('attacker creates invitation in own tenant', await as('authenticated', X, `INSERT INTO invitations (id,tenant_id,email,role) VALUES ('${INV_SQ}','${TX}','ceo@acme.example','admin')`), true);
const VIC = '00000000-0000-0000-0000-0000000000f1', VIC2 = '00000000-0000-0000-0000-0000000000f2', W1 = '00000000-0000-0000-0000-0000000000f3';
await db.exec(`INSERT INTO auth.users VALUES ('${VIC}','CEO@acme.example','{"name":"Acme Real"}',now())`);
r = await db.query(`SELECT p.tenant_id, p.role, t.slug FROM profiles p JOIN tenants t ON t.id=p.tenant_id WHERE p.id='${VIC}'`);
expect('plain signup with invited email gets own tenant (no squatting)', { ok: r.rows[0].tenant_id !== TX && r.rows[0].role === 'admin' && r.rows[0].slug === 'acme_real' }, true);
r = await db.query(`SELECT status FROM invitations WHERE id='${INV_SQ}'`);
expect('squat invitation untouched', { ok: r.rows[0].status === 'pending' }, true);
// invitation_id for a different email must not join
await db.exec(`INSERT INTO invitations (id,tenant_id,email,role) VALUES ('${INV_W}','${T1}','w1@t.de','viewer')`);
await db.exec(`INSERT INTO auth.users VALUES ('${VIC2}','other@acme.example','${inv(INV_W)}',now())`);
r = await db.query(`SELECT tenant_id FROM profiles WHERE id='${VIC2}'`);
expect('invitation_id with mismatching email ignored', { ok: r.rows[0].tenant_id !== T1 }, true);
// malformed invitation_id falls through to own tenant (no cast error)
await db.exec(`INSERT INTO auth.users VALUES ('${W1}','w1@t.de','{"invitation_id":"not-a-uuid"}',now())`);
r = await db.query(`SELECT tenant_id FROM profiles WHERE id='${W1}'`);
expect('malformed invitation_id -> own tenant', { ok: r.rows[0].tenant_id !== T1 }, true);
// customer signup
await db.exec(`INSERT INTO auth.users VALUES ('${C1}','c1@k.de','{"user_type":"customer","tenant_id":"${T1}","first_name":"Kim"}',null)`);
r = await db.query(`SELECT (SELECT count(*) FROM profiles WHERE id='${C1}')::int AS p, (SELECT count(*) FROM rh_customer_profiles WHERE id='${C1}')::int AS c`);
expect('customer gets no admin profile, gets customer profile', { ok: r.rows[0].p === 0 && r.rows[0].c === 1 }, true);

// DB-01 attacks
expect('self is_super_admin blocked', await as('authenticated', X, `UPDATE profiles SET is_super_admin=true WHERE id='${X}'`), false);
expect('self admin_role blocked', await as('authenticated', X, `UPDATE profiles SET admin_role='super_admin' WHERE id='${X}'`), false);
expect('self tenant switch blocked', await as('authenticated', X, `UPDATE profiles SET tenant_id='${T1}' WHERE id='${X}'`), false);
expect('self email change blocked', await as('authenticated', X, `UPDATE profiles SET email='z@z.de' WHERE id='${X}'`), false);
expect('viewer self-promotion blocked', await as('authenticated', V1, `UPDATE profiles SET role='admin' WHERE id='${V1}'`), false);
expect('viewer edits other blocked', await as('authenticated', V1, `UPDATE profiles SET role='viewer' WHERE id='${A2}' RETURNING id`), true, (x) => x.r.rows.length === 0);
expect('client insert profile blocked', await as('authenticated', X, `INSERT INTO profiles (id,tenant_id,email,is_super_admin) VALUES ('${C1}','${TX}','c','true')`), false);
// profile-less customer inserts own admin profile into a victim tenant, even with a permissive leftover INSERT policy
await db.exec(`DROP POLICY IF EXISTS "leftover_self_insert" ON profiles; CREATE POLICY "leftover_self_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id)`);
expect('customer self-insert admin profile into victim tenant blocked', await as('authenticated', C1, `INSERT INTO profiles (id,tenant_id,email,role) VALUES ('${C1}','${T1}','c1@k.de','admin')`), false);
expect('anon insert profile blocked', await as('anon', null, `INSERT INTO profiles (id,tenant_id,email) VALUES ('${C1}','${T1}','c1@k.de')`), false);
r = await db.query(`SELECT count(*)::int AS n FROM profiles WHERE id='${C1}'`);
expect('customer still has no profile', { ok: r.rows[0].n === 0 }, true);
await db.exec(`DROP POLICY "leftover_self_insert" ON profiles`);
// legit
expect('self name/avatar update ok', await as('authenticated', V1, `UPDATE profiles SET name='Vic', avatar_url='u', updated_at=now() WHERE id='${V1}'`), true);
expect('admin changes other role ok', await as('authenticated', A1, `UPDATE profiles SET role='editor', updated_at=now() WHERE id='${V1}' RETURNING role`), true, (x) => x.r.rows[0]?.role === 'editor');
expect('admin deactivates other ok', await as('authenticated', A1, `UPDATE profiles SET status='inactive' WHERE id='${V1}' RETURNING id`), true, (x) => x.r.rows.length === 1);
expect('admin sets is_super_admin on other blocked', await as('authenticated', A1, `UPDATE profiles SET is_super_admin=true WHERE id='${V1}'`), false);
expect('admin moves other tenant blocked', await as('authenticated', A1, `UPDATE profiles SET tenant_id='${TX}' WHERE id='${V1}'`), false);
expect('cross-tenant admin edit affects 0 rows', await as('authenticated', X, `UPDATE profiles SET name='h' WHERE id='${V1}' RETURNING id`), true, (x) => x.r.rows.length === 0);
expect('admin invalid role blocked', await as('authenticated', A1, `UPDATE profiles SET role='owner' WHERE id='${V1}'`), false);
expect('self demote with other admin ok', await as('authenticated', A2, `UPDATE profiles SET role='editor' WHERE id='${A2}' RETURNING role`), true, (x) => x.r.rows[0]?.role === 'editor');
expect('last admin self-demote blocked', await as('authenticated', A1, `UPDATE profiles SET role='viewer' WHERE id='${A1}'`), false);
expect('service_role can set super admin', await as('service_role', null, `UPDATE profiles SET is_super_admin=true WHERE id='${A2}' RETURNING id`), true, (x) => x.r.rows.length === 1);
// invitations
expect('viewer cannot create invitation', await as('authenticated', V1, `INSERT INTO invitations (tenant_id,email,role) VALUES ('${T1}','q@q.de','admin')`), false);
expect('admin can create invitation', await as('authenticated', A1, `INSERT INTO invitations (tenant_id,email,role) VALUES ('${T1}','q@q.de','editor')`), true);
// customers
const { rows: [{ customer_id: CU }] } = await db.query(`SELECT customer_id FROM rh_customer_profiles WHERE id='${C1}'`);
await db.exec(`INSERT INTO rh_customers (tenant_id,email) VALUES ('${T1}','other@k.de')`);
const { rows: [{ id: OTHER }] } = await db.query(`SELECT id FROM rh_customers WHERE email='other@k.de'`);
expect('customer re-point customer_id blocked', await as('authenticated', C1, `UPDATE rh_customer_profiles SET customer_id='${OTHER}' WHERE id='${C1}'`), false);
expect('customer display_name ok', await as('authenticated', C1, `UPDATE rh_customer_profiles SET display_name='K', updated_at=now() WHERE id='${C1}'`), true);
expect('customer risk_score blocked', await as('authenticated', C1, `UPDATE rh_customers SET risk_score=5 WHERE id='${CU}'`), false);
expect('customer contact update ok', await as('authenticated', C1, `UPDATE rh_customers SET first_name='Kim', phone='1', addresses='[]', updated_at=now() WHERE id='${CU}' RETURNING id`), true, (x) => x.r.rows.length === 1);
expect('staff risk_score ok', await as('authenticated', A1, `UPDATE rh_customers SET risk_score=80 WHERE id='${CU}' RETURNING id`), true, (x) => x.r.rows.length === 1);
// storage
expect('foreign tenant folder write blocked', await as('authenticated', X, `INSERT INTO storage.objects (bucket_id,name) VALUES ('compliance-reports','${T1}/r.pdf')`), false);
expect('own folder write ok', await as('authenticated', A1, `INSERT INTO storage.objects (bucket_id,name) VALUES ('compliance-reports','${T1}/r.pdf')`), true);
expect('foreign read sees nothing', await as('authenticated', X, `SELECT * FROM storage.objects WHERE bucket_id='compliance-reports'`), true, (x) => x.r.rows.length === 0);
expect('foreign tenant feedback write blocked', await as('authenticated', X, `INSERT INTO storage.objects (bucket_id,name) VALUES ('feedback-photos','${T1}/r/x.jpg')`), false);
// master data
await db.exec(`INSERT INTO countries (name) VALUES ('DE')`);
expect('anon read countries ok', await as('anon', null, `SELECT * FROM countries`), true, (x) => x.r.rows.length === 1);
expect('anon delete countries no-op', await as('anon', null, `DELETE FROM countries RETURNING id`), true, (x) => x.r.rows.length === 0);
expect('tenant admin insert news blocked', await as('authenticated', A1, `INSERT INTO news_items (title) VALUES ('x')`), false);
expect('super admin insert news ok', await as('authenticated', A2, `INSERT INTO news_items (title) VALUES ('x')`), true);
// audit
expect('anon log_admin_action blocked', await as('anon', null, `SELECT log_admin_action(null,'a','b','c')`), false);
expect('authenticated log_admin_action blocked', await as('authenticated', A1, `SELECT log_admin_action(null,'a','b','c')`), false);
expect('service_role log_admin_action ok', await as('service_role', null, `SELECT log_admin_action(null,'a','b','c')`), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
