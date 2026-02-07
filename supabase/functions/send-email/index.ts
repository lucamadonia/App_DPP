/**
 * Supabase Edge Function: send-email
 *
 * Sends emails via Resend HTTP API. Can be triggered by:
 * 1. Database Webhook on INSERT into rh_notifications (payload.record)
 * 2. Direct invocation from client via supabase.functions.invoke (payload.record)
 *
 * Deployment:
 *   supabase functions deploy send-email --no-verify-jwt
 *
 * Required Supabase Secrets:
 *   - RESEND_API_KEY
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const DEFAULT_FROM = 'Trackbliss <noreply@trackbliss.eu>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      await supabase
        .from('rh_notifications')
        .update({ status: 'failed', metadata: { ...record.metadata, error: 'No recipient email' } })
        .eq('id', record.id);
      return new Response(JSON.stringify({ error: 'No recipient email' }), { status: 200 });
    }

    if (!RESEND_API_KEY) {
      await supabase
        .from('rh_notifications')
        .update({ status: 'failed', metadata: { ...record.metadata, error: 'RESEND_API_KEY not configured' } })
        .eq('id', record.id);
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), { status: 200 });
    }

    const senderName = record.metadata?.senderName || '';
    const isHtml = record.metadata?.isHtml === true;
    const fromAddress = senderName ? `${senderName} <noreply@trackbliss.eu>` : DEFAULT_FROM;

    // If content is already HTML (from email editor), use directly; otherwise wrap plain text
    const htmlBody = isHtml ? record.content : wrapPlainTextAsHtml(record.content || '', senderName);

    // Send email via Resend HTTP API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [recipientEmail],
        subject: record.subject || 'Notification',
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json();

    if (resendRes.ok) {
      // Mark as sent
      await supabase
        .from('rh_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', record.id);

      return new Response(JSON.stringify({ success: true, resendId: resendData.id }), { status: 200 });
    } else {
      const errorMsg = resendData.message || resendData.error || JSON.stringify(resendData);
      console.error('Resend API error:', errorMsg);

      await supabase
        .from('rh_notifications')
        .update({ status: 'failed', metadata: { ...record.metadata, error: errorMsg } })
        .eq('id', record.id);

      return new Response(JSON.stringify({ error: errorMsg }), { status: 200 });
    }
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
