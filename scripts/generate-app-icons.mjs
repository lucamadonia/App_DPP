/**
 * Generates the full iOS + Android + web icon set from one square master.
 *
 * Usage:  node scripts/generate-app-icons.mjs [path/to/master.png]
 *
 * The App Store icon must be 1024x1024 and fully opaque (no alpha channel),
 * so the master is composited onto the brand background rather than exported
 * with transparency.
 *
 * Android adaptive icons need the logo inset to ~66% of the canvas: the
 * launcher crops the outer ring to whatever mask the device uses.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Default master: resources/icon-master.png — the brand MARK only (box +
// checkmark + plane), no wordmark, 1024x1024 RGBA.
//
// Why not public/trackbliss-logo.png: that is the full logo including the
// "Trackbliss" wordmark. At 60px on a home screen the wordmark is an illegible
// smudge, so it makes a poor icon.
//
// Provenance of the master: the 512px logo was AI-upscaled to 1024 (Magnific,
// ultra-sublime), its alpha channel rebuilt from the original (Lanczos +
// threshold, because the upscaler returns opaque JPEG), then cropped to the
// mark's alpha bounding box. Replace it wholesale if a true vector source
// becomes available.
const MASTER = process.argv[2] || 'resources/icon-master.png';
const OUT = 'public/icons';
const RESOURCES = 'resources';

/** Brand background — must match --background (dark) in src/index.css. */
const BG = { r: 0x0f, g: 0x17, b: 0x2a, alpha: 1 };
const BG_HEX = '#0F172A';

/** Web/PWA + apple-touch sizes. */
const WEB_SIZES = [32, 48, 64, 72, 96, 128, 144, 152, 167, 180, 192, 256, 384, 512, 1024];

async function opaqueIcon(src, size, padRatio = 1) {
  const inner = Math.round(size * padRatio);
  const logo = await sharp(src)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const offset = Math.round((size - inner) / 2);
  return sharp({
    create: { width: size, height: size, channels: 4, background: BG },
  })
    .composite([{ input: logo, top: offset, left: offset }])
    .flatten({ background: BG })
    .removeAlpha() // flatten() composites but keeps the channel; the App Store
                   // rejects icons that still carry alpha.
    .png()
    .toBuffer();
}

async function main() {
  if (!existsSync(MASTER)) {
    console.error(`Master icon not found: ${MASTER}`);
    process.exit(1);
  }

  const meta = await sharp(MASTER).metadata();
  if (meta.width !== meta.height) {
    console.error(`Master must be square, got ${meta.width}x${meta.height}`);
    process.exit(1);
  }
  if (meta.width < 1024) {
    console.warn(
      `WARNING: master is ${meta.width}x${meta.width}. The App Store icon is ` +
        `1024x1024, so it will be upscaled and look soft. Supply a 1024px master ` +
        `before submitting to the store.`
    );
  }

  await mkdir(OUT, { recursive: true });
  await mkdir(RESOURCES, { recursive: true });

  // --- Web / PWA / apple-touch (logo fills ~82% of the canvas) ---
  for (const size of WEB_SIZES) {
    await writeFile(path.join(OUT, `icon-${size}.png`), await opaqueIcon(MASTER, size, 0.72));
  }
  await writeFile(path.join(OUT, 'apple-touch-icon.png'), await opaqueIcon(MASTER, 180, 0.72));

  // --- Capacitor assets pipeline sources ---
  // `npx @capacitor/assets generate` picks these up and produces every native
  // density for both platforms.
  await writeFile(path.join(RESOURCES, 'icon.png'), await opaqueIcon(MASTER, 1024, 0.72));
  // Adaptive icon: transparent foreground inset to 66%, flat colour background.
  const fgInner = Math.round(1024 * 0.66);
  const fg = await sharp(MASTER)
    .resize(fgInner, fgInner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const fgOffset = Math.round((1024 - fgInner) / 2);
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fg, top: fgOffset, left: fgOffset }])
    .png()
    .toFile(path.join(RESOURCES, 'icon-foreground.png'));
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BG } })
    .png()
    .toFile(path.join(RESOURCES, 'icon-background.png'));

  // --- Splash screens (2732x2732 covers every device after CENTER_CROP) ---
  const splashLogo = await sharp(MASTER)
    .resize(640, 640, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  for (const name of ['splash.png', 'splash-dark.png']) {
    await sharp({ create: { width: 2732, height: 2732, channels: 4, background: BG } })
      .composite([{ input: splashLogo, gravity: 'centre' }])
      .flatten({ background: BG })
      .removeAlpha()
      .png()
      .toFile(path.join(RESOURCES, name));
  }

  // --- PWA manifest ---
  const manifest = {
    name: 'Trackbliss',
    short_name: 'Trackbliss',
    description: 'Digital Product Passports, Retouren und Lagerverwaltung.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: BG_HEX,
    theme_color: BG_HEX,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  await writeFile('public/manifest.webmanifest', JSON.stringify(manifest, null, 2) + '\n');

  console.log(`Generated ${WEB_SIZES.length + 1} web icons in ${OUT}/`);
  console.log(`Generated native sources in ${RESOURCES}/ (icon, adaptive fg/bg, splash)`);
  console.log('Generated public/manifest.webmanifest');
  console.log('\nNext: npx @capacitor/assets generate --iconBackgroundColor ' + BG_HEX);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
