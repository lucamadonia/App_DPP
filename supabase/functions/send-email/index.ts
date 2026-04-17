/**
 * Supabase Edge Function: send-email
 *
 * Sends emails via SMTP (all-inkl mailbox). Can be triggered by:
 * 1. Database Webhook on INSERT into rh_notifications (payload.record)
 * 2. Direct invocation from client via supabase.functions.invoke (payload.record)
 *
 * Deployment:
 *   supabase functions deploy send-email --no-verify-jwt
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
    ${senderName ? `<strong style="font-size: 18px;">${senderName}</strong>` : ''}
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

Deno.serve(async (req) => {
  try {
    const payload = await req.json();

    // Support both webhook format (payload.record) and direct invocation
    const record = payload?.record ?? payload;
    if (!record || !record.id) {
      return new Response(JSON.stringify({ error: 'No valid record in payload' }), { status: 400 });
    }

    // Only process email notifications that are pending
    if (record.channel !== 'email' || record.status !== 'pending') {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const recipientEmail = record.recipient_email;
    if (!recipientEmail) {
      await markFailed(record.id, record.metadata, 'No recipient email');
      return new Response(JSON.stringify({ error: 'No recipient email' }), { status: 200 });
    }

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
      await markFailed(record.id, record.metadata, 'SMTP credentials not configured');
      return new Response(JSON.stringify({ error: 'SMTP credentials not configured' }), { status: 200 });
    }

    const senderName = (record.metadata?.senderName as string | undefined) || DEFAULT_FROM_NAME;
    const isHtml = record.metadata?.isHtml === true;
    const fromAddress = senderName ? `${senderName} <${SMTP_FROM}>` : SMTP_FROM;
    const htmlBody = isHtml ? record.content : wrapPlainTextAsHtml(record.content || '', senderName);

    // One short-lived SMTP connection per message. The Edge Function is
    // invocation-scoped so keeping a pool across invocations is not useful.
    const client = new SMTPClient({
      connection: {
        hostname: SMTP_HOST,
        port: SMTP_PORT,
        tls: useTls,
        auth: {
          username: SMTP_USER,
          password: SMTP_PASS,
        },
      },
    });

    try {
      await client.send({
        from: fromAddress,
        to: recipientEmail,
        subject: record.subject || 'Notification',
        html: htmlBody,
      });
    } catch (sendErr) {
      try { await client.close(); } catch { /* ignore close error */ }
      const errorMsg = sendErr instanceof Error ? sendErr.message : String(sendErr);
      console.error('SMTP send error:', errorMsg);
      await markFailed(record.id, record.metadata, errorMsg);
      return new Response(JSON.stringify({ error: errorMsg }), { status: 200 });
    }

    try { await client.close(); } catch { /* ignore close error */ }

    await supabase
      .from('rh_notifications')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', record.id);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
