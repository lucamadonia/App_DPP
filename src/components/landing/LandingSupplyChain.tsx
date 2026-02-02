import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { TreePine, Factory, ClipboardCheck, Truck, User } from 'lucide-react';

const steps = [
  { key: 'step1', icon: TreePine, color: 'bg-emerald-100 text-emerald-600 border-emerald-200', lineColor: 'from-emerald-400', badges: ['GTIN', 'Origin'] },
  { key: 'step2', icon: Factory, color: 'bg-blue-100 text-blue-600 border-blue-200', lineColor: 'from-blue-400', badges: ['Batch #', 'S/N'] },
  { key: 'step3', icon: ClipboardCheck, color: 'bg-amber-100 text-amber-600 border-amber-200', lineColor: 'from-amber-400', badges: ['Score', 'Cert'] },
  { key: 'step4', icon: Truck, color: 'bg-violet-100 text-violet-600 border-violet-200', lineColor: 'from-violet-400', badges: ['HS-Code', 'Weight'] },
  { key: 'step5', icon: User, color: 'bg-rose-100 text-rose-600 border-rose-200', lineColor: 'from-rose-400', badges: ['QR', 'DPP'] },
];

export function LandingSupplyChain() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section id="supply-chain" className="py-24 bg-[linear-gradient(rgba(226,232,240,0.4)_1px,transparent_1px),linear-gradient(90deg,rgba(226,232,240,0.4)_1px,transparent_1px)] bg-[size:40px_40px] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div ref={ref} className={`text-center max-w-3xl mx-auto mb-16 ${isVisible ? 'animate-landing-reveal' : 'opacity-0 translate-y-8'}`}>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            {t('supplyChain.title')}
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {t('supplyChain.subtitle')}
          </p>
        </div>

        {/* Desktop: Horizontal Flow with Detail Cards */}
        <div className="hidden lg:block">
          <div className="relative max-w-5xl mx-auto">
            {/* Connecting Line */}
            <div className="absolute top-10 left-[10%] right-[10%] h-0.5">
              <div
                className={`h-full bg-gradient-to-r from-emerald-400 via-blue-400 to-rose-400 transition-all duration-1000 origin-left ${
                  isVisible ? 'scale-x-100' : 'scale-x-0'
                }`}
                style={{ backgroundSize: '200% 100%' }}
              />
              {/* Animated dots on line */}
              {isVisible && (
                <>
                  <div className="absolute top-[-2px] left-[20%] h-1.5 w-1.5 rounded-full bg-emerald-400 animate-landing-pulse-dot" />
                  <div className="absolute top-[-2px] left-[40%] h-1.5 w-1.5 rounded-full bg-blue-400 animate-landing-pulse-dot [animation-delay:0.5s]" />
                  <div className="absolute top-[-2px] left-[60%] h-1.5 w-1.5 rounded-full bg-amber-400 animate-landing-pulse-dot [animation-delay:1s]" />
                  <div className="absolute top-[-2px] left-[80%] h-1.5 w-1.5 rounded-full bg-violet-400 animate-landing-pulse-dot [animation-delay:1.5s]" />
                </>
              )}
            </div>

            <div className="flex items-start justify-between">
              {steps.map((step, i) => (
                <div
                  key={step.key}
                  className={`relative z-10 flex flex-col items-center w-[18%] ${
                    isVisible ? 'animate-landing-reveal-scale' : 'opacity-0 scale-90'
                  }`}
                  style={{ animationDelay: isVisible ? `${i * 200}ms` : undefined }}
                >
                  {/* Data Badges above */}
                  <div className="flex gap-1 mb-2 h-5">
                    {step.badges.map((badge) => (
                      <span key={badge} className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[9px] font-medium text-slate-500 shadow-sm">
                        {badge}
                      </span>
                    ))}
                  </div>

                  {/* Icon */}
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl border-2 ${step.color} bg-white shadow-sm`}>
                    <step.icon className="h-7 w-7" />
                  </div>

                  <span className="mt-3 text-sm font-semibold text-slate-700">
                    {t(`supplyChain.${step.key}`)}
                  </span>

                  {/* Detail Card */}
                  <div className="mt-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm w-full">
                    <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                      {t(`supplyChain.${step.key}.detail`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: Vertical Flow */}
        <div className="lg:hidden space-y-0">
          {steps.map((step, i) => (
            <div key={step.key} className="flex flex-col items-center">
              <div
                className={`flex flex-col items-center ${
                  isVisible ? 'animate-landing-reveal' : 'opacity-0 translate-y-8'
                }`}
                style={{ animationDelay: isVisible ? `${i * 150}ms` : undefined }}
              >
                <div className={`flex h-14 w-14 items-center justify-center rounded-xl border-2 ${step.color} bg-white shadow-sm`}>
                  <step.icon className="h-6 w-6" />
                </div>
                <span className="mt-2 text-sm font-semibold text-slate-700">
                  {t(`supplyChain.${step.key}`)}
                </span>
                <p className="mt-1 text-xs text-slate-500 text-center max-w-[200px]">
                  {t(`supplyChain.${step.key}.detail`)}
                </p>
              </div>
              {i < steps.length - 1 && (
                <div className="h-8 w-0.5 bg-gradient-to-b from-slate-300 to-slate-200 my-2 relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-slate-400 animate-landing-pulse-dot" />
                </div>
              )}
            </div>
          ))}
        </div>

        <p className={`text-center mt-12 text-lg font-medium text-slate-500 ${isVisible ? 'animate-landing-reveal [animation-delay:1s]' : 'opacity-0'}`}>
          {t('supplyChain.caption')}
        </p>
      </div>
    </section>
  );
}
