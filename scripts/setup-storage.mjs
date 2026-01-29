/**
 * Setup & Verify Supabase Storage Buckets
 *
 * Checks if required storage buckets exist and creates them if missing.
 * Also verifies that the necessary RLS policies are in place.
 *
 * Usage:
 *   node scripts/setup-storage.mjs
 *
 * Environment variables (read from .env in project root if present):
 *   SUPABASE_URL               – e.g. https://xyzabc.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY  – service-role secret (NOT the anon key)
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Minimal .env parser */
function loadDotenv(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, 'utf-8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadDotenv(resolve(__dirname, '..', '.env'));
loadDotenv(resolve(__dirname, '..', '.env.local'));

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;

const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'ERROR: Missing environment variables.\n' +
    'Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY\n' +
    '(or their VITE_ prefixed equivalents) in .env or as env vars.'
  );
  process.exit(1);
}

const STORAGE_BASE = `${SUPABASE_URL.replace(/\/+$/, '')}/storage/v1`;

const REQUIRED_BUCKETS = [
  {
    id: 'documents',
    name: 'documents',
    public: false,
    file_size_limit: 52428800, // 50MB
    allowed_mime_types: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  {
    id: 'product-images',
    name: 'product-images',
    public: true,
    file_size_limit: 10485760, // 10MB
    allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
  {
    id: 'branding',
    name: 'branding',
    public: true,
    file_size_limit: 2097152, // 2MB
    allowed_mime_types: [
      'image/jpeg',
      'image/png',
      'image/svg+xml',
      'image/x-icon',
      'image/vnd.microsoft.icon',
      'image/webp',
    ],
  },
];

async function storageRequest(path, options = {}) {
  const url = `${STORAGE_BASE}/${path}`;
  const method = options.method || 'GET';

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const res = await fetch(url, { ...options, method, headers });
  const text = await res.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { ok: res.ok, status: res.status, data };
}

async function main() {
  console.log('Verifying Supabase Storage Buckets...');
  console.log(`URL: ${SUPABASE_URL}\n`);

  // List existing buckets
  const { ok, data: existingBuckets } = await storageRequest('bucket');
  if (!ok) {
    console.error('Failed to list buckets:', existingBuckets);
    process.exit(1);
  }

  const existingIds = new Set(
    Array.isArray(existingBuckets) ? existingBuckets.map(b => b.id) : []
  );

  for (const bucket of REQUIRED_BUCKETS) {
    if (existingIds.has(bucket.id)) {
      console.log(`✓ Bucket "${bucket.id}" exists`);
    } else {
      console.log(`  Creating bucket "${bucket.id}"...`);
      const { ok: created, data: createResult } = await storageRequest('bucket', {
        method: 'POST',
        body: JSON.stringify(bucket),
      });

      if (created) {
        console.log(`✓ Bucket "${bucket.id}" created successfully`);
      } else {
        console.error(`✗ Failed to create bucket "${bucket.id}":`, createResult);
      }
    }
  }

  console.log('\n--- Storage Setup Complete ---');
  console.log('Note: RLS policies must be applied via SQL.');
  console.log('Run supabase/storage.sql in the Supabase SQL Editor if policies are missing.');
}

main();
