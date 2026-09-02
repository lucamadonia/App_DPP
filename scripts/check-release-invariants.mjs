/**
 * Release metadata gate shared by CI and the tagged mobile workflow.
 *
 * It deliberately checks the native source files rather than generated build
 * output. That catches Windows-only Capacitor rewrites and version drift before
 * a macOS or Play build spends minutes compiling the wrong release.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import sharp from 'sharp';

const failures = [];
const fail = (message) => failures.push(message);
const read = (file) => readFileSync(file, 'utf8');

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const version = packageJson.version;
const appId = 'eu.trackbliss.app';

if (packageLock.version !== version || packageLock.packages?.['']?.version !== version) {
  fail(`package-lock.json version must match package.json (${version})`);
}

const androidBuild = read('android/app/build.gradle');
const androidVersion = androidBuild.match(/versionName\s+"([^"]+)"/)?.[1];
if (androidVersion !== version) {
  fail(`Android versionName is ${androidVersion ?? 'missing'}, expected ${version}`);
}
if (!androidBuild.includes(`applicationId "${appId}"`)) {
  fail(`Android applicationId must be ${appId}`);
}

const androidVariables = read('android/variables.gradle');
const targetSdk = Number(androidVariables.match(/targetSdkVersion\s*=\s*(\d+)/)?.[1] ?? 0);
const compileSdk = Number(androidVariables.match(/compileSdkVersion\s*=\s*(\d+)/)?.[1] ?? 0);
if (targetSdk < 36 || compileSdk < 36) {
  fail(`Google Play releases require target/compile SDK 36 or newer (found ${targetSdk}/${compileSdk})`);
}

const iosProject = read('ios/App/App.xcodeproj/project.pbxproj');
const iosVersions = Array.from(iosProject.matchAll(/MARKETING_VERSION = ([^;]+);/g), (match) => match[1]);
if (!iosVersions.length || iosVersions.some((value) => value !== version)) {
  fail(`Every iOS MARKETING_VERSION must be ${version} (found ${iosVersions.join(', ') || 'none'})`);
}
const iosBundleIds = Array.from(
  iosProject.matchAll(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g),
  (match) => match[1].replaceAll('"', ''),
);
if (!iosBundleIds.length || iosBundleIds.some((value) => value !== appId)) {
  fail(`Every iOS bundle identifier must be ${appId}`);
}

const swiftPackage = read('ios/App/CapApp-SPM/Package.swift');
const swiftPaths = Array.from(swiftPackage.matchAll(/\.package\(name: "[^"]+", path: "([^"]+)"\)/g), (match) => match[1]);
if (!swiftPaths.length || swiftPaths.some((value) => value.includes('\\'))) {
  fail('SwiftPM local package paths must use forward slashes; never commit a Windows cap sync rewrite');
}

const workflow = read('.github/workflows/mobile-release.yml');
const stepBlocks = workflow.split(/(?=^      - )/m).filter((block) => block.startsWith('      - '));
for (const block of stepBlocks) {
  const name = block.match(/^      - (?:name: )?([^\n]+)/)?.[1]?.trim() ?? 'unnamed step';
  const keys = Array.from(block.matchAll(/^        ([A-Za-z_][\w-]*):/gm), (match) => match[1]);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicates.length) fail(`Workflow step "${name}" repeats key(s): ${[...new Set(duplicates)].join(', ')}`);
}

for (const required of [
  "tags: ['v*']",
  'runs-on: macos-26',
  'xcodebuild -project App.xcodeproj',
  'Match tag to package version',
  'Upload to Play internal testing',
  'Require iOS release credentials for tagged release',
  'Validate App Store package',
  'Upload to TestFlight',
]) {
  if (!workflow.includes(required)) fail(`Mobile workflow is missing: ${required}`);
}
if (workflow.includes('xcodebuild -workspace App.xcworkspace')) {
  fail('The Capacitor SwiftPM project has no App.xcworkspace; iOS CI must use App.xcodeproj');
}

const androidManifest = read('android/app/src/main/AndroidManifest.xml');
for (const pathPrefix of ['/auth', '/customer', '/p', '/01', '/t']) {
  if (!androidManifest.includes(`android:pathPrefix="${pathPrefix}"`)) {
    fail(`Android App Links are missing path prefix ${pathPrefix}`);
  }
}

const assetLinks = JSON.parse(read('public/.well-known/assetlinks.json'));
if (assetLinks?.[0]?.target?.package_name !== appId) {
  fail(`assetlinks.json package name must be ${appId}`);
}
const fingerprints = assetLinks?.[0]?.target?.sha256_cert_fingerprints ?? [];
if (!fingerprints.length || fingerprints.some((value) => !/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(value))) {
  fail('assetlinks.json must contain at least one complete SHA-256 certificate fingerprint');
}

const capacitorPrivacyManifest = 'node_modules/@capacitor/ios/Capacitor/Capacitor/PrivacyInfo.xcprivacy';
if (!existsSync(capacitorPrivacyManifest)) {
  fail('The installed Capacitor iOS SDK is missing its required PrivacyInfo.xcprivacy manifest');
}

const appPrivacyManifest = 'ios/App/App/PrivacyInfo.xcprivacy';
if (!existsSync(appPrivacyManifest)) {
  fail('The iOS app privacy manifest is missing');
} else {
  const privacy = read(appPrivacyManifest);
  if (!privacy.includes('NSPrivacyAccessedAPICategoryUserDefaults') || !privacy.includes('CA92.1')) {
    fail('The iOS privacy manifest must declare app-local UserDefaults usage with reason CA92.1');
  }
  if (!iosProject.includes('PrivacyInfo.xcprivacy in Resources')) {
    fail('PrivacyInfo.xcprivacy must be included in the Xcode Resources build phase');
  }
}

const iosInfo = read('ios/App/App/Info.plist');
if (!iosInfo.includes('ITSAppUsesNonExemptEncryption')) {
  fail('Info.plist must declare the app export-compliance state');
}
const iosEntitlements = read('ios/App/App/App.entitlements');
if (!iosEntitlements.includes('com.apple.developer.applesignin')) {
  fail('The iOS app must include the Sign in with Apple entitlement alongside Google login');
}

const releaseNotes = `docs/releases/v${version}.md`;
if (!existsSync(releaseNotes)) {
  fail(`Release notes are missing: ${releaseNotes}`);
}

const dashboardAsset = 'public/images/dashboard/compliance-intelligence-hero.webp';
if (!existsSync(dashboardAsset)) {
  fail(`Dashboard release asset is missing: ${dashboardAsset}`);
} else {
  const metadata = await sharp(dashboardAsset).metadata();
  const size = statSync(dashboardAsset).size;
  if (metadata.format !== 'webp' || metadata.width !== 960 || metadata.height !== 640 || !metadata.hasAlpha) {
    fail('Dashboard hero must remain a transparent 960x640 WebP');
  }
  if (size > 180 * 1024) {
    fail(`Dashboard hero exceeds 180 KB (${Math.round(size / 1024)} KB)`);
  }
}

if (failures.length) {
  console.error('Release invariant check FAILED:\n- ' + failures.join('\n- '));
  process.exit(1);
}

console.log(`Release invariants OK - Trackbliss ${version}, ${appId}, SDK ${targetSdk}`);
