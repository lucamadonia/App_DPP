import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { Check, QrCode, Users, Shield, Lock } from 'lucide-react';

const templates = [
  'modern', 'classic', 'minimal', 'premium', 'eco',
  'technical', 'government', 'retail', 'scientific', 'accessible', 'compact',
] as const;

const templateColors: Record<string, { accent: string; header: string }> = {
  modern: { accent: 'bg-blue-500', header: 'bg-gradient-to-r from-blue-600 to-blue-500' },
  classic: { accent: 'bg-slate-700', header: 'bg-slate-700' },
  minimal: { accent: 'bg-slate-900', header: 'bg-white border-b-2 border-slate-900' },
  premium: { accent: 'bg-amber-600', header: 'bg-gradient-to-r from-slate-900 to-slate-800' },
  eco: { accent: 'bg-emerald-600', header: 'bg-gradient-to-r from-emerald-600 to-green-500' },
  technical: { accent: 'bg-indigo-600', header: 'bg-indigo-600' },
  government: { accent: 'bg-blue-800', header: 'bg-blue-900' },
  retail: { accent: 'bg-rose-500', header: 'bg-gradient-to-r from-rose-500 to-pink-500' },
  scientific: { accent: 'bg-cyan-600', header: 'bg-cyan-700' },
  accessible: { accent: 'bg-yellow-600', header: 'bg-yellow-500' },
  compact: { accent: 'bg-slate-600', header: 'bg-slate-600' },
};

const visibilityTiers = [
  { key: 'consumer', icon: Users, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { key: 'customs', icon: Shield, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { key: 'internal', icon: Lock, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
];

export function LandingDPPShowcase() {
  const { t } = useTranslation('landing');
  const [active, setActive] = useState<string>('modern');
  const { ref, isVisible } = useScrollReveal();

  const colors = templateColors[active];
  const features = [
    t('dppShowcase.feature1'),
    t('dppShowcase.feature2'),
    t('dppShowcase.feature3'),
    t('dppShowcase.feature4'),
  ];

  return (
    <section id="dpp-showcase" className="py-24 bg-slate-900 text-white overflow-hidden">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div className={isVisible ? 'animate-landing-reveal-left' : 'opacity-0 -translate-x-10'}>
            <h2 className="text-3xl sm:text-4xl font-bold">
              {t('dppShowcase.title')}
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              {t('dppShowcase.subtitle')}
            </p>
            <ul className="mt-8 space-y-3">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                  <span className="text-slate-300">{f}</span>
                </li>
              ))}
            </ul>

            {/* Visibility Tiers */}
            <div className="mt-8">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                {t('dppShowcase.visibility.label')}
              </p>
              <div className="flex gap-2">
                {visibilityTiers.map((tier) => (
                  <div key={tier.key} className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${tier.color}`}>
                    <tier.icon className="h-4 w-4" />
                    <span className="text-xs font-medium">{t(`dppShowcase.visibility.${tier.key}`)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* URL Patterns */}
            <div className="mt-6 rounded-xl bg-slate-800 border border-slate-700 p-4">
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mb-2">
                {t('dppShowcase.urlPatterns')}
              </p>
              <div className="space-y-1.5 font-mono text-xs">
                <p className="text-emerald-400">/p/<span className="text-slate-400">:gtin</span>/<span className="text-slate-400">:serial</span></p>
                <p className="text-blue-400">/01/<span className="text-slate-400">:gtin</span>/21/<span className="text-slate-400">:serial</span></p>
                <p className="text-violet-400">?view=<span className="text-slate-400">zoll</span></p>
              </div>
            </div>

            {/* Template Tabs */}
            <div className="mt-8 flex flex-wrap gap-2">
              {templates.map((tmpl) => (
                <button
                  key={tmpl}
                  onClick={() => setActive(tmpl)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    active === tmpl
                      ? 'bg-white text-slate-900'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                  }`}
                >
                  {t(`dppShowcase.template.${tmpl}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Right: DPP Mockup */}
          <div className={isVisible ? 'animate-landing-reveal-right' : 'opacity-0 translate-x-10'}>
            <div className="rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden max-w-sm mx-auto lg:ml-auto transition-all duration-500">
              {/* Header */}
              <div className={`px-5 py-4 text-white ${colors.header} ${active === 'minimal' ? '!text-slate-900' : ''}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider opacity-80">Digital Product Passport</p>
                    <p className="text-sm font-semibold mt-0.5">{t('dppShowcase.mockup.manufacturer')}</p>
                  </div>
                  <div className="h-8 w-8 rounded bg-white/20 flex items-center justify-center">
                    <QrCode className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="font-semibold text-base">{t('dppShowcase.mockup.productName')}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">GTIN: 4260123456789</p>
                </div>

                {[
                  { label: 'Material', value: t('dppShowcase.mockup.material') },
                  { label: 'Origin', value: t('dppShowcase.mockup.origin') },
                  { label: 'Recyclability', value: t('dppShowcase.mockup.recyclability') },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-t border-slate-100">
                    <span className="text-xs text-slate-500">{row.label}</span>
                    <span className="text-sm font-medium">{row.value}</span>
                  </div>
                ))}

                {/* QR Code with Scan Me */}
                <div className="flex flex-col items-center pt-2 gap-2">
                  <div className="grid grid-cols-7 grid-rows-7 gap-0.5 h-24 w-24">
                    {Array.from({ length: 49 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-[1px] ${
                          [0,1,2,4,5,6,7,13,14,20,21,22,23,24,25,27,28,29,30,34,35,42,43,44,45,46,47,48].includes(i)
                            ? 'bg-slate-900'
                            : 'bg-slate-100'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-medium text-slate-400">{t('dppShowcase.scanMe')}</span>
                </div>
              </div>

              {/* Footer accent */}
              <div className={`h-1.5 ${colors.accent}`} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
