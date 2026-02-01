/**
 * Email HTML Renderer - Pure function: EmailDesignConfig -> inline-CSS HTML string
 * Generates email-client compatible HTML with inline styles.
 * Supports locale-specific blocks: pass locale='de' to render German content.
 */
import type { EmailDesignConfig, EmailBlock } from './emailEditorTypes';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(str: string): string {
  return escapeHtml(str).replace(/\n/g, '<br/>');
}

function renderBlock(block: EmailBlock, baseFontSize: number): string {
  switch (block.type) {
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

    default:
      return '';
  }
}

/**
 * Render email HTML from design config.
 * @param config - The design configuration
 * @param previewText - Optional email preheader text
 * @param locale - Optional locale code (e.g. 'de') to use locale-specific blocks
 */
export function renderEmailHtml(config: EmailDesignConfig, previewText?: string, locale?: string): string {
  const { layout, header, footer } = config;
  const fontSize = layout.baseFontSize || 14;

  // Resolve locale-specific content
  const localeContent = locale ? config.locales?.[locale] : undefined;
  const blocks = localeContent?.blocks || config.blocks;
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

  const footerHtml = footer.enabled
    ? `<tr>
        <td style="background-color:${footer.backgroundColor};padding:16px 32px;text-align:center;border-radius:0 0 ${layout.borderRadius}px ${layout.borderRadius}px;border-top:1px solid #e5e7eb;">
          <p style="margin:0 0 8px;font-size:12px;color:${footer.textColor};">${escapeHtml(footerText)}</p>
          ${footer.links.length > 0
            ? `<p style="margin:0;font-size:12px;">${footer.links.map((l) => `<a href="${escapeHtml(l.url)}" style="color:${footer.textColor};text-decoration:underline;margin:0 8px;">${escapeHtml(l.label)}</a>`).join('')}</p>`
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

/**
 * Fill template variables with sample data for preview.
 */
export function fillSampleData(html: string, sampleData: Record<string, string>): string {
  let result = html;
  for (const [key, value] of Object.entries(sampleData)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return result;
}
