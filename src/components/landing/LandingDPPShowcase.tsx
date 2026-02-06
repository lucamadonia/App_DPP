import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { Check, ScanLine, Users, ShieldCheck, Lock, Fingerprint, Gem } from 'lucide-react';

const templates = [
  'modern', 'classic', 'minimal', 'premium', 'eco',
  'technical', 'government', 'retail', 'scientific', 'accessible', 'compact',
] as const;

type TemplateName = typeof templates[number];

const templateThumbColors: Record<TemplateName, { bg: string; accent: string }> = {
  modern:     { bg: 'from-blue-500 to-blue-600', accent: 'bg-blue-400' },
  classic:    { bg: 'from-slate-600 to-slate-700', accent: 'bg-slate-500' },
  minimal:    { bg: 'from-gray-100 to-gray-200', accent: 'bg-gray-800' },
  premium:    { bg: 'from-slate-800 to-slate-900', accent: 'bg-amber-500' },
  eco:        { bg: 'from-emerald-500 to-green-600', accent: 'bg-emerald-300' },
  technical:  { bg: 'from-indigo-600 to-indigo-700', accent: 'bg-indigo-400' },
  government: { bg: 'from-blue-800 to-blue-900', accent: 'bg-blue-500' },
  retail:     { bg: 'from-rose-400 to-pink-500', accent: 'bg-rose-300' },
  scientific: { bg: 'from-cyan-600 to-teal-700', accent: 'bg-cyan-400' },
  accessible: { bg: 'from-yellow-400 to-yellow-500', accent: 'bg-yellow-600' },
  compact:    { bg: 'from-slate-500 to-slate-600', accent: 'bg-slate-400' },
};

const visibilityTiers = [
  { key: 'consumer', icon: Users, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  { key: 'customs', icon: ShieldCheck, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { key: 'internal', icon: Lock, color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
];

/* Mini-bar component for material composition */
function MaterialBars() {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-[8px] text-slate-500 w-12">Cotton</span>
        <div className="flex-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-emerald-400 w-[85%]" /></div>
        <span className="text-[8px] text-slate-400">85%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[8px] text-slate-500 w-12">Elastane</span>
        <div className="flex-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-blue-400 w-[10%]" /></div>
        <span className="text-[8px] text-slate-400">10%</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[8px] text-slate-500 w-12">Polyester</span>
        <div className="flex-1 h-1.5 rounded-full bg-slate-100"><div className="h-1.5 rounded-full bg-violet-400 w-[5%]" /></div>
        <span className="text-[8px] text-slate-400">5%</span>
      </div>
    </div>
  );
}

/* Certification badges */
function CertBadges({ variant = 'default' }: { variant?: string }) {
  const badges = [
    { label: 'CE', bg: variant === 'eco' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700' },
    { label: 'ISO', bg: variant === 'eco' ? 'bg-green-100 text-green-700' : 'bg-violet-100 text-violet-700' },
    { label: 'GS1', bg: variant === 'eco' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-700' },
  ];
  return (
    <div className="flex gap-1">
      {badges.map((b) => (
        <span key={b.label} className={`text-[7px] font-bold px-1.5 py-0.5 rounded ${b.bg}`}>{b.label}</span>
      ))}
    </div>
  );
}

/* Carbon gauge miniature */
function CarbonGauge({ color = '#10b981' }: { color?: string }) {
  return (
    <svg width="40" height="24" viewBox="0 0 40 24">
      <path d="M 4 20 A 16 16 0 0 1 36 20" fill="none" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
      <path d="M 4 20 A 16 16 0 0 1 36 20" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray="50" strokeDashoffset="12" />
      <text x="20" y="19" textAnchor="middle" fontSize="7" fontWeight="bold" fill={color}>A+</text>
    </svg>
  );
}

/* Supply chain mini timeline */
function SupplyChainDots({ color = 'bg-blue-400' }: { color?: string }) {
  const steps = ['Raw', 'Prod', 'Ship'];
  return (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`h-3 w-3 rounded-full ${color} flex items-center justify-center`}>
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
          </div>
          {i < steps.length - 1 && <div className={`h-0.5 w-6 ${color} opacity-40`} />}
        </div>
      ))}
    </div>
  );
}

/* Template-specific mockup renderers */
const templateMockups: Record<TemplateName, (t: (k: string) => string) => React.ReactNode> = {
  modern: (t) => (
    <div className="rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-wider opacity-80">Digital Product Passport</p>
            <p className="text-xs font-semibold mt-0.5">{t('dppShowcase.mockup.manufacturer')}</p>
          </div>
          <div className="h-7 w-7 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center">
            <ScanLine className="h-4 w-4" />
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-sm">{t('dppShowcase.mockup.productName')}</h3>
        <div className="flex gap-2">
          <span className="text-[8px] bg-blue-50 text-blue-600 rounded-full px-2 py-0.5 font-medium">GTIN: 4260…789</span>
          <span className="text-[8px] bg-emerald-50 text-emerald-600 rounded-full px-2 py-0.5 font-medium">SN: 001</span>
        </div>
        <MaterialBars />
        <div className="flex items-center justify-between">
          <CertBadges />
          <CarbonGauge />
        </div>
        <SupplyChainDots />
      </div>
      <div className="h-1 bg-gradient-to-r from-blue-500 to-violet-500" />
    </div>
  ),
  classic: (t) => (
    <div className="rounded-xl bg-white text-slate-900 shadow-2xl overflow-hidden border border-slate-200">
      <div className="bg-slate-700 px-5 py-3 text-white">
        <p className="text-[9px] uppercase tracking-widest opacity-70">DPP</p>
        <p className="text-xs font-semibold">{t('dppShowcase.mockup.manufacturer')}</p>
      </div>
      <div className="p-4 space-y-2.5">
        <h3 className="font-semibold text-sm border-b border-slate-200 pb-2">{t('dppShowcase.mockup.productName')}</h3>
        {['Material', 'Origin', 'Recyclability'].map((label, i) => (
          <div key={label} className="flex justify-between text-xs border-b border-slate-100 pb-1.5">
            <span className="text-slate-500">{label}</span>
            <span className="font-medium">{i === 0 ? '100% Cotton' : i === 1 ? 'DE' : '95%'}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500 w-[95%]" /></div>
          <span className="text-[9px] font-semibold text-emerald-600">95%</span>
        </div>
        <CertBadges />
      </div>
    </div>
  ),
  minimal: (t) => (
    <div className="rounded-xl bg-white text-slate-900 shadow-lg overflow-hidden">
      <div className="px-5 py-3 border-b-2 border-slate-900">
        <p className="text-xs font-semibold">{t('dppShowcase.mockup.manufacturer')}</p>
      </div>
      <div className="p-5 space-y-4">
        <h3 className="text-lg font-light tracking-tight">{t('dppShowcase.mockup.productName')}</h3>
        <p className="text-[10px] text-slate-400">GTIN 4260123456789 &middot; SN001</p>
        <div className="space-y-2 text-xs text-slate-600">
          <p>100% Organic Cotton</p>
          <p>Made in Germany</p>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <CarbonGauge color="#6b7280" />
        </div>
      </div>
    </div>
  ),
  premium: (t) => (
    <div className="rounded-2xl bg-slate-900 text-white shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-5 py-4 border-b border-amber-500/30">
        <div className="flex items-center gap-2">
          <Gem className="h-4 w-4 text-amber-400" />
          <div>
            <p className="text-[8px] uppercase tracking-[0.2em] text-amber-400/80">Premium DPP</p>
            <p className="text-xs font-semibold">{t('dppShowcase.mockup.manufacturer')}</p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-sm text-amber-50">{t('dppShowcase.mockup.productName')}</h3>
        <div className="h-px bg-gradient-to-r from-amber-500/50 to-transparent" />
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div className="bg-slate-800 rounded-lg p-2"><span className="text-slate-500 block">Material</span><span className="text-amber-200">100% Cotton</span></div>
          <div className="bg-slate-800 rounded-lg p-2"><span className="text-slate-500 block">Origin</span><span className="text-amber-200">Germany</span></div>
        </div>
        <div className="flex gap-1">
          {['CE', 'ISO', 'GS1'].map((b) => (
            <span key={b} className="text-[7px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">{b}</span>
          ))}
        </div>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-amber-400 to-amber-600" />
    </div>
  ),
  eco: (t) => (
    <div className="rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-500 to-green-500 px-5 py-4 text-white">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3v12a6 6 0 0 0 12 0V3m-4 8c0-3-2-5-4-6" /></svg>
          <p className="text-xs font-semibold">{t('dppShowcase.mockup.manufacturer')}</p>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <h3 className="font-semibold text-sm">{t('dppShowcase.mockup.productName')}</h3>
        <div className="rounded-lg bg-emerald-50 p-2.5 border border-emerald-100">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-medium text-emerald-700">Carbon Footprint</span>
            <CarbonGauge color="#10b981" />
          </div>
          <div className="h-1.5 rounded-full bg-emerald-100"><div className="h-1.5 rounded-full bg-emerald-500 w-[20%]" /></div>
          <p className="text-[8px] text-emerald-600 mt-1">2.3 kg CO₂e &middot; A+ Rating</p>
        </div>
        <MaterialBars />
        <CertBadges variant="eco" />
      </div>
      <div className="h-1 bg-gradient-to-r from-emerald-400 to-green-500" />
    </div>
  ),
  technical: (t) => (
    <div className="rounded-xl bg-white text-slate-900 shadow-2xl overflow-hidden border border-indigo-200">
      <div className="bg-indigo-600 px-5 py-3 text-white">
        <p className="text-[8px] uppercase tracking-widest opacity-70 font-mono">TECHNICAL SPECIFICATION</p>
        <p className="text-xs font-semibold">{t('dppShowcase.mockup.productName')}</p>
      </div>
      <div className="p-4 space-y-2">
        <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
          {[['GTIN', '4260123456789'], ['Serial', 'SN001'], ['HS Code', '6109.10.00'], ['Weight', '0.28 kg']].map(([k, v]) => (
            <div key={k} className="bg-indigo-50 rounded p-1.5">
              <span className="text-indigo-400 block">{k}</span>
              <span className="text-indigo-800 font-semibold">{v}</span>
            </div>
          ))}
        </div>
        <MaterialBars />
        <SupplyChainDots color="bg-indigo-400" />
      </div>
    </div>
  ),
  government: (t) => (
    <div className="rounded-xl bg-white text-slate-900 shadow-2xl overflow-hidden border-2 border-blue-800">
      <div className="bg-blue-900 px-5 py-3 text-white flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-blue-300" />
        <div>
          <p className="text-[8px] uppercase tracking-widest opacity-70">Official Product Passport</p>
          <p className="text-xs font-semibold">{t('dppShowcase.mockup.manufacturer')}</p>
        </div>
      </div>
      <div className="p-4 space-y-2.5">
        <h3 className="font-semibold text-sm">{t('dppShowcase.mockup.productName')}</h3>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-[9px]">
          <p className="font-semibold text-blue-800">EU Declaration of Conformity</p>
          <p className="text-blue-600">ESPR 2024/1781 &middot; CE 2025</p>
        </div>
        <div className="grid grid-cols-3 gap-1 text-center text-[8px]">
          {[['HS Code', '6109.10'], ['Origin', 'DE'], ['EORI', 'DE123…']].map(([k, v]) => (
            <div key={k} className="bg-slate-50 rounded p-1.5">
              <span className="text-slate-400 block">{k}</span>
              <span className="font-semibold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  ),
  retail: (t) => (
    <div className="rounded-2xl bg-white text-slate-900 shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-rose-400 to-pink-500 px-5 py-4 text-white">
        <p className="text-xs font-semibold">{t('dppShowcase.mockup.productName')}</p>
        <div className="flex items-center gap-1 mt-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <svg key={star} className={`h-3 w-3 ${star <= 4 ? 'text-yellow-300' : 'text-white/40'}`} fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
          <span className="text-[9px] text-white/80 ml-1">4.8 (2,341)</span>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-[10px]">
          <span className="bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5 font-medium">Eco-Certified</span>
          <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 font-medium">Free Returns</span>
        </div>
        <MaterialBars />
        <CarbonGauge color="#f43f5e" />
      </div>
    </div>
  ),
  scientific: (t) => (
    <div className="rounded-xl bg-white text-slate-900 shadow-2xl overflow-hidden">
      <div className="bg-gradient-to-r from-cyan-600 to-teal-700 px-5 py-3 text-white">
        <p className="text-[8px] uppercase tracking-widest opacity-70">Research Data Sheet</p>
        <p className="text-xs font-semibold">{t('dppShowcase.mockup.productName')}</p>
      </div>
      <div className="p-4 space-y-2">
        <table className="w-full text-[9px]">
          <tbody>
            {[['CAS-Nr.', '—'], ['Concentration', '< 0.1%'], ['SVHC', 'Not present'], ['Lifetime', '5 years']].map(([k, v]) => (
              <tr key={k} className="border-b border-slate-100">
                <td className="text-slate-500 py-1 pr-2 font-mono">{k}</td>
                <td className="font-semibold py-1">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <SupplyChainDots color="bg-cyan-500" />
        <CertBadges />
      </div>
    </div>
  ),
  accessible: (t) => (
    <div className="rounded-xl bg-white text-slate-900 shadow-2xl overflow-hidden border-2 border-yellow-500">
      <div className="bg-yellow-400 px-5 py-4 text-slate-900">
        <p className="text-sm font-bold">{t('dppShowcase.mockup.productName')}</p>
        <p className="text-xs font-medium mt-0.5">{t('dppShowcase.mockup.manufacturer')}</p>
      </div>
      <div className="p-4 space-y-3">
        <div className="text-sm space-y-2 font-medium">
          <p><span className="text-slate-500">Material:</span> 100% Organic Cotton</p>
          <p><span className="text-slate-500">Origin:</span> Germany</p>
          <p><span className="text-slate-500">Recyclable:</span> 95%</p>
        </div>
        <div className="flex gap-1.5">
          {['CE', 'ISO', 'GS1'].map((b) => (
            <span key={b} className="text-[9px] font-bold px-2 py-1 rounded bg-yellow-100 text-yellow-800 border border-yellow-300">{b}</span>
          ))}
        </div>
      </div>
    </div>
  ),
  compact: (t) => (
    <div className="rounded-xl bg-white text-slate-900 shadow-2xl overflow-hidden">
      <div className="bg-slate-600 px-4 py-2 text-white flex items-center justify-between">
        <p className="text-[10px] font-semibold">{t('dppShowcase.mockup.productName')}</p>
        <Fingerprint className="h-3.5 w-3.5 text-slate-300" />
      </div>
      <div className="px-3 py-1 bg-slate-50 border-b border-slate-200 flex gap-2">
        {['Details', 'Materials', 'Certs'].map((tab, i) => (
          <span key={tab} className={`text-[8px] py-1 ${i === 0 ? 'font-semibold text-blue-600 border-b border-blue-600' : 'text-slate-400'}`}>{tab}</span>
        ))}
      </div>
      <div className="p-3 space-y-2 text-[10px]">
        <div className="flex justify-between"><span className="text-slate-500">GTIN</span><span className="font-medium font-mono">4260123456789</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Material</span><span className="font-medium">Cotton 85%</span></div>
        <div className="flex justify-between"><span className="text-slate-500">CO₂</span><span className="font-medium text-emerald-600">2.3 kg</span></div>
        <CertBadges />
      </div>
    </div>
  ),
};

export function LandingDPPShowcase() {
  const { t } = useTranslation('landing');
  const [active, setActive] = useState<TemplateName>('modern');
  const { ref, isVisible } = useScrollReveal();

  const features = [
    t('dppShowcase.feature1'),
    t('dppShowcase.feature2'),
    t('dppShowcase.feature3'),
    t('dppShowcase.feature4'),
  ];

  return (
    <section id="dpp-showcase" className="py-24 bg-slate-900 text-white overflow-hidden">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
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

            {/* Template Selector — Thumbnail Grid */}
            <div className="mt-8">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">
                {t('dppShowcase.template.modern').replace('Modern', '')}11 Templates
              </p>
              <div className="grid grid-cols-6 sm:grid-cols-11 gap-1.5">
                {templates.map((tmpl) => {
                  const thumb = templateThumbColors[tmpl];
                  return (
                    <button
                      key={tmpl}
                      onClick={() => setActive(tmpl)}
                      className={`group relative rounded-lg overflow-hidden transition-all h-14 ${
                        active === tmpl ? 'ring-2 ring-blue-400 scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={t(`dppShowcase.template.${tmpl}`)}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-b ${thumb.bg}`} />
                      <div className="absolute bottom-0 left-0 right-0 bg-white/90 px-1 py-0.5">
                        <div className={`h-0.5 w-3/4 ${thumb.accent} rounded-full mb-0.5`} />
                        <div className="h-0.5 w-1/2 bg-slate-200 rounded-full" />
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 text-[10px] text-slate-500 text-center">
                {t(`dppShowcase.template.${active}`)}
              </div>
            </div>
          </div>

          {/* Right: DPP Mockup */}
          <div className={isVisible ? 'animate-landing-reveal-right' : 'opacity-0 translate-x-10'}>
            <div className="max-w-sm mx-auto lg:ml-auto">
              <div key={active} className="animate-landing-template-switch">
                {templateMockups[active](t)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
