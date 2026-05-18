/**
 * One-off: upload the Fambliss tracking hero image to Supabase Storage
 * and print the public URL.
 *
 * Usage: node scripts/upload-tracking-hero.mjs <local-file> <tenant-id>
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadDotenv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of content.split('\n')) {
    const line = rawLine.replace(/\r$/, '').trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    if (!process.env[m[1]]) {
      let v = m[2].trim();
      v = v.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
      process.env[m[1]] = v;
    }
  }
}
loadDotenv();

const [, , localFile, tenantId, objectNameArg] = process.argv;
if (!localFile || !tenantId) {
  console.error('Usage: node scripts/upload-tracking-hero.mjs <local-file> <tenant-id> [object-name]');
  process.exit(1);
}
const objectName = objectNameArg || 'tracking-hero.png';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const bucket = 'branding';
const objectPath = `${tenantId}/${objectName}`;
const fileBytes = fs.readFileSync(localFile);

const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath}`;
const res = await fetch(uploadUrl, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${SERVICE_KEY}`,
    apikey: SERVICE_KEY,
    'Content-Type': 'image/png',
    'x-upsert': 'true',
    'Cache-Control': '31536000',
  },
  body: fileBytes,
});

if (!res.ok) {
  const text = await res.text();
  console.error(`Upload failed: ${res.status} ${text}`);
  process.exit(1);
}

const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectPath}`;
console.log(`Uploaded ${fileBytes.length} bytes to ${objectPath}`);
console.log(`Public URL: ${publicUrl}`);
