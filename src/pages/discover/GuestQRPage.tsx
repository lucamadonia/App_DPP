import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Download, FileCode2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { GlassCard } from '@/components/ui/glass-card';
import { toast } from 'sonner';
import {
  NO_LOGO,
  QR_MIN_CONTRAST,
  qrContrastRatio,
  renderQrPng,
  renderQrSvg,
  type QrErrorCorrection,
} from '@/lib/qr-generator';
import { saveOrShare } from '@/lib/download-file';
import { guestState } from '@/lib/guest-state';
import { GuestUpsellCard } from '@/components/discover/GuestUpsellCard';

type GuestQrMode = 'url' | 'gs1' | 'vcard';

interface GuestQrState {
  mode: GuestQrMode;
  url: string;
  gtin: string;
  serial: string;
  fn: string;
  org: string;
  email: string;
  phone: string;
  fg: string;
  bg: string;
  size: number;
  margin: number;
  ec: QrErrorCorrection;
  caption: string;
}

const DEFAULTS: GuestQrState = {
  mode: 'url',
  url: 'https://',
  gtin: '',
  serial: '',
  fn: '',
  org: '',
  email: '',
  phone: '',
  fg: '#0F172A',
  bg: '#FFFFFF',
  size: 512,
  margin: 2,
  ec: 'M',
  caption: '',
};

const PRESETS: Array<{ fg: string; bg: string }> = [
  { fg: '#0F172A', bg: '#FFFFFF' },
  { fg: '#3B82F6', bg: '#FFFFFF' },
  { fg: '#8B5CF6', bg: '#FFFFFF' },
  { fg: '#16A34A', bg: '#FFFFFF' },
  { fg: '#FFFFFF', bg: '#0F172A' },
  { fg: '#0F172A', bg: '#F1F5F9' },
];

/** GS1 check digit — mod 10, weights alternating 3 and 1 from the right. */
function gtinCheckDigitValid(gtin: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(gtin)) return false;
  const digits = gtin.split('').map(Number);
  const check = digits.pop()!;
  let sum = 0;
  for (let i = digits.length - 1, w = 3; i >= 0; i -= 1, w = w === 3 ? 1 : 3) {
    sum += digits[i] * w;
  }
  return (10 - (sum % 10)) % 10 === check;
}

/** Escape per RFC 6350: backslash, comma, semicolon and newline. */
function vcardEscape(value: string): string {
  return value.replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n');
}

function buildPayload(s: GuestQrState): string {
  if (s.mode === 'gs1') {
    return `https://id.gs1.org/01/${s.gtin}/21/${s.serial}`;
  }
  if (s.mode === 'vcard') {
    return [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${vcardEscape(s.fn)}`,
      s.org ? `ORG:${vcardEscape(s.org)}` : '',
      s.email ? `EMAIL:${vcardEscape(s.email)}` : '',
      s.phone ? `TEL:${vcardEscape(s.phone)}` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\n');
  }
  return s.url;
}

/**
 * QR generator for guests.
 *
 * Renders through the shared primitives in src/lib/qr-generator.ts — the same
 * code path the authenticated generator uses, so a guest gets the real thing
 * rather than a cut-down demo. What it deliberately lacks is the tenant side:
 * product and batch pickers, saved branding, and the resolver settings, none of
 * which mean anything without an account.
 *
 * Downloads go through saveOrShare rather than `<a download>`, which is inert
 * inside a WebView.
 */
export function GuestQRPage() {
  const { t } = useTranslation(['journey', 'common']);
  const [s, setS] = useState<GuestQrState>(DEFAULTS);
  const [preview, setPreview] = useState<string>('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void guestState.qr.load<Partial<GuestQrState>>({}).then((saved) => {
      if (!cancelled && saved && Object.keys(saved).length > 0) {
        setS((prev) => ({ ...prev, ...saved }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const payload = useMemo(() => buildPayload(s), [s]);

  const gtinOk = s.mode !== 'gs1' || s.gtin === '' || gtinCheckDigitValid(s.gtin);
  const contrast = qrContrastRatio(s.fg, s.bg);
  const lowContrast = contrast < QR_MIN_CONTRAST;

  const renderOptions = useMemo(
    () => ({
      data: payload,
      width: s.size,
      margin: s.margin,
      errorCorrectionLevel: s.ec,
      color: { dark: s.fg, light: s.bg },
    }),
    [payload, s.size, s.margin, s.ec, s.fg, s.bg]
  );

  const caption = useMemo(
    () => ({
      enabled: Boolean(s.caption),
      content: s.caption,
      position: 'bottom' as const,
      color: s.fg,
    }),
    [s.caption, s.fg]
  );

  // Live preview. Deliberately not debounced: rendering a QR to a canvas is
  // sub-millisecond work, and a lagging preview reads as a broken control.
  useEffect(() => {
    let cancelled = false;
    if (!payload || payload === 'https://') {
      setPreview('');
      return;
    }
    void renderQrPng(renderOptions, NO_LOGO, caption)
      .then((url) => {
        if (!cancelled) setPreview(url);
      })
      .catch(() => {
        if (!cancelled) setPreview('');
      });
    return () => {
      cancelled = true;
    };
  }, [payload, renderOptions, caption]);

  const patch = useCallback((next: Partial<GuestQrState>) => {
    setS((prev) => {
      const merged = { ...prev, ...next };
      guestState.qr.save(merged);
      return merged;
    });
  }, []);

  const download = useCallback(
    async (format: 'png' | 'svg') => {
      if (busy || !preview) return;
      setBusy(true);
      try {
        const stamp = new Date().toISOString().slice(0, 10);
        const content =
          format === 'png'
            ? await renderQrPng(renderOptions, NO_LOGO, caption)
            : await renderQrSvg(renderOptions, NO_LOGO, caption);
        await saveOrShare({
          content,
          mime: format === 'png' ? 'image/png' : 'image/svg+xml',
          filename: `qr-${stamp}.${format}`,
        });
      } catch {
        toast.error(t('discover.qr.saveFailed'));
      } finally {
        setBusy(false);
      }
    },
    [busy, preview, renderOptions, caption, t]
  );

  const modes: Array<{ value: GuestQrMode; labelKey: string }> = [
    { value: 'url', labelKey: 'discover.qr.tab.url' },
    { value: 'gs1', labelKey: 'discover.qr.tab.gs1' },
    { value: 'vcard', labelKey: 'discover.qr.tab.vcard' },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-1.5">
        <h2 className="text-title-lg font-bold tracking-tight">{t('discover.tools.qr.title')}</h2>
        <p className="text-body leading-relaxed text-muted-foreground">
          {t('discover.tools.qr.desc')}
        </p>
      </header>

      {preview && (
        <div className="flex justify-center rounded-2xl border p-6" style={{ background: s.bg }}>
          <img src={preview} alt={t('discover.qr.previewAlt')} className="size-52 object-contain" />
        </div>
      )}

      <div role="tablist" className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {modes.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={s.mode === m.value}
            onClick={() => patch({ mode: m.value })}
            className={`touch-target shrink-0 rounded-xl px-4 text-caption font-medium transition-colors ${
              s.mode === m.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {t(m.labelKey)}
          </button>
        ))}
      </div>

      <GlassCard className="space-y-4 p-4">
        {s.mode === 'url' && (
          <div className="space-y-1.5">
            <Label htmlFor="qr-url">{t('discover.qr.url')}</Label>
            <Input
              id="qr-url"
              inputMode="url"
              value={s.url}
              onChange={(e) => patch({ url: e.target.value })}
            />
          </div>
        )}

        {s.mode === 'gs1' && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="qr-gtin">{t('discover.qr.gtin')}</Label>
              <Input
                id="qr-gtin"
                inputMode="numeric"
                placeholder="04012345678901"
                value={s.gtin}
                onChange={(e) => patch({ gtin: e.target.value.replace(/\D/g, '') })}
                aria-invalid={!gtinOk}
              />
              {!gtinOk && (
                <p className="text-caption text-destructive">{t('discover.qr.gtinInvalid')}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-serial">{t('discover.qr.serial')}</Label>
              <Input
                id="qr-serial"
                value={s.serial}
                onChange={(e) => patch({ serial: e.target.value })}
              />
            </div>
            <p className="break-all rounded-lg bg-muted p-2.5 font-mono text-caption text-muted-foreground">
              {payload}
            </p>
          </>
        )}

        {s.mode === 'vcard' && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="qr-fn">{t('discover.qr.name')}</Label>
              <Input id="qr-fn" value={s.fn} onChange={(e) => patch({ fn: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-org">{t('discover.qr.org')}</Label>
              <Input id="qr-org" value={s.org} onChange={(e) => patch({ org: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-email">{t('discover.qr.email')}</Label>
              <Input
                id="qr-email"
                inputMode="email"
                value={s.email}
                onChange={(e) => patch({ email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qr-phone">{t('discover.qr.phone')}</Label>
              <Input
                id="qr-phone"
                inputMode="tel"
                value={s.phone}
                onChange={(e) => patch({ phone: e.target.value })}
              />
            </div>
          </>
        )}
      </GlassCard>

      <GlassCard className="space-y-4 p-4">
        <div className="space-y-2">
          <Label>{t('discover.qr.colours')}</Label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={`${p.fg}-${p.bg}`}
                type="button"
                onClick={() => patch({ fg: p.fg, bg: p.bg })}
                aria-label={t('discover.qr.colourPreset')}
                className="touch-target size-11 rounded-xl border"
                style={{ background: p.bg }}
              >
                <span
                  className="mx-auto block size-5 rounded"
                  style={{ background: p.fg }}
                  aria-hidden
                />
              </button>
            ))}
          </div>
        </div>

        {/* Nobody else in the app checks this, and it is the difference between
            a QR that scans and one that only looks good on a screen. */}
        {lowContrast && (
          <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-2.5 text-caption">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            {t('discover.qr.lowContrast', { ratio: contrast.toFixed(1) })}
          </p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="qr-caption">{t('discover.qr.caption')}</Label>
          <Input
            id="qr-caption"
            value={s.caption}
            onChange={(e) => patch({ caption: e.target.value })}
          />
        </div>
      </GlassCard>

      <div className="flex gap-2">
        <Button className="h-12 flex-1" disabled={!preview || busy} onClick={() => download('png')}>
          <Download className="mr-1.5 size-4" />
          PNG
        </Button>
        <Button
          variant="secondary"
          className="h-12 flex-1"
          disabled={!preview || busy}
          onClick={() => download('svg')}
        >
          <FileCode2 className="mr-1.5 size-4" />
          SVG
        </Button>
      </div>

      <GuestUpsellCard reason="qr" />
    </div>
  );
}
