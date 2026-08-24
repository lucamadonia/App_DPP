import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

/**
 * Capacitor configuration.
 *
 * NOTE: no `server.url` here — that would point the release build at a remote
 * origin. Live reload is opt-in via CAP_LIVE_RELOAD (see below) and must never
 * reach a store build.
 */
const liveReloadUrl = process.env.CAP_LIVE_RELOAD;

const config: CapacitorConfig = {
  appId: 'eu.trackbliss.app',
  appName: 'Trackbliss',
  webDir: 'dist',
  ios: {
    contentInset: 'always',
    // Deliberately NOT renamed to 'Trackbliss'. This names the Xcode SCHEME,
    // and `cap add ios` always generates one called "App" - Capacitor does not
    // rename it. Pointing this at a scheme that does not exist breaks
    // `cap run ios`, and mobile-release.yml archives with `-scheme App`.
    // The user-visible name comes from CFBundleDisplayName, not from here.
    scheme: 'App',
  },
  android: {
    // https scheme is required for Universal/App Links and secure-context APIs
    // (getUserMedia for the barcode scanner).
    buildOptions: {},
  },
  server: {
    androidScheme: 'https',
    ...(liveReloadUrl ? { url: liveReloadUrl, cleartext: true } : {}),
  },
  plugins: {
    SplashScreen: {
      // The React splash takes over — see src/components/splash/. Auto-hiding
      // here would show a white frame between native splash and first paint.
      launchAutoHide: false,
      backgroundColor: '#0F172A',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
      backgroundColor: '#0F172A',
    },
    Keyboard: {
      // 'none' keeps the WebView at full height; we lift sticky bars ourselves
      // via the --kb-h CSS variable. 'native' would squash the whole layout.
      resize: KeyboardResize.None,
    },
  },
};

export default config;
