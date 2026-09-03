# Google Play submission checklist

## Repository and build gates

- [x] Version 1.2.0 and package name `eu.trackbliss.app` aligned
- [x] Target and compile SDK 36
- [x] Signed Android App Bundle workflow
- [x] Monotonic CI `versionCode`
- [x] DE and EN store copy within Play limits
- [x] Opaque 512 × 512 icon and 1024 × 500 feature graphic
- [x] DE and EN phone and 10-inch tablet screenshots
- [x] Public privacy policy and external account-deletion request path
- [x] In-app account deletion

## Play Console account steps

- [ ] Create or select app `Trackbliss` with package `eu.trackbliss.app`
- [ ] Accept Developer Program Policies, export-law declaration, and Play App Signing terms
- [ ] Complete app access instructions with an active review account
- [ ] Complete Ads, Content rating, Target audience, News, and Data safety declarations honestly
- [ ] Enter `https://trackbliss.eu/privacy` as privacy policy
- [ ] Enter `https://trackbliss.eu/support` as account-deletion resource
- [ ] Upload DE and EN listing text and graphics from this folder
- [ ] Confirm category, tags, contact email, and website
- [ ] Configure internal testers without committing their email addresses

## Signing and automation

- [ ] Enable Play App Signing
- [ ] Record the app-signing SHA-256 fingerprint in `public/.well-known/assetlinks.json`
- [ ] Create a least-privilege Play service account with Release Manager access
- [ ] Store its JSON directly as GitHub secret `PLAY_SERVICE_ACCOUNT_JSON`
- [ ] Run Mobile Release with `platform: android`
- [ ] Confirm the signed AAB build and Play upload steps are green
- [ ] In Play Console, confirm version 1.2.0 is active on Internal testing
- [ ] Install from the tester opt-in link and verify login, deletion, camera/QR, deep links, guest mode, and billing behavior on a physical Android device

Production rollout remains a separate deliberate Play Console action after internal testing and policy review.
