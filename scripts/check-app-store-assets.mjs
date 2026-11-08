#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const failures = [];
const fail = (message) => failures.push(message);
const read = (file) => readFileSync(file, 'utf8').trim();

// Validate the actual Xcode asset catalog, not just metadata/screenshots. A
// correctly sized Capacitor placeholder or a flat launch image can still ship.
for (const [catalog, reference] of [
  ['AppIcon.appiconset', 'public/icons/icon-1024.png'],
  ['LaunchMark.imageset', 'public/icons/icon-256.png'],
]) {
  const directory = path.join('ios/App/App/Assets.xcassets', catalog);
  const contents = JSON.parse(read(path.join(directory, 'Contents.json')));
  const image = contents.images.find((entry) => entry.filename);
  const target = image && path.join(directory, image.filename);
  if (!target || !existsSync(target)) {
    fail(`Missing native brand image in ${catalog}`);
    continue;
  }
  const [nativePixels, brandPixels] = await Promise.all([
    sharp(target).ensureAlpha().raw().toBuffer(),
    sharp(reference).ensureAlpha().raw().toBuffer(),
  ]);
  if (!nativePixels.equals(brandPixels)) fail(`${catalog} does not contain the current Trackbliss brand image`);
  if (catalog === 'AppIcon.appiconset') {
    const metadata = await sharp(target).metadata();
    if (metadata.width !== 1024 || metadata.height !== 1024 || metadata.hasAlpha) {
      fail('The iOS app icon must be an opaque 1024 x 1024 PNG');
    }
  }
}

const metadataLimits = {
  'name.txt': 30,
  'subtitle.txt': 30,
  'promotional_text.txt': 170,
  'keywords.txt': 100,
  'description.txt': 4000,
  'release_notes.txt': 4000,
};

for (const locale of ['de-DE', 'en-US']) {
  const directory = path.join('app-store', 'metadata', locale);
  for (const [file, limit] of Object.entries(metadataLimits)) {
    const target = path.join(directory, file);
    if (!existsSync(target)) {
      fail(`Missing App Store metadata: ${target}`);
      continue;
    }
    const length = [...read(target)].length;
    if (!length || length > limit) fail(`${target} has ${length} characters; allowed 1-${limit}`);
  }

  for (const file of ['support_url.txt', 'privacy_url.txt', 'marketing_url.txt']) {
    const target = path.join(directory, file);
    if (!existsSync(target) || !read(target).startsWith('https://trackbliss.eu/')) {
      fail(`${target} must contain a public Trackbliss HTTPS URL`);
    }
  }
}

const screenshotTargets = [
  ['iphone-6.9', 1320, 2868],
  ['ipad-13', 2064, 2752],
];

for (const locale of ['de-DE', 'en-US']) {
  for (const [device, width, height] of screenshotTargets) {
    const directory = path.join('app-store', 'screenshots', locale, device);
    if (!existsSync(directory)) {
      fail(`Missing screenshot directory: ${directory}`);
      continue;
    }
    const files = readdirSync(directory).filter((file) => file.endsWith('.png')).sort();
    if (files.length < 1 || files.length > 10) {
      fail(`${directory} must contain 1-10 PNG screenshots; found ${files.length}`);
    }
    for (const file of files) {
      const target = path.join(directory, file);
      const metadata = await sharp(target).metadata();
      if (metadata.width !== width || metadata.height !== height) {
        fail(`${target} is ${metadata.width}x${metadata.height}; expected ${width}x${height}`);
      }
    }
  }
}

const infoPlist = read('ios/App/App/Info.plist');
if (!infoPlist.includes('ITSAppUsesNonExemptEncryption')) fail('Info.plist lacks export-compliance declaration');
const entitlements = read('ios/App/App/App.entitlements');
if (!entitlements.includes('com.apple.developer.applesignin')) fail('Sign in with Apple entitlement is missing');
const project = read('ios/App/App.xcodeproj/project.pbxproj');
if (!project.includes('PrivacyInfo.xcprivacy in Resources')) fail('Privacy manifest is not bundled by Xcode');
const auth = read('src/services/supabase/auth.ts');
if (!auth.includes("signInWithOAuthProvider('apple'")) fail('Apple OAuth service is missing');
const supportRoute = read('src/App.tsx');
if (!supportRoute.includes('path="support"')) fail('Public App Store support route is missing');

if (failures.length) {
  console.error('App Store asset check FAILED:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log('App Store assets OK - DE/EN metadata, iPhone 6.9-inch and iPad 13-inch screenshots.');
