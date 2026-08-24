/**
 * Production build for the Capacitor shell.
 *
 * Sets CAPACITOR_BUILD=1 so vite.config.ts leaves the service worker out —
 * a SW inside a WebView that already serves from the local bundle buys nothing
 * and can strand users on a cached shell after an app update.
 *
 * A plain `CAPACITOR_BUILD=1 vite build` is not portable to Windows, hence a
 * script rather than an inline env assignment in package.json.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, rmSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CAPACITOR_BUILD: '1' },
});

if (result.status !== 0) process.exit(result.status ?? 1);

/**
 * Drop web-origin-only assets from dist/ before `cap sync` copies it into the
 * APK. hero-website.png is only ever referenced as an absolute og:image /
 * twitter:image URL by crawlers hitting the public site — inside the app it is
 * 796 KB of bytes nothing can ever request. dist/ is gitignored and rebuilt
 * every time, so deleting from it is free and reversible.
 */
const WEB_ONLY = ['hero-website.png'];
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
for (const name of WEB_ONLY) {
  const file = path.join(dist, name);
  if (existsSync(file)) {
    const kb = Math.round(statSync(file).size / 1024);
    rmSync(file);
    console.log(`build:native — pruned ${name} (${kb} KB, web-only)`);
  }
}
