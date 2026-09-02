# App Privacy draft

This is a conservative code-based inventory for App Store Connect. The Account
Holder must confirm it against production operations, subprocessors, retention,
and the generated Xcode privacy report before publishing.

## Tracking

- Data used to track the user: **No**
- Third-party advertising: **No**
- Advertising identifier / IDFA: **Not used**
- Marketing or behavioral analytics SDK: **Not present in the app bundle**

## Data linked to the user or organization

| App Store data type | Typical Trackbliss data | Purpose |
| --- | --- | --- |
| Contact Info — Name | user, customer, supplier contact name | App Functionality, Account Management |
| Contact Info — Email Address | login, invitations, tickets, notifications | App Functionality, Account Management |
| Contact Info — Phone Number | optional profile, customer, supplier data | App Functionality |
| Contact Info — Physical Address | organization, customer, return, shipping addresses | App Functionality |
| Identifiers — User ID | Supabase account and tenant membership IDs | App Functionality, Account Management |
| Purchases — Purchase History | organizational plan, entitlement, invoice status | App Functionality |
| User Content — Photos or Videos | product and return photos, ticket attachments | App Functionality |
| User Content — Customer Support | tickets, messages, return support requests | App Functionality |
| User Content — Other User Content | documents, product/passport and supply-chain data | App Functionality |
| Usage Data — Product Interaction | compliance/audit actions required for the business audit trail | App Functionality, Security |
| Other Data | product, batch, serial, compliance, warehouse, and logistics records | App Functionality |

## Not collected by the native app

- Payment card or bank-account details
- Precise or coarse device location
- Contacts address book
- Health, fitness, biometric, or sensitive personal information
- Browsing or search history for advertising
- Crash logs through a third-party crash-reporting SDK

Stripe payment details are handled outside the iOS app. The backend retains only
the organizational customer/subscription/invoice references needed to display
entitlements and billing status.

## Required confirmations in App Store Connect

- Confirm each listed data type is marked **Linked to the User** and **Not used
  for Tracking**.
- Confirm App Functionality and Account Management purposes; do not select
  third-party advertising or developer advertising.
- Generate the Xcode privacy report from the final archive and reconcile it with
  this table and `ios/App/App/PrivacyInfo.xcprivacy`.
- Publish `https://trackbliss.eu/privacy` as the Privacy Policy URL.
