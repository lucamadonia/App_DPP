/**
 * Shared AES-GCM helpers for commerce channel credentials.
 *
 * Credentials live in commerce_connection_credentials.encrypted_payload as
 * `<iv>.<ciphertext>`, both base64url.  The key comes from the
 * OAUTH_TOKEN_ENCRYPTION_KEY secret (32 bytes, hex or base64url).
 *
 * Rotating that secret makes every stored credential unreadable — connections
 * then have to be re-authorized.
 */

// deno-lint-ignore-file no-explicit-any

const encoder = new TextEncoder();

export function b64(input: Uint8Array) {
  return btoa(String.fromCharCode(...input)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function unb64(input: string) {
  const s = input.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - input.length % 4) % 4);
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function encryptionKey() {
  const raw = Deno.env.get('OAUTH_TOKEN_ENCRYPTION_KEY');
  if (!raw) throw new Error('Missing OAUTH_TOKEN_ENCRYPTION_KEY');
  const bytes = raw.length === 64 ? Uint8Array.from(raw.match(/.{2}/g)!.map((x) => parseInt(x, 16))) : unb64(raw);
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encryptCredentials(value: unknown) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(), encoder.encode(JSON.stringify(value))),
  );
  return `${b64(iv)}.${b64(encrypted)}`;
}

export async function decryptCredentials(value: string): Promise<any> {
  const [iv, ciphertext] = value.split('.');
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: unb64(iv) },
    await encryptionKey(),
    unb64(ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plain));
}
