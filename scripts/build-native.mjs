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

const result = spawnSync('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, CAPACITOR_BUILD: '1' },
});

process.exit(result.status ?? 1);
