/**
 * Server-to-server authentication for internal edge functions (SEC-14).
 *
 * The old pattern base64-decoded the bearer JWT and trusted `role ===
 * 'service_role'` without checking the signature. That is only safe while the
 * gateway runs with verify_jwt=true; one deploy with --no-verify-jwt would let a
 * forged unsigned token through. This helper compares the bearer token
 * byte-for-byte (constant time) with the service-role key from the function
 * environment instead.
 *
 * Accepted tokens:
 *   - SUPABASE_SERVICE_ROLE_KEY (auto-injected; also what the pg_net triggers
 *     send via vault secret 'service_role_jwt')
 *   - SERVICE_ROLE_JWT (optional secret) — set it to the vault value only if
 *     the vault JWT ever differs from SUPABASE_SERVICE_ROLE_KEY.
 */
import { timingSafeEqual } from './rate-limit.ts';

export function bearerToken(req: Request): string {
  const header = req.headers.get('authorization') || '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : '';
}

export function isServiceRoleRequest(req: Request): boolean {
  const token = bearerToken(req);
  if (!token) return false;
  const candidates = [
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    Deno.env.get('SERVICE_ROLE_JWT') || '',
  ].filter((v) => v.length > 0);
  let ok = false;
  // Compare against every candidate (no early exit) to keep timing uniform.
  for (const candidate of candidates) {
    if (timingSafeEqual(token, candidate)) ok = true;
  }
  return ok;
}
