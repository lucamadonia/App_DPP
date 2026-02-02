import { useTranslation } from 'react-i18next';
import { ShieldCheck, Globe, Award, CheckCircle, FileCheck, Scale } from 'lucide-react';

const badges = [
  { key: 'trust.eu', icon: Globe, color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { key: 'trust.espr', icon: ShieldCheck, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { key: 'trust.ce', icon: CheckCircle, color: 'text-slate-700 bg-slate-50 border-slate-200' },
  { key: 'trust.gs1', icon: Award, color: 'text-orange-700 bg-orange-50 border-orange-200' },
  { key: 'trust.reach', icon: FileCheck, color: 'text-cyan-700 bg-cyan-50 border-cyan-200' },
  { key: 'trust.gpsr', icon: Scale, color: 'text-violet-700 bg-violet-50 border-violet-200' },
  { key: 'trust.iso', icon: Award, color: 'text-teal-700 bg-teal-50 border-teal-200' },
];

export function LandingTrustBar() {
  const { t } = useTranslation('landing');

  // Duplicate for seamless marquee
  const allBadges = [...badges, ...badges];

  return (
    <section className="bg-slate-50 border-y border-slate-200/60 py-5 overflow-hidden">
      {/* Marquee badges */}
      <div className="flex animate-landing-marquee w-max">
        {allBadges.map((badge, i) => (
          <div
            key={`${badge.key}-${i}`}
            className={`relative mx-3 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap ${badge.color} overflow-hidden`}
          >
            <badge.icon className="h-4 w-4" />
            {t(badge.key)}
            {/* Shimmer overlay */}
            <div className="absolute inset-0 animate-landing-shimmer pointer-events-none" style={{ background: 'linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)', backgroundSize: '200% 100%' }} />
          </div>
        ))}
      </div>

      {/* Trusted by row */}
      <div className="mt-4 flex items-center justify-center gap-6 px-4">
        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
          {t('trust.trustedBy')}
        </span>
        <div className="flex items-center gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-6 rounded bg-slate-200/60"
              style={{ width: `${60 + i * 10}px` }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
