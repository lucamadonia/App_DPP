/**
 * Shared guards for tenant custom domains that edge functions add to or
 * remove from the production Vercel project (manage-vercel-domain,
 * admin-api set_custom_domain). Go-live re-audit EF-01 / EF-02.
 *
 * - normalizeCustomDomain(): strict hostname validation. Anything that could
 *   change the Vercel API path or query ('/', '?', '#', '%', '@', ':', '\',
 *   whitespace, '..') is rejected, never "cleaned".
 * - isPlatformHost(): production / platform hostnames that no tenant may ever
 *   add or remove (exact match or any subdomain). Extendable with the
 *   PLATFORM_DOMAIN_DENYLIST secret (CSV).
 * - Ownership: a domain is only ever removed from Vercel when the
 *   public.tenant_vercel_domains row (service role only, written after a 2xx
 *   add by these functions) says this tenant added it. tenants.settings and
 *   tenants.custom_domain are tenant-writable and are never trusted for that.
 *
 * Keep PLATFORM_SUFFIXES in sync with public.is_platform_host() in
 * supabase/migrations/20261001b_tenant_secrets_public_branding.sql.
 */

const DOMAIN_RE = /^(?=.{1,253}$)(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/;

export const PLATFORM_SUFFIXES: readonly string[] = [
  'fambliss.eu',
  'fambliss.de',
  'fambliss.com',
  'family-joy.com',
  'trackbliss.eu',
  'trackbliss.de',
  'trackbliss.com',
  'vercel.app',
  'vercel.com',
  'vercel-dns.com',
  'now.sh',
  'supabase.co',
  'supabase.com',
  'supabase.in',
  'myshopify.com',
  'localhost',
];

function extraDenylist(): string[] {
  let raw = '';
  try {
    raw = Deno.env.get('PLATFORM_DOMAIN_DENYLIST') || '';
  } catch {
    raw = '';
  }
  return raw.split(',').map((s) => s.trim().toLowerCase().replace(/^\*\./, '')).filter(Boolean);
}

/** Lower-cased hostname or null. Never strips path/query parts: rejects them. */
export function normalizeCustomDomain(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const v = input.trim().toLowerCase().replace(/\.$/, '');
  if (!v || v.length > 253) return null;
  if (/[/?#%@:\\\s]/.test(v) || v.includes('..')) return null;
  if (!DOMAIN_RE.test(v)) return null;
  return v;
}

/** True for platform/production hosts and every subdomain of them. */
export function isPlatformHost(domain: string, extra: string[] = extraDenylist()): boolean {
  const d = domain.trim().toLowerCase().replace(/\.$/, '');
  return [...PLATFORM_SUFFIXES, ...extra].some((s) => d === s || d.endsWith(`.${s}`));
}

/** Validation result for a tenant-supplied custom domain. */
export function checkTenantCustomDomain(
  input: unknown,
): { ok: true; domain: string } | { ok: false; error: 'invalid_domain' | 'platform_domain' } {
  const domain = normalizeCustomDomain(input);
  if (!domain) return { ok: false, error: 'invalid_domain' };
  if (isPlatformHost(domain)) return { ok: false, error: 'platform_domain' };
  return { ok: true, domain };
}

/** Path segment for the Vercel domains API; input must be a normalized domain. */
export function vercelDomainPath(projectId: string, domain: string, version = 'v9'): string {
  const d = normalizeCustomDomain(domain);
  if (!d) throw new Error('invalid_domain');
  return `/${version}/projects/${encodeURIComponent(projectId)}/domains/${encodeURIComponent(d)}`;
}
