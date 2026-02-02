import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { Users, Shield, Lock, Check, X, Settings } from 'lucide-react';

const tiers = [
  { key: 'consumer', icon: Users, color: 'bg-emerald-500', ring: 'ring-emerald-200', textColor: 'text-emerald-600', bgLight: 'bg-emerald-50', size: 'h-44 w-44 sm:h-52 sm:w-52' },
  { key: 'customs', icon: Shield, color: 'bg-amber-500', ring: 'ring-amber-200', textColor: 'text-amber-600', bgLight: 'bg-amber-50', size: 'h-36 w-36 sm:h-44 sm:w-44' },
  { key: 'internal', icon: Lock, color: 'bg-slate-600', ring: 'ring-slate-300', textColor: 'text-slate-600', bgLight: 'bg-slate-50', size: 'h-28 w-28 sm:h-36 sm:w-36' },
];

const matrixRows = [
  { key: 'productName', consumer: true, customs: true, internal: true },
  { key: 'material', consumer: true, customs: true, internal: true },
  { key: 'hsCode', consumer: false, customs: true, internal: true },
  { key: 'internalNotes', consumer: false, customs: false, internal: true },
  { key: 'purchasePrice', consumer: false, customs: false, internal: true },
];

const visFeatures = ['feature1', 'feature2', 'feature3'];

export function LandingVisibility() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="visibility" className="py-24 bg-slate-50">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 ${isVisible ? 'animate-landing-reveal' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            {t('visibility.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {t('visibility.subtitle')}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Layer Visualization + Matrix */}
          <div className={isVisible ? 'animate-landing-reveal-left' : 'opacity-0 -translate-x-10'}>
            {/* Layer Circles */}
            <div className="flex justify-center mb-10">
              <div className="relative flex items-center justify-center h-56 sm:h-64">
                {tiers.map((tier, i) => (
                  <div
                    key={tier.key}
                    className={`absolute flex flex-col items-center justify-center rounded-full border-2 ${tier.bgLight} border-current ${tier.textColor} transition-all duration-700 ${tier.size} ${
                      isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                    }`}
                    style={{ transitionDelay: `${(2 - i) * 200}ms`, zIndex: 3 - i }}
                  >
                    <tier.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${tier.textColor} mb-1`} />
                    <span className={`text-xs sm:text-sm font-semibold ${tier.textColor}`}>
                      {t(`visibility.${tier.key}`)}
                    </span>
                    <span className={`text-[10px] sm:text-xs ${tier.textColor} opacity-70`}>
                      {t(`visibility.${tier.key}.fields`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Matrix Table */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500">Field</th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-emerald-600">
                      <Users className="h-3.5 w-3.5 inline mr-1" />
                      {t('visibility.consumer')}
                    </th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-amber-600">
                      <Shield className="h-3.5 w-3.5 inline mr-1" />
                      {t('visibility.customs')}
                    </th>
                    <th className="px-3 py-2.5 text-center text-xs font-medium text-slate-600">
                      <Lock className="h-3.5 w-3.5 inline mr-1" />
                      {t('visibility.internal')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {matrixRows.map((row, i) => (
                    <tr key={row.key} className={`border-t border-slate-50 ${isVisible ? 'animate-landing-reveal' : 'opacity-0'}`}
                      style={{ animationDelay: `${600 + i * 100}ms` }}
                    >
                      <td className="px-4 py-2.5 text-sm text-slate-700 font-medium">
                        {t(`visibility.matrix.${row.key}`)}
                      </td>
                      {(['consumer', 'customs', 'internal'] as const).map((tier) => (
                        <td key={tier} className="px-3 py-2.5 text-center">
                          {row[tier] ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100">
                              <Check className="h-3 w-3 text-emerald-600" />
                            </span>
                          ) : (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-50">
                              <X className="h-3 w-3 text-red-400" />
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right: Features */}
          <div className={`lg:pt-16 ${isVisible ? 'animate-landing-reveal-right' : 'opacity-0 translate-x-10'}`}>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-700 mb-6">
              <Settings className="h-4 w-4" />
              Per-Field Control
            </div>

            <div className="space-y-6">
              {tiers.map((tier) => (
                <div key={tier.key} className="rounded-xl border border-slate-200 bg-white p-5 landing-card-hover">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`rounded-lg p-2 ${tier.color}`}>
                      <tier.icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{t(`visibility.${tier.key}`)}</h3>
                      <p className="text-xs text-slate-500">{t(`visibility.${tier.key}.fields`)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <ul className="mt-8 space-y-3">
              {visFeatures.map((key) => (
                <li key={key} className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-100 p-1 mt-0.5 shrink-0">
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-slate-700">{t(`visibility.${key}`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
