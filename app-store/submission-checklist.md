# App Store submission checklist

## Automated and repository gates

- [x] Version 1.2.0 and bundle ID `eu.trackbliss.app` aligned
- [x] iPhone and iPad target enabled
- [x] 1024 × 1024 opaque app icon
- [x] Camera and photo usage descriptions
- [x] Associated Domains entitlement
- [x] Sign in with Apple UI and entitlement
- [x] In-app account deletion
- [x] iOS purchase and external-checkout paths hidden
- [x] Export-compliance plist key
- [x] App privacy manifest bundled as an Xcode resource
- [x] Xcode 26 / iOS 26 CI gate
- [x] Signed IPA validation before TestFlight upload
- [x] DE and EN App Store copy
- [x] Public support, privacy, terms, and imprint routes

## Apple/Supabase account-owner steps

- [ ] Accept all pending agreements in App Store Connect > Business
- [ ] Create the iOS app record using the values in `app-store/README.md`
- [ ] Enable Sign in with Apple on App ID `eu.trackbliss.app`
- [ ] Configure the Apple Services ID, private key, and Supabase Apple provider
- [ ] Regenerate and download the App Store provisioning profile
- [ ] Verify Apple login end-to-end on a physical iPhone
- [ ] Create an active, non-production demo tenant and review user
- [ ] Enter demo credentials directly in App Store Connect > App Review Information
- [ ] Confirm App Privacy answers using `app-store/privacy-label.md`
- [ ] Complete the current age-rating questionnaire honestly
- [ ] Confirm content rights and Digital Services Act trader status
- [ ] Confirm export-compliance answers for the selected territories
- [ ] Review screenshots for fictional data and approve every localization

## GitHub setup and TestFlight

- [ ] Create GitHub Environment `app-store`
- [ ] Add all secrets and variables listed in `app-store/README.md`
- [ ] Push the release commit to `main`
- [ ] Actions > Mobile Release > Run workflow > platform `ios`
- [ ] Confirm workflow preflight, signed archive, validation, and upload are green
- [ ] In App Store Connect > TestFlight, wait for processing and confirm no warnings
- [ ] Test login, deletion, camera/QR, deep links, guest mode, and read-only billing on iPhone and iPad

## Submission

- [ ] Select build 1.2.0 in App Store Connect
- [ ] Paste localized metadata and review notes
- [ ] Upload iPhone 6.9-inch and iPad 13-inch screenshots
- [ ] Set release mode (manual, automatic, or phased) deliberately
- [ ] Add for Review, then submit to App Review
- [ ] Record the App Store Connect status and submission timestamp separately
