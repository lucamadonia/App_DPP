import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { Clock, TrendingUp, DollarSign } from 'lucide-react';

const statusSteps = [
  { key: 'created', color: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { key: 'pending', color: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { key: 'approved', color: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { key: 'label', color: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { key: 'shipped', color: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { key: 'delivered', color: 'bg-emerald-500', ring: 'ring-emerald-200' },
  { key: 'inspection', color: 'bg-blue-500', ring: 'ring-blue-200', active: true },
  { key: 'refundProc', color: 'bg-slate-300', ring: 'ring-slate-100' },
  { key: 'refundDone', color: 'bg-slate-300', ring: 'ring-slate-100' },
  { key: 'completed', color: 'bg-slate-300', ring: 'ring-slate-100' },
];

const branchSteps = [
  { key: 'rejected', color: 'bg-red-500', ring: 'ring-red-200' },
  { key: 'cancelled', color: 'bg-slate-400', ring: 'ring-slate-200' },
];

const kpis = [
  { key: 'avgDays', icon: Clock, color: 'text-blue-600 bg-blue-50' },
  { key: 'sla', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'volume', icon: DollarSign, color: 'text-violet-600 bg-violet-50' },
];

export function LandingReturnFlow() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="return-flow" className="py-24 bg-white">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`text-center max-w-3xl mx-auto mb-16 ${isVisible ? 'animate-landing-reveal' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            {t('returnFlow.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {t('returnFlow.subtitle')}
          </p>
        </div>

        {/* Desktop Pipeline */}
        <div className="hidden lg:block mb-16">
          <div className={`relative ${isVisible ? 'animate-landing-reveal [animation-delay:0.3s]' : 'opacity-0'}`}>
            {/* Main Pipeline */}
            <div className="flex items-center justify-between max-w-5xl mx-auto">
              {statusSteps.map((step, i) => (
                <div key={step.key} className="flex items-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${step.color} ring-4 ${step.ring} transition-all duration-500`}
                      style={{ transitionDelay: `${i * 100}ms` }}
                    >
                      {i <= 5 && (
                        <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                      {step.active && (
                        <>
                          <div className="h-3 w-3 rounded-full bg-white animate-landing-pulse-dot" />
                          <div className="absolute inset-0 rounded-full bg-blue-400 opacity-30 animate-ping" />
                        </>
                      )}
                      {i > 6 && <div className="h-2 w-2 rounded-full bg-white/60" />}
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap ${step.active ? 'text-blue-600 font-semibold' : i <= 5 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {t(`returnFlow.status.${step.key}`)}
                    </span>
                  </div>
                  {i < statusSteps.length - 1 && (
                    <div className={`h-0.5 w-full min-w-[20px] mx-1 ${i < 6 ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Branch: Rejected / Cancelled */}
            <div className="flex items-center gap-6 mt-6 ml-[15%]">
              <div className="h-6 w-0.5 bg-slate-200 ml-8" />
              <div className="flex items-center gap-4">
                {branchSteps.map((step) => (
                  <div key={step.key} className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full ${step.color} ring-2 ${step.ring}`}>
                      <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      {t(`returnFlow.status.${step.key}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile: Vertical Timeline */}
        <div className="lg:hidden mb-12">
          <div className="relative ml-4">
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200" />
            {statusSteps.slice(0, 7).map((step, i) => (
              <div key={step.key} className={`relative flex items-center gap-4 pb-6 ${isVisible ? 'animate-landing-reveal' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full ${step.color} ring-2 ${step.ring}`}>
                  {i <= 5 && (
                    <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {step.active && <div className="h-2 w-2 rounded-full bg-white animate-landing-pulse-dot" />}
                </div>
                <span className={`text-sm font-medium ${step.active ? 'text-blue-600' : i <= 5 ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {t(`returnFlow.status.${step.key}`)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className={`grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto ${isVisible ? 'animate-landing-reveal [animation-delay:0.6s]' : 'opacity-0'}`}>
          {kpis.map((kpi) => (
            <div key={kpi.key} className="rounded-2xl border border-slate-200 bg-white p-5 text-center landing-card-hover">
              <div className={`inline-flex rounded-xl p-2.5 ${kpi.color} mb-3`}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {t(`returnFlow.kpi.${kpi.key}Value`)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {t(`returnFlow.kpi.${kpi.key}`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
