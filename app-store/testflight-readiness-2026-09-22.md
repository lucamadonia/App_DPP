# Trackbliss TestFlight preparation — 2026-09-22

## Signed build

- Version **1.2.0 (16)**, bundle ID `eu.trackbliss.app`.
- Source commit: `cf73441` on `release/ios-testflight-20260922`.
- [Signed iOS verification](https://github.com/lucamadonia/App_DPP/actions/runs/35782729951): successful archive and export; `verify_only=true`.
- Artifact: `ios-release-ipa` / `App.ipa`, 6,973,159 bytes.
- Local copy: `tmp/ios-testflight-20260922/App.ipa` (ignored by Git).
- SHA-256: `d16d96ebd505a07e529ddd5f80422ddb0388713d054a42cf1f7a66c9f3a5f76a`.
- Inspected IPA: iPhone and iPad, minimum iOS 15, iOS 26.5 SDK, privacy manifest present, no service worker files.
- Provisioning profile: `Trackbliss_App_Store`, expires 2027-08-19; Xcode successfully signed and exported it.
- **No Apple package validation, TestFlight upload, Apple processing, or physical-device acceptance is claimed.**

## Verification

- Native production build, release/native invariants and store asset checks passed.
- 326 unit tests passed; lint has 0 errors and 385 existing warnings.
- 11 production backend guard cases passed.
- [CI on the build source](https://github.com/lucamadonia/App_DPP/actions/runs/35782844142): 64 mobile browser tests passed, along with build, lint and database regressions.
- Local production-bundle checks: 35 of 36 passed initially; the remaining target-size measurement sampled the login spring animation just below 44 px. The test now requests reduced motion; both iPhone and iPad target-size checks pass. Application code is unchanged by this test correction.
- An earlier local first-run suite was stopped because the production bundle intentionally lacks its required `VITE_E2E_FIRST_RUN` test flag. CI exercised that suite using the correct test build.

## Configured GitHub environment

The `app-store` environment now contains `IOS_CERT_P12_BASE64`,
`IOS_CERT_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, `VITE_SUPABASE_URL`,
and `VITE_SUPABASE_ANON_KEY`. Secret values remain outside Git and documentation.

The workflow now supplies the production backend at build time, rejects missing
or unsuitable configuration, and separates signed verification from Apple upload.

## Remaining upload prerequisites

1. Confirm/create the Trackbliss app record in App Store Connect and set its numeric
   ID as `APP_STORE_CONNECT_APP_ID` in the GitHub `app-store` environment.
2. Set `APPLE_ID` and `APPLE_APP_SPECIFIC_PASSWORD` as environment secrets.
3. Configure the Apple OAuth Services ID and Supabase Apple provider. The live
   public auth settings returned `external.apple=false` during this preparation.
4. Verify Apple login on a physical iPhone, then set
   `APPLE_SIGN_IN_CONFIGURED=true`. Do not set this flag merely to bypass the gate.
5. Run `Mobile Release` on this release branch with `platform=ios` and
   `verify_only=false`. This creates a fresh build number, validates the package
   with Apple and uploads it. The current verification artifact was not uploaded.
6. Confirm processing in App Store Connect and assign the build to the intended
   TestFlight group. Verify login/callbacks, QR camera, sharing, deletion,
   rotation/keyboard handling and billing restrictions on physical devices.

Changes are reviewable in [PR #39](https://github.com/lucamadonia/App_DPP/pull/39).
App Store review submission remains separate from TestFlight preparation.
