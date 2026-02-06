import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import QRCode from 'qrcode';
import { Download, Copy, Check, ScanLine, Palette, Maximize2, ShieldCheck } from 'lucide-react';

const colorPresets = [
  { hex: '#0f172a', label: 'Slate' },
  { hex: '#3b82f6', label: 'Blue' },
  { hex: '#8b5cf6', label: 'Violet' },
  { hex: '#10b981', label: 'Emerald' },
  { hex: '#ef4444', label: 'Red' },
  { hex: '#f59e0b', label: 'Amber' },
];

const ecLevels = ['L', 'M', 'Q', 'H'] as const;
type ECLevel = typeof ecLevels[number];

const tabs = ['custom', 'gs1', 'vcard'] as const;
type TabType = typeof tabs[number];

export function LandingQRSection() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();

  const [activeTab, setActiveTab] = useState<TabType>('custom');
  const [url, setUrl] = useState('https://trackbliss.com/p/4260123456789/SN001');
  const [qrColor, setQrColor] = useState('#0f172a');
  const [size, setSize] = useState(256);
  const [ecLevel, setEcLevel] = useState<ECLevel>('M');
  const [copied, setCopied] = useState(false);

  // GS1 fields
  const [gtin, setGtin] = useState('4260123456789');
  const [serial, setSerial] = useState('SN001');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const effectiveUrl = activeTab === 'gs1'
    ? `https://id.gs1.org/01/${gtin}/21/${serial}`
    : activeTab === 'vcard'
      ? 'BEGIN:VCARD\nVERSION:3.0\nFN:EcoWear GmbH\nORG:EcoWear GmbH\nTEL:+49 30 12345678\nEMAIL:info@ecowear.de\nURL:https://ecowear.de\nADR:;;Musterstr. 12;Berlin;;10115;DE\nEND:VCARD'
      : url;

  // Render QR code
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !effectiveUrl) return;

    QRCode.toCanvas(canvas, effectiveUrl, {
      width: size,
      margin: 2,
      color: { dark: qrColor, light: '#ffffff' },
      errorCorrectionLevel: ecLevel,
    }).catch(() => {
      // silently ignore render errors for invalid input
    });
  }, [effectiveUrl, qrColor, size, ecLevel]);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `qr-code-${Date.now()}.png`;
    a.click();
  }, []);

  const handleCopy = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Fallback: copy URL instead
      await navigator.clipboard.writeText(effectiveUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [effectiveUrl]);

  return (
    <section id="qr-section" className="py-24 bg-slate-900 text-white overflow-hidden">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`text-center max-w-3xl mx-auto mb-12 ${isVisible ? 'animate-landing-reveal' : 'opacity-0 translate-y-8'}`}>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-sm font-medium text-blue-400 mb-6">
            <ScanLine className="h-4 w-4" />
            {t('qrSection.tryIt')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold">{t('qrSection.title')}</h2>
          <p className="mt-4 text-lg text-slate-400">{t('qrSection.subtitle')}</p>
        </div>

        {/* Generator Card */}
        <div className={`rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden max-w-4xl mx-auto ${
          isVisible ? 'animate-landing-reveal [animation-delay:0.3s]' : 'opacity-0 translate-y-8'
        }`}>
          {/* Tab Bar */}
          <div className="flex border-b border-slate-700 bg-slate-800/50">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'text-blue-400 border-b-2 border-blue-400 bg-slate-800'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t(`qrSection.tab.${tab}`)}
              </button>
            ))}
          </div>

          {/* Content Grid */}
          <div className="grid md:grid-cols-2 gap-6 p-6">
            {/* Left: Controls */}
            <div className="space-y-5">
              {activeTab === 'custom' && (
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">{t('qrSection.urlInput')}</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="https://..."
                  />
                </div>
              )}

              {activeTab === 'gs1' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 mb-1.5 block">{t('qrSection.gtinInput')}</label>
                    <input
                      type="text"
                      value={gtin}
                      onChange={(e) => setGtin(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="4260123456789"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-400 mb-1.5 block">{t('qrSection.serialInput')}</label>
                    <input
                      type="text"
                      value={serial}
                      onChange={(e) => setSerial(e.target.value)}
                      className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="SN001"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'vcard' && (
                <div className="rounded-lg bg-slate-900 border border-slate-600 p-3">
                  <p className="text-[10px] font-medium text-slate-500 uppercase mb-2">vCard Demo</p>
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
{`FN: EcoWear GmbH
ORG: EcoWear GmbH
TEL: +49 30 12345678
EMAIL: info@ecowear.de
URL: ecowear.de`}
                  </pre>
                </div>
              )}

              {/* Color Presets */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5" />
                  {t('qrSection.color')}
                </label>
                <div className="flex gap-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c.hex}
                      onClick={() => setQrColor(c.hex)}
                      className={`h-8 w-8 rounded-full border-2 transition-all ${
                        qrColor === c.hex ? 'border-blue-400 scale-110' : 'border-slate-600 hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>

              {/* Size Slider */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <Maximize2 className="h-3.5 w-3.5" />
                  {t('qrSection.size')}: {size}px
                </label>
                <input
                  type="range"
                  min={128}
                  max={512}
                  step={32}
                  value={size}
                  onChange={(e) => setSize(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              {/* Error Correction */}
              <div>
                <label className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {t('qrSection.errorCorrection')}
                </label>
                <div className="flex gap-1.5">
                  {ecLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => setEcLevel(level)}
                      className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                        ecLevel === level
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                      }`}
                    >
                      {t(`qrSection.ecLevel.${level}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Preview + Actions */}
            <div className="flex flex-col items-center">
              <div className="rounded-xl bg-white p-4 shadow-lg">
                <canvas ref={canvasRef} className="block" />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors animate-landing-pulse-ring"
                >
                  <Download className="h-4 w-4" />
                  {t('qrSection.download')}
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 rounded-xl border border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  {copied ? t('qrSection.copied') : t('qrSection.copy')}
                </button>
              </div>
            </div>
          </div>

          {/* Footer: GS1 Structure Reference */}
          <div className="border-t border-slate-700 px-6 py-3 bg-slate-800/50">
            <p className="text-[10px] font-medium text-slate-500 mb-1">{t('qrSection.gs1Structure')}</p>
            <div className="flex gap-4 font-mono text-[11px]">
              <span><span className="text-blue-400">01</span>=<span className="text-slate-400">GTIN</span></span>
              <span><span className="text-violet-400">21</span>=<span className="text-slate-400">Serial</span></span>
              <span><span className="text-emerald-400">10</span>=<span className="text-slate-400">Batch</span></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
