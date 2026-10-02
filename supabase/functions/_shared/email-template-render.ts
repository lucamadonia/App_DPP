/**
 * Server-side renderer for Returns-Hub email templates (rh_email_templates).
 *
 * Deno mirror of:
 *   - src/components/returns/email-editor/emailHtmlRenderer.ts (renderEmailHtml)
 *   - src/components/returns/email-editor/SocialIconSvgs.ts   (icon data URIs)
 *   - renderTemplate()/resolveDisplayReason() in src/services/supabase/rh-notification-trigger.ts
 *   - src/lib/return-reasons.ts                                 (reason labels)
 * Keep these in sync when the block model changes.
 *
 * Used by notify-dispatch for rows queued with metadata.render === 'server'
 * (public portal mails via public_enqueue_notification). Unlike the client
 * renderer, every substituted variable is HTML-escaped: these values come from
 * anonymous visitors (names, free-text reasons, ticket subjects) and must never
 * become markup or links.
 */

// deno-lint-ignore-file no-explicit-any

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(str: unknown): string {
  return escapeHtml(str).replace(/\n/g, '<br/>');
}

const SOCIAL_ICONS: Record<string, { viewBox: string; path: string; coloredFill: string }> = {
  facebook: { viewBox: '0 0 24 24', coloredFill: '#1877F2', path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z' },
  twitter: { viewBox: '0 0 24 24', coloredFill: '#000000', path: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z' },
  instagram: { viewBox: '0 0 24 24', coloredFill: '#E4405F', path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z' },
  linkedin: { viewBox: '0 0 24 24', coloredFill: '#0A66C2', path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z' },
  youtube: { viewBox: '0 0 24 24', coloredFill: '#FF0000', path: 'M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z' },
  tiktok: { viewBox: '0 0 24 24', coloredFill: '#000000', path: 'M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z' },
  website: { viewBox: '0 0 24 24', coloredFill: '#4A90D9', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z' },
  email: { viewBox: '0 0 24 24', coloredFill: '#EA4335', path: 'M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z' },
};

function socialIconDataUri(platform: string, style: string, size: number): string {
  const icon = SOCIAL_ICONS[platform];
  if (!icon) return '';
  const fill = style === 'colored' ? icon.coloredFill : style === 'light' ? '#ffffff' : '#333333';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${icon.viewBox}" fill="${fill}"><path d="${icon.path}"/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function renderBlock(block: any, baseFontSize: number): string {
  switch (block?.type) {
    case 'text':
      return `<tr><td style="padding:4px 0;font-size:${baseFontSize}px;line-height:1.6;color:#374151;">${nl2br(block.content)}</td></tr>`;
    case 'button': {
      const align = block.alignment || 'center';
      return `<tr><td style="padding:8px 0;" align="${align}">
        <a href="${escapeHtml(block.url || '#')}" target="_blank" style="display:inline-block;padding:12px 28px;background-color:${block.backgroundColor};color:${block.textColor};text-decoration:none;border-radius:${block.borderRadius}px;font-size:${baseFontSize}px;font-weight:600;">${escapeHtml(block.text)}</a>
      </td></tr>`;
    }
    case 'divider':
      return `<tr><td style="padding:8px 0;"><hr style="border:none;border-top:${block.thickness}px solid ${block.color};margin:0;"/></td></tr>`;
    case 'spacer':
      return `<tr><td style="height:${block.height}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
    case 'info-box':
      return `<tr><td style="padding:4px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${block.borderColor};border-radius:6px;background-color:${block.backgroundColor};">
          <tr>
            <td style="padding:12px 16px;">
              <div style="font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${escapeHtml(block.label)}</div>
              <div style="font-size:${baseFontSize + 2}px;font-weight:600;color:#111827;">${escapeHtml(block.value)}</div>
            </td>
          </tr>
        </table>
      </td></tr>`;
    case 'image': {
      const imgAlign = block.alignment || 'center';
      const imgStyle = `max-width:${block.width}px;width:100%;height:auto;display:block;border-radius:${block.borderRadius}px;`;
      const imgTag = `<img src="${escapeHtml(block.src)}" alt="${escapeHtml(block.alt)}" style="${imgStyle}" />`;
      const content = block.linkUrl
        ? `<a href="${escapeHtml(block.linkUrl)}" target="_blank" style="display:inline-block;">${imgTag}</a>`
        : imgTag;
      return `<tr><td style="padding:8px 0;" align="${imgAlign}">${content}</td></tr>`;
    }
    case 'social-links': {
      const socialAlign = block.alignment || 'center';
      const iconCells = (block.links || [])
        .map((link: any) => {
          const iconUri = socialIconDataUri(link.platform, block.iconStyle, block.iconSize);
          return `<td style="padding:0 6px;">
            <a href="${escapeHtml(link.url || '#')}" target="_blank" style="display:inline-block;">
              <img src="${iconUri}" width="${block.iconSize}" height="${block.iconSize}" alt="${escapeHtml(link.platform)}" style="display:block;border:0;" />
            </a>
          </td>`;
        })
        .join('');
      return `<tr><td style="padding:12px 0;" align="${socialAlign}">
        <table cellpadding="0" cellspacing="0" border="0" style="display:inline-table;">
          <tr>${iconCells}</tr>
        </table>
      </td></tr>`;
    }
    case 'columns': {
      const colWidth = block.columnCount === 2 ? '50%' : '33.33%';
      const colCells = (block.columns || [])
        .slice(0, block.columnCount)
        .map((col: any, i: number) => {
          const w = col.width || colWidth;
          const innerBlocks = (col.blocks || []).map((b: any) => renderBlock(b, baseFontSize)).join('\n');
          const paddingLeft = i === 0 ? '0' : `${block.gap / 2}px`;
          const paddingRight = i === block.columnCount - 1 ? '0' : `${block.gap / 2}px`;
          return `<td style="width:${w};vertical-align:top;padding-left:${paddingLeft};padding-right:${paddingRight};">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              ${innerBlocks}
            </table>
          </td>`;
        })
        .join('');
      return `<tr><td style="padding:8px 0;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>${colCells}</tr>
        </table>
      </td></tr>`;
    }
    case 'hero': {
      const heroAlign = block.alignment || 'center';
      const bgStyle = block.backgroundImage
        ? `background-image:url('${escapeHtml(block.backgroundImage)}');background-size:cover;background-position:center;background-repeat:no-repeat;`
        : '';
      const bgColor = block.backgroundColor || '#1e293b';
      const overlay = block.overlayOpacity > 0
        ? `<div style="position:absolute;top:0;left:0;right:0;bottom:0;background-color:${bgColor};opacity:${block.overlayOpacity};"></div>`
        : '';
      const ctaHtml = block.ctaText
        ? `<a href="${escapeHtml(block.ctaUrl || '#')}" target="_blank" style="display:inline-block;padding:14px 32px;background-color:${block.ctaBackgroundColor};color:${block.ctaTextColor};text-decoration:none;border-radius:${block.ctaBorderRadius}px;font-size:${baseFontSize}px;font-weight:600;margin-top:16px;">${escapeHtml(block.ctaText)}</a>`
        : '';
      return `<tr><td style="padding:0;">
        <div style="position:relative;min-height:${block.minHeight}px;background-color:${bgColor};${bgStyle}border-radius:8px;overflow:hidden;">
          ${overlay}
          <div style="position:relative;z-index:1;padding:40px 32px;text-align:${heroAlign};">
            <h1 style="margin:0 0 8px;font-size:${baseFontSize + 10}px;font-weight:700;color:${block.titleColor};line-height:1.2;">${escapeHtml(block.title)}</h1>
            ${block.subtitle ? `<p style="margin:0;font-size:${baseFontSize + 2}px;color:${block.subtitleColor};line-height:1.5;">${escapeHtml(block.subtitle)}</p>` : ''}
            ${ctaHtml}
          </div>
        </div>
      </td></tr>`;
    }
    default:
      return '';
  }
}

/** Mirror of renderEmailHtml(config, previewText, locale). */
export function renderEmailHtml(config: any, previewText?: string, locale?: string): string {
  const layout = config.layout || {};
  const header = config.header || {};
  const footer = config.footer || { links: [] };
  const fontSize = layout.baseFontSize || 14;

  const localeContent = locale ? config.locales?.[locale] : undefined;
  const blocks: any[] = localeContent?.blocks || config.blocks || [];
  const footerText = localeContent?.footerText || footer.text;
  const htmlLang = locale || 'en';

  const headerHtml = header.enabled
    ? `<tr>
        <td style="background-color:${header.backgroundColor};padding:20px 32px;text-align:${header.alignment};border-radius:${layout.borderRadius}px ${layout.borderRadius}px 0 0;">
          ${header.showLogo && header.logoUrl
            ? `<img src="${escapeHtml(header.logoUrl)}" height="${header.logoHeight}" alt="Logo" style="display:inline-block;max-width:200px;height:${header.logoHeight}px;" />`
            : `<span style="color:${header.textColor};font-size:18px;font-weight:700;">Email</span>`
          }
        </td>
      </tr>`
    : '';

  const blocksHtml = blocks.map((b) => renderBlock(b, fontSize)).join('\n');
  const links: any[] = footer.links || [];

  const footerHtml = footer.enabled
    ? `<tr>
        <td style="background-color:${footer.backgroundColor};padding:16px 32px;text-align:center;border-radius:0 0 ${layout.borderRadius}px ${layout.borderRadius}px;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 8px;font-size:12px;color:${footer.textColor};">${escapeHtml(footerText)}</p>
          ${links.length > 0
            ? `<p style="margin:0;font-size:12px;">${links.map((l) => `<a href="${escapeHtml(l.url)}" style="color:${footer.textColor};text-decoration:underline;margin:0 8px;">${escapeHtml(l.label)}</a>`).join('')}</p>`
            : ''
          }
        </td>
      </tr>`
    : '';

  const previewTextHtml = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(previewText)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Email</title>
</head>
<body style="margin:0;padding:0;background-color:${layout.backgroundColor};font-family:${layout.fontFamily};">
  ${previewTextHtml}
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${layout.backgroundColor};">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table width="${layout.maxWidth}" cellpadding="0" cellspacing="0" border="0" style="max-width:${layout.maxWidth}px;width:100%;background-color:${layout.contentBackgroundColor};border-radius:${layout.borderRadius}px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          ${headerHtml}
          <tr>
            <td style="padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${blocksHtml}
              </table>
            </td>
          </tr>
          ${footerHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const REASON_LABELS: Record<string, { de: string; en: string }> = {
  damaged: { de: 'Beschädigt', en: 'Damaged' },
  defective: { de: 'Defekt', en: 'Defective' },
  wrong_item: { de: 'Falscher Artikel', en: 'Wrong item' },
  not_as_described: { de: 'Nicht wie beschrieben', en: 'Not as described' },
  not_needed: { de: 'Nicht mehr benötigt', en: 'No longer needed' },
  arrived_late: { de: 'Zu spät angekommen', en: 'Arrived late' },
  other: { de: 'Sonstiges', en: 'Other' },
};

function reasonLabel(category: string, locale: string): string {
  if (!category) return '';
  const entry = REASON_LABELS[category];
  if (entry) return locale.startsWith('de') ? entry.de : entry.en;
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Fambliss defaults for footer/legal link vars (same as DEFAULT_BRAND_VARS on the client). */
const DEFAULT_BRAND_VARS: Record<string, string> = {
  shopUrl: 'https://shop.fambliss.de',
  journalUrl: 'https://shop.fambliss.de/blogs/news',
  contactUrl: 'https://shop.fambliss.de/pages/kontakt',
  imprintUrl: 'https://shop.fambliss.de/pages/impressum',
  privacyUrl: 'https://shop.fambliss.de/pages/datenschutz',
  termsUrl: 'https://shop.fambliss.de/pages/agb',
  unsubscribeUrl: 'https://shop.fambliss.de/pages/abmelden',
  hrbNumber: '734371',
};

/**
 * Visitor-controlled free text (ticket subject, return reason, names) for
 * rows queued anonymously. HTML escaping stops markup but not spam/phishing
 * text, and mail clients autolink URLs and bare domains, so strip URLs,
 * e-mail addresses and domain-like tokens, drop unusual characters and
 * shorten. Same rules as sanitize_public_mail_text() in migration 20261001d
 * (defence in depth for rows queued before that version).
 */
export function sanitizePublicText(raw: unknown, max: number): string {
  const once = (s: string) =>
    s
      .replace(/(https?:\/\/|www\.)\S*/gi, ' ')
      .replace(/\S+@\S+/g, ' ')
      .replace(/\S+\.[a-z]{2,}\S*/gi, ' ');
  // \p{Cc} = U+0000-U+001F and U+007F-U+009F (C0/C1 control characters).
  const noCtrl = String(raw ?? '').replace(/\p{Cc}/gu, ' ');
  return once(once(noCtrl).replace(/[^\p{L}\p{N}_ .,;:!?()'/%+-]/gu, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, Math.max(0, max));
}

/** Variables the public queue may provide. Everything else renders empty. */
export interface ServerRenderVars {
  customerName?: string;
  firstName?: string;
  returnNumber?: string;
  status?: string;
  reason?: string;
  reasonCategory?: string;
  ticketNumber?: string;
  subject?: string;
  trackingUrl?: string;
}

/**
 * Substitute {{vars}} with HTML-escaped values. `asText` skips escaping for the
 * subject line (a plain header, never HTML) but strips CR/LF to block header
 * injection.
 */
function substitute(template: string, vars: ServerRenderVars, locale: string, asText: boolean): string {
  const rawReason = (vars.reason || '').trim();
  const reason = rawReason && !REASON_LABELS[rawReason] ? rawReason : reasonLabel(rawReason || vars.reasonCategory || '', locale);
  const values: Record<string, string> = {
    customerName: vars.customerName || vars.firstName || '',
    firstName: vars.firstName || vars.customerName || '',
    returnNumber: vars.returnNumber || '',
    status: vars.status || '',
    reason,
    refundAmount: '',
    ticketNumber: vars.ticketNumber || '',
    subject: vars.subject || '',
    trackingUrl: vars.trackingUrl || '',
    orderNumber: '',
    shipmentNumber: '',
    trackingNumber: '',
    itemCount: '',
    productsHtml: '',
    trackingHtml: '',
    hero_image_url: '',
    heroImageUrl: '',
    tutorialUrl: '',
    reviewUrl: '',
    feedbackUrl: '',
    feedback_url: '',
  };
  for (const [k, v] of Object.entries(DEFAULT_BRAND_VARS)) {
    values[k] = v;
    values[k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)] = v;
  }
  return template.replace(/\{\{\s*([a-zA-Z_]+)\s*\}\}/g, (match, key: string) => {
    if (!(key in values)) return match;
    const value = values[key];
    return asText ? value.replace(/[\r\n]+/g, ' ') : escapeHtml(value);
  });
}

export interface TemplateRow {
  subject_template?: string | null;
  body_template?: string | null;
  html_template?: string | null;
  design_config?: any;
}

/** Render subject + HTML body for a stored template, mirroring triggerPublicEmailNotification. */
export function renderStoredTemplate(
  template: TemplateRow,
  vars: ServerRenderVars,
  locale: string,
): { subject: string; html: string; isHtml: boolean } {
  const design = template.design_config || {};
  const localeContent = design?.locales?.[locale];
  const subjectSource = localeContent?.subjectTemplate || template.subject_template || '';
  const subject = substitute(subjectSource, vars, locale, true).slice(0, 300);

  if (Array.isArray(design?.blocks) && design.blocks.length > 0) {
    return { subject, html: substitute(renderEmailHtml(design, '', locale), vars, locale, false), isHtml: true };
  }
  if (template.html_template) {
    return { subject, html: substitute(template.html_template, vars, locale, false), isHtml: true };
  }
  // Plain-text body: escape everything, keep line breaks.
  const body = substitute(escapeHtml(template.body_template || ''), vars, locale, false).replace(/\n/g, '<br/>');
  return { subject, html: body, isHtml: true };
}
