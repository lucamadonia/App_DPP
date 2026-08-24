/**
 * QR rendering primitives — canvas (PNG) and DOM (SVG).
 *
 * Extracted from QRGeneratorPage, where the same composition existed twice:
 * once against a canvas for PNG and again against a parsed SVG document for
 * vector export, with the SVG copy rendering *and* downloading in one function.
 * Splitting render from save is what makes both reusable — the guest QR tool
 * needs the rendering but not the tenant-scoped page around it.
 *
 * Everything here is pure client-side: no network, no Supabase, no auth.
 */
import QRCode from 'qrcode';

export type QrErrorCorrection = 'L' | 'M' | 'Q' | 'H';

export interface QrRenderOptions {
  data: string;
  width: number;
  margin: number;
  errorCorrectionLevel: QrErrorCorrection;
  color: { dark: string; light: string };
}

export interface QrLogoOptions {
  enabled: boolean;
  url: string;
  /** Logo width as a percentage of the QR width (sane range 10-30). */
  size: number;
}

export interface QrTextOptions {
  enabled: boolean;
  content: string;
  position: 'top' | 'bottom';
  color: string;
}

export const NO_LOGO: QrLogoOptions = { enabled: false, url: '', size: 20 };
export const NO_TEXT: QrTextOptions = {
  enabled: false,
  content: '',
  position: 'bottom',
  color: '#000000',
};

/** Load an image element. `crossOrigin` keeps the canvas untainted. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * A logo punches a hole in the symbol, so the code must carry enough redundancy
 * to survive it. Level H (30 % recovery) is the only safe choice there,
 * regardless of what the caller asked for.
 */
function effectiveEcLevel(o: QrRenderOptions, logo: QrLogoOptions): QrErrorCorrection {
  return logo.enabled && logo.url ? 'H' : o.errorCorrectionLevel;
}

function captionFontSize(width: number): number {
  return Math.max(11, Math.round(width * 0.05));
}

/** Render to a PNG data URL, with optional centred logo and caption strip. */
export async function renderQrPng(
  o: QrRenderOptions,
  logo: QrLogoOptions = NO_LOGO,
  text: QrTextOptions = NO_TEXT
): Promise<string> {
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, o.data, {
    width: o.width,
    margin: o.margin,
    color: o.color,
    errorCorrectionLevel: effectiveEcLevel(o, logo),
  });

  const qrW = qrCanvas.width;
  const qrH = qrCanvas.height;
  const fontSize = captionFontSize(qrW);
  const hasCaption = text.enabled && Boolean(text.content);
  const textBlockH = hasCaption ? fontSize + 12 : 0;

  const canvas = document.createElement('canvas');
  canvas.width = qrW;
  canvas.height = qrH + textBlockH;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = o.color.light;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const qrY = hasCaption && text.position === 'top' ? textBlockH : 0;
  ctx.drawImage(qrCanvas, 0, qrY);

  if (logo.enabled && logo.url) {
    try {
      const img = await loadImage(logo.url);
      const logoW = qrW * (logo.size / 100);
      const logoH = (img.naturalHeight / img.naturalWidth) * logoW;
      const logoX = (qrW - logoW) / 2;
      const logoY = qrY + (qrH - logoH) / 2;
      const pad = Math.round(qrW * 0.02);

      ctx.fillStyle = o.color.light;
      ctx.fillRect(logoX - pad, logoY - pad, logoW + pad * 2, logoH + pad * 2);
      ctx.drawImage(img, logoX, logoY, logoW, logoH);
    } catch {
      // A missing logo must not cost the user their QR code.
    }
  }

  if (hasCaption) {
    ctx.font = `${fontSize}px "SF Mono", Consolas, "Liberation Mono", monospace`;
    ctx.fillStyle = text.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textY = text.position === 'top' ? textBlockH / 2 : qrY + qrH + textBlockH / 2;

    let label = text.content;
    while (ctx.measureText(label).width > canvas.width - 12 && label.length > 3) {
      label = label.slice(0, -4) + '…';
    }
    ctx.fillText(label, canvas.width / 2, textY);
  }

  return canvas.toDataURL('image/png');
}

/** Render to an SVG string, with the same optional logo and caption. */
export async function renderQrSvg(
  o: QrRenderOptions,
  logo: QrLogoOptions = NO_LOGO,
  text: QrTextOptions = NO_TEXT
): Promise<string> {
  let svgString = await QRCode.toString(o.data, {
    type: 'svg',
    width: o.width,
    margin: o.margin,
    color: o.color,
    errorCorrectionLevel: effectiveEcLevel(o, logo),
  });

  const wantsLogo = logo.enabled && Boolean(logo.url);
  const wantsText = text.enabled && Boolean(text.content);
  if (!wantsLogo && !wantsText) return svgString;

  const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const svg = doc.documentElement;
  const svgW = parseFloat(svg.getAttribute('width') || String(o.width));
  const svgH = parseFloat(svg.getAttribute('height') || String(o.width));

  const fontSize = captionFontSize(svgW);
  const textBlockH = wantsText ? fontSize + 12 : 0;

  if (textBlockH > 0) {
    svg.setAttribute('height', String(svgH + textBlockH));
    const vb = svg.getAttribute('viewBox');
    if (vb) {
      const parts = vb.split(' ');
      parts[3] = String(parseFloat(parts[3]) + textBlockH);
      svg.setAttribute('viewBox', parts.join(' '));
    }

    const bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', String(svgH));
    bgRect.setAttribute('width', String(svgW));
    bgRect.setAttribute('height', String(textBlockH));
    bgRect.setAttribute('fill', o.color.light);
    svg.appendChild(bgRect);

    const textEl = doc.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', String(svgW / 2));
    textEl.setAttribute('y', String(svgH + textBlockH / 2));
    textEl.setAttribute('text-anchor', 'middle');
    textEl.setAttribute('dominant-baseline', 'central');
    textEl.setAttribute('font-family', 'monospace');
    textEl.setAttribute('font-size', String(fontSize));
    textEl.setAttribute('fill', o.color.dark);
    textEl.textContent = text.content;
    svg.appendChild(textEl);
  }

  if (wantsLogo) {
    try {
      // An <image href> pointing at a remote URL would break the moment the SVG
      // leaves this origin, so the bitmap is inlined as a data URI.
      let logoDataUrl = logo.url;
      if (!logo.url.startsWith('data:')) {
        const img = await loadImage(logo.url);
        const tmp = document.createElement('canvas');
        tmp.width = img.naturalWidth;
        tmp.height = img.naturalHeight;
        tmp.getContext('2d')!.drawImage(img, 0, 0);
        logoDataUrl = tmp.toDataURL('image/png');
      }

      const logoW = svgW * (logo.size / 100);
      const logoH = logoW;
      const logoX = (svgW - logoW) / 2;
      const logoY = (svgH - logoH) / 2;
      const pad = Math.round(svgW * 0.02);

      const logoBg = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
      logoBg.setAttribute('x', String(logoX - pad));
      logoBg.setAttribute('y', String(logoY - pad));
      logoBg.setAttribute('width', String(logoW + pad * 2));
      logoBg.setAttribute('height', String(logoH + pad * 2));
      logoBg.setAttribute('rx', String(Math.round(pad)));
      logoBg.setAttribute('fill', o.color.light);
      svg.appendChild(logoBg);

      const imgEl = doc.createElementNS('http://www.w3.org/2000/svg', 'image');
      imgEl.setAttribute('x', String(logoX));
      imgEl.setAttribute('y', String(logoY));
      imgEl.setAttribute('width', String(logoW));
      imgEl.setAttribute('height', String(logoH));
      imgEl.setAttribute('href', logoDataUrl);
      imgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      svg.appendChild(imgEl);
    } catch {
      // Same as the canvas path: no logo beats no QR code.
    }
  }

  svgString = new XMLSerializer().serializeToString(doc);
  return svgString;
}

/**
 * Relative luminance per WCAG 2.x. Used to warn when a colour pairing is too
 * low-contrast for a scanner to resolve the modules reliably.
 */
function relativeLuminance(hex: string): number {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return 0;
  const int = parseInt(m[1], 16);
  const channels = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/** Contrast ratio between the dark and light modules, 1-21. */
export function qrContrastRatio(dark: string, light: string): number {
  const a = relativeLuminance(dark);
  const b = relativeLuminance(light);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Below roughly 3:1 a camera struggles to separate the modules under ordinary
 * lighting, so a pretty-but-unscannable code is worth warning about before
 * someone prints ten thousand labels.
 */
export const QR_MIN_CONTRAST = 3;
