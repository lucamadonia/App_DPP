// PGlite test for supabase/migrations/20261001h_accept_invitation.sql (SEC-07 accept flow).
// Builds the chain 20261001a -> 20261001h on a minimal production-shaped schema.
// Run: node scripts/test-accept-invitation.mjs
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
const read = (f) => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8');
const migA = read('20261001a_lockdown_profiles_storage_masterdata.sql');
const migH = read('20261001h_accept_invitation.sql');

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
CREATE TABLE invitations (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade, email text not null,
  role text default 'viewer' check (role in ('admin','editor','viewer')), name text, message text,
  status text default 'pending' check (status in ('pending','accepted','expired','cancelled')), invited_by uuid, created_at timestamptz default now(),
  expires_at timestamptz default now()+interval '7 days', unique (tenant_id, email, status));
CREATE TABLE activity_log (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade, user_id uuid,
  action text not null, entity_type text not null, entity_id uuid, details jsonb default '{}', created_at timestamptz default now());
CREATE TABLE products (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id) on delete cascade, name text);
CREATE TABLE billing_credits (tenant_id uuid primary key references tenants(id) on delete cascade, monthly_allowance int default 3);
CREATE TABLE billing_subscriptions (id uuid primary key default gen_random_uuid(), tenant_id uuid references tenants(id) on delete cascade, plan text, status text);
CREATE TABLE billing_module_subscriptions (id uuid primary key default gen_random_uuid(), tenant_id uuid references tenants(id) on delete cascade, module_id text, status text);
CREATE TABLE rh_customers (id uuid primary key default gen_random_uuid(), tenant_id uuid references tenants(id), email text, first_name text, last_name text, phone text, company text, display_name text,
  addresses jsonb default '[]', communication_preferences jsonb, risk_score int default 0, tags text[] default '{}', notes text, updated_at timestamptz default now());
CREATE TABLE rh_customer_profiles (id uuid primary key references auth.users(id), customer_id uuid references rh_customers(id), tenant_id uuid references tenants(id), display_name text, avatar_url text, email_verified boolean default false, last_login_at timestamptz, updated_at timestamptz default now());
CREATE TABLE countries (id serial primary key, name text);
CREATE TABLE news_items (id serial primary key, title text);
CREATE FUNCTION get_user_tenant_id() RETURNS uuid AS $$ BEGIN RETURN (SELECT tenant_id FROM profiles WHERE id = auth.uid()); END; $$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE FUNCTION get_customer_id() RETURNS uuid AS $$ SELECT customer_id FROM rh_customer_profiles WHERE id = auth.uid(); $$ LANGUAGE sql SECURITY DEFINER STABLE;
CREATE FUNCTION log_admin_action(p_admin_id UUID, p_admin_email TEXT, p_action TEXT, p_target_type TEXT, p_target_id TEXT DEFAULT NULL, p_target_label TEXT DEFAULT NULL,
  p_changes JSONB DEFAULT NULL, p_reason TEXT DEFAULT NULL, p_ip_address TEXT DEFAULT NULL, p_user_agent TEXT DEFAULT NULL) RETURNS UUID AS $$ SELECT gen_random_uuid() $$ LANGUAGE sql SECURITY DEFINER;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rh_customers ENABLE ROW LEVEL SECURITY; ALTER TABLE rh_customer_profiles ENABLE ROW LEVEL SECURITY; ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can view profiles in their tenant" ON profiles FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "inv_sel" ON invitations FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE POLICY "act_sel" ON activity_log FOR SELECT USING (tenant_id = get_user_tenant_id());
CREATE FUNCTION handle_new_user() RETURNS trigger AS $$ BEGIN RETURN NEW; END $$ LANGUAGE plpgsql;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public, storage TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
`);
await db.exec(migA);
await db.exec(migH);
await db.exec(migH); // idempotency
console.log('migrations a + h applied (h twice) OK');

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
const accept = (uid, id, confirm = false) => as('authenticated', uid, `SELECT accept_invitation('${id}', ${confirm}) AS r`);
const res = (x) => x.r.rows[0].r;
const q1 = async (sql) => (await db.query(sql)).rows[0];

// Self-signups -> each gets its own tenant via handle_new_user (20261001a).
const U = (n) => `00000000-0000-0000-0000-0000000000${n}`;
const [HOST, BOB, EVE, SOLE, EMPTY, MEM, DUO1, PAID, UNC] =
  ['a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'f2', 'f4', 'f5'].map(U);
const signup = (id, email, confirmed = true) =>
  db.exec(`INSERT INTO auth.users VALUES ('${id}','${email}','{"name":"${email.split('@')[0]}"}',${confirmed ? 'now()' : 'null'})`);
await signup(HOST, 'host@acme.de');
await signup(BOB, 'Bob@Example.com');
await signup(EVE, 'eve@evil.de');
await signup(SOLE, 'sole@data.de');
await signup(EMPTY, 'empty@x.de');
await signup(DUO1, 'duo1@x.de');
await signup(PAID, 'paid@x.de');
await signup(UNC, 'unconfirmed@x.de', false);
const tenantOf = async (uid) => (await q1(`SELECT tenant_id FROM profiles WHERE id='${uid}'`)).tenant_id;
const T_HOST = await tenantOf(HOST), T_BOB = await tenantOf(BOB), T_EVE = await tenantOf(EVE), T_SOLE = await tenantOf(SOLE),
  T_EMPTY = await tenantOf(EMPTY), T_DUO = await tenantOf(DUO1), T_PAID = await tenantOf(PAID);
// MEM is an editor in DUO1's tenant (DUO1 is the sole admin there).
await db.exec(`INSERT INTO auth.users VALUES ('${MEM}','mem@x.de','{}',now())`);
await db.exec(`UPDATE profiles SET tenant_id='${T_DUO}', role='editor' WHERE id='${MEM}'`);
await db.exec(`DELETE FROM tenants t WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.tenant_id=t.id)`);
await db.exec(`INSERT INTO products (tenant_id,name) VALUES ('${T_SOLE}','Widget')`);
await db.exec(`INSERT INTO billing_credits (tenant_id) VALUES ('${T_EMPTY}')`); // bookkeeping only -> still "empty"
await db.exec(`INSERT INTO billing_subscriptions (tenant_id,plan,status) VALUES ('${T_EMPTY}','free','active'),('${T_PAID}','pro','active')`);
// HOST is on enterprise (25 seats) so the join tests below are not seat-limited; EVE stays free (1 seat).
await db.exec(`INSERT INTO billing_subscriptions (tenant_id,plan,status) VALUES ('${T_HOST}','enterprise','active')`);

// Host admin creates invitations through the normal admin-only RLS path.
const INV = (n) => `00000000-0000-0000-0000-00000000f0${n}`;
const mk = (id, email, role = 'editor', extra = '') =>
  as('authenticated', HOST, `INSERT INTO invitations (id,tenant_id,email,role,invited_by${extra ? ',expires_at' : ''}) VALUES ('${id}','${T_HOST}','${email}','${role}','${HOST}'${extra ? `,${extra}` : ''})`);
expect('host creates invitation for bob (mixed case)', await mk(INV('01'), 'bob@example.COM', 'editor'), true);
expect('host creates expired invitation', await mk(INV('02'), 'sole@data.de', 'viewer', `now() - interval '1 day'`), true);
await db.exec(`UPDATE invitations SET status='cancelled' WHERE id='${INV('02')}'`); // free the (tenant,email,pending) slot
expect('host creates invitation for sole admin with data', await mk(INV('03'), 'sole@data.de', 'admin'), true);
expect('host creates invitation for empty-tenant admin', await mk(INV('04'), 'empty@x.de', 'viewer'), true);
expect('host creates invitation for duo admin', await mk(INV('05'), 'duo1@x.de', 'viewer'), true);
expect('host creates invitation for paid admin', await mk(INV('06'), 'paid@x.de', 'viewer'), true);
expect('host creates invitation for member', await mk(INV('07'), 'mem@x.de', 'viewer'), true);
expect('host creates invitation for unconfirmed address', await mk(INV('08'), 'unconfirmed@x.de', 'viewer'), true);
expect('host creates expired invitation (2)', await mk(INV('09'), 'eve@evil.de', 'viewer', `now() - interval '1 hour'`), true);
// Squatting: EVE's own tenant "invites" bob into EVE's tenant as admin -> only bob decides; also eve cannot use bob's invitation.
expect('eve invites bob into eve tenant (own tenant, allowed)', await as('authenticated', EVE, `INSERT INTO invitations (id,tenant_id,email,role) VALUES ('${INV('10')}','${T_EVE}','bob@example.com','admin')`), true);

// --- grants ---
expect('anon cannot call accept_invitation', await as('anon', null, `SELECT accept_invitation('${INV('01')}', false)`), false);
expect('authenticated without uid rejected', await accept(null, INV('01')), false);
expect('anon cannot list invitations', await as('anon', null, `SELECT list_my_pending_invitations()`), false);
expect('authenticated cannot call internal helper', await as('authenticated', BOB, `SELECT _invitation_leave_assessment('${BOB}')`), false);
expect('authenticated cannot call seat helper', await as('authenticated', BOB, `SELECT _tenant_seat_status('${T_HOST}')`), false);

// --- list ---
let r = await as('authenticated', BOB, `SELECT list_my_pending_invitations() AS r`);
expect('bob lists both invitations addressed to him (case-insensitive)', r, true,
  (x) => res(x).invitations.length === 2 && res(x).invitations.every((i) => ['editor', 'admin'].includes(i.role)) && res(x).leave.outcome === 'delete_empty_tenant');
r = await as('authenticated', EVE, `SELECT list_my_pending_invitations() AS r`);
expect('eve sees none (expired excluded, foreign excluded)', r, true, (x) => res(x).invitations.length === 0);
r = await as('authenticated', UNC, `SELECT list_my_pending_invitations() AS r`);
expect('unconfirmed email sees none', r, true, (x) => res(x).invitations.length === 0);

// --- wrong email / squatting ---
r = await accept(EVE, INV('01'));
expect('wrong email: eve cannot accept bob\'s invitation', r, true, (x) => res(x).error === 'not_found');
r = await accept(EVE, '00000000-0000-0000-0000-0000000000ff');
expect('unknown id gives same answer as wrong email', r, true, (x) => res(x).error === 'not_found');
r = await accept(EVE, INV('09'));
expect('expired invitation rejected', r, true, (x) => res(x).error === 'expired');
r = await accept(SOLE, INV('02'));
expect('cancelled invitation rejected', r, true, (x) => res(x).error === 'not_pending');
r = await accept(UNC, INV('08'));
expect('unconfirmed email rejected', r, true, (x) => res(x).error === 'email_not_confirmed');
expect('eve still in own tenant', { ok: (await tenantOf(EVE)) === T_EVE }, true);
expect('direct self tenant switch still blocked by guard', await as('authenticated', EVE, `UPDATE profiles SET tenant_id='${T_HOST}' WHERE id='${EVE}'`), false);
expect('client cannot mark invitation accepted', await as('authenticated', BOB, `UPDATE invitations SET status='accepted' WHERE id='${INV('01')}' RETURNING id`), true, (x) => x.r.rows.length === 0);

// --- sole admin with data requires confirmation ---
r = await accept(SOLE, INV('03'));
expect('sole admin with data: confirmation_required', r, true,
  (x) => res(x).status === 'confirmation_required' && res(x).leave.data_tables.includes('products'));
expect('nothing changed without confirmation', { ok: (await tenantOf(SOLE)) === T_SOLE && (await q1(`SELECT status FROM invitations WHERE id='${INV('03')}'`)).status === 'pending' }, true);
r = await accept(SOLE, INV('03'), true);
expect('sole admin with data: accepted after confirm', r, true, (x) => res(x).status === 'accepted' && res(x).role === 'admin' && res(x).left_tenant_deleted === false);
let p = await q1(`SELECT tenant_id, role FROM profiles WHERE id='${SOLE}'`);
expect('sole admin moved with invitation role', { ok: p.tenant_id === T_HOST && p.role === 'admin' }, true);
expect('data tenant kept (not deleted)', { ok: (await q1(`SELECT count(*)::int n FROM products WHERE tenant_id='${T_SOLE}'`)).n === 1 && (await q1(`SELECT count(*)::int n FROM tenants WHERE id='${T_SOLE}'`)).n === 1 }, true);
expect('audit rows in both tenants', { ok: (await q1(`SELECT count(*)::int n FROM activity_log WHERE user_id='${SOLE}' AND tenant_id IN ('${T_HOST}','${T_SOLE}')`)).n === 2 }, true);
expect('GUC reset after move', await as('authenticated', SOLE, `SELECT current_setting('trackbliss.profile_change', true) AS v`), true, (x) => !x.r.rows[0].v);
r = await accept(SOLE, INV('03'), true);
expect('replay of accepted invitation rejected', r, true, (x) => res(x).error === 'not_pending');

// --- sole admin with other members must promote first ---
r = await accept(DUO1, INV('05'), true);
expect('sole admin with members: promote_admin_first (even with confirm)', r, true, (x) => res(x).error === 'promote_admin_first');
expect('duo1 still in own tenant', { ok: (await tenantOf(DUO1)) === T_DUO }, true);

// --- paid subscription blocks ---
r = await accept(PAID, INV('06'), true);
expect('sole admin with paid plan: active_subscription', r, true, (x) => res(x).error === 'active_subscription');

// --- non-admin member leaves freely ---
r = await accept(MEM, INV('07'));
expect('editor member accepts without confirmation', r, true, (x) => res(x).status === 'accepted' && res(x).role === 'viewer');
expect('old tenant intact for remaining admin', { ok: (await tenantOf(DUO1)) === T_DUO && (await tenantOf(MEM)) === T_HOST }, true);

// --- happy path: sole member of an empty tenant, tenant cleaned up ---
r = await accept(EMPTY, INV('04'));
expect('empty-tenant user accepts directly', r, true, (x) => res(x).status === 'accepted' && res(x).left_tenant_deleted === true);
expect('empty tenant deleted', { ok: (await q1(`SELECT count(*)::int n FROM tenants WHERE id='${T_EMPTY}'`)).n === 0 }, true);
r = await accept(BOB, INV('01'));
expect('bob accepts host invitation (mixed-case email)', r, true, (x) => res(x).status === 'accepted' && res(x).tenant_id === T_HOST && res(x).role === 'editor');
expect('bob invitation marked accepted', { ok: (await q1(`SELECT status FROM invitations WHERE id='${INV('01')}'`)).status === 'accepted' }, true);
expect('bob now sees host tenant data scope', await as('authenticated', BOB, `SELECT get_user_tenant_id() AS t`), true, (x) => x.r.rows[0].t === T_HOST);
// Bob is now an editor at HOST; the squat invitation from EVE needs another explicit accept.
r = await as('authenticated', BOB, `SELECT list_my_pending_invitations() AS r`);
expect('remaining eve invitation listed with leave assessment', r, true, (x) => res(x).invitations.length === 1 && res(x).leave.outcome === 'leave');
r = await accept(HOST, INV('07'));
expect('host cannot accept an invitation addressed to someone else', r, true, (x) => res(x).error === 'not_found');

// --- seat limit (invitation inserted directly via PostgREST, bypassing invite-user) ---
r = await accept(BOB, INV('10'));
expect('free tenant with one profile: accept rejected with seat_limit', r, true,
  (x) => res(x).status === 'error' && res(x).error === 'seat_limit' && res(x).limit === 1);
expect('seat_limit: bob unchanged, invitation still pending',
  { ok: (await tenantOf(BOB)) === T_HOST && (await q1(`SELECT status FROM invitations WHERE id='${INV('10')}'`)).status === 'pending' }, true);
await db.exec(`INSERT INTO billing_subscriptions (tenant_id,plan,status) VALUES ('${T_EVE}','pro','canceled')`);
r = await accept(BOB, INV('10'));
expect('canceled pro subscription still counts as free', r, true, (x) => res(x).error === 'seat_limit');

// --- handle_new_user Path 2 (signUp with data.invitation_id) honours the seat limit ---
expect('eve inserts invitation for a new user directly', await as('authenticated', EVE,
  `INSERT INTO invitations (id,tenant_id,email,role) VALUES ('${INV('11')}','${T_EVE}','new1@x.de','editor')`), true);
const NEW1 = U('91'), NEW2 = U('92');
await db.exec(`INSERT INTO auth.users VALUES ('${NEW1}','new1@x.de','{"invitation_id":"${INV('11')}"}',now())`);
const t1 = await tenantOf(NEW1);
expect('Path 2 over seat limit: new user gets own tenant as admin', { ok: !!t1 && t1 !== T_EVE && (await q1(`SELECT role FROM profiles WHERE id='${NEW1}'`)).role === 'admin' }, true);
expect('Path 2 over seat limit: invitation stays pending, eve tenant still 1 profile',
  { ok: (await q1(`SELECT status FROM invitations WHERE id='${INV('11')}'`)).status === 'pending'
      && (await q1(`SELECT count(*)::int n FROM profiles WHERE tenant_id='${T_EVE}'`)).n === 1 }, true);
expect('host inserts invitation for a new user', await mk(INV('12'), 'new2@x.de', 'viewer'), true);
await db.exec(`INSERT INTO auth.users VALUES ('${NEW2}','new2@x.de','{"invitation_id":"${INV('12')}"}',now())`);
expect('Path 2 with a free seat: new user joins host as viewer, invitation accepted',
  { ok: (await tenantOf(NEW2)) === T_HOST && (await q1(`SELECT role FROM profiles WHERE id='${NEW2}'`)).role === 'viewer'
      && (await q1(`SELECT status FROM invitations WHERE id='${INV('12')}'`)).status === 'accepted' }, true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
