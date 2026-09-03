#!/usr/bin/env node
import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const locales = ['de-DE', 'en-US'];
const shots = ['01-discover.png', '02-requirements.png', '03-checklists.png', '04-qr-tool.png', '05-tips.png'];

async function ensureDirectory(target) {
  await mkdir(target, { recursive: true });
}

async function renderScreenshots(locale) {
  const phoneDirectory = path.join('play-store', 'graphics', locale, 'phone');
  const tabletDirectory = path.join('play-store', 'graphics', locale, 'tablet-10');
  await Promise.all([ensureDirectory(phoneDirectory), ensureDirectory(tabletDirectory)]);

  for (const file of shots) {
    await sharp(path.join('app-store', 'screenshots', locale, 'iphone-6.9', file))
      .resize(1080, 1920, { fit: 'contain', background: '#f2f6fa' })
      .flatten({ background: '#f2f6fa' })
      .png({ compressionLevel: 9, palette: false })
      .toFile(path.join(phoneDirectory, file));

    await sharp(path.join('app-store', 'screenshots', locale, 'ipad-13', file))
      .resize(1440, 2560, { fit: 'contain', background: '#f2f6fa' })
      .flatten({ background: '#f2f6fa' })
      .png({ compressionLevel: 9, palette: false })
      .toFile(path.join(tabletDirectory, file));
  }
}

async function renderIcon() {
  const outputDirectory = path.join('play-store', 'graphics', 'shared');
  await ensureDirectory(outputDirectory);
  await sharp(path.join('public', 'icons', 'icon-512.png'))
    .resize(512, 512, { fit: 'cover' })
    .flatten({ background: '#ffffff' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(path.join(outputDirectory, 'app-icon-512.png'));
}

async function renderFeatureGraphic() {
  const outputDirectory = path.join('play-store', 'graphics', 'shared');
  await ensureDirectory(outputDirectory);

  const background = Buffer.from(`
    <svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f8fbff"/>
          <stop offset="0.58" stop-color="#e8f3ff"/>
          <stop offset="1" stop-color="#cfe8ff"/>
        </linearGradient>
        <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#72c7f4"/>
          <stop offset="1" stop-color="#3f8ff7"/>
        </linearGradient>
      </defs>
      <rect width="1024" height="500" fill="url(#bg)"/>
      <g opacity="0.35" stroke="#9db4cc" stroke-width="2">
        <path d="M-80 80L260 420M-10 10L330 350M60 -60L400 280M130 -130L470 210"/>
        <path d="M-80 420L260 80M-10 490L330 150M60 560L400 220M130 630L470 290"/>
      </g>
      <g transform="translate(92 117)">
        <path d="M0 92L63 29L151 117L239 29L302 92L214 180L302 268L239 331L151 243L63 331L0 268L88 180Z" fill="url(#brand)"/>
        <path d="M63 29L151 117L239 29" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="square" opacity="0.95"/>
      </g>
      <text x="438" y="210" fill="#10203a" font-family="Inter, Arial, sans-serif" font-size="72" font-weight="750" letter-spacing="-2">Trackbliss</text>
      <text x="442" y="265" fill="#4d6580" font-family="Inter, Arial, sans-serif" font-size="27" font-weight="500">Digital Product Passports</text>
      <g transform="translate(444 305)">
        <rect width="132" height="42" rx="21" fill="#ffffff" opacity="0.92"/>
        <circle cx="25" cy="21" r="7" fill="#47a7f4"/>
        <text x="43" y="28" fill="#29445f" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600">Compliance</text>
        <rect x="146" width="112" height="42" rx="21" fill="#ffffff" opacity="0.92"/>
        <circle cx="171" cy="21" r="7" fill="#47a7f4"/>
        <text x="189" y="28" fill="#29445f" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600">QR &amp; DPP</text>
      </g>
    </svg>
  `);

  await sharp(background)
    .flatten({ background: '#f8fbff' })
    .png({ compressionLevel: 9, palette: false })
    .toFile(path.join(outputDirectory, 'feature-graphic-1024x500.png'));
}

await Promise.all(locales.map(renderScreenshots));
await Promise.all([renderIcon(), renderFeatureGraphic()]);
console.log('Google Play graphics generated: icon, feature graphic, and DE/EN phone/tablet screenshots.');
