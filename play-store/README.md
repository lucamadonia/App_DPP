# Trackbliss Google Play handoff

This folder is the source of truth for the first Google Play release of Trackbliss 1.2.0. It contains DE/EN listing copy, upload-ready graphics, a conservative data-safety draft, and the remaining Play Console steps. Never commit service-account JSON, keystores, passwords, recovery codes, or tester email lists.

## App record

- App name: Trackbliss
- Default language: German (Germany)
- App or game: App
- Free or paid: Free
- Package name: `eu.trackbliss.app`
- Category: Business
- Suggested tags: Business, Productivity
- Contact email: `info@myfamblissgroup.com`
- Website: `https://trackbliss.eu`
- Privacy policy: `https://trackbliss.eu/privacy`
- Account deletion resource: `https://trackbliss.eu/support`
- Version: `1.2.0`

## Graphics

- `graphics/shared/app-icon-512.png`: 512 × 512, opaque PNG
- `graphics/shared/feature-graphic-1024x500.png`: 1024 × 500, opaque PNG
- `graphics/{locale}/phone`: five 1080 × 1920 screenshots
- `graphics/{locale}/tablet-10`: five 1440 × 2560 screenshots
- `graphics/alt-text.md`: localized accessible descriptions

Regenerate all derived graphics with `npm run playstore:assets` and verify them with `npm run check:play-store`.

## Automated internal release

Repository secrets already sign the Android App Bundle. A Play service account with Release Manager access must be stored as the repository secret `PLAY_SERVICE_ACCOUNT_JSON`. Actions > Mobile Release > Run workflow > `platform: android` then builds a signed AAB and uploads it to the `internal` track. If the secret is absent, a manual workflow run still retains the signed AAB as a GitHub artifact and explicitly skips the Play upload.

After Play App Signing is enabled, copy the Play app-signing certificate SHA-256 fingerprint into `public/.well-known/assetlinks.json`, replacing the placeholder. The upload-key fingerprint is not the app-signing fingerprint served to users.
