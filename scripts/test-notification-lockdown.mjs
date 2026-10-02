// PGlite test for supabase/migrations/20261001d_rh_notifications_lockdown_ratelimit.sql
// (go-live package D: SEC-04, SRE-03, SRE-04, SEC-09/SEC-10).
// Run: node scripts/test-notification-lockdown.mjs
//
// Covers the regression where public_enqueue_notification selected a
// non-existent rh_customers.name column (42703 for every return/ticket with a
// customer_id), the anon lockdown, and the per-tenant insert guard that caps
// free tenants on the platform sender.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const db = new PGlite();
const mig = readFileSync(
  new URL('../supabase/migrations/20261001d_rh_notifications_lockdown_ratelimit.sql', import.meta.url),
  'utf8',
);

// Minimal schema mirroring the production columns the migration touches.
await db.exec(`
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
CREATE TABLE tenants (id uuid primary key default gen_random_uuid(), name text, slug text unique, settings jsonb default '{}');
CREATE TABLE profiles (id uuid primary key, tenant_id uuid references tenants(id), email text);
CREATE TABLE rh_customers (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), email text not null,
  first_name text, last_name text, phone text, company text, created_at timestamptz default now(), updated_at timestamptz default now());
CREATE TABLE rh_returns (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), return_number text not null,
  status text not null default 'CREATED', customer_id uuid references rh_customers(id), reason_category text, reason_text text,
  metadata jsonb default '{}', created_at timestamptz default now(), updated_at timestamptz default now());
CREATE TABLE rh_return_timeline (id uuid primary key default gen_random_uuid(), tenant_id uuid, return_id uuid references rh_returns(id),
  status text, comment text, created_at timestamptz default now());
CREATE TABLE rh_tickets (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id), ticket_number text,
  customer_id uuid references rh_customers(id), subject text, status text default 'open', metadata jsonb default '{}', created_at timestamptz default now());
CREATE TABLE rh_ticket_messages (id uuid primary key default gen_random_uuid(), ticket_id uuid references rh_tickets(id), sender_type text,
  sender_email text, created_at timestamptz default now());
CREATE TABLE rh_email_templates (id uuid primary key default gen_random_uuid(), tenant_id uuid references tenants(id), event_type text, enabled boolean default true);
CREATE TABLE rh_notifications (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  return_id uuid references rh_returns(id), ticket_id uuid references rh_tickets(id), customer_id uuid references rh_customers(id),
  channel text not null check (channel in ('email','sms','push','websocket')), template text, subject text, content text,
  status text default 'pending' check (status in ('pending','sent','delivered','failed')), sent_at timestamptz,
  metadata jsonb default '{}', recipient_email text, created_at timestamptz default now());
CREATE TABLE tenant_smtp_config (id uuid primary key default gen_random_uuid(), tenant_id uuid unique not null references tenants(id),
  enabled boolean default false, host text, username text, password_encrypted text, from_address text);
CREATE TABLE billing_subscriptions (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  plan text not null default 'free', status text not null default 'active');
CREATE TABLE billing_module_subscriptions (id uuid primary key default gen_random_uuid(), tenant_id uuid not null references tenants(id),
  module_id text not null, status text not null default 'active');

ALTER TABLE rh_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant isolation for rh_notifications" ON rh_notifications FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Allow anon to create notifications" ON rh_notifications FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon to read own notifications" ON rh_notifications FOR SELECT TO anon USING (true);

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
`);

await db.exec(mig);
await db.exec(mig); // idempotency
console.log('migration applied twice OK');

let pass = 0;
let fail = 0;
function expect(name, cond, detail) {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}`, cond ? '' : JSON.stringify(detail ?? null));
}

let ipCounter = 0;
async function as(role, uid, sql, params = []) {
  ipCounter++;
  const claims = JSON.stringify({ role, sub: uid || undefined });
  const headers = JSON.stringify({ 'x-forwarded-for': `203.0.113.${ipCounter % 250}` });
  await db.query(`RESET ROLE`);
  await db.query(`SELECT set_config('request.jwt.claim.sub', $1, false), set_config('request.jwt.claims', $2, false),
    set_config('request.headers', $3, false)`, [uid || '', claims, headers]);
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

// ---- fixtures ---------------------------------------------------------------
const T_FREE = '00000000-0000-0000-0000-00000000f001';
const T_PAID = '00000000-0000-0000-0000-00000000f002';
const T_SMTP = '00000000-0000-0000-0000-00000000f003';
const U_FREE = '00000000-0000-0000-0000-00000000a001';
const U_PAID = '00000000-0000-0000-0000-00000000a002';
const U_SMTP = '00000000-0000-0000-0000-00000000a003';
await db.exec(`
INSERT INTO tenants (id, name, slug) VALUES ('${T_FREE}','Free','free'), ('${T_PAID}','Paid','paid'), ('${T_SMTP}','Smtp','smtp');
INSERT INTO profiles VALUES ('${U_FREE}','${T_FREE}','a@free.de'), ('${U_PAID}','${T_PAID}','a@paid.de'), ('${U_SMTP}','${T_SMTP}','a@smtp.de');
INSERT INTO billing_subscriptions (tenant_id, plan, status) VALUES ('${T_FREE}','free','active'), ('${T_PAID}','pro','active'), ('${T_SMTP}','free','active');
INSERT INTO tenant_smtp_config (tenant_id, enabled, host, username, password_encrypted, from_address) VALUES ('${T_SMTP}', true, 'smtp.example.com', 'shop', 'enc:x', 'shop@example.com');
INSERT INTO rh_email_templates (tenant_id, event_type, enabled)
  SELECT '${T_PAID}', e, true FROM unnest(ARRAY['return_confirmed','return_cancelled','ticket_created']) e;
`);
const { rows: [cust] } = await db.query(
  `INSERT INTO rh_customers (tenant_id, email, first_name, last_name) VALUES ($1,'Max@Kunde.de','Max','Muster') RETURNING id`,
  [T_PAID],
);
// Return like public_create_return writes it: customer_id set, email in metadata, no customerName.
const { rows: [ret1] } = await db.query(
  `INSERT INTO rh_returns (tenant_id, return_number, status, customer_id, reason_text, metadata)
   VALUES ($1,'RET-1','CREATED',$2,'Zu klein','{"email":"max@kunde.de"}') RETURNING id`,
  [T_PAID, cust.id],
);
// Return with customer_id but no metadata email -> recipient must come from rh_customers.
const { rows: [ret2] } = await db.query(
  `INSERT INTO rh_returns (tenant_id, return_number, status, customer_id) VALUES ($1,'RET-2','CREATED',$2) RETURNING id`,
  [T_PAID, cust.id],
);
const { rows: [ret3] } = await db.query(
  `INSERT INTO rh_returns (tenant_id, return_number, status, customer_id, metadata)
   VALUES ($1,'RET-3','CANCELLED',$2,'{"email":"max@kunde.de","customerName":"Maxi"}') RETURNING id`,
  [T_PAID, cust.id],
);
await db.query(`INSERT INTO rh_return_timeline (tenant_id, return_id, status, comment) VALUES ($1,$2,'CANCELLED','Doch behalten')`, [T_PAID, ret3.id]);
const { rows: [tic] } = await db.query(
  `INSERT INTO rh_tickets (tenant_id, ticket_number, customer_id, subject) VALUES ($1,'TCK-1',$2,'Frage') RETURNING id`,
  [T_PAID, cust.id],
);

// ---- anon lockdown ----------------------------------------------------------
let r = await as('anon', null, `INSERT INTO rh_notifications (tenant_id, channel, recipient_email, subject, content) VALUES ('${T_PAID}','email','x@evil.de','hi','<a>')`);
expect('anon INSERT rh_notifications denied', !r.ok, r);
r = await as('anon', null, `SELECT count(*) FROM rh_notifications`);
expect('anon SELECT rh_notifications denied', !r.ok, r);
r = await as('anon', null, `SELECT * FROM rate_limit_hit('x', 5, 60)`);
expect('anon cannot call rate_limit_hit', !r.ok, r);

// ---- public_enqueue_notification with customer_id (regression for c.name) ---
const enqueue = `SELECT public_enqueue_notification($1::uuid, $2, $3::uuid, $4, $5::uuid, $6) AS res`;
r = await as('anon', null, enqueue, [T_PAID, 'return_confirmed', ret1.id, null, null, null]);
expect('return_confirmed with customer_id queues', r.ok && r.rows[0].res.ok === true && r.rows[0].res.id, r);
let row = (await db.query(`SELECT * FROM rh_notifications WHERE return_id = $1`, [ret1.id])).rows[0];
expect('recipient from metadata.email', row?.recipient_email === 'max@kunde.de', row);
expect('customerName from first/last name', row?.metadata?.vars?.customerName === 'Max Muster', row?.metadata);
expect('no client content stored', row?.subject === null && row?.content === null && row?.metadata?.render === 'server', row);

r = await as('anon', null, enqueue, [T_PAID, 'return_confirmed', ret1.id, null, null, null]);
expect('duplicate return_confirmed skipped', r.ok && r.rows[0].res.skipped === 'duplicate', r);

r = await as('anon', null, enqueue, [T_PAID, 'return_confirmed', null, 'RET-2', null, null]);
row = (await db.query(`SELECT * FROM rh_notifications WHERE return_id = $1`, [ret2.id])).rows[0];
expect('recipient falls back to rh_customers.email', r.ok && r.rows[0].res.ok === true && row?.recipient_email === 'max@kunde.de', { r, row });

r = await as('anon', null, enqueue, [T_PAID, 'return_cancelled', ret3.id, null, null, null]);
row = (await db.query(`SELECT * FROM rh_notifications WHERE return_id = $1`, [ret3.id])).rows[0];
expect('return_cancelled queues with timeline reason', r.ok && row?.metadata?.vars?.reason === 'Doch behalten'
  && row?.metadata?.vars?.customerName === 'Maxi', { r, meta: row?.metadata });

r = await as('authenticated', null, enqueue, [T_PAID, 'ticket_created', tic.id, null, tic.id, null]);
row = (await db.query(`SELECT * FROM rh_notifications WHERE ticket_id = $1`, [tic.id])).rows[0];
expect('ticket_created with customer_id queues', r.ok && r.rows[0].res.ok === true && row?.recipient_email === 'max@kunde.de'
  && row?.metadata?.vars?.customerName === 'Max Muster', { r, row });

r = await as('anon', null, enqueue, [T_PAID, 'return_approved', ret1.id, null, null, null]);
expect('non-allowlisted event rejected', r.ok && r.rows[0].res.reason === 'event_not_allowed', r);

await db.query(`UPDATE rh_returns SET created_at = now() - interval '2 hours' WHERE id = $1`, [ret2.id]);
await db.query(`DELETE FROM rh_notifications WHERE return_id = $1`, [ret2.id]);
r = await as('anon', null, enqueue, [T_PAID, 'return_confirmed', ret2.id, null, null, null]);
expect('stale return rejected', r.ok && r.rows[0].res.reason === 'stale', r);

// ---- authenticated insert guard ----------------------------------------------
async function tenantInserts(uid, tenantId, n) {
  let ok = 0;
  let lastErr = null;
  for (let i = 0; i < n; i++) {
    const res = await as('authenticated', uid,
      `INSERT INTO rh_notifications (tenant_id, channel, recipient_email, subject, content, metadata)
       VALUES ($1,'email',$2,'Hallo','<p>x</p>','{"isHtml":true}')`, [tenantId, `r${i}-${tenantId.slice(-3)}@example.com`]);
    if (res.ok) ok++;
    else lastErr = res.err;
  }
  return { ok, lastErr };
}
let g = await tenantInserts(U_FREE, T_FREE, 25);
expect('free tenant on platform SMTP capped at 20/h', g.ok === 20 && /rate limit/i.test(g.lastErr || ''), g);
g = await tenantInserts(U_PAID, T_PAID, 25);
expect('paid tenant not capped at 20/h', g.ok === 25, g);
g = await tenantInserts(U_SMTP, T_SMTP, 25);
expect('free tenant with own SMTP not capped at 20/h', g.ok === 25, g);

r = await as('authenticated', U_FREE,
  `INSERT INTO rh_notifications (tenant_id, channel, recipient_email) VALUES ($1,'email','x@example.com')`, [T_PAID]);
expect('cross-tenant insert blocked by RLS', !r.ok, r);

// Free daily cap: reset the hourly window, then the day budget (50) still applies.
await db.exec(`DELETE FROM rate_limit_counters WHERE bucket = 'notif:tenant:h:${T_FREE}'`);
g = await tenantInserts(U_FREE, T_FREE, 20);
await db.exec(`DELETE FROM rate_limit_counters WHERE bucket = 'notif:tenant:h:${T_FREE}'`);
const g2 = await tenantInserts(U_FREE, T_FREE, 20);
expect('free tenant capped at 50/day', g.ok + g2.ok === 30 && /daily/i.test(g2.lastErr || ''), { g, g2 });

// service_role inserts are not limited by the guard
r = await as('service_role', null,
  `INSERT INTO rh_notifications (tenant_id, channel, recipient_email) VALUES ($1,'email','svc@example.com')`, [T_FREE]);
expect('service_role insert not limited', r.ok, r);

// ---- claim ------------------------------------------------------------------
const { rows: [n1] } = await db.query(`SELECT id FROM rh_notifications WHERE return_id = $1`, [ret1.id]);
r = await as('service_role', null, `SELECT count(*)::int AS c FROM claim_rh_notification($1, 'dispatch')`, [n1.id]);
const r2 = await as('service_role', null, `SELECT count(*)::int AS c FROM claim_rh_notification($1, 'dispatch')`, [n1.id]);
expect('claim is single-winner', r.ok && r.rows[0].c === 1 && r2.ok && r2.rows[0].c === 0, { r, r2 });
r = await as('authenticated', U_PAID, `SELECT * FROM claim_rh_notification($1, 'smtp')`, [n1.id]);
expect('authenticated cannot claim', !r.ok, r);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
