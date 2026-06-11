// Optimize large marketing images in public/
// - Converts hero-*/team-* PNGs to WebP (quality 80, max width 1920px)
// - Recompresses hero-website.png in place (kept as PNG for og:image compatibility)
// - Recompresses trackbliss-logo.png in place (kept as PNG for email client compatibility)
//
// Usage: node scripts/optimize-images.mjs

import sharp from 'sharp';
import { statSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const WEBP_SOURCES = [
  'hero-illustration.png',
  'hero-photorealistic.png',
  'hero-retail.png',
  'hero-website.png',
  'team-collaboration.png',
  'team-operations.png',
];

const fmt = (bytes) => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

async function toWebp(file) {
  const src = path.join(publicDir, file);
  if (!existsSync(src)) {
    console.log(`${file}: not found, skipping`);
    return;
  }
  const dest = src.replace(/\.png$/, '.webp');
  const before = statSync(src).size;
  await sharp(src)
    .resize({ width: 1920, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(dest);
  const after = statSync(dest).size;
  console.log(`${file} -> ${path.basename(dest)}: ${fmt(before)} -> ${fmt(after)}`);
}

async function recompressPng(file, maxWidth) {
  const src = path.join(publicDir, file);
  if (!existsSync(src)) {
    console.log(`${file}: not found, skipping`);
    return;
  }
  const tmp = `${src}.tmp.png`;
  const before = statSync(src).size;
  await sharp(src)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .png({ compressionLevel: 9, palette: true, quality: 90 })
    .toFile(tmp);
  const after = statSync(tmp).size;
  if (after < before) {
    unlinkSync(src);
    renameSync(tmp, src);
    console.log(`${file} (PNG, max ${maxWidth}px): ${fmt(before)} -> ${fmt(after)}`);
  } else {
    unlinkSync(tmp);
    console.log(`${file}: recompression not smaller, kept original (${fmt(before)})`);
  }
}

for (const file of WEBP_SOURCES) {
  await toWebp(file);
}

// hero-website.png stays as PNG too (referenced as og:image / twitter:image —
// WebP support for link previews is unreliable), but shrunk to 1920px.
await recompressPng('hero-website.png', 1920);

// trackbliss-logo.png is referenced from email templates (mail clients often
// lack WebP support) — keep PNG, just resize/compress.
await recompressPng('trackbliss-logo.png', 512);

console.log('Done.');
