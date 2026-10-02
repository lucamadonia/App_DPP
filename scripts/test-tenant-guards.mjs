// PGlite test for supabase/migrations/20261001j_tenant_guards_and_limits.sql
// (go-live re-audit package C: RLS-3, RLS-4, RLS-6..10, REG-1, REG-2, XFF,
// create_public_support_ticket). Builds the full schema chain (base SQL files
// + every migration up to and including 20261001g), then applies j twice.
// Run: node scripts/test-tenant-guards.mjs
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { uuid_ossp } from '@electric-sql/pglite/contrib/uuid_ossp';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('../supabase/', import.meta.url));
const TARGET = '20261001j_tenant_guards_and_limits.sql';

function splitSql(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const d = sql.slice(i, i + 2);
    if (d === '--') { const j = sql.indexOf('\n', i); const e = j < 0 ? n : j; cur += sql.slice(i, e); i = e; continue; }
    if (d === '/*') { const j = sql.indexOf('*/', i + 2); const e = j < 0 ? n : j + 2; cur += sql.slice(i, e); i = e; continue; }
    if (c === "'") { let j = i + 1; while (j < n) { if (sql[j] === "'") { if (sql[j + 1] === "'") { j += 2; continue; } break; } j++; } cur += sql.slice(i, j + 1); i = j + 1; continue; }
    if (c === '"') { const j = sql.indexOf('"', i + 1); cur += sql.slice(i, j + 1); i = j + 1; continue; }
    if (c === '$') {
      const m = /^\$[A-Za-z_0-9]*\$/.exec(sql.slice(i));
      if (m && !/[A-Za-z_0-9]/.test(sql[i - 1] || ' ')) { const j = sql.indexOf(m[0], i + m[0].length); const e = j < 0 ? n : j + m[0].length; cur += sql.slice(i, e); i = e; continue; }
    }
    if (c === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out.filter((s) => s.replace(/--.*$/gm, '').trim().length);
}

const db = new PGlite({ extensions: { pgcrypto, uuid_ossp } });
await db.exec(`
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator NOLOGIN; CREATE ROLE supabase_auth_admin NOLOGIN; CREATE ROLE supabase_admin NOLOGIN;
CREATE ROLE supabase_storage_admin NOLOGIN; CREATE ROLE dashboard_user NOLOGIN;
CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions; CREATE SCHEMA cron; CREATE SCHEMA net; CREATE SCHEMA vault;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions; CREATE EXTENSION "uuid-ossp" WITH SCHEMA public;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.role', true),'') $$;
CREATE FUNCTION auth.email() RETURNS text LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.email', true),'') $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true),'')::jsonb, '{}'::jsonb) $$;
CREATE TABLE auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}', raw_app_meta_data jsonb default '{}', email_confirmed_at timestamptz, created_at timestamptz default now(), last_sign_in_at timestamptz, deleted_at timestamptz, phone text, banned_until timestamptz);
CREATE TABLE storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now(), updated_at timestamptz default now(), owner uuid);
CREATE TABLE storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, metadata jsonb, created_at timestamptz default now(), updated_at timestamptz default now());
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
CREATE FUNCTION storage.filename(name text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT (string_to_array(name,'/'))[array_length(string_to_array(name,'/'),1)] $$;
CREATE FUNCTION storage.extension(name text) RETURNS text LANGUAGE sql IMMUTABLE AS $$ SELECT split_part(name,'.',2) $$;
CREATE TABLE cron.job (jobid bigserial primary key, jobname text, schedule text, command text);
CREATE FUNCTION cron.schedule(n text, s text, c text) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO cron.job(jobname,schedule,command) VALUES (n,s,c) RETURNING jobid $$;
CREATE FUNCTION cron.schedule(s text, c text) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO cron.job(schedule,command) VALUES (s,c) RETURNING jobid $$;
CREATE FUNCTION cron.unschedule(n text) RETURNS boolean LANGUAGE sql AS $$ DELETE FROM cron.job WHERE jobname=n RETURNING true $$;
CREATE FUNCTION cron.unschedule(n bigint) RETURNS boolean LANGUAGE sql AS $$ DELETE FROM cron.job WHERE jobid=n RETURNING true $$;
CREATE TABLE net._calls (id bigserial, url text, body jsonb, headers jsonb);
CREATE FUNCTION net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000) RETURNS bigint LANGUAGE sql AS $$ INSERT INTO net._calls(url,body,headers) VALUES (url,body,headers) RETURNING id $$;
CREATE TABLE vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text);
CREATE VIEW vault.decrypted_secrets AS SELECT id, name, secret AS decrypted_secret FROM vault.secrets;
CREATE FUNCTION vault.create_secret(s text, n text default null, d text default null) RETURNS uuid LANGUAGE sql AS $$ INSERT INTO vault.secrets(name,secret) VALUES (n,s) RETURNING id $$;
INSERT INTO vault.secrets(name,secret) VALUES ('service_role_jwt','x'),('supabase_url','http://x'),('project_url','http://x');
GRANT USAGE ON SCHEMA public, auth, storage, extensions TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth, storage TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
SET search_path = public, extensions;
`);

// Base files are partly order-dependent and contain dashboard-era drift:
// retry failed statements a few passes (same approach as the re-audit harness).
const base = ['schema.sql', 'storage.sql', 'migration-users-storage.sql', 'migration-batches.sql', 'migration-add-quantity-to-batches.sql',
  'migration-supply-chain-v2.sql', 'migration-document-visibility.sql', 'migration-returns-hub.sql', 'migration-customer-portal.sql',
  'migration-email-notifications.sql', 'migration-email-templates-v2.sql', 'migration-feature-pack.sql', 'FIX_CUSTOMER_PORTAL_RLS.sql'];
let pending = [];
for (const f of base) for (const st of splitSql(readFileSync(join(ROOT, f), 'utf8'))) pending.push(st);
for (let pass = 0; pass < 6 && pending.length; pass++) {
  const next = [];
  for (const st of pending) {
    if (/^\s*(BEGIN|COMMIT)\s*$/i.test(st)) continue;
    try { await db.exec(st); } catch { next.push(st); try { await db.exec('ROLLBACK'); } catch { /* none */ } }
  }
  if (next.length === pending.length) break;
  pending = next;
}
const golive = [];
for (const f of readdirSync(join(ROOT, 'migrations')).filter((x) => x.endsWith('.sql')).sort()) {
  if (f >= '20261001h') break; // j is applied after a..g only
  const sql = readFileSync(join(ROOT, 'migrations', f), 'utf8');
  try {
    await db.exec('SET search_path = public, extensions;' + sql);
    if (f.startsWith('20261001')) golive.push(f);
  } catch (e) {
    try { await db.exec('ROLLBACK'); } catch { /* none */ }
    if (f.startsWith('20261001')) throw new Error(`${f} failed in chain: ${e.message}`);
    for (const st of splitSql(sql)) {
      if (/^\s*(BEGIN|COMMIT)\s*$/i.test(st)) continue;
      try { await db.exec('SET search_path = public, extensions;' + st); } catch { try { await db.exec('ROLLBACK'); } catch { /* none */ } }
    }
  }
}
if (golive.length !== 7) throw new Error(`expected 20261001a..g in chain, got ${golive.join(',')}`);
const mig = readFileSync(join(ROOT, 'migrations', TARGET), 'utf8');
await db.exec('RESET ROLE; SET search_path = public, extensions;' + mig);
await db.exec('SET search_path = public, extensions;' + mig); // idempotency
console.log('chain a..g + j applied twice OK');

let pass = 0;
let fail = 0;
function expect(name, cond, detail) {
  if (cond) pass++; else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`, cond ? '' : JSON.stringify(detail ?? null).slice(0, 400));
}
async function as(role, uid, sql, params = [], headers = null) {
  await db.exec('RESET ROLE');
  await db.query(`SELECT set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claim.role',$2,false),
    set_config('request.jwt.claims',$3,false), set_config('request.headers',$4,false)`,
  [uid || '', role, JSON.stringify({ role, sub: uid || undefined }), headers ? JSON.stringify(headers) : '']);
  await db.exec(`SET ROLE ${role}`);
  try { const r = await db.query(sql, params); return { ok: true, rows: r.rows }; } catch (e) { return { ok: false, err: e.message }; } finally {
    await db.exec(`RESET ROLE; SELECT set_config('request.jwt.claims','',false), set_config('request.jwt.claim.role','',false),
      set_config('request.jwt.claim.sub','',false), set_config('request.headers','',false)`);
  }
}
const q = async (sql, params = []) => (await db.query(sql, params)).rows;

// ---- fixtures (handle_new_user from 20261001a creates tenant + admin profile)
const U_A = '00000000-0000-0000-0000-0000000000a1';
const U_B = '00000000-0000-0000-0000-0000000000b1';
const U_STAFF = '00000000-0000-0000-0000-0000000000c1';
const U_SUPER = '00000000-0000-0000-0000-0000000000d1';
for (const [id, mail] of [[U_A, 'a@shop-a.de'], [U_B, 'b@shop-b.de'], [U_STAFF, 'staff@trackbliss.eu'], [U_SUPER, 'root@trackbliss.eu']]) {
  await db.query(`INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES ($1,$2,'{"name":"X"}',now())`, [id, mail]);
}
const tenantOf = async (u) => (await q('SELECT tenant_id FROM profiles WHERE id=$1', [u]))[0].tenant_id;
const T_A = await tenantOf(U_A);
const T_B = await tenantOf(U_B);
await db.query(`UPDATE profiles SET admin_role='support_admin', is_super_admin=false WHERE id=$1`, [U_STAFF]);
await db.query(`UPDATE profiles SET admin_role='super_admin', is_super_admin=true WHERE id=$1`, [U_SUPER]);
await db.query(`UPDATE tenants SET slug='shop-a', settings=coalesce(settings,'{}')||'{"returnsHub":{"enabled":true,"features":{"workflowRules":true}}}' WHERE id=$1`, [T_A]);
await db.query(`UPDATE tenants SET slug='shop-b', settings=coalesce(settings,'{}')||'{"returnsHub":{"enabled":true,"features":{"workflowRules":true}}}' WHERE id=$1`, [T_B]);

// ---- RLS-4: platform-owned tenant columns --------------------------------
for (const [col, val] of [['status', `'trial_expired'`], ['custom_domain', `'shop.victim.de'`], ['custom_domain_verified', 'true'],
  ['admin_notes', `'x'`], ['trial_ends_at', `now()+interval '10 years'`], ['suspended_reason', `'x'`], ['health_score', '100'],
  ['dns_verification_token', `'t'`]]) {
  const r = await as('authenticated', U_A, `UPDATE tenants SET ${col}=${val} WHERE id=$1`, [T_A]);
  expect(`tenant admin cannot change tenants.${col}`, !r.ok && /platform administrators/.test(r.err), r);
}
let r = await as('authenticated', U_A, `UPDATE tenants SET name='Shop A GmbH', settings=settings||'{"x":1}' WHERE id=$1 RETURNING name`, [T_A]);
expect('tenant admin can still change name/settings', r.ok && r.rows[0]?.name === 'Shop A GmbH', r);
r = await as('authenticated', U_A, `UPDATE tenants SET settings=jsonb_set(settings,'{returnsHub,portalDomain}',
  '{"customDomain":"returns.shop-a.de","portalType":"returns","domainStatus":"verified","domainVerifiedAt":"2020-01-01"}') WHERE id=$1
  RETURNING settings#>'{returnsHub,portalDomain}' pd`, [T_A]);
expect('client-set portal domainStatus=verified is stored as pending', r.ok && r.rows[0].pd.domainStatus === 'pending'
  && !('domainVerifiedAt' in r.rows[0].pd), r);
r = await as('anon', null, `SELECT get_public_tenant_by_domain('returns.shop-a.de') t`);
expect('unverified portal domain does not resolve', r.ok && r.rows[0].t === null, r);
r = await as('authenticated', U_A, `SELECT set_portal_domain_status($1,'returns.shop-a.de','verified')`, [T_A]);
expect('tenant cannot call set_portal_domain_status', !r.ok, r);
r = await as('service_role', null, `SELECT set_portal_domain_status($1,'other.example.com','verified') ok`, [T_A]);
expect('set_portal_domain_status ignores a domain that is not stored', r.ok && r.rows[0].ok === false, r);
r = await as('service_role', null, `SELECT set_portal_domain_status($1,'Returns.Shop-A.de','verified') ok,
  (SELECT settings#>'{returnsHub,portalDomain}' FROM tenants WHERE id=$1) pd`, [T_A]);
const pdNow = (await q(`SELECT settings#>'{returnsHub,portalDomain}' pd FROM tenants WHERE id=$1`, [T_A]))[0].pd;
expect('service_role verifies the stored portal domain', r.ok && r.rows[0].ok === true && pdNow.domainStatus === 'verified'
  && pdNow.domainVerifiedAt, { r, pdNow });
r = await as('anon', null, `SELECT get_public_tenant_by_domain('returns.shop-a.de')->>'id' t`);
expect('verified portal domain resolves', r.ok && r.rows[0].t === T_A, r);
r = await as('authenticated', U_A, `UPDATE tenants SET settings=jsonb_set(settings,'{returnsHub,portalDomain,portalType}','"both"') WHERE id=$1
  RETURNING settings#>>'{returnsHub,portalDomain,domainStatus}' s`, [T_A]);
expect('verified domain survives an unrelated settings save', r.ok && r.rows[0].s === 'verified', r);
r = await as('authenticated', U_A, `UPDATE tenants SET settings=jsonb_set(settings,'{returnsHub,portalDomain,customDomain}','"other.shop-a.de"') WHERE id=$1
  RETURNING settings#>>'{returnsHub,portalDomain,domainStatus}' s`, [T_A]);
expect('changing the domain drops verified to pending', r.ok && r.rows[0].s === 'pending', r);
r = await as('service_role', null, `UPDATE tenants SET status='suspended', suspended_reason='abuse' WHERE id=$1 RETURNING status`, [T_B]);
expect('service_role can suspend a tenant', r.ok && r.rows[0].status === 'suspended', r);
r = await as('authenticated', U_B, `UPDATE tenants SET status='active' WHERE id=$1`, [T_B]);
expect('suspended tenant cannot reactivate itself', !r.ok, r);
// Cross-tenant writes go through admin-api (service role); RLS limits a
// super admin's JWT to its own row, where the guard lets it through.
r = await as('authenticated', U_SUPER, `UPDATE tenants SET admin_notes='vip' WHERE id=$1 RETURNING admin_notes`, [await tenantOf(U_SUPER)]);
expect('platform super admin passes the column guard', r.ok && r.rows[0]?.admin_notes === 'vip', r);

// ---- REG-1: platform staff read all tenants -------------------------------
r = await as('authenticated', U_STAFF, `SELECT count(*)::int n FROM tenants WHERE id IN ($1,$2)`, [T_A, T_B]);
expect('support_admin reads all tenants', r.ok && r.rows[0].n === 2, r);
r = await as('authenticated', U_A, `SELECT count(*)::int n FROM tenants WHERE id IN ($1,$2)`, [T_A, T_B]);
expect('tenant user reads only own tenant', r.ok && r.rows[0].n === 1, r);
r = await as('authenticated', U_STAFF, `UPDATE tenants SET name='hacked' WHERE id=$1 RETURNING id`, [T_B]);
expect('support_admin gets no cross-tenant UPDATE', !r.ok || r.rows.length === 0, r);

// ---- RLS-10: no anon enumeration ------------------------------------------
r = await as('anon', null, `SELECT count(*) FROM tenants`);
expect('anon cannot SELECT tenants', !r.ok, r);
r = await as('anon', null, `SELECT get_public_tenant_by_slug('shop-a')->>'id' id, tenant_exists($1) e`, [T_A]);
expect('anon slug lookup + tenant_exists still work', r.ok && r.rows[0].id === T_A && r.rows[0].e === true, r);
const residual = await q(`SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename<>'tenants'
  AND roles && ARRAY['anon','public']::name[] AND (coalesce(qual,'') ~* 'from\\s+(public\\.)?tenants\\M' OR coalesce(with_check,'') ~* 'from\\s+(public\\.)?tenants\\M')`);
expect('no anon/public policy reads tenants directly', residual.length === 0, residual);

// ---- RLS-7: no anon template read -----------------------------------------
await db.query(`INSERT INTO rh_email_templates(tenant_id,event_type,enabled,subject_template,body_template) VALUES ($1,'return_confirmed',true,'Hi','x')`, [T_B]);
r = await as('anon', null, `SELECT count(*) FROM rh_email_templates`);
expect('anon cannot read rh_email_templates', !r.ok, r);
r = await as('authenticated', U_B, `SELECT count(*)::int n FROM rh_email_templates WHERE tenant_id=$1`, [T_B]);
expect('tenant staff still reads own templates', r.ok && r.rows[0].n === 1, r);

// ---- RLS-8: customer-portal ticket insert ---------------------------------
const U_CUST = '00000000-0000-0000-0000-0000000000e1';
const [cust] = await q(`INSERT INTO rh_customers(tenant_id,email,first_name) VALUES ($1,'kunde@example.com','Kim') RETURNING id`, [T_A]);
await db.query(`INSERT INTO auth.users(id,email,raw_user_meta_data,email_confirmed_at) VALUES ($1,'kunde@example.com',$2,now())`,
  [U_CUST, JSON.stringify({ user_type: 'customer', tenant_id: T_A })]);
await db.query(`DELETE FROM profiles WHERE id=$1`, [U_CUST]);
await db.query(`INSERT INTO rh_customer_profiles(id,customer_id,tenant_id) VALUES ($1,$2,$3) ON CONFLICT (id) DO UPDATE SET customer_id=$2, tenant_id=$3`, [U_CUST, cust.id, T_A]);
r = await as('authenticated', U_CUST, `INSERT INTO rh_tickets(tenant_id,ticket_number,customer_id,subject,status,priority,assigned_to,tags,metadata)
  VALUES ($1,'TKT-X',$2,'Hilfe','resolved','urgent',$3,ARRAY['vip'],'{"source":"x","vip":true}') RETURNING status, priority, assigned_to, tags, metadata`, [T_A, cust.id, U_A]);
expect('customer ticket forced to open/normal/unassigned', r.ok && r.rows[0].status === 'open' && r.rows[0].priority === 'normal'
  && r.rows[0].assigned_to === null && r.rows[0].tags.length === 0 && r.rows[0].metadata.source === 'customer_portal' && !r.rows[0].metadata.vip, r);
r = await as('authenticated', U_A, `INSERT INTO rh_tickets(tenant_id,ticket_number,subject,status,priority) VALUES ($1,'TKT-S','Staff','in_progress','high') RETURNING status, priority`, [T_A]);
expect('staff ticket insert keeps its values', r.ok && r.rows[0].status === 'in_progress' && r.rows[0].priority === 'high', r);

// ---- XFF ------------------------------------------------------------------
const ip = async (h) => (await as('service_role', null, `SELECT _public_returns_client_ip() ip`, [], h)).rows?.[0]?.ip;
expect('XFF: right-most hop, not the client-supplied first entry', await ip({ 'x-forwarded-for': '6.6.6.6, 10.0.0.9' }) === '10.0.0.9');
expect('cf-connecting-ip wins', await ip({ 'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '6.6.6.6, 10.0.0.9' }) === '1.2.3.4');

// ---- RLS-6: no lockout through the e-mail bucket ---------------------------
await db.query(`INSERT INTO billing_module_subscriptions(tenant_id,module_id,status) VALUES ($1,'returns_hub_starter','active') ON CONFLICT DO NOTHING`, [T_A]);
const [ret] = await q(`INSERT INTO rh_returns(tenant_id,return_number,status,customer_id,metadata) VALUES ($1,'RET-20261001-ABC','CREATED',$2,'{"email":"victim@example.com"}') RETURNING id`, [T_A, cust.id]);
for (let i = 0; i < 31; i++) {
  await as('anon', null, `SELECT public_track_return($1,'victim@example.com')`, [`RET-BOGUS-${i}`], { 'x-forwarded-for': `9.9.9.9, 198.51.100.${i % 3}` });
}
r = await as('anon', null, `SELECT public_track_return('RET-20261001-ABC','victim@example.com') t`, [], { 'x-forwarded-for': '203.0.113.77' });
expect('victim can still track after 31 third-party failures', r.ok && r.rows[0].t !== null, r);
r = await as('anon', null, `SELECT public_track_return('RET-NOPE','victim@example.com') t`, [], { 'x-forwarded-for': '198.51.100.0' });
expect('attacker IP blocked after 20 failures', r.ok && r.rows[0].t === null, r);

// ---- RLS-3: workflow entitlement ------------------------------------------
const graph = (ev) => JSON.stringify({ _graphVersion: '2', nodes: [{ id: 't', type: 'trigger', data: { eventType: ev } },
  { id: 'a', type: 'action', data: { actionType: 'notification_internal', params: { message: 'hi' } } }], edges: [{ source: 't', target: 'a' }] });
for (const t of [T_A, T_B]) {
  await db.query(`INSERT INTO rh_workflow_rules(tenant_id,name,trigger_type,active,server_execution,conditions,actions) VALUES ($1,'r','ticket_created',true,true,$2,'[]')`, [t, graph('ticket_created')]);
}
await db.query(`DELETE FROM rh_workflow_runs`);
await as('authenticated', U_B, `INSERT INTO rh_tickets(tenant_id,ticket_number,subject) VALUES ($1,'TKT-B1','x')`, [T_B]);
await as('authenticated', U_A, `INSERT INTO rh_tickets(tenant_id,ticket_number,subject) VALUES ($1,'TKT-A1','x')`, [T_A]);
let runs = await q(`SELECT tenant_id FROM rh_workflow_runs`);
expect('free tenant with workflowRules flag gets no run', !runs.some((x) => x.tenant_id === T_B), runs);
expect('tenant with Returns Hub module gets a run', runs.some((x) => x.tenant_id === T_A), runs);
await db.query(`UPDATE billing_module_subscriptions SET status='canceled' WHERE tenant_id=$1`, [T_A]);
await db.exec(`SELECT workflow_tick()`);
runs = await q(`SELECT status, error FROM rh_workflow_runs WHERE tenant_id=$1`, [T_A]);
expect('tick cancels runs after the entitlement lapsed', runs.length === 1 && runs[0].status === 'cancelled' && /Returns Hub/.test(runs[0].error), runs);
await db.query(`INSERT INTO billing_subscriptions(tenant_id,stripe_customer_id,plan,status) VALUES ($1,'cus_t','enterprise','active')`, [T_B]);
await as('authenticated', U_B, `INSERT INTO rh_tickets(tenant_id,ticket_number,subject) VALUES ($1,'TKT-B2','x')`, [T_B]);
runs = await q(`SELECT status FROM rh_workflow_runs WHERE tenant_id=$1`, [T_B]);
expect('enterprise plan is entitled', runs.length === 1, runs);

// ---- REG-2: deferral instead of dropping ----------------------------------
// T_B is paid (enterprise). Exhaust its hourly bucket directly.
const hourStart = `to_timestamp(floor(extract(epoch FROM now())/3600)*3600)`;
await db.query(`INSERT INTO rate_limit_counters(bucket,window_start,hits) VALUES ($1, ${hourStart}, 600)
  ON CONFLICT (bucket,window_start) DO UPDATE SET hits=600`, [`notif:tenant:h:${T_B}`]);
r = await as('authenticated', U_B, `INSERT INTO rh_notifications(tenant_id,channel,recipient_email,subject,content,status)
  VALUES ($1,'email','kunde@example.org','Versandt','<p>x</p>','pending') RETURNING id, status, metadata`, [T_B]);
expect('paid tenant over the cap: mail stored as deferred', r.ok && r.rows[0].status === 'deferred'
  && r.rows[0].metadata.deferred_reason === 'tenant_hourly_cap', r);
const deferredId = r.rows?.[0]?.id;
const callsBefore = (await q(`SELECT count(*)::int n FROM net._calls`))[0].n;
expect('deferred mail is not dispatched', callsBefore === (await q(`SELECT count(*)::int n FROM net._calls`))[0].n);
r = await as('authenticated', U_B, `UPDATE rh_notifications SET status='pending' WHERE id=$1`, [deferredId]);
expect('tenant cannot release its own deferred mail', !r.ok, r);
r = await as('authenticated', U_B, `SELECT rh_notifications_release_deferred()`);
expect('tenant cannot call the release function', !r.ok, r);
r = await as('authenticated', U_B, `INSERT INTO rh_notifications(tenant_id,channel,recipient_email,status) VALUES ($1,'email','y@example.org','deferred') RETURNING status`, [T_B]);
expect('client-chosen deferred status still counts against the cap', r.ok && r.rows[0].status === 'deferred', r);
await db.query(`DELETE FROM rate_limit_counters WHERE bucket=$1`, [`notif:tenant:h:${T_B}`]);
const rel = (await q(`SELECT rh_notifications_release_deferred() r`))[0].r;
const [row] = await q(`SELECT status, metadata FROM rh_notifications WHERE id=$1`, [deferredId]);
const callsAfter = (await q(`SELECT count(*)::int n FROM net._calls`))[0].n;
expect('cron releases deferred mail into dispatch', rel.released >= 1 && row.status === 'pending' && row.metadata.released_at
  && callsAfter > callsBefore, { rel, row, callsBefore, callsAfter });
await db.query(`INSERT INTO rh_notifications(tenant_id,channel,recipient_email,status,created_at) VALUES ($1,'email','old@example.org','deferred',now()-interval '4 days')`, [T_B]);
await q(`SELECT rh_notifications_release_deferred()`);
const [old] = await q(`SELECT status, metadata->>'error' e FROM rh_notifications WHERE recipient_email='old@example.org'`);
expect('deferred mail older than 72h becomes failed (visible)', old.status === 'failed' && old.e === 'deferred_expired', old);
// Free tenant (T_A lost its module above): still rejected with an error.
await db.query(`INSERT INTO rate_limit_counters(bucket,window_start,hits) VALUES ($1, ${hourStart}, 20)
  ON CONFLICT (bucket,window_start) DO UPDATE SET hits=20`, [`notif:tenant:h:${T_A}`]);
r = await as('authenticated', U_A, `INSERT INTO rh_notifications(tenant_id,channel,recipient_email) VALUES ($1,'email','z@example.org')`, [T_A]);
expect('free tenant over the cap is rejected with an error', !r.ok && /rate limit/i.test(r.err), r);
expect('release cron scheduled', (await q(`SELECT count(*)::int n FROM cron.job WHERE jobname='trackbliss-release-deferred-mails'`))[0].n === 1);

// REG-2 review: deferred rows must not burn the tenant budget, and one
// tenant's backlog must not starve another tenant.
const hits = async (bucket, win) => (await q(`SELECT coalesce((SELECT hits FROM rate_limit_counters WHERE bucket=$1
  AND window_start=to_timestamp(floor(extract(epoch FROM now())/${win})*${win})),0)::int n`, [bucket]))[0].n;
const hB = `notif:tenant:h:${T_B}`;
const dB = `notif:tenant:d:${T_B}`;
await db.query(`DELETE FROM rate_limit_counters WHERE bucket LIKE $1`, [`notif:%${T_B}%`]);
await db.query(`DELETE FROM rh_notifications WHERE tenant_id=$1 AND status='deferred'`, [T_B]);
const st = { pending: 0, deferred: 0, rejected: 0 };
for (let i = 0; i < 60; i++) {
  const x = await as('authenticated', U_B, `INSERT INTO rh_notifications(tenant_id,channel,recipient_email,subject,content)
    VALUES ($1,'email','owner@shop-b.de','Neue Retoure','x') RETURNING status`, [T_B]);
  if (!x.ok) st.rejected++; else st[x.rows[0].status]++;
}
expect('60 mails to one recipient: 20 sent, 20 deferred, 20 rejected (bounded backlog)',
  st.pending === 20 && st.deferred === 20 && st.rejected === 20, st);
expect('deferred mails do not consume the tenant buckets', await hits(hB, 3600) === 20 && await hits(dB, 86400) === 20,
  { h: await hits(hB, 3600), d: await hits(dB, 86400) });
let relSum = 0;
for (let i = 0; i < 6; i++) relSum += (await q(`SELECT rh_notifications_release_deferred() r`))[0].r.released;
expect('6 release runs with a full recipient bucket: no release, tenant buckets unchanged',
  relSum === 0 && await hits(hB, 3600) === 20 && await hits(dB, 86400) === 20,
  { relSum, h: await hits(hB, 3600), d: await hits(dB, 86400) });
await db.query(`DELETE FROM rate_limit_counters WHERE bucket LIKE 'notif:rcpt:%'`);
const rel2 = (await q(`SELECT rh_notifications_release_deferred() r`))[0].r;
expect('recipient window over: the 20 deferred mails are released and counted once',
  rel2.released === 20 && await hits(hB, 3600) === 40 && await hits(dB, 86400) === 40, { rel2, h: await hits(hB, 3600) });

// Starvation: T_A (free tier, hour bucket full) owns 350 older deferred rows.
await db.query(`INSERT INTO rate_limit_counters(bucket,window_start,hits) VALUES ($1, ${hourStart}, 20)
  ON CONFLICT (bucket,window_start) DO UPDATE SET hits=20`, [`notif:tenant:h:${T_A}`]);
await db.query(`INSERT INTO rh_notifications(tenant_id,channel,recipient_email,status,created_at)
  SELECT $1,'email','a'||g||'@example.org','deferred',now()-interval '1 hour' FROM generate_series(1,350) g`, [T_A]);
const [late] = await q(`INSERT INTO rh_notifications(tenant_id,channel,recipient_email,status) VALUES ($1,'email','late@example.org','deferred') RETURNING id`, [T_B]);
const hA = await hits(`notif:tenant:h:${T_A}`, 3600);
const rel3 = (await q(`SELECT rh_notifications_release_deferred(300) r`))[0].r;
const [lateRow] = await q(`SELECT status FROM rh_notifications WHERE id=$1`, [late.id]);
expect('a blocked tenant with 350 older deferred rows does not starve another tenant',
  lateRow.status === 'pending' && rel3.released === 1, { rel3, lateRow });
expect('blocked tenant buckets are not touched by the release', await hits(`notif:tenant:h:${T_A}`, 3600) === hA);
await db.query(`DELETE FROM rh_notifications WHERE tenant_id=$1 AND status='deferred'`, [T_A]);

// Per-tenant backlog cap: 3000 deferred rows -> further over-cap mail is rejected.
await db.query(`INSERT INTO rh_notifications(tenant_id,channel,recipient_email,status)
  SELECT $1,'email','b'||g||'@example.org','deferred' FROM generate_series(1,3000) g`, [T_B]);
await db.query(`INSERT INTO rate_limit_counters(bucket,window_start,hits) VALUES ($1, ${hourStart}, 600)
  ON CONFLICT (bucket,window_start) DO UPDATE SET hits=600`, [hB]);
r = await as('authenticated', U_B, `INSERT INTO rh_notifications(tenant_id,channel,recipient_email) VALUES ($1,'email','new@example.org')`, [T_B]);
expect('tenant with 3000 deferred mails: over-cap mail rejected with an error', !r.ok && /backlog full/i.test(r.err), r);
expect('rejected mail leaves the hour bucket unchanged', await hits(hB, 3600) === 600);
await db.query(`DELETE FROM rh_notifications WHERE tenant_id=$1 AND status='deferred'`, [T_B]);
await db.query(`DELETE FROM rate_limit_counters WHERE bucket LIKE $1`, [`notif:%${T_B}%`]);

// ---- create_public_support_ticket -----------------------------------------
await db.query(`INSERT INTO wh_shipments(tenant_id,shipment_number,recipient_type,recipient_name,recipient_email,tracking_token,status,
  shipping_street,shipping_city,shipping_postal_code,shipping_country)
  VALUES ($1,'SH-1','customer','Erika Mustermann','erika@example.com','tok-123','shipped','Weg 1','Freiburg','79098','DE')`, [T_B]);
r = await as('anon', null, `SELECT * FROM create_public_support_ticket('tok-123','erika@example.com','Paket fehlt','Wo ist mein Paket?',NULL)`, [], { 'x-forwarded-for': '192.0.2.10' });
expect('support ticket for a new e-mail is created', r.ok && r.rows.length === 1 && /^TKT-/.test(r.rows[0].ticket_number), r);
const [c2] = await q(`SELECT first_name, last_name FROM rh_customers WHERE tenant_id=$1 AND email='erika@example.com'`, [T_B]);
expect('customer created with first/last name', c2?.first_name === 'Erika' && c2?.last_name === 'Mustermann', c2);
let got = 0;
for (let i = 0; i < 6; i++) {
  const x = await as('anon', null, `SELECT * FROM create_public_support_ticket('tok-123','erika@example.com','s','m',NULL)`, [], { 'x-forwarded-for': `192.0.2.${20 + i}` });
  if (x.ok && x.rows.length) got++;
}
expect('support tickets rate limited per token (5/h)', got === 4, got);
r = await as('anon', null, `SELECT * FROM create_public_support_ticket('nope','erika@example.com','s','m',NULL)`, [], { 'x-forwarded-for': '192.0.2.99' });
expect('invalid token rejected', !r.ok && /invalid_token/.test(r.err), r);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
