/**
 * Supabase Edge Function: auth-email-hook
 *
 * Replaces Supabase's built-in Auth email sender. Supabase POSTs here
 * for every auth event (signup confirm, invite, magic link, recovery,
 * email change, reauthentication). We detect the user's preferred
 * locale from `user_metadata.locale`, pick the matching HTML template
 * (en / de / el), substitute Go-style variables, and send via SMTP
 * (all-inkl via denomailer).
 *
 * Register in Supabase Dashboard:
 *   Authentication → Hooks → Send Email Hook (HTTP)
 *     URL:    https://<project>.supabase.co/functions/v1/auth-email-hook
 *     Secret: generated in the dashboard, copy into SEND_EMAIL_HOOK_SECRET
 *
 * Required Supabase Secrets:
 *   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM  (same as send-email)
 *   - SEND_EMAIL_HOOK_SECRET  (from the dashboard, format: v1,whsec_...)
 *   - SUPABASE_URL  (automatic)
 *
 * Deployment:
 *   supabase functions deploy auth-email-hook --no-verify-jwt
 *
 * --no-verify-jwt is required because Supabase calls this hook without
 * a JWT; webhook signature validation is our auth instead.
 */

import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

// ─── Config ──────────────────────────────────────────────────

const SMTP_HOST = Deno.env.get('SMTP_HOST') || '';
const SMTP_PORT = parseInt(Deno.env.get('SMTP_PORT') || '465', 10);
const SMTP_USER = Deno.env.get('SMTP_USER') || '';
const SMTP_PASS = Deno.env.get('SMTP_PASS') || '';
const SMTP_FROM = Deno.env.get('SMTP_FROM') || 'noreply@trackbliss.eu';
const SEND_EMAIL_HOOK_SECRET = Deno.env.get('SEND_EMAIL_HOOK_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';

const DEFAULT_FROM_NAME = 'Trackbliss';
const SUPPORTED_LOCALES = ['en', 'de', 'el'] as const;
type Locale = typeof SUPPORTED_LOCALES[number];

// ─── Template mapping ────────────────────────────────────────

type EmailActionType =
  | 'signup'
  | 'invite'
  | 'magiclink'
  | 'recovery'
  | 'email_change'
  | 'email_change_new'
  | 'email_change_current'
  | 'reauthentication';

// Supabase uses `email_change_current` / `email_change_new` in newer
// versions. Fold both to the same template.
const TEMPLATE_NAME: Record<EmailActionType, string> = {
  signup: 'confirmation',
  invite: 'invite',
  magiclink: 'magic-link',
  recovery: 'recovery',
  email_change: 'email-change',
  email_change_current: 'email-change',
  email_change_new: 'email-change',
  reauthentication: 'reauthentication',
};

const SUBJECTS: Record<Locale, Record<EmailActionType, string>> = {
  en: {
    signup: 'Confirm your email address',
    invite: "You've been invited to Trackbliss",
    magiclink: 'Your sign-in link for Trackbliss',
    recovery: 'Reset your password',
    email_change: 'Confirm your new email address',
    email_change_current: 'Confirm your new email address',
    email_change_new: 'Confirm your new email address',
    reauthentication: 'Your security code: {{ .Token }}',
  },
  de: {
    signup: 'Bestätigen Sie Ihre E-Mail-Adresse',
    invite: 'Sie wurden zu Trackbliss eingeladen',
    magiclink: 'Ihr Anmelde-Link für Trackbliss',
    recovery: 'Passwort zurücksetzen',
    email_change: 'Neue E-Mail-Adresse bestätigen',
    email_change_current: 'Neue E-Mail-Adresse bestätigen',
    email_change_new: 'Neue E-Mail-Adresse bestätigen',
    reauthentication: 'Ihr Sicherheitscode: {{ .Token }}',
  },
  el: {
    signup: 'Επιβεβαίωση διεύθυνσης email',
    invite: 'Προσκληθήκατε στο Trackbliss',
    magiclink: 'Ο σύνδεσμος σύνδεσης για το Trackbliss',
    recovery: 'Επαναφορά κωδικού',
    email_change: 'Επιβεβαίωση νέας διεύθυνσης email',
    email_change_current: 'Επιβεβαίωση νέας διεύθυνσης email',
    email_change_new: 'Επιβεβαίωση νέας διεύθυνσης email',
    reauthentication: 'Ο κωδικός ασφαλείας: {{ .Token }}',
  },
};

// ─── Helpers ─────────────────────────────────────────────────

function detectLocale(metadata: Record<string, unknown> | null | undefined): Locale {
  const raw = String(
    metadata?.locale ??
    metadata?.lang ??
    metadata?.language ??
    metadata?.preferred_language ??
    ''
  );
  const short = raw.slice(0, 2).toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(short)
    ? (short as Locale)
    : 'en';
}

function substitute(template: string, data: Record<string, string>): string {
  // Replaces both `{{ .Foo }}` and `{{.Foo}}` (any whitespace)
  return template.replace(/\{\{\s*\.(\w+)\s*\}\}/g, (_, key) => data[key] ?? '');
}

async function loadTemplate(locale: Locale, name: string): Promise<string> {
  const url = new URL(`./templates/${locale}/${name}.html`, import.meta.url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Template not found: ${locale}/${name}.html (${res.status})`);
  }
  return await res.text();
}

function buildConfirmationURL(
  tokenHash: string,
  actionType: string,
  redirectTo: string | undefined,
  siteURL: string,
): string {
  const base = SUPABASE_URL || siteURL;
  const redirect = redirectTo || siteURL;
  return `${base}/auth/v1/verify?token=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(actionType)}&redirect_to=${encodeURIComponent(redirect)}`;
}

// ─── Hook handler ────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });

  // Webhook signature verification (Supabase uses standardwebhooks / Svix-style)
  if (!SEND_EMAIL_HOOK_SECRET) {
    console.error('SEND_EMAIL_HOOK_SECRET not configured');
    return new Response(JSON.stringify({ error: 'Hook secret not configured' }), { status: 500 });
  }

  let payload: {
    user: { email: string; user_metadata?: Record<string, unknown> };
    email_data: {
      token: string;
      token_hash: string;
      redirect_to?: string;
      email_action_type: string;
      site_url: string;
      new_email?: string;
    };
  };

  try {
    const wh = new Webhook(SEND_EMAIL_HOOK_SECRET.replace(/^v1,/, ''));
    payload = wh.verify(rawBody, headers) as typeof payload;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
  }

  const { user, email_data } = payload;
  const { token, token_hash, redirect_to, email_action_type, site_url, new_email } = email_data;

  const templateName = TEMPLATE_NAME[email_action_type as EmailActionType];
  if (!templateName) {
    console.error(`Unknown email_action_type: ${email_action_type}`);
    return new Response(
      JSON.stringify({ error: `Unsupported email_action_type: ${email_action_type}` }),
      { status: 400 },
    );
  }

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.error('SMTP credentials not configured');
    return new Response(JSON.stringify({ error: 'SMTP not configured' }), { status: 500 });
  }

  // Figure out locale + load template
  const locale = detectLocale(user.user_metadata);
  let html: string;
  try {
    html = await loadTemplate(locale, templateName);
  } catch (err) {
    console.error(`Template load failed (${locale}/${templateName}):`, err);
    // Graceful fallback to English if a non-en template is missing
    if (locale !== 'en') {
      try {
        html = await loadTemplate('en', templateName);
      } catch (fallbackErr) {
        return new Response(JSON.stringify({ error: String(fallbackErr) }), { status: 500 });
      }
    } else {
      return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
    }
  }

  const confirmationURL = buildConfirmationURL(token_hash, email_action_type, redirect_to, site_url);
  const vars: Record<string, string> = {
    ConfirmationURL: confirmationURL,
    Token: token || '',
    TokenHash: token_hash || '',
    SiteURL: site_url || '',
    Email: user.email || '',
    NewEmail: new_email || '',
  };

  const renderedHtml = substitute(html, vars);
  const subjectTemplate = SUBJECTS[locale][email_action_type as EmailActionType]
    ?? SUBJECTS.en[email_action_type as EmailActionType]
    ?? 'Trackbliss';
  const subject = substitute(subjectTemplate, vars);

  // Send via SMTP
  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: SMTP_PORT === 465,
      auth: {
        username: SMTP_USER,
        password: SMTP_PASS,
      },
    },
  });

  try {
    await client.send({
      from: `${DEFAULT_FROM_NAME} <${SMTP_FROM}>`,
      to: user.email,
      subject,
      html: renderedHtml,
    });
  } catch (sendErr) {
    try { await client.close(); } catch { /* ignore */ }
    const msg = sendErr instanceof Error ? sendErr.message : String(sendErr);
    console.error('SMTP send failed:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }

  try { await client.close(); } catch { /* ignore */ }

  return new Response(JSON.stringify({ success: true, locale, template: templateName }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
