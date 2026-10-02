# Go-live 2026-10-01: mail relay lockdown rollout (package D)

The steps must run in this order and in one maintenance window. Each step
depends on the one before it.

| # | Step | Why it must come here |
|---|------|-----------------------|
| 0 | Migrations A, B, C applied (`node scripts/db-migrate.mjs`) | 20261001d builds on them |
| 1 | Apply `supabase/migrations/20261001d_rh_notifications_lockdown_ratelimit.sql` | Creates `claim_rh_notification`, `tenant_mail_tier`, `rate_limit_hit`, `public_enqueue_notification`. The new `send-email` and `notify-dispatch` call these RPCs; without them every mail returns 500 `claim_failed` and stays `pending`. |
| 2a | Vault check: `SELECT md5(decrypted_secret) FROM vault.decrypted_secrets WHERE name = 'service_role_jwt';` must equal the md5 of `SUPABASE_SERVICE_ROLE_KEY`. If they differ, set the edge secret `SERVICE_ROLE_JWT` to the vault value. | `notify-dispatch` compares the trigger's bearer token exactly. On a mismatch, every mail gets 403 and stays `pending`. |
| 2b | Deploy `notify-dispatch` **and** `send-email` together (both `verify_jwt = true`), then `widerruf-request` and `chatbot-create` | The old `notify-dispatch` cannot render `render='server'` rows. It would pass them through with an empty body, to Family-Joy or as "Notification" via SMTP. |
| 3 | Deploy the frontend (Vercel) | The new frontend queues public mails through `public_enqueue_notification` (`render='server'` rows). Only the new `notify-dispatch` renders them. |

Safety nets if the order is broken anyway: the new `send-email` and
`notify-dispatch` mark empty or unrendered rows as `failed` (`empty_content` /
`unrendered_server_row`) and do not send them. They cannot protect against an
**old** `notify-dispatch`, so step 2b must happen before step 3.

Between steps 1 and 3, anonymous visitors' portal confirmation mails are not
queued, because the old frontend still inserts directly and anon INSERT is
revoked. Keep that window short.

## Live checks after step 3

1. As anon: `INSERT` and `SELECT` on `rh_notifications` fail.
2. Create a test return in the returns portal. A `return_confirmed` row appears
   with `metadata.render = 'server'` and reaches `status = 'sent'`.
3. Send a CRM "Kunde kontaktieren" mail to yourself. The row reaches `sent`.
4. `SELECT status, metadata->>'error', count(*) FROM rh_notifications WHERE created_at > now() - interval '1 hour' GROUP BY 1, 2;`
   shows no `claim_failed`, `empty_content`, `unrendered_server_row` or 403 errors.

## Limits introduced (for support questions)

- Tenant inserts, free tier: 20/h and 50/day. Paid tier, or a **complete** own SMTP config: 600/h and 3000/day. Per recipient per tenant: 20/h.
- Platform sender (`noreply@trackbliss.eu`) for non-paying tenants, at send time: 60/h and 300/day (`platform_quota_exceeded`).
- An enabled but incomplete tenant SMTP config fails with `tenant_smtp_incomplete` and does not fall back to the platform sender.
- Public queue: 30/h per IP, 100/h per tenant, 5/h per recipient per tenant, 1000/h globally.
