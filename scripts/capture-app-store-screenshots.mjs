#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const root = process.cwd();
const baseUrl = 'http://127.0.0.1:4174';
const npmCli = process.env.npm_execpath;

const localizations = [
  { folder: 'de-DE', language: 'de' },
  { folder: 'en-US', language: 'en' },
];

const devices = [
  { folder: 'iphone-6.9', width: 440, height: 956, scale: 3, expected: [1320, 2868], mobile: true },
  { folder: 'ipad-13', width: 1032, height: 1376, scale: 2, expected: [2064, 2752], mobile: true },
];

const screens = [
  ['01-discover', '/discover'],
  ['02-requirements', '/discover/requirements'],
  ['03-checklists', '/discover/checklists'],
  ['04-qr-tool', '/discover/qr'],
  ['05-tips', '/discover/tips'],
];

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // Preview is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Preview did not become ready at ${baseUrl}`);
}

if (!process.argv.includes('--skip-build')) {
  console.log('Building the deterministic native guest-mode screenshot target...');
  if (!npmCli) throw new Error('Run this script through npm: npm run appstore:screenshots');
  await run(process.execPath, [npmCli, 'run', 'build'], {
    env: { ...process.env, VITE_E2E_FIRST_RUN: '1' },
  });
} else {
  console.log('Using the existing VITE_E2E_FIRST_RUN=1 production build.');
}

const preview = spawn(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174'],
  { cwd: root, stdio: 'inherit' },
);

try {
  await waitForServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const locale of localizations) {
      for (const device of devices) {
        const outputDir = path.join(root, 'app-store', 'screenshots', locale.folder, device.folder);
        await mkdir(outputDir, { recursive: true });

        const context = await browser.newContext({
          viewport: { width: device.width, height: device.height },
          deviceScaleFactor: device.scale,
          isMobile: device.mobile,
          hasTouch: true,
          colorScheme: 'light',
          locale: locale.folder,
        });
        await context.addInitScript((language) => {
          localStorage.setItem('dpp-language', language);
        }, locale.language);

        const page = await context.newPage();
        await page.emulateMedia({ reducedMotion: 'reduce' });

        for (const [name, route] of screens) {
          await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
          await page.evaluate(async () => { await document.fonts.ready; });
          await page.waitForTimeout(750);

          if (!new URL(page.url()).pathname.startsWith('/discover')) {
            throw new Error(`${route} left guest mode and ended at ${page.url()}`);
          }

          const screenshot = await page.screenshot({ fullPage: false, animations: 'disabled' });
          const target = path.join(outputDir, `${name}.png`);
          await sharp(screenshot)
            .png({ compressionLevel: 9, adaptiveFiltering: true })
            .toFile(target);

          const metadata = await sharp(target).metadata();
          if (metadata.width !== device.expected[0] || metadata.height !== device.expected[1]) {
            throw new Error(`${target} is ${metadata.width}x${metadata.height}; expected ${device.expected.join('x')}`);
          }
          console.log(`${path.relative(root, target)} (${metadata.width}x${metadata.height})`);
        }

        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
} finally {
  preview.kill('SIGTERM');
}

console.log('App Store screenshot set complete.');
