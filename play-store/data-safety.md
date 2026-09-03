# Google Play Data safety draft

This is a conservative code-based handoff, not a declaration submitted to Google. The account owner must reconcile it with production operations, subprocessors, retention, Play SDK Index results, and Play Console wording before publishing.

## Collection and security

- The app collects user and organization data required to provide Trackbliss.
- Data is encrypted in transit with HTTPS/TLS.
- Users can request deletion in-app and through `https://trackbliss.eu/support`.
- The app does not use advertising identifiers, behavioral advertising, or data for cross-app tracking.
- Review processor contracts before answering whether any transfer counts as “sharing” under Google Play. Do not infer “not shared” merely because a recipient is a service provider.

## Likely Play data types

| Play data category | Trackbliss example | Purpose |
| --- | --- | --- |
| Personal info — Name | user, customer, supplier names | App functionality, Account management |
| Personal info — Email address | login, invitations, tickets, notifications | App functionality, Account management |
| Personal info — Address | organization, customer, return, shipping addresses | App functionality |
| Personal info — Phone number | optional profile, customer, supplier contacts | App functionality |
| Financial info — Purchase history | organization plan, entitlement, invoice status | App functionality |
| Photos and videos | product and return photos, attachments | App functionality |
| Files and docs | certificates, reports, ticket attachments | App functionality |
| Messages | support tickets and customer messages | App functionality |
| App activity — App interactions | compliance and audit actions | App functionality, Security and compliance |
| Device or other IDs — User IDs | Supabase account and tenant membership IDs | App functionality, Account management |
| Other data | product, batch, serial, compliance, warehouse, and logistics data | App functionality |

## Not collected by the Android app based on the current code inventory

- Payment card or bank-account details
- Precise or approximate device location
- Contacts address book
- Health, fitness, biometric, or sensitive personal information
- Browsing or search history for advertising
- Crash logs through a third-party crash-reporting SDK

Stripe handles payment details outside the Android app. Trackbliss retains only the organizational customer, subscription, and invoice references needed to show entitlements and billing state.

## Account deletion answers

- Account creation: Yes
- In-app deletion: Yes — Settings > Account > Danger zone > Delete account; customer portal > Profile > Delete account
- External deletion request: Yes — `https://trackbliss.eu/support`
- Deleted: login, password credential, personal profile, and organization/customer-portal access
- Retained where required: organization-owned product/passport content, compliance audit records, and legally required transaction/return records. The in-app confirmation explains the applicable result.
