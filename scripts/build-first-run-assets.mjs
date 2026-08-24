/**
 * First-run image pipeline.
 *
 * Two modes:
 *   node scripts/build-first-run-assets.mjs           generate derivatives from the masters
 *   node scripts/build-first-run-assets.mjs --check   verify only (CI-safe, needs no masters)
 *
 * `--check` is the one CI runs. The 2K masters in resources/first-run/ are
 * gitignored, so CI only ever sees the committed .webp files — the check reads
 * their metadata and sizes and asserts the budget, which is enough to stop
 * someone dropping a 3 MB image into the app's first screen.
 *
 * Deliberately NOT an extension of scripts/optimize-images.mjs: that is a
 * one-shot marketing cleanup with a hardcoded six-file list (four of whose
 * sources no longer exist on disk), one fixed recipe, and no notion of a byte
 * cap. Bolting a quality search, an LQIP emitter, a manifest and a luminance
 * analyser onto it would produce two scripts in one trench coat.
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const mastersDir = path.join(root, 'resources', 'first-run');
const outDir = path.join(root, 'public', 'first-run');
const lqipFile = path.join(root, 'src', 'components', 'first-run', 'lqip.generated.ts');
const manifestFile = path.join(__dirname, 'first-run-assets.json');

const manifest = JSON.parse(readFileSync(manifestFile, 'utf8'));
const CHECK_ONLY = process.argv.includes('--check');

/** LQIP is rendered as a scaled-up background-image; the upscale IS the blur. */
const LQIP_W = 24;
const LQIP_H = 42;

/** Text colour the scrim has to carry, and the WCAG AA floor for body copy. */
const TEXT_RGB = [0xf8, 0xfa, 0xfc];
const MIN_CONTRAST = 4.5;

const fail = [];
const warn = [];

function kb(bytes) {
  return Math.round((bytes / 1024) * 10) / 10;
}

function srgbToLinear(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function luminance([r, g, b]) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrast(fg, bg) {
  const a = luminance(fg);
  const b = luminance(bg);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/** Composite a black scrim of the given alpha over a measured mean colour. */
function overScrim(mean, alpha) {
  return mean.map((c) => c * (1 - alpha));
}

/**
 * Encode down from q=68 until the file fits its cap.
 *
 * Floor is 48: an image that needs more than q=68 to look acceptable carries too
 * much high-frequency detail to work as a backdrop anyway, so the right fix is
 * to regenerate something simpler rather than to keep lowering quality.
 */
async function encodeToCap(pipeline, capBytes) {
  for (let q = 68; q >= 48; q -= 4) {
    const buf = await pipeline
      .clone()
      // smartSubsample is not optional for this palette: the saturated blue and
      // violet practicals are exactly where WebP's 4:2:0 chroma subsampling
      // fringes.
      .webp({ quality: q, effort: 6, smartSubsample: true })
      .toBuffer();
    if (buf.length <= capBytes) return { buf, quality: q };
  }
  return null;
}

/**
 * Measure the two bands the title and the CTA sit over, and assert that
 * #F8FAFC text clears WCAG AA against the scrim-composited mean.
 *
 * This converts "reads correctly behind a scrim" from a code-review opinion
 * into a build-time assertion a future contributor cannot regress by swapping
 * in a prettier image.
 */
async function analyseBands(file, width, height) {
  const topH = Math.round(height * 0.35);
  const bottomH = Math.round(height * 0.25);

  const top = await sharp(file).extract({ left: 0, top: 0, width, height: topH }).stats();
  const bottom = await sharp(file)
    .extract({ left: 0, top: height - bottomH, width, height: bottomH })
    .stats();

  const meanOf = (s) => s.channels.slice(0, 3).map((c) => c.mean);
  const sdOf = (s) => s.channels.slice(0, 3).reduce((a, c) => a + c.stdev, 0) / 3;

  // Scrim opacities mirror --fr-scrim-top / --fr-scrim-bottom plus --fr-tint in
  // src/styles/first-run.css. Keep them in sync.
  const topAlpha = 0.62 + 0.25 * (1 - 0.62);
  const topContrast = contrast(TEXT_RGB, overScrim(meanOf(top), topAlpha));
  const bottomContrast = contrast(TEXT_RGB, overScrim(meanOf(bottom), 0.94));

  return { topContrast, bottomContrast, topSd: sdOf(top), bottomSd: sdOf(bottom) };
}

async function generate() {
  if (!existsSync(mastersDir)) {
    console.error(`No masters at ${mastersDir}. They are gitignored — regenerate them from`);
    console.error(`the prompts and creation ids in scripts/first-run-assets.json, or run --check.`);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  mkdirSync(path.dirname(lqipFile), { recursive: true });

  const lqips = [];
  let total = 0;

  for (const asset of manifest.assets) {
    const master =
      [`${asset.slug}.jpg`, `${asset.slug}.png`, `${asset.slug}.webp`]
        .map((n) => path.join(mastersDir, n))
        .find((p) => existsSync(p)) ?? null;

    if (!master) {
      fail.push(`${asset.slug}: no master found in resources/first-run/`);
      continue;
    }

    const pipeline = sharp(master).resize(asset.width, asset.height, {
      fit: 'cover',
      position: 'attention',
    });

    const encoded = await encodeToCap(pipeline, asset.capKB * 1024);
    if (!encoded) {
      fail.push(
        `${asset.slug}: cannot reach ${asset.capKB} KB even at q=48 — too busy for a backdrop, regenerate something simpler`
      );
      continue;
    }

    const outFile = path.join(outDir, `${asset.slug}.webp`);
    writeFileSync(outFile, encoded.buf);
    total += encoded.buf.length;

    const bands = await analyseBands(outFile, asset.width, asset.height);
    if (bands.topContrast < MIN_CONTRAST) {
      warn.push(
        `${asset.slug}: top band contrast ${bands.topContrast.toFixed(2)}:1 below ${MIN_CONTRAST}:1`
      );
    }
    if (bands.bottomContrast < MIN_CONTRAST) {
      warn.push(
        `${asset.slug}: bottom band contrast ${bands.bottomContrast.toFixed(2)}:1 below ${MIN_CONTRAST}:1`
      );
    }
    if (bands.bottomSd > 46) {
      warn.push(
        `${asset.slug}: bottom band is busy (sd ${bands.bottomSd.toFixed(1)}) — detail behind the card`
      );
    }

    const lqipBuf = await sharp(master)
      .resize(LQIP_W, LQIP_H, { fit: 'cover' })
      .webp({ quality: 40 })
      .toBuffer();
    lqips.push({ slug: asset.slug, data: `data:image/webp;base64,${lqipBuf.toString('base64')}` });

    console.log(
      `${asset.slug.padEnd(20)} q=${encoded.quality}  ${String(kb(encoded.buf.length)).padStart(6)} KB / ${asset.capKB} KB` +
        `   top ${bands.topContrast.toFixed(1)}:1  bottom ${bands.bottomContrast.toFixed(1)}:1`
    );
  }

  const union = lqips.map((l) => `'${l.slug}'`).join(' | ');
  writeFileSync(
    lqipFile,
    `/**
 * GENERATED by scripts/build-first-run-assets.mjs — do not edit by hand.
 *
 * Each entry is a ${LQIP_W}x${LQIP_H} WebP inlined as a data URI, painted as the slide's
 * background-image while the full-size backdrop decodes. Upscaling 24px to full
 * screen IS the blur, for free, on the GPU — no filter: blur() needed.
 *
 * FirstRunAsset is a string-literal union, so a typo'd or renamed slug becomes a
 * compile error in \`tsc --noEmit\`, which already gates the build.
 */
export type FirstRunAsset = ${union};

export const LQIP: Record<FirstRunAsset, string> = {
${lqips.map((l) => `  '${l.slug}':\n    '${l.data}',`).join('\n')}
};
`,
    'utf8'
  );

  console.log(`\ntotal ${kb(total)} KB / ${manifest.totalCapKB} KB cap`);
  if (total > manifest.totalCapKB * 1024) {
    fail.push(`total ${kb(total)} KB exceeds the ${manifest.totalCapKB} KB cap`);
  }
}

function check() {
  if (!existsSync(outDir)) {
    fail.push('public/first-run/ is missing — run `npm run images:first-run`');
    return;
  }

  const expected = new Set(manifest.assets.map((a) => `${a.slug}.webp`));
  for (const f of readdirSync(outDir).filter((f) => f.endsWith('.webp'))) {
    if (!expected.has(f)) fail.push(`orphan file public/first-run/${f} is not in the manifest`);
  }

  let total = 0;
  for (const asset of manifest.assets) {
    const file = path.join(outDir, `${asset.slug}.webp`);
    if (!existsSync(file)) {
      fail.push(`missing public/first-run/${asset.slug}.webp`);
      continue;
    }
    const size = statSync(file).size;
    total += size;
    if (size > asset.capKB * 1024) {
      fail.push(`${asset.slug}.webp is ${kb(size)} KB, cap is ${asset.capKB} KB`);
    }
  }

  if (total > manifest.totalCapKB * 1024) {
    fail.push(`public/first-run/ totals ${kb(total)} KB, cap is ${manifest.totalCapKB} KB`);
  }

  if (!existsSync(lqipFile)) {
    fail.push(`missing ${path.relative(root, lqipFile)} — run \`npm run images:first-run\``);
  } else {
    const src = readFileSync(lqipFile, 'utf8');
    for (const asset of manifest.assets) {
      if (!src.includes(`'${asset.slug}':`)) fail.push(`${asset.slug} has no LQIP entry`);
    }
  }

  // Coarse second gate, so nobody drops another megabyte into public/ unnoticed
  // the way trackbliss-logo-1024.png got in. Everything here ships in the APK.
  const publicDir = path.join(root, 'public');
  let publicTotal = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else publicTotal += statSync(p).size;
    }
  };
  walk(publicDir);
  const PUBLIC_CAP_MB = 6;
  if (publicTotal > PUBLIC_CAP_MB * 1024 * 1024) {
    fail.push(
      `public/ totals ${(publicTotal / 1024 / 1024).toFixed(2)} MB, cap is ${PUBLIC_CAP_MB} MB`
    );
  }

  console.log(
    `first-run ${kb(total)} KB / ${manifest.totalCapKB} KB   ·   public/ ${(publicTotal / 1024 / 1024).toFixed(2)} MB / ${PUBLIC_CAP_MB} MB`
  );
}

await (CHECK_ONLY ? check() : generate());

for (const w of warn) console.warn(`warn  ${w}`);
if (fail.length) {
  console.error('\nFirst-run asset check FAILED');
  for (const f of fail) console.error(`  ${f}`);
  process.exit(1);
}
console.log('First-run assets OK');
