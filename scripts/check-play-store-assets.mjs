#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const failures = [];
const fail = (message) => failures.push(message);
const read = (file) => readFileSync(file, 'utf8').trim();

const metadataLimits = {
  'title.txt': 30,
  'short-description.txt': 80,
  'full-description.txt': 4000,
  'release-notes.txt': 500,
};

for (const locale of ['de-DE', 'en-US']) {
  const directory = path.join('play-store', 'metadata', locale);
  for (const [file, limit] of Object.entries(metadataLimits)) {
    const target = path.join(directory, file);
    if (!existsSync(target)) {
      fail(`Missing Play Store metadata: ${target}`);
      continue;
    }
    const length = [...read(target)].length;
    if (!length || length > limit) fail(`${target} has ${length} characters; allowed 1-${limit}`);
  }

  for (const [device, width, height] of [['phone', 1080, 1920], ['tablet-10', 1440, 2560]]) {
    const screenshotDirectory = path.join('play-store', 'graphics', locale, device);
    if (!existsSync(screenshotDirectory)) {
      fail(`Missing Play Store screenshot directory: ${screenshotDirectory}`);
      continue;
    }
    const files = readdirSync(screenshotDirectory).filter((file) => file.endsWith('.png')).sort();
    if (files.length < 4 || files.length > 8) {
      fail(`${screenshotDirectory} must contain 4-8 PNG screenshots; found ${files.length}`);
    }
    for (const file of files) {
      const target = path.join(screenshotDirectory, file);
      const metadata = await sharp(target).metadata();
      if (metadata.width !== width || metadata.height !== height) {
        fail(`${target} is ${metadata.width}x${metadata.height}; expected ${width}x${height}`);
      }
      if (metadata.hasAlpha) fail(`${target} must not have an alpha channel`);
    }
  }
}

for (const [file, width, height] of [
  ['app-icon-512.png', 512, 512],
  ['feature-graphic-1024x500.png', 1024, 500],
]) {
  const target = path.join('play-store', 'graphics', 'shared', file);
  if (!existsSync(target)) {
    fail(`Missing Play Store graphic: ${target}`);
    continue;
  }
  const metadata = await sharp(target).metadata();
  if (metadata.width !== width || metadata.height !== height) {
    fail(`${target} is ${metadata.width}x${metadata.height}; expected ${width}x${height}`);
  }
  if (metadata.hasAlpha) fail(`${target} must not have an alpha channel`);
}

for (const target of [
  path.join('play-store', 'data-safety.md'),
  path.join('play-store', 'submission-checklist.md'),
  path.join('play-store', 'graphics', 'alt-text.md'),
]) {
  if (!existsSync(target) || !read(target)) fail(`Missing Play Store handoff document: ${target}`);
}

const manifest = read(path.join('android', 'app', 'src', 'main', 'AndroidManifest.xml'));
if (!manifest.includes('android.permission.CAMERA')) fail('Android manifest lacks the declared camera permission');
const supportPage = read(path.join('src', 'pages', 'SupportPage.tsx'));
if (!supportPage.includes('Trackbliss%20account%20deletion%20request')) {
  fail('The public support page lacks an external account-deletion request path');
}

if (failures.length) {
  console.error('Play Store asset check FAILED:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log('Play Store assets OK - DE/EN metadata, icon, feature graphic, phone/tablet screenshots, and policy handoff.');
