/**
 * Sign in with Apple token revocation for delete-account (QA-3).
 *
 * App Store guideline 5.1.1(v) expects apps offering Sign in with Apple to
 * revoke the user's Apple tokens when the account is deleted
 * (POST https://appleid.apple.com/auth/revoke).
 *
 * Supabase does not persist the Apple refresh token server-side, so the token
 * must come from the client: either `appleRefreshToken` (the session's
 * provider_refresh_token, present only for a while after an Apple sign-in) or
 * `appleAuthorizationCode` (from a fresh native Apple sign-in). Before
 * revoking, the token is exchanged/refreshed at Apple and the returned
 * id_token's `sub` must match the caller's own Apple identity, so a caller can
 * only revoke their own grant.
 *
 * Best-effort by design: a failed or impossible revocation is logged and
 * reported (`appleTokenRevoked: false`) but never blocks the deletion itself.
 *
 * Secrets (all required for revocation; without them it is skipped + logged):
 *   APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY (contents of the .p8 key),
 *   APPLE_CLIENT_ID (the Services ID configured as Apple provider in Supabase;
 *   comma-separated list allowed, e.g. Services ID + iOS bundle id).
 */

const APPLE_AUDIENCE = 'https://appleid.apple.com';
const TOKEN_MAX_LEN = 4096;

export type AppleRevocationResult = 'revoked' | 'not_apple_user' | 'skipped' | 'failed';

export interface AppleTokenInput {
  appleRefreshToken?: string;
  appleAuthorizationCode?: string;
}

interface AuthUserLike {
  id: string;
  identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> | null; provider_id?: string }> | null;
}

/** Extracts the optional Apple token fields from the request body. */
export function readAppleTokenInput(body: unknown): AppleTokenInput {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const pick = (v: unknown) =>
    typeof v === 'string' && v.length > 0 && v.length <= TOKEN_MAX_LEN ? v : undefined;
  return { appleRefreshToken: pick(b.appleRefreshToken), appleAuthorizationCode: pick(b.appleAuthorizationCode) };
}

export async function revokeAppleTokens(user: AuthUserLike, input: AppleTokenInput): Promise<AppleRevocationResult> {
  const appleSubs = new Set<string>();
  for (const identity of user.identities ?? []) {
    if (identity.provider !== 'apple') continue;
    const data = identity.identity_data ?? {};
    for (const v of [data.sub, data.provider_id, identity.provider_id]) {
      if (typeof v === 'string' && v) appleSubs.add(v);
    }
  }
  if (appleSubs.size === 0) return 'not_apple_user';

  const teamId = Deno.env.get('APPLE_TEAM_ID') || '';
  const keyId = Deno.env.get('APPLE_KEY_ID') || '';
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY') || '';
  const clientIds = (Deno.env.get('APPLE_CLIENT_ID') || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!teamId || !keyId || !privateKey || clientIds.length === 0) {
    console.warn(`[delete-account] apple token of user ${user.id} NOT revoked: APPLE_* secrets missing`);
    return 'skipped';
  }
  if (!input.appleRefreshToken && !input.appleAuthorizationCode) {
    console.warn(`[delete-account] apple token of user ${user.id} NOT revoked: no token supplied by client`);
    return 'skipped';
  }

  try {
    for (const clientId of clientIds) {
      const clientSecret = await buildClientSecret(teamId, keyId, privateKey, clientId);
      const grant: Record<string, string> = input.appleAuthorizationCode
        ? { grant_type: 'authorization_code', code: input.appleAuthorizationCode }
        : { grant_type: 'refresh_token', refresh_token: input.appleRefreshToken! };

      const tokenRes = await postForm(`${APPLE_AUDIENCE}/auth/token`, {
        client_id: clientId,
        client_secret: clientSecret,
        ...grant,
      });
      if (!tokenRes.ok) continue; // token belongs to another client id (or is invalid)
      const tokens = await tokenRes.json() as { id_token?: string; refresh_token?: string };

      const claims = decodeJwtPayload(tokens.id_token);
      if (!claims || claims.aud !== clientId || typeof claims.sub !== 'string' || !appleSubs.has(claims.sub)) {
        console.warn(`[delete-account] apple token of user ${user.id} rejected: id_token does not match caller`);
        return 'failed';
      }

      const refreshToken = tokens.refresh_token || input.appleRefreshToken;
      if (!refreshToken) return 'failed';
      const revokeRes = await postForm(`${APPLE_AUDIENCE}/auth/revoke`, {
        client_id: clientId,
        client_secret: clientSecret,
        token: refreshToken,
        token_type_hint: 'refresh_token',
      });
      if (revokeRes.ok) return 'revoked';
      console.warn(`[delete-account] apple revoke for user ${user.id} failed: HTTP ${revokeRes.status}`);
      return 'failed';
    }
    console.warn(`[delete-account] apple token of user ${user.id} not accepted by any APPLE_CLIENT_ID`);
    return 'failed';
  } catch (err) {
    console.warn(`[delete-account] apple revoke for user ${user.id} threw:`, err);
    return 'failed';
  }
}

function postForm(url: string, fields: Record<string, string>): Promise<Response> {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
  });
}

function base64Url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes;
  let bin = '';
  for (const b of raw) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** ES256 client secret JWT as required by Apple's token/revoke endpoints. */
async function buildClientSecret(teamId: string, keyId: string, pem: string, clientId: string): Promise<string> {
  const der = Uint8Array.from(
    atob(pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\\n|\s/g, '')),
    (c) => c.charCodeAt(0),
  );
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const signingInput = `${base64Url(JSON.stringify({ alg: 'ES256', kid: keyId }))}.${base64Url(
    JSON.stringify({ iss: teamId, iat: now, exp: now + 300, aud: APPLE_AUDIENCE, sub: clientId }),
  )}`;
  // WebCrypto returns the raw r||s (IEEE P1363) form, which is what JWS ES256 expects.
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${base64Url(new Uint8Array(sig))}`;
}

/** Payload of an id_token received directly from Apple over TLS (no signature check needed). */
function decodeJwtPayload(jwt: string | undefined): Record<string, unknown> | null {
  if (!jwt) return null;
  const part = jwt.split('.')[1];
  if (!part) return null;
  try {
    const bin = atob(part.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (part.length % 4)) % 4));
    const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}
