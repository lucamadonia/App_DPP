# Trackbliss App Store handoff

This folder is the source of truth for the first iOS App Store submission of
Trackbliss 1.2.0. It contains upload-ready DE/EN copy, the review handoff, the
privacy inventory, screenshot requirements, and the remaining account-owner
steps. Do not put passwords, one-time codes, private keys, certificates, or a
review account password in this repository.

## App record

- Platform: iOS
- App name: Trackbliss
- Primary language: German
- Bundle ID: `eu.trackbliss.app`
- SKU: `TRACKBLISS-IOS-001`
- Primary category: Business
- Secondary category: Productivity
- Price: Free
- Version: `1.2.0`
- Copyright: `2026 MYFAMBLISS GROUP LTD`
- Privacy policy: `https://trackbliss.eu/privacy`
- Support URL: `https://trackbliss.eu/support`
- Marketing URL: `https://trackbliss.eu/landing`

## Sign in with Apple account setup

The app and provisioning profile must expose Sign in with Apple because Google
is also offered for the primary account. Complete these account-owner steps:

1. Apple Developer > Certificates, Identifiers & Profiles > Identifiers >
   `eu.trackbliss.app`: enable **Sign in with Apple** and keep **Associated Domains**.
2. Create a Services ID, recommended identifier `eu.trackbliss.app.web`, and
   associate it with the Trackbliss App ID.
3. Register domain `trackbliss.eu` and return URL
   `https://xbnybrqzsjlbieqlwsas.supabase.co/auth/v1/callback`.
4. Create a Sign in with Apple key and client secret. Configure it directly in
   Supabase Dashboard > Authentication > Sign In / Providers > Apple. Never
   paste the `.p8` key or client secret into chat or Git.
5. Add `https://trackbliss.eu/auth/callback` to Supabase Authentication > URL
   Configuration > Redirect URLs.
6. Regenerate the App Store provisioning profile after enabling the capability.
   The release workflow rejects profiles without the entitlement.
7. Set GitHub Environment `app-store` variable
   `APPLE_SIGN_IN_CONFIGURED=true` only after an end-to-end login succeeds.

Apple OAuth client secrets expire and must be rotated at least every six months.

## GitHub `app-store` environment

Secrets:

- `IOS_CERT_P12_BASE64`
- `IOS_CERT_PASSWORD`
- `IOS_PROVISIONING_PROFILE_BASE64`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

Variables:

- `APP_STORE_CONNECT_APP_ID` — numeric Apple ID from App Store Connect
- `APPLE_SIGN_IN_CONFIGURED` — literal `true` after live verification

Once those values are configured, Actions > **Mobile Release** > **Run
workflow** > `platform: ios` performs all local gates, builds with Xcode 26,
validates the IPA, and uploads it to TestFlight. App Review submission remains
an explicit App Store Connect action after metadata, privacy answers, screenshots,
and the review account have been confirmed.
