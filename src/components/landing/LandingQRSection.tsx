import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { Check, QrCode } from 'lucide-react';

const qrFeatures = ['feature1', 'feature2', 'feature3', 'feature4', 'feature5', 'feature6'];
const tabs = ['customer', 'customs', 'gs1'] as const;

const domainUrls = [
  'trackbliss.com/p/4260123/SN001',
  'id.gs1.org/01/4260123/21/SN001',
  'dpp.your-brand.com/passport/SN001',
];

export function LandingQRSection() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('customer');

  return (
    <section id="qr-section" className="py-24 bg-slate-900 text-white overflow-hidden">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: QR Mockup */}
          <div className={isVisible ? 'animate-landing-reveal-left' : 'opacity-0 -translate-x-10'}>
            <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6 max-w-sm mx-auto lg:mx-0">
              {/* QR Code */}
              <div className="flex justify-center mb-5">
                <div className="relative">
                  <svg width="180" height="180" viewBox="0 0 180 180" className="rounded-xl">
                    <rect width="180" height="180" fill="#1e293b" rx="12" />
                    {/* QR pattern (stylized) */}
                    {[0,1,2,3,4,5,6,7,8].map(row =>
                      [0,1,2,3,4,5,6,7,8].map(col => {
                        const isCorner = (row < 3 && col < 3) || (row < 3 && col > 5) || (row > 5 && col < 3);
                        const isData = [
                          [0,0],[0,1],[0,2],[1,0],[1,2],[2,0],[2,1],[2,2],
                          [0,6],[0,7],[0,8],[1,6],[1,8],[2,6],[2,7],[2,8],
                          [6,0],[6,1],[6,2],[7,0],[7,2],[8,0],[8,1],[8,2],
                          [3,3],[3,5],[4,4],[5,3],[5,5],
                          [3,7],[4,6],[5,7],[6,5],[7,4],[8,5],[7,7],[6,7],
                        ].some(([r,c]) => r === row && c === col);
                        if (!isData) return null;
                        return (
                          <rect
                            key={`${row}-${col}`}
                            x={16 + col * 18}
                            y={16 + row * 18}
                            width={14}
                            height={14}
                            rx={isCorner ? 2 : 3}
                            fill={isCorner ? '#3b82f6' : '#8b5cf6'}
                            opacity={isCorner ? 1 : 0.8}
                          />
                        );
                      })
                    )}
                    {/* Center logo */}
                    <rect x="68" y="68" width="44" height="44" rx="10" fill="#0f172a" />
                    <rect x="72" y="72" width="36" height="36" rx="8" fill="#3b82f6" />
                    <text x="90" y="95" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">DPP</text>
                  </svg>
                </div>
              </div>

              {/* URL Tabs */}
              <div className="flex gap-1 mb-3 bg-slate-900 rounded-lg p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-blue-500 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t(`qrSection.tab.${tab}`)}
                  </button>
                ))}
              </div>

              {/* Settings Mockup */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Size</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 rounded-full bg-slate-700">
                      <div className="h-1.5 w-14 rounded-full bg-blue-500" />
                    </div>
                    <span className="text-xs text-slate-300">256px</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Colors</span>
                  <div className="flex gap-1.5">
                    {['bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500', 'bg-slate-100'].map((c, i) => (
                      <div key={i} className={`h-4 w-4 rounded-full ${c} ${i === 0 ? 'ring-2 ring-blue-300' : ''}`} />
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Error Correction</span>
                  <span className="text-xs text-slate-300 bg-slate-700 rounded px-2 py-0.5">Level H (30%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Features */}
          <div className={isVisible ? 'animate-landing-reveal-right' : 'opacity-0 translate-x-10'}>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 text-sm font-medium text-blue-400 mb-6">
              <QrCode className="h-4 w-4" />
              GS1 Digital Link
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">
              {t('qrSection.title')}
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              {t('qrSection.subtitle')}
            </p>

            <ul className="mt-8 space-y-4">
              {qrFeatures.map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-500/20 p-1 mt-0.5 shrink-0">
                    <Check className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <span className="text-slate-300">{t(`qrSection.${key}`)}</span>
                </li>
              ))}
            </ul>

            {/* Domain Showcase */}
            <div className="mt-8 rounded-xl bg-slate-800 border border-slate-700 p-4">
              <p className="text-xs font-medium text-slate-400 mb-3">{t('qrSection.domains')}</p>
              <div className="space-y-2 font-mono text-xs">
                {domainUrls.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-slate-500">{'>'}</span>
                    <span className="text-blue-400">{url}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
