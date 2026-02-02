import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { Check, UserCircle, RotateCcw, MessageSquare, Palette, Fingerprint } from 'lucide-react';

const features = [
  { key: 'feature1', icon: RotateCcw },
  { key: 'feature2', icon: UserCircle },
  { key: 'feature3', icon: MessageSquare },
  { key: 'feature4', icon: Palette },
  { key: 'feature5', icon: Fingerprint },
];

export function LandingCustomerPortal() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24 bg-gradient-to-br from-blue-50/50 via-white to-violet-50/50">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div className={isVisible ? 'animate-landing-reveal-left' : 'opacity-0 -translate-x-10'}>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-sm font-medium text-emerald-700 mb-6">
              <UserCircle className="h-4 w-4" />
              White-Label
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              {t('customerPortal.title')}
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              {t('customerPortal.subtitle')}
            </p>
            <ul className="mt-8 space-y-4">
              {features.map((f) => (
                <li key={f.key} className="flex items-start gap-3">
                  <div className="rounded-full bg-emerald-100 p-1 mt-0.5 shrink-0">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  <span className="text-slate-700">{t(`customerPortal.${f.key}`)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Mockup */}
          <div className={isVisible ? 'animate-landing-reveal-right' : 'opacity-0 translate-x-10'}>
            <div className="rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden max-w-sm mx-auto lg:ml-auto">
              {/* Portal Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                    <UserCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold">{t('customerPortal.mockup.welcome')}</p>
                    <p className="text-emerald-100 text-xs">sarah.mueller@example.com</p>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { key: 'totalReturns', value: '8', color: 'text-slate-900' },
                    { key: 'openReturns', value: '2', color: 'text-amber-600' },
                    { key: 'completed', value: '6', color: 'text-emerald-600' },
                  ].map((stat) => (
                    <div key={stat.key} className="rounded-xl bg-slate-50 p-2.5 text-center">
                      <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                      <p className="text-[10px] text-slate-500">{t(`customerPortal.mockup.${stat.key}`)}</p>
                    </div>
                  ))}
                </div>

                {/* Recent Returns */}
                <div className="rounded-xl border border-slate-100 p-3">
                  <p className="text-xs font-medium text-slate-500 mb-2">{t('customerPortal.mockup.recentReturns')}</p>
                  {[
                    { id: 'RET-2024-041', status: 'Approved', statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    { id: 'RET-2024-039', status: 'Inspection', statusColor: 'bg-blue-50 text-blue-700 border-blue-200' },
                    { id: 'RET-2024-035', status: 'Completed', statusColor: 'bg-slate-50 text-slate-600 border-slate-200' },
                  ].map((ret) => (
                    <div key={ret.id} className="flex items-center justify-between py-2 border-t border-slate-50">
                      <div>
                        <p className="text-xs font-medium text-slate-700">{ret.id}</p>
                        <p className="text-[10px] text-slate-400">2 items</p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${ret.statusColor}`}>
                        {ret.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* CTA */}
                <button className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white">
                  {t('customerPortal.mockup.newReturn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
