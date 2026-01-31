/**
 * Supabase Edge Function: send-email
 *
 * Triggered by a Database Webhook on INSERT into rh_notifications
 * where channel='email' and status='pending'.
 *
 * Sends the email via Resend API and updates the notification status.
 *
 * Deployment:
 *   supabase functions deploy send-email --no-verify-jwt
 *
 * Required Supabase Secrets:
 *   - RESEND_API_KEY
 *   - SUPABASE_URL (automatic)
 *   - SUPABASE_SERVICE_ROLE_KEY (automatic)
 *
 * Database Webhook Configuration (Supabase Dashboard):
 *   Table: rh_notifications
 *   Events: INSERT
 *   Target: Edge Function "send-email"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function wrapHtml(body: string, senderName: string): string {
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

    // The webhook payload contains the new row in `record`
    const record = payload?.record;
    if (!record) {
      return new Response(JSON.stringify({ error: 'No record in payload' }), { status: 400 });
    }

    // Only process email notifications that are pending
    if (record.channel !== 'email' || record.status !== 'pending') {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const recipientEmail = record.recipient_email;
    if (!recipientEmail) {
      // Mark as failed - no recipient
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
    const fromEmail = `${senderName || 'Returns Hub'} <noreply@resend.dev>`;

    const htmlBody = wrapHtml(record.content || '', senderName);

    // Send email via Resend API
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: record.subject || 'Notification',
        html: htmlBody,
      }),
    });

    if (resendRes.ok) {
      // Mark as sent
      await supabase
        .from('rh_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', record.id);

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      const errorBody = await resendRes.text();
      // Mark as failed
      await supabase
        .from('rh_notifications')
        .update({ status: 'failed', metadata: { ...record.metadata, error: errorBody } })
        .eq('id', record.id);

      return new Response(JSON.stringify({ error: errorBody }), { status: 200 });
    }
  } catch (err) {
    console.error('send-email error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
