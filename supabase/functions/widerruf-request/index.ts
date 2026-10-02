/**
 * Supabase Edge Function: widerruf-request
 *
 * Public, login-free endpoint backing the §356a BGB "Widerrufsbutton"
 * (electronic right-of-withdrawal function, mandatory from 2026-06-19).
 *
 * The customer enters email + order number (+ name) on the public Widerruf
 * page and confirms ("Widerruf bestätigen"). This function — server-side, so
 * the receipt timestamp is authoritative and the routing cannot be tampered
 * with from the client — does, in order:
 *
 *   1. Resolve tenant, stamp the server receipt time.
 *   2. Look up the order (commerce_orders) and check email + withdrawal window.
 *   3. ALWAYS record the declaration:
 *        - valid case   → rh_returns (reason_category='widerruf')
 *        - uncertain/old → rh_tickets (manual review) — written with the
 *          service role, so the Professional-tier gate on the client-side
 *          createRhTicket() does NOT block a legally-required acknowledgement.
 *   4. ALWAYS send the acknowledgement-of-receipt email
 *      (trigger_event='widerruf_eingang_bestaetigt') by POSTing the event to
 *      the Family-Joy mail hub (HMAC). No renderedHtml is sent, so the hub
 *      renders the central message_templates template with the context vars.
 *
 * COMPLIANCE: the validity window NEVER blocks submission. An expired window,
 * unknown order or mismatched email all still produce a recorded declaration
 * plus the timestamped receipt — they only change WHERE the case lands for the
 * operator (normal return queue vs. a manual-review ticket).
 *
 * ABUSE PROTECTION (go-live hardening SEC-09/SRE-06): persistent rate limits
 * per IP, per email and per tenant (rate_limit_counters) that apply ONLY to
 * unverified declarations (manual-review tickets); optional Cloudflare
 * Turnstile (enforced once TURNSTILE_SECRET_KEY is set; the page must then send
 * `captcha_token`); the receipt mail at most once per tenant+email+order per
 * day; and a sanitised name in the mail context. A verified declaration (order
 * found, email matches, inside the window) is never throttled, so nobody can
 * exhaust shared buckets to block genuine § 356a withdrawals.
 *
 * Required Edge Function Secrets:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  — auto
 *   MAIL_HUB_URL                             — Family-Joy mail-event-receiver URL
 *   MAIL_HUB_SECRET                          — same value as Family-Joy MAIL_EVENT_RECEIVER_SECRET
 *   TURNSTILE_SECRET_KEY (optional)          — enables the captcha check
 *
 * Deploy with verify_jwt = false (public, login-free; see supabase/config.toml).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  enforceRateLimits,
  getClientIp,
  hashKey,
  rateLimitedResponse,
  verifyTurnstile,
} from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
};

const ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Conservative grace windows — the check only ROUTES (valid case vs. manual
// review), it never rejects. Generous thresholds keep genuine withdrawals on
// the normal path; only clearly-old orders go to manual review.
const FULFILLED_GRACE_DAYS = 30; // 14-day window + shipping/handling buffer
const PLACED_GRACE_DAYS = 45;    // fallback when the order was never fulfilled
const DAY_MS = 24 * 60 * 60 * 1000;

function luhnCheckDigit(input: string): number {
  const digits = input.split('').map((c) => {
    const code = c.charCodeAt(0);
    if (code >= 48 && code <= 57) return code - 48;
    if (code >= 65 && code <= 90) return code - 55;
    return 0;
  });
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits[i];
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return (10 - (sum % 10)) % 10;
}

function generateNumber(prefix: string): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  let random = '';
  for (let i = 0; i < 4; i++) {
    random += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return `${prefix}-${date}-${random}${luhnCheckDigit(random)}`;
}

function formatReceiptTime(d: Date, lang: 'de' | 'en'): string {
  try {
    if (lang === 'de') {
      const parts = new Intl.DateTimeFormat('de-DE', {
        timeZone: 'Europe/Berlin',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }).format(d);
      return `${parts} Uhr`;
    }
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Berlin',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

/**
 * Keep letters, spaces, dots, apostrophes and hyphens only (max 60 chars), and
 * drop anything that looks like a URL or domain, so the name in the receipt
 * mail cannot carry links or markup.
 */
function sanitizeName(raw: string): string {
  const noUrls = raw.replace(/(https?:\/\/|www\.)\S*/gi, ' ').replace(/\S+\.[a-z]{2,}\S*/gi, ' ');
  return noUrls
    .replace(/[^\p{L} .'-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);
}

async function hmacHex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  let body: {
    order_number?: string;
    email?: string;
    name?: string;
    tenant_slug?: string;
    lang?: string;
    captcha_token?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const orderNumber = String(body.order_number || '').trim().replace(/^#/, '').replace(/[^a-zA-Z0-9-_]/g, '').slice(0, 64);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 254);
  const declaredName = sanitizeName(String(body.name || ''));
  const tenantSlug = (body.tenant_slug || '').trim().replace(/[^a-zA-Z0-9-_]/g, '');
  const lang: 'de' | 'en' = (body.lang || 'de').toLowerCase().startsWith('de') ? 'de' : 'en';

  if (!orderNumber || !email || !tenantSlug) {
    return jsonResponse({
      error: 'Missing required fields',
      required: ['order_number', 'email', 'tenant_slug'],
    }, 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ error: 'Invalid email format' }, 400);
  }

  const clientIp = getClientIp(req);
  const captcha = await verifyTurnstile(body.captcha_token, clientIp);
  if (captcha === 'failed') {
    return jsonResponse({ error: 'captcha_failed' }, 403);
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Resolve tenant + authoritative server receipt time
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, slug, name, settings')
      .eq('slug', tenantSlug)
      .single();
    if (!tenant) return jsonResponse({ success: false, message: 'Tenant not found' }, 404);

    const receivedAt = new Date();
    const receivedAtIso = receivedAt.toISOString();
    const receivedAtLabel = formatReceiptTime(receivedAt, lang);

    // 2. Look up the order (best-effort) and assess the withdrawal window.
    const { data: order } = await supabase
      .from('commerce_orders')
      .select('id, external_order_number, customer_email, customer_name, placed_at, fulfilled_at, total_amount, currency')
      .eq('tenant_id', tenant.id)
      .or(`external_order_number.eq.${orderNumber},external_order_number.eq.#${orderNumber}`)
      .maybeSingle();

    const orderFound = !!order;
    const emailMatches = orderFound && (order!.customer_email || '').toLowerCase() === email;

    let outsideWindow = false;
    if (orderFound) {
      const now = receivedAt.getTime();
      if (order!.fulfilled_at) {
        outsideWindow = now - new Date(order!.fulfilled_at).getTime() > FULFILLED_GRACE_DAYS * DAY_MS;
      } else if (order!.placed_at) {
        outsideWindow = now - new Date(order!.placed_at).getTime() > PLACED_GRACE_DAYS * DAY_MS;
      }
    }

    const isValidCase = orderFound && emailMatches && !outsideWindow;

    const orderName = (order?.customer_name || '').trim();
    const firstName = (declaredName || orderName).split(' ')[0] || '';

    // 3. Throttling — ONLY for unverified declarations (manual-review tickets).
    //    A verified case (order found, email matches, inside the window) is
    //    never throttled: shared buckets (tenant / spoofable IP / a victim's
    //    email) could otherwise be pre-exhausted by an attacker to take the
    //    legally required § 356a button offline. Only the real customer knows
    //    a matching order number + email, so verified cases cannot be flooded
    //    anonymously; their receipt mail is still deduplicated per day below.
    //    Buckets are evaluated in order and stop at the first rejection, so the
    //    shared tenant bucket only counts requests that passed IP + email.
    //    Fails open (legally required flow): a counter outage never blocks.
    if (!isValidCase) {
      const limit = await enforceRateLimits(supabase, [
        { bucket: `widerruf:ip:${await hashKey(clientIp)}`, limit: 10, windowSeconds: 3600 },
        { bucket: `widerruf:email:${await hashKey(email)}`, limit: 3, windowSeconds: 3600 },
        { bucket: `widerruf:tenant:${tenant.id}`, limit: 200, windowSeconds: 3600 },
      ], { failOpen: true });
      if (!limit.allowed) {
        return rateLimitedResponse(limit.retryAfterSeconds, corsHeaders);
      }
    }

    // 4. Find or create the customer record (so case/ticket links to a contact).
    //    Runs after the throttle, so floods cannot spam rh_customers.
    let customerId: string | null = null;
    {
      const { data: existingCustomer } = await supabase
        .from('rh_customers')
        .select('id')
        .eq('tenant_id', tenant.id)
        .ilike('email', email)
        .maybeSingle();
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const nameParts = (declaredName || orderName).split(' ');
        const { data: newCustomer } = await supabase
          .from('rh_customers')
          .insert({
            tenant_id: tenant.id,
            email,
            first_name: nameParts[0] || null,
            last_name: nameParts.slice(1).join(' ') || null,
          })
          .select('id')
          .maybeSingle();
        customerId = newCustomer?.id ?? null;
      }
    }

    // 5. Record the declaration — valid → return case, else → ticket.
    let reference = '';
    let outcome: 'recorded' | 'manual_review' = 'recorded';

    const auditMeta = {
      source: 'widerruf_button',
      channel: 'widerruf',
      withdrawal_received_at: receivedAtIso,
      email,
      declared_name: declaredName || orderName || null,
      order_number: orderNumber,
    };

    if (isValidCase) {
      const returnNumber = generateNumber('RET');
      const { data: newReturn, error: returnError } = await supabase
        .from('rh_returns')
        .insert({
          tenant_id: tenant.id,
          return_number: returnNumber,
          status: 'PENDING_APPROVAL',
          customer_id: customerId,
          order_id: order!.external_order_number,
          reason_category: 'widerruf',
          reason_text: 'Widerruf gemäß § 356a BGB (Widerrufsbutton)',
          desired_solution: 'refund',
          priority: 'normal',
          metadata: auditMeta,
        })
        .select('id, return_number')
        .single();

      if (returnError || !newReturn) {
        console.error('[widerruf-request] return insert failed:', returnError);
        return jsonResponse({ error: 'Failed to record withdrawal' }, 500);
      }
      reference = newReturn.return_number;

      // Copy order line items into the return (best-effort, non-fatal).
      const { data: orderItems } = await supabase
        .from('commerce_order_items')
        .select('title, variant_title, sku, gtin, quantity, unit_price, total_price')
        .eq('order_id', order!.id)
        .limit(50);
      if (orderItems && orderItems.length > 0) {
        // deno-lint-ignore no-explicit-any
        const items = orderItems.map((i: any) => ({
          tenant_id: tenant.id,
          return_id: newReturn.id,
          product_name: i.title,
          variant_title: i.variant_title,
          sku: i.sku,
          gtin: i.gtin,
          quantity: i.quantity,
          unit_price: i.unit_price,
          refund_amount: i.total_price,
          condition: 'used',
        }));
        await supabase.from('rh_return_items').insert(items);
      }

      await supabase.from('rh_return_timeline').insert({
        tenant_id: tenant.id,
        return_id: newReturn.id,
        status: 'PENDING_APPROVAL',
        comment: `Widerruf über Widerrufsbutton (§ 356a BGB) erklärt am ${receivedAtLabel}.`,
        actor_type: 'customer',
      });
    } else {
      outcome = 'manual_review';
      const ticketNumber = generateNumber('WDR');
      const reason = !orderFound ? 'order_not_found' : !emailMatches ? 'email_mismatch' : 'window_expired';
      const { data: newTicket, error: ticketError } = await supabase
        .from('rh_tickets')
        .insert({
          tenant_id: tenant.id,
          ticket_number: ticketNumber,
          customer_id: customerId,
          category: 'widerruf',
          priority: 'high',
          status: 'open',
          subject: `Widerruf – manuelle Prüfung: Bestellung #${orderNumber}`,
          metadata: { ...auditMeta, review_reason: reason },
        })
        .select('id, ticket_number')
        .single();

      if (ticketError || !newTicket) {
        console.error('[widerruf-request] ticket insert failed:', ticketError);
        return jsonResponse({ error: 'Failed to record withdrawal' }, 500);
      }
      reference = newTicket.ticket_number;
    }

    // 6. Send the §356a acknowledgement-of-receipt email via the hub.
    //    No renderedHtml → the hub renders message_templates by trigger_event.
    const mailHubUrl = Deno.env.get('MAIL_HUB_URL') || '';
    const mailHubSecret = Deno.env.get('MAIL_HUB_SECRET') || '';
    // One receipt per tenant + email + order per day: repeated submissions of
    // the same declaration are still recorded above, but do not mail-bomb.
    const receiptGate = await enforceRateLimits(supabase, [
      { bucket: `widerruf:receipt:${await hashKey(`${tenant.id}|${email}|${orderNumber}`)}`, limit: 1, windowSeconds: 86400 },
    ], { failOpen: true });
    if (!receiptGate.allowed) {
      console.log(`[widerruf-request] receipt already sent today for ${reference} — skipping duplicate mail`);
    } else if (mailHubUrl && mailHubSecret) {
      const mailBody = JSON.stringify({
        eventType: 'widerruf_eingang_bestaetigt',
        source: 'trackbliss',
        sourceEventId: `trackbliss:widerruf:${reference}`,
        recipientEmail: email,
        language: lang,
        userType: 'customer',
        context: {
          customer_first_name: firstName.slice(0, 40),
          order_number: `#${orderNumber}`,
          withdrawal_received_at: receivedAtLabel,
        },
        metadata: { kind: 'widerruf', reference, outcome },
      });
      try {
        const signature = await hmacHex(mailHubSecret, mailBody);
        const res = await fetch(mailHubUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Hook-Signature': signature },
          body: mailBody,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          console.warn(`[widerruf-request] mail hub ${res.status}: ${text.slice(0, 200)}`);
        }
      } catch (err) {
        // Mail failure must NOT fail the withdrawal — it is already recorded.
        console.error('[widerruf-request] mail hub fetch failed:', err);
      }
    } else {
      console.warn('[widerruf-request] MAIL_HUB_URL/SECRET missing — receipt email skipped');
    }

    return jsonResponse({
      success: true,
      outcome,
      reference,
      received_at: receivedAtIso,
      received_at_label: receivedAtLabel,
    });
  } catch (err) {
    console.error('[widerruf-request] unexpected error:', err);
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
