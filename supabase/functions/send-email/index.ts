/**
 * Supabase Edge Function: send-email
 *
 * Sends one rh_notifications row via SMTP (tenant_smtp_config or the platform
 * all-inkl mailbox). INTERNAL ONLY — called by notify-dispatch with
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   body: { notificationId }
 *
 * Security (go-live hardening, SEC-03/SRE-02): the function used to accept a
 * full `record` from any caller (open SMTP relay). It now
 *   - requires an exact service-role bearer token (the anon key is a valid JWT
 *     too, so verify_jwt alone is not enough),
 *   - ignores everything in the body except the notification id and re-loads
 *     recipient/subject/content/tenant from the database,
 *   - claims the row atomically (claim_rh_notification 'smtp') so it is never
 *     delivered twice.
 * Browsers must NOT call this function; insert an rh_notifications row instead.
 *   - never falls back to the platform sender for an enabled-but-incomplete
 *     tenant SMTP config, and caps platform-sender mails of non-paying
 *     tenants at send time (tenant_mail_tier + smtp:platform:* buckets),
 *   - refuses empty / unrendered (render='server') rows.
 *   - EF-07: free tenants on the platform sender additionally count against a
 *     GLOBAL ceiling shared by all non-paying tenants
 *     (smtp:platform:free:global:*, PLATFORM_FREE_GLOBAL_HOURLY / _DAILY), and
 *     their mails are sent as plain text only (HTML flattened, links shown as
 *     visible URLs), with the display name forced to "<tenant> via Trackbliss"
 *     and a fixed sender footer (_shared/platform-mail-policy.ts). Rollback
 *     switch: PLATFORM_FREE_HTML_POLICY=allow.
 *
 * ROLLOUT ORDER (mandatory, docs/releases/golive-20261001-mail-rollout.md):
 *   1. migration 20261001d (claim_rh_notification, tenant_mail_tier,
 *      rate_limit_hit) — without it every call 500s 'claim_failed' and the
 *      row stays 'pending',
 *   2. vault 'service_role_jwt' == SUPABASE_SERVICE_ROLE_KEY check, then deploy
 *      this function TOGETHER with notify-dispatch,
 *   3. then the frontend.
 *
 * Deployment: verify_jwt = true (see supabase/config.toml)
 *   node scripts/deploy-edge-function.mjs send-email
 *
 * Required Supabase Secrets:
 *   - SMTP_HOST              e.g. w0208d95.kasserver.com
 *   - SMTP_PORT              465 (implicit TLS) or 587 (STARTTLS)
 *   - SMTP_USER              mailbox username (e.g. m07cc7ff)
 *   - SMTP_PASS              mailbox password
 *   - SMTP_FROM              default sender address, e.g. noreply@trackbliss.eu
 *   - SUPABASE_URL           (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { logToCentralLog } from '../_shared/mail-hub.ts';
import { isServiceRoleRequest } from '../_shared/service-auth.ts';
import { enforceRateLimits } from '../_shared/rate-limit.ts';
import { freeTierPlainBody, platformDisplayName } from '../_shared/platform-mail-policy.ts';

/** Platform-sender (noreply@trackbliss.eu) budget per non-paying tenant. */
const PLATFORM_FREE_HOURLY = 60;
const PLATFORM_FREE_DAILY = 300;

function intEnv(name: string, fallback: number): number {
  const n = parseInt(Deno.env.get(name) || '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * EF-07: ceiling for ALL non-paying tenants combined on the platform sender,
 * so mass sign-ups cannot multiply the per-tenant budget.
 */
const PLATFORM_FREE_GLOBAL_HOURLY = intEnv('PLATFORM_FREE_GLOBAL_HOURLY', 600);
const PLATFORM_FREE_GLOBAL_DAILY = intEnv('PLATFORM_FREE_GLOBAL_DAILY', 3000);
/** 'plaintext' (default) or 'allow' (rollback: send free-tier HTML unchanged). */
const PLATFORM_FREE_HTML_POLICY = (Deno.env.get('PLATFORM_FREE_HTML_POLICY') || 'plaintext').toLowerCase();

const SMTP_HOST = Deno.env.get('SMTP_HOST') || '';
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465', 10);
const SMTP_USER = Deno.env.get('SMTP_USER') || '';
const SMTP_PASS = Deno.env.get('SMTP_PASS') || '';
const SMTP_FROM = Deno.env.get('SMTP_FROM') || 'noreply@trackbliss.eu';
const DEFAULT_FROM_NAME = 'Trackbliss';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Port 465 → implicit TLS. Anything else (e.g. 587) → STARTTLS.
const useTls = SMTP_PORT === 465;

function wrapPlainTextAsHtml(body: string, senderName: string): string {
  const escapedBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="border-bottom: 2px solid #3B82F6; padding-bottom: 16px; margin-bottom: 24px;">
    ${senderName ? `<strong style="font-size: 18px;">${senderName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong>` : ''}
  </div>
  <div style="line-height: 1.6;">
    ${escapedBody}
  </div>
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
    This is an automated message. Please do not reply directly to this email.
  </div>
</body>
</html>`;
}

async function markFailed(id: string, existingMetadata: Record<string, unknown> | null | undefined, error: string) {
  await supabase
    .from('rh_notifications')
    .update({ status: 'failed', metadata: { ...(existingMetadata || {}), error } })
    .eq('id', id);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!isServiceRoleRequest(req)) return json({ error: 'Forbidden' }, 403);

  try {
    const payload = await req.json().catch(() => null);

    // Only the id is taken from the request. `record.id` is still accepted so
    // an older notify-dispatch deployment keeps working during rollout, but
    // every other field of a posted record is ignored.
    const notificationId = String(payload?.notificationId ?? payload?.record?.id ?? '');
    if (!UUID_RE.test(notificationId)) {
      return json({ error: 'notificationId required' }, 400);
    }

    const { data: claimed, error: claimError } = await supabase
      .rpc('claim_rh_notification', { p_id: notificationId, p_stage: 'smtp' });
    if (claimError) {
      console.error('send-email claim failed:', claimError.message);
      return json({ error: 'claim_failed' }, 500);
    }
    const record = Array.isArray(claimed) ? claimed[0] : claimed;
    // Not pending, unknown id, or already claimed by another run.
    if (!record) return json({ skipped: true });

    if (record.channel !== 'email') {
      return json({ skipped: true });
    }

    const recipientEmail = record.recipient_email;
    if (!recipientEmail) {
      await markFailed(record.id, record.metadata, 'No recipient email');
      return json({ error: 'No recipient email' });
    }

    // Safety net for the rollout order: a render='server' row (queued by
    // public_enqueue_notification) has no subject/content until the NEW
    // notify-dispatch renders it. Never send such a row (or any empty mail)
    // as "Notification" with an empty body.
    if (!String(record.content || '').trim()) {
      const reason = record.metadata?.render === 'server' ? 'unrendered_server_row' : 'empty_content';
      await markFailed(record.id, record.metadata, reason);
      return json({ skipped: true, reason });
    }

    // We defer the "is SMTP configured" check until after potential per-tenant
    // override resolution, so tenants with their own SMTP can still send even
    // if platform SMTP secrets are not set.

    // Display name only: strip header-breaking characters (CR/LF, quotes, <>).
    const rawSenderName = typeof record.metadata?.senderName === 'string' ? record.metadata.senderName : '';
    const senderName = rawSenderName.replace(/[\r\n"<>]/g, ' ').trim().slice(0, 100) || DEFAULT_FROM_NAME;
    const isHtml = record.metadata?.isHtml === true;

    // Phase 6: Per-tenant SMTP override
    // If the notification's tenant has a custom SMTP config with enabled=true,
    // use those credentials. Otherwise fall back to the platform SMTP.
    let tenantSmtp: {
      host: string; port: number; username: string; password: string;
      from_address: string; from_name: string | null; use_tls: boolean;
    } | null = null;
    if (record.tenant_id) {
      const { data: cfg } = await supabase
        .from('tenant_smtp_config')
        .select('enabled, host, port, username, password_encrypted, from_address, from_name, use_tls')
        .eq('tenant_id', record.tenant_id)
        .eq('enabled', true)
        .maybeSingle();
      const complete = !!cfg && [cfg.host, cfg.username, cfg.password_encrypted, cfg.from_address]
        .every((v) => typeof v === 'string' && v.trim() !== '');
      if (cfg && !complete) {
        // Enabled but incomplete tenant SMTP: the tenant asked for its own
        // mailbox. Never silently fall back to the platform sender
        // (noreply@trackbliss.eu) — that was a free-tier cap bypass.
        await markFailed(record.id, record.metadata, 'tenant_smtp_incomplete');
        return json({ error: 'tenant_smtp_incomplete' });
      }
      if (cfg && complete) {
        tenantSmtp = {
          host: cfg.host,
          port: cfg.port || 465,
          username: cfg.username,
          password: cfg.password_encrypted,
          from_address: cfg.from_address,
          from_name: cfg.from_name,
          use_tls: cfg.use_tls !== false,
        };
      }
    }

    // Platform-sender quota for non-paying tenants, enforced at SEND time:
    // insert-time caps can be raced (complete SMTP config while queueing →
    // blank it before delivery), this cannot. Generous enough for portal
    // confirmations and cron mails of a small free tenant.
    // Free tenant on the platform sender: restricted presentation (EF-07).
    let freePlatform: { tenantName: string } | null = null;
    if (!tenantSmtp && record.tenant_id) {
      const { data: tier, error: tierError } = await supabase
        .rpc('tenant_mail_tier', { p_tenant_id: record.tenant_id });
      if (tierError) console.error('send-email tenant_mail_tier failed:', tierError.message);
      if (tier !== 'paid') {
        // Fail open on counter errors: the insert-time guard still applies and
        // a transient DB error must not drop a customer's mail. Per-tenant
        // buckets first, so a tenant over its own quota does not use up the
        // shared global budget.
        const verdict = await enforceRateLimits(supabase, [
          { bucket: `smtp:platform:h:${record.tenant_id}`, limit: PLATFORM_FREE_HOURLY, windowSeconds: 3600 },
          { bucket: `smtp:platform:d:${record.tenant_id}`, limit: PLATFORM_FREE_DAILY, windowSeconds: 86400 },
          { bucket: 'smtp:platform:free:global:h', limit: PLATFORM_FREE_GLOBAL_HOURLY, windowSeconds: 3600 },
          { bucket: 'smtp:platform:free:global:d', limit: PLATFORM_FREE_GLOBAL_DAILY, windowSeconds: 86400 },
        ], { failOpen: true });
        if (!verdict.allowed) {
          const reason = verdict.exceeded?.startsWith('smtp:platform:free:global')
            ? 'platform_global_quota_exceeded'
            : 'platform_quota_exceeded';
          if (reason === 'platform_global_quota_exceeded') {
            console.error('send-email: global free-tier platform ceiling reached');
          }
          await markFailed(record.id, record.metadata, reason);
          return json({ error: reason });
        }
        if (PLATFORM_FREE_HTML_POLICY !== 'allow') {
          const { data: tenantRow } = await supabase
            .from('tenants')
            .select('name')
            .eq('id', record.tenant_id)
            .maybeSingle();
          freePlatform = { tenantName: typeof tenantRow?.name === 'string' ? tenantRow.name : '' };
        }
      }
    }

    const effectiveHost = tenantSmtp?.host || SMTP_HOST;
    const effectivePort = tenantSmtp?.port ?? SMTP_PORT;
    const effectiveUser = tenantSmtp?.username || SMTP_USER;
    const effectivePass = tenantSmtp?.password || SMTP_PASS;
    const effectiveFromAddress = tenantSmtp?.from_address || SMTP_FROM;
    // Free tier on the platform sender: the display name is not tenant-chosen.
    const effectiveFromName = freePlatform
      ? platformDisplayName(freePlatform.tenantName)
      : (tenantSmtp?.from_name || senderName).replace(/[\r\n"<>]/g, ' ').trim();
    const effectiveUseTls = tenantSmtp?.use_tls ?? useTls;

    if (!effectiveHost || !effectiveUser || !effectivePass) {
      await markFailed(record.id, record.metadata, 'SMTP credentials not configured (platform default is empty and tenant has no custom config)');
      return json({ error: 'SMTP credentials not configured' });
    }

    const fromAddress = effectiveFromName
      ? `${effectiveFromName} <${effectiveFromAddress}>`
      : effectiveFromAddress;
    // Free tier on the platform sender: never deliver tenant-authored HTML.
    const htmlBody = freePlatform
      ? wrapPlainTextAsHtml(
        freeTierPlainBody(String(record.content || ''), isHtml, freePlatform.tenantName, String(record.metadata?.locale || '')),
        effectiveFromName,
      )
      : isHtml ? record.content : wrapPlainTextAsHtml(record.content || '', effectiveFromName);

    // One short-lived SMTP connection per message.
    const client = new SMTPClient({
      connection: {
        hostname: effectiveHost,
        port: effectivePort,
        tls: effectiveUseTls,
        auth: {
          username: effectiveUser,
          password: effectivePass,
        },
      },
    });

    let sendError: string | null = null;
    try {
      await client.send({
        from: fromAddress,
        to: recipientEmail,
        subject: String(record.subject || 'Notification').replace(/[\r\n]+/g, ' '),
        html: htmlBody,
      });
    } catch (sendErr) {
      sendError = sendErr instanceof Error ? sendErr.message : String(sendErr);
      console.error('SMTP send error:', sendError);
    }

    try { await client.close(); } catch { /* ignore close error */ }

    // Fire-and-forget central log to Family-Joy email_send_log so every
    // Returns-Hub / transactional mail sent via this fallback path is
    // visible in the central Email Center.
    logToCentralLog({
      triggerEvent: String(record.metadata?.eventType || record.metadata?.event_type || 'rh.notification'),
      recipientEmail,
      status: sendError ? 'failed' : 'sent',
      source: 'trackbliss-send-email',
      sourceEventId: String(record.id),
      recipientType: 'customer',
      userType: 'shop',
      language: String(record.metadata?.locale || 'en'),
      subject: record.subject || 'Notification',
      fromAddress: effectiveFromAddress,
      htmlBody,
      previewText: record.subject || '',
      errorMessage: sendError,
      meta: {
        tenant_id: record.tenant_id ?? null,
        channel: record.channel ?? 'email',
        notification_id: record.id,
        used_tenant_smtp: !!tenantSmtp,
        free_platform_plaintext: !!freePlatform,
      },
    }).catch(() => { /* never propagate logging errors */ });

    if (sendError) {
      await markFailed(record.id, record.metadata, sendError);
      return json({ error: 'smtp_send_failed' });
    }

    await supabase
      .from('rh_notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', record.id);

    return json({ success: true });
  } catch (err) {
    console.error('send-email error:', err);
    return json({ error: 'internal_error' }, 500);
  }
});
