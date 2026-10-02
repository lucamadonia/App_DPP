/**
 * Platform-sender policy for non-paying tenants (EF-07).
 *
 * Free self-signup tenants can author mail HTML (rh_notifications content,
 * tenant-editable templates) and choose the display name. Sent unchanged from
 * noreply@trackbliss.eu that is a phishing kit with a trusted envelope. For
 * free tenants on the PLATFORM sender, send-email therefore:
 *   - converts any HTML body to plain text (links become visible
 *     "text (url)"), then wraps it in the fixed platform layout,
 *   - forces the display name to "<tenant> via Trackbliss",
 *   - appends a fixed footer naming the sending tenant.
 * Paying tenants and tenants with their own SMTP are not affected.
 *
 * Pure functions, no Deno APIs, so vitest can import this file.
 */

const ENTITY_MAP: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  auml: 'ä',
  ouml: 'ö',
  uuml: 'ü',
  Auml: 'Ä',
  Ouml: 'Ö',
  Uuml: 'Ü',
  szlig: 'ß',
  euro: '€',
  copy: '©',
  ndash: '–',
  mdash: '—',
  hellip: '…',
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      if (!Number.isFinite(n) || n <= 0 || n > 0x10ffff) return '';
      // Drop control characters except tab/newline.
      if (n < 32 && n !== 9 && n !== 10) return '';
      return String.fromCodePoint(n);
    }
    return ENTITY_MAP[code] ?? match;
  });
}

/** Only http(s)/mailto URLs are shown; anything else (javascript:, data:) is dropped. */
function visibleUrl(href: string): string {
  const url = decodeEntities(href).trim();
  return /^(https?:|mailto:)/i.test(url) ? url : '';
}

/**
 * Best-effort HTML → plain text. The output is later HTML-escaped by the
 * plain-text wrapper, so nothing here needs to be safe HTML.
 */
export function htmlToPlainText(html: string): string {
  let s = String(html ?? '');
  // Remove non-content blocks entirely.
  s = s.replace(/<!--[\s\S]*?-->/g, '');
  s = s.replace(/<(head|style|script|title|noscript|template|svg)\b[\s\S]*?<\/\1\s*>/gi, '');
  // Links: keep the text and show the real target.
  s = s.replace(/<a\b[^>]*?\bhref\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a\s*>/gi,
    (_m, _q, d1, d2, d3, inner) => {
      const url = visibleUrl(d1 ?? d2 ?? d3 ?? '');
      const label = String(inner).replace(/<[^>]*>/g, '').trim();
      if (!url) return label;
      if (!label || decodeEntities(label) === url) return ` ${url} `;
      return `${label} (${url})`;
    });
  // Images: alt text only (no remote pixel / brand logo).
  s = s.replace(/<img\b[^>]*?\balt\s*=\s*("([^"]*)"|'([^']*)')[^>]*>/gi, (_m, _q, a1, a2) => (a1 ?? a2 ?? ''));
  // Block-level boundaries → newlines.
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<\/(p|div|tr|h[1-6]|li|table|section|article|header|footer|blockquote)\s*>/gi, '\n');
  s = s.replace(/<li\b[^>]*>/gi, '- ');
  s = s.replace(/<\/t[dh]\s*>/gi, ' ');
  // Strip all remaining tags.
  s = s.replace(/<[^>]*>/g, '');
  s = decodeEntities(s);
  // Normalise whitespace.
  s = s.replace(/\r\n?/g, '\n');
  s = s.replace(/[^\S\n]+/g, ' '); // all whitespace except newlines (incl. NBSP)
  s = s.split('\n').map((line) => line.trim()).join('\n');
  s = s.replace(/\n{3,}/g, '\n\n');
  return s.trim();
}

/** Display-name safe: no header-breaking characters, bounded length. */
export function safeDisplayName(name: string, max = 60): string {
  return String(name ?? '').replace(/[\r\n"<>@,;:\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Forced display name for free-tier platform mails. */
export function platformDisplayName(tenantName: string | null | undefined): string {
  const tenant = safeDisplayName(tenantName || '', 40);
  return tenant ? `${tenant} via Trackbliss` : 'Trackbliss';
}

/** Fixed footer (DE/EN) appended to free-tier platform mails. */
export function platformFooter(tenantName: string | null | undefined, locale: string | null | undefined): string {
  const tenant = safeDisplayName(tenantName || '', 80) || 'a Trackbliss customer';
  if (String(locale || '').toLowerCase().startsWith('de')) {
    return `Diese Nachricht wurde von "${tenant}" über die Plattform Trackbliss versendet. ` +
      'Trackbliss fragt nie per E-Mail nach Passwörtern oder Zahlungsdaten.';
  }
  return `This message was sent by "${tenant}" via the Trackbliss platform. ` +
    'Trackbliss never asks for passwords or payment details by email.';
}

/**
 * Plain-text body for a free-tier platform mail: HTML is flattened, plain
 * text is kept, and the fixed footer is appended.
 */
export function freeTierPlainBody(
  content: string,
  isHtml: boolean,
  tenantName: string | null | undefined,
  locale: string | null | undefined,
): string {
  const text = isHtml ? htmlToPlainText(content) : String(content ?? '').trim();
  return `${text}\n\n--\n${platformFooter(tenantName, locale)}`;
}
