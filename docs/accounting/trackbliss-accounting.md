# Trackbliss accounting handoff (prepared 2026-10-30)

## Scope and ownership

The proposed seller is **MYFAMBLISS GROUP LTD**, provided that its contracts, Stripe account and Trackbliss sales channels actually make it the seller of record. Do not put this name, an address or a VAT number on customer invoices until the Cyprus accountant has confirmed the registered details and tax setup.

The provider list supplied by the owner reports `trackbliss.eu` as successfully registered on 2026-02-01. On 2026-10-30, an HTTPS HEAD request to `https://trackbliss.eu/` returned HTTP 200 with `Server: Vercel`. The hostname is already present in the Checkout redirect allowlist and the app's known-host routing. Domain registration and reachability do not establish the legal seller or VAT treatment.

| Project | Bookkeeping code | Proposed internal reference |
| --- | --- | --- |
| Trackbliss | `TRACK` | `TRACK-2026-000001` |

The proposed `TRACK-2026-...` reference is **internal**. Stripe's `invoice.number` remains the customer-facing invoice number. Do not issue a second PDF with a different number for the same sale. A legal invoice series or Stripe prefix change requires accountant review. [EU invoice rules](https://taxation-customs.ec.europa.eu/taxation/vat/vat-businesses/invoicing_en), [directive text](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A02006L0112-20190101).

## Trackbliss implementation prepared here

- Checkout sets server-controlled `project_code=TRACK` on the Checkout Session and on the new Subscription or one-time PaymentIntent. New Trackbliss Stripe Customers also carry this code. Client metadata is ignored.
- On `invoice.created`, `invoice.finalized` and the already handled `invoice.paid` and payment-failure events, the webhook tags the Stripe Invoice and associated renewal PaymentIntent with `TRACK` after resolving the customer to a Trackbliss tenant. Configure the additional two events on the Stripe webhook endpoint; until then the paid/failure fallback still runs. The handler refuses a conflicting project tag. The PaymentIntent also gets `stripe_invoice_id` and, where present, `stripe_subscription_id`. Stripe's original IDs and invoice number are stored in `billing_invoices` on paid/failure events.
- The migration fills `TRACK` on existing local invoice rows but does **not** backfill their Stripe invoice numbers, payment IDs, taxes, fees or refunds. The local invoice table is a customer history mirror, not a general ledger.
- One-time credit purchases use PaymentIntent metadata; Checkout currently does not create a Stripe invoice for them. The accountant must decide whether and how these sales require a separate invoice/receipt. Do not assume the payment confirmation is a compliant VAT invoice.

## Trackbliss accounting import contract

Record the **Trackbliss Stripe account ID** and account currency with each row. Assign a clearing account for the Stripe account used for Trackbliss sales. Confirm the actual account and seller identity before importing transactions.

Import invoice/credit-note records and payment-side balance transactions as separate source streams. Retain at least: `project_code`, Stripe account ID, invoice ID and **actual** invoice number, subscription ID, PaymentIntent ID, charge ID, refund/dispute ID, balance transaction ID, payout ID, transaction type/reporting category, timestamps, gross amount, tax amount and treatment, fee, net, currency and exchange rate. Keep the raw Stripe export and an import batch ID. Never infer VAT from the payout amount.

Reconcile: opening Stripe balance + payments - refunds/chargebacks - fees +/- adjustments - payouts = closing Stripe balance, by account and currency. Match each bank receipt to a Stripe payout ID. A payout moves value from the Stripe clearing account to the bank account; it is not a second sale. Resolve every unassigned transaction before closing a period. Stripe balance transactions expose `amount`, `fee`, `net`, `reporting_category` and `source`: [Stripe API reference](https://docs.stripe.com/api/balance_transactions/object). Stripe payout objects carry the payout reference: [Stripe API reference](https://docs.stripe.com/api/payouts/object).

For a directly attributable Trackbliss expense, record the supplier invoice, legal recipient and VAT treatment, amount/currency, payment reference and `TRACK`. Refunds and payment disputes should adjust the original Trackbliss records, preserving their own IDs and dates.

## Required decisions before sales or accounting cutover

1. Confirm the LTD's exact registered name, address, VAT ID, seller-of-record status for each Trackbliss sales channel, and who issues invoices for any app-store sales. Use the actual Stripe account business profile and tax IDs, not a label in app code.
2. Have the Cyprus accountant approve B2C/B2B classification, customer-location evidence, VAT/OSS registrations, reverse-charge wording, tax rates, tax point and credit-note handling for each service and country. Checkout currently has **neither** `automatic_tax` nor `tax_id_collection` enabled. A billing-address prompt alone does not calculate VAT. See the [EU place-of-taxation rules](https://taxation-customs.ec.europa.eu/taxation/vat/vat-directive/place-taxation_en) and [OSS overview](https://taxation-customs.ec.europa.eu/taxation/vat/vat-businesses_en).
3. Review Stripe-hosted invoice PDF and one-time sale receipt for the verified seller details, service description and period, customer details, invoice number, tax breakdown and required tax wording. Agree on Stripe's official numbering before changing any prefixes.
4. Apply the Trackbliss migration before deploying the two changed Edge Functions. Add `invoice.created` and `invoice.finalized` to the Stripe webhook endpoint. Then test in Stripe test mode: plan checkout, renewal, one-time credits, failed payment, refund, dispute and payout; inspect metadata/IDs, invoice PDF, tax result and clearing-account totals. Backfill historical invoice references from Stripe with an audited, idempotent import. Reconcile the first full live period before treating this as operational.

No live Stripe configuration, VAT registration, accounting ledger, migration or Edge Function deployment is changed by this document.
