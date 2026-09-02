#!/usr/bin/env node
/**
 * Applies the iOS project settings that `npx cap add ios` cannot know about.
 *
 * `cap add ios` regenerates a vanilla Xcode project. Everything the App Store
 * actually requires - the Associated Domains entitlement behind Universal
 * Links, the permission strings without which the app is rejected on sight,
 * the signing team - has to be put back afterwards. Doing that by hand in
 * Xcode means it is lost the next time anyone regenerates the platform, and on
 * Windows there is no Xcode to do it in at all.
 *
 * So: idempotent, runs on the macOS CI runner right after `cap add ios`, and
 * the RESULT is committed. Re-running it on an already-configured project
 * changes nothing.
 *
 * Usage: node scripts/configure-ios.mjs
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const TEAM_ID = 'WU8U8HD73G'; // MYFAMBLISS GROUP LTD. Not a secret: it is
                              // served publicly in apple-app-site-association.
const BUNDLE_ID = 'eu.trackbliss.app';

/**
 * Both domains, because Associated Domains accepts a list and links from
 * either should open the app. Auth redirects still use exactly one canonical
 * origin (trackbliss.eu) - that is decided in src/lib/platform.ts, not here.
 */
const ASSOCIATED_DOMAINS = ['applinks:trackbliss.eu', 'applinks:dpp-app.fambliss.eu'];

const APP_DIR = 'ios/App';
const PROJECT = `${APP_DIR}/App.xcodeproj/project.pbxproj`;
const INFO_PLIST = `${APP_DIR}/App/Info.plist`;
const ENTITLEMENTS = `${APP_DIR}/App/App.entitlements`;
const PRIVACY_MANIFEST = `${APP_DIR}/App/PrivacyInfo.xcprivacy`;
const EXPORT_OPTIONS = `${APP_DIR}/ExportOptions.plist`;

if (!existsSync(PROJECT)) {
  console.error(`${PROJECT} not found - run \`npx cap add ios\` first (macOS only).`);
  process.exit(1);
}

const changes = [];

/* ------------------------------------------------------------------ *
 * 1. Associated Domains entitlement
 * ------------------------------------------------------------------ */
const entitlementsXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.developer.associated-domains</key>
\t<array>
${ASSOCIATED_DOMAINS.map((d) => `\t\t<string>${d}</string>`).join('\n')}
\t</array>
\t<key>com.apple.developer.applesignin</key>
\t<array>
\t\t<string>Default</string>
\t</array>
</dict>
</plist>
`;
if (!existsSync(ENTITLEMENTS) || readFileSync(ENTITLEMENTS, 'utf8') !== entitlementsXml) {
  writeFileSync(ENTITLEMENTS, entitlementsXml);
  changes.push('App.entitlements (Associated Domains)');
}

/* ------------------------------------------------------------------ *
 * 2. Wire the entitlement + signing team into every build config
 *
 * Xcode only reads an entitlements file if CODE_SIGN_ENTITLEMENTS points at
 * it, and that lives in the pbxproj. Anchoring on PRODUCT_BUNDLE_IDENTIFIER
 * rather than on a build-config name: Capacitor emits it once per config
 * (Debug and Release), so this reaches both without hard-coding their names.
 * ------------------------------------------------------------------ */
const pbx = readFileSync(PROJECT, 'utf8');

if (pbx.includes('CODE_SIGN_ENTITLEMENTS')) {
  // Already wired up. Leave it byte-for-byte alone rather than rewriting it,
  // so a second run cannot drift the file.
} else {
  // Capacitor writes the bundle id once per build configuration (Debug and
  // Release). Anchoring on it reaches both without hard-coding config names,
  // and it may or may not be quoted depending on the Capacitor version.
  const bundleLine = /([	 ]*)PRODUCT_BUNDLE_IDENTIFIER = "?eu.trackbliss.app"?;/g;
  const hits = pbx.match(bundleLine);

  // Silence here would be the dangerous outcome: no match means no
  // entitlement, and the first sign of that is Universal Links quietly not
  // working on a build that is already in review.
  if (!hits || hits.length === 0) {
    console.error(
      `No PRODUCT_BUNDLE_IDENTIFIER = ${BUNDLE_ID} found in ${PROJECT}.
` +
        'The Xcode project layout changed - the entitlement was NOT applied.'
    );
    process.exit(1);
  }

  const patched = pbx.replace(
    bundleLine,
    (match, indent) =>
      `${indent}CODE_SIGN_ENTITLEMENTS = App/App.entitlements;
` +
      `${indent}DEVELOPMENT_TEAM = ${TEAM_ID};
${match}`
  );
  writeFileSync(PROJECT, patched);
  changes.push(`project.pbxproj (${hits.length} build configs: entitlements + team)`);
}


/* ------------------------------------------------------------------ *
 * 3. Permission strings
 *
 * An app that opens the camera without NSCameraUsageDescription does not get
 * rejected - it crashes. PlistBuddy rather than string surgery because
 * Info.plist is a real plist and Xcode rewrites its formatting.
 * ------------------------------------------------------------------ */
const plistKeys = {
  NSCameraUsageDescription:
    'Trackbliss uses the camera to scan barcodes and QR codes on products and shipments.',
  NSPhotoLibraryUsageDescription:
    'Trackbliss lets you attach photos to returns, tickets and product documentation.',
  NSPhotoLibraryAddUsageDescription:
    'Trackbliss saves shipping labels and reports to your photo library.',
  CFBundleDisplayName: 'Trackbliss',
  // Trackbliss uses exempt, standard HTTPS/TLS rather than proprietary or
  // non-standard encryption.
  ITSAppUsesNonExemptEncryption: false,
  // German is the primary interface language and long words are the norm;
  // without this the status bar and web view do not honour the dark theme.
  UIViewControllerBasedStatusBarAppearance: false,
};

for (const [key, value] of Object.entries(plistKeys)) {
  const type = typeof value === 'boolean' ? 'bool' : 'string';
  const literal = typeof value === 'boolean' ? String(value) : value;
  try {
    execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, INFO_PLIST], {
      stdio: 'pipe',
    });
    execFileSync('/usr/libexec/PlistBuddy', ['-c', `Set :${key} ${literal}`, INFO_PLIST]);
  } catch {
    execFileSync('/usr/libexec/PlistBuddy', [
      '-c',
      `Add :${key} ${type} ${literal}`,
      INFO_PLIST,
    ]);
    changes.push(`Info.plist :${key}`);
  }
}

/* ------------------------------------------------------------------ *
 * 4. App privacy manifest
 *
 * Capacitor Preferences is statically linked and uses UserDefaults only for
 * app-local state. CA92.1 is Apple's approved reason for exactly that use.
 * ------------------------------------------------------------------ */
const privacyCollectedDataTypes = [
  'NSPrivacyCollectedDataTypeName',
  'NSPrivacyCollectedDataTypeEmailAddress',
  'NSPrivacyCollectedDataTypePhoneNumber',
  'NSPrivacyCollectedDataTypePhysicalAddress',
  'NSPrivacyCollectedDataTypeUserID',
  'NSPrivacyCollectedDataTypePurchaseHistory',
  'NSPrivacyCollectedDataTypePhotosorVideos',
  'NSPrivacyCollectedDataTypeCustomerSupport',
  'NSPrivacyCollectedDataTypeOtherUserContent',
  'NSPrivacyCollectedDataTypeProductInteraction',
  'NSPrivacyCollectedDataTypeOtherDataTypes',
];
const privacyCollectedDataXml = privacyCollectedDataTypes.map((type) => `\t\t<dict>
\t\t\t<key>NSPrivacyCollectedDataType</key>
\t\t\t<string>${type}</string>
\t\t\t<key>NSPrivacyCollectedDataTypeLinked</key><true/>
\t\t\t<key>NSPrivacyCollectedDataTypeTracking</key><false/>
\t\t\t<key>NSPrivacyCollectedDataTypePurposes</key><array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
\t\t</dict>`).join('\n');

const privacyManifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>NSPrivacyAccessedAPITypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>NSPrivacyAccessedAPIType</key>
\t\t\t<string>NSPrivacyAccessedAPICategoryUserDefaults</string>
\t\t\t<key>NSPrivacyAccessedAPITypeReasons</key>
\t\t\t<array>
\t\t\t\t<string>CA92.1</string>
\t\t\t</array>
\t\t</dict>
\t</array>
\t<key>NSPrivacyCollectedDataTypes</key>
\t<array>
${privacyCollectedDataXml}
\t</array>
\t<key>NSPrivacyTracking</key>
\t<false/>
\t<key>NSPrivacyTrackingDomains</key>
\t<array/>
</dict>
</plist>
`;
if (!existsSync(PRIVACY_MANIFEST) || readFileSync(PRIVACY_MANIFEST, 'utf8') !== privacyManifestXml) {
  writeFileSync(PRIVACY_MANIFEST, privacyManifestXml);
  changes.push('PrivacyInfo.xcprivacy');
}

// Capacitor's generated Xcode project uses explicit file references, so merely
// writing PrivacyInfo.xcprivacy does not put it in the application bundle.
let privacyProject = readFileSync(PROJECT, 'utf8');
if (!privacyProject.includes('PrivacyInfo.xcprivacy in Resources')) {
  const edits = [
    [
      '/* End PBXBuildFile section */',
      '\t\tA11E00012F00000100000001 /* PrivacyInfo.xcprivacy in Resources */ = {isa = PBXBuildFile; fileRef = A11E00022F00000100000001 /* PrivacyInfo.xcprivacy */; };\n/* End PBXBuildFile section */',
    ],
    [
      '/* End PBXFileReference section */',
      '\t\tA11E00022F00000100000001 /* PrivacyInfo.xcprivacy */ = {isa = PBXFileReference; lastKnownFileType = text.xml; path = PrivacyInfo.xcprivacy; sourceTree = "<group>"; };\n/* End PBXFileReference section */',
    ],
    [
      '\t\t\t\t504EC3131FED79650016851F /* Info.plist */,',
      '\t\t\t\t504EC3131FED79650016851F /* Info.plist */,\n\t\t\t\tA11E00022F00000100000001 /* PrivacyInfo.xcprivacy */,',
    ],
    [
      '\t\t\t\t50379B232058CBB4000EE86E /* capacitor.config.json in Resources */,',
      '\t\t\t\t50379B232058CBB4000EE86E /* capacitor.config.json in Resources */,\n\t\t\t\tA11E00012F00000100000001 /* PrivacyInfo.xcprivacy in Resources */,',
    ],
  ];

  for (const [anchor, replacement] of edits) {
    if (!privacyProject.includes(anchor)) {
      console.error(`Cannot add PrivacyInfo.xcprivacy: Xcode project anchor missing: ${anchor}`);
      process.exit(1);
    }
    privacyProject = privacyProject.replace(anchor, replacement);
  }
  writeFileSync(PROJECT, privacyProject);
  changes.push('project.pbxproj (privacy manifest resource)');
}

/* ------------------------------------------------------------------ *
 * 5. ExportOptions.plist, which mobile-release.yml already expects
 * ------------------------------------------------------------------ */
const exportXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>method</key>
\t<string>app-store-connect</string>
\t<key>teamID</key>
\t<string>${TEAM_ID}</string>
\t<key>uploadSymbols</key>
\t<true/>
\t<key>destination</key>
\t<string>export</string>
</dict>
</plist>
`;
if (!existsSync(EXPORT_OPTIONS) || readFileSync(EXPORT_OPTIONS, 'utf8') !== exportXml) {
  writeFileSync(EXPORT_OPTIONS, exportXml);
  changes.push('ExportOptions.plist');
}

console.log(
  changes.length
    ? `Configured iOS project:\n  - ${changes.join('\n  - ')}`
    : 'iOS project already configured - nothing to change.'
);
