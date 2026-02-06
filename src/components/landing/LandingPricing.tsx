import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { PLAN_CONFIGS, MODULE_CONFIGS, CREDIT_PACKS } from '@/types/billing';
import type { BillingPlan, ModuleId } from '@/types/billing';
import { Check, RotateCcw, Building2, Users, Globe, Sparkles, Zap, Crown, ArrowRight } from 'lucide-react';

const plans: BillingPlan[] = ['free', 'pro', 'enterprise'];

const moduleList: { id: ModuleId; icon: typeof RotateCcw; gradient: string }[] = [
  { id: 'returns_hub_starter', icon: RotateCcw, gradient: 'from-rose-500 to-orange-500' },
  { id: 'returns_hub_professional', icon: RotateCcw, gradient: 'from-orange-500 to-amber-500' },
  { id: 'returns_hub_business', icon: RotateCcw, gradient: 'from-red-500 to-rose-500' },
  { id: 'supplier_portal', icon: Building2, gradient: 'from-emerald-500 to-teal-500' },
  { id: 'customer_portal', icon: Users, gradient: 'from-cyan-500 to-blue-500' },
  { id: 'custom_domain', icon: Globe, gradient: 'from-violet-500 to-purple-500' },
];

const moduleKeyMap: Record<ModuleId, string> = {
  returns_hub_starter: 'returnsHubStarter',
  returns_hub_professional: 'returnsHubProfessional',
  returns_hub_business: 'returnsHubBusiness',
  supplier_portal: 'supplierPortal',
  customer_portal: 'customerPortal',
  custom_domain: 'customDomain',
};

export function LandingPricing() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const { ref, isVisible } = useScrollReveal();
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');

  const getPrice = (plan: BillingPlan) => {
    const config = PLAN_CONFIGS[plan];
    if (plan === 'free') return 0;
    return interval === 'yearly'
      ? Math.round(config.priceYearly / 12)
      : config.priceMonthly;
  };

  const requiresBadge = (moduleId: ModuleId) => {
    const config = MODULE_CONFIGS[moduleId];
    if (moduleId === 'customer_portal') return t('pricing.addons.requiresReturnsHub');
    if (config.requiresPlan === 'enterprise') return t('pricing.addons.requiresEnterprise');
    return t('pricing.addons.requiresPro');
  };

  return (
    <section id="pricing" className="relative py-24 overflow-hidden" ref={ref}>
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 via-white to-slate-50/50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[500px] w-[800px] rounded-full bg-blue-100/30 blur-3xl" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className={`text-center mb-14 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
            <Sparkles className="h-4 w-4" />
            {t('pricing.headline')}
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
            <span className="landing-gradient-text">{t('pricing.headline')}</span>
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>

        {/* Monthly / Yearly Toggle */}
        <div className={`flex justify-center mb-14 transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="relative inline-flex items-center rounded-full bg-slate-100 p-1 shadow-inner">
            <button
              onClick={() => setInterval('monthly')}
              className={`relative z-10 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 ${
                interval === 'monthly'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setInterval('yearly')}
              className={`relative z-10 rounded-full px-6 py-2.5 text-sm font-semibold transition-all duration-300 flex items-center gap-2 ${
                interval === 'yearly'
                  ? 'bg-white text-slate-900 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('pricing.yearly')}
              <span className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-2.5 py-0.5 text-xs font-bold shadow-sm">
                {t('pricing.savePercent')}
              </span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => {
            const price = getPrice(plan);
            const isPro = plan === 'pro';
            const isEnterprise = plan === 'enterprise';

            return (
              <div
                key={plan}
                className={`relative rounded-2xl flex flex-col transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                } ${isPro ? 'landing-3d-card' : 'landing-card-hover'}`}
                style={{ transitionDelay: `${200 + i * 120}ms` }}
              >
                {/* Gradient border wrapper for Pro */}
                {isPro && (
                  <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500 bg-[length:200%_100%] animate-gradient-shift opacity-80" />
                )}
                {/* Glow for Enterprise */}
                {isEnterprise && (
                  <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-violet-400/20 to-purple-500/20 animate-landing-glow-border" />
                )}

                <div className={`relative rounded-2xl bg-white p-7 flex flex-col flex-1 border ${
                  isPro ? 'border-transparent shadow-xl shadow-blue-500/10' :
                  isEnterprise ? 'border-violet-200/80 shadow-lg' :
                  'border-slate-200 shadow-sm'
                }`}>
                  {/* Popular Badge */}
                  {isPro && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 flex items-center gap-1.5">
                        <Zap className="h-3 w-3" />
                        {t('pricing.popular')}
                      </span>
                    </div>
                  )}

                  {/* Plan Icon + Name */}
                  <div className="mb-6">
                    <div className={`inline-flex rounded-xl p-2.5 mb-3 ${
                      isPro ? 'bg-blue-100 text-blue-600' :
                      isEnterprise ? 'bg-violet-100 text-violet-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {isEnterprise ? <Crown className="h-5 w-5" /> :
                       isPro ? <Zap className="h-5 w-5" /> :
                       <Sparkles className="h-5 w-5" />}
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {t(`pricing.plan.${plan}.name`)}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {t(`pricing.plan.${plan}.desc`)}
                    </p>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-bold ${
                        isPro ? 'landing-gradient-text' :
                        isEnterprise ? 'text-violet-700' :
                        'text-slate-900'
                      }`}>
                        {plan === 'free' ? t('pricing.free') : `€${price}`}
                      </span>
                      {plan !== 'free' && (
                        <span className="text-slate-500 text-sm">
                          {t('pricing.perMonth')}
                        </span>
                      )}
                    </div>
                    {plan !== 'free' && interval === 'yearly' && (
                      <p className="mt-1 text-xs text-emerald-600 font-medium">
                        {t('pricing.billedYearly')}
                      </p>
                    )}
                  </div>

                  {/* Feature List */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <li key={n} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <div className={`rounded-full p-0.5 mt-0.5 shrink-0 ${
                          isPro ? 'bg-blue-100 text-blue-600' :
                          isEnterprise ? 'bg-violet-100 text-violet-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          <Check className="h-3 w-3" />
                        </div>
                        <span>{t(`pricing.plan.${plan}.f${n}`)}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    onClick={() => navigate('/login')}
                    className={`w-full rounded-xl py-3 text-sm font-semibold transition-all flex items-center justify-center gap-2 group ${
                      isPro
                        ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98]'
                        : isEnterprise
                        ? 'bg-violet-600 text-white hover:bg-violet-700 hover:scale-[1.02] active:scale-[0.98]'
                        : 'bg-slate-900 text-white hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    {plan === 'free' ? t('pricing.getStarted') :
                     plan === 'pro' ? t('pricing.startTrial') :
                     t('pricing.contactSales')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add-on Modules */}
        <div className={`mt-24 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '600ms' }}>
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {t('pricing.addons.headline')}
            </h3>
            <p className="mt-2 text-slate-600">
              {t('pricing.addons.subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {moduleList.map((mod, i) => {
              const config = MODULE_CONFIGS[mod.id];
              const key = moduleKeyMap[mod.id];
              return (
                <div
                  key={mod.id}
                  className={`group rounded-xl border border-slate-200 bg-white p-5 landing-3d-card transition-all duration-500 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                  }`}
                  style={{ transitionDelay: `${700 + i * 80}ms` }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`rounded-lg p-2 bg-gradient-to-br ${mod.gradient} text-white shadow-sm`}>
                      <mod.icon className="h-4 w-4" />
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      {t(`pricing.addons.${key}.name`)}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                    {t(`pricing.addons.${key}.desc`)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-slate-900">
                      €{config.priceMonthly}
                      <span className="text-xs font-normal text-slate-500">{t('pricing.addons.perMonth')}</span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-600">
                      {requiresBadge(mod.id)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Credit Packs */}
        <div className={`mt-20 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: '900ms' }}>
          <div className="text-center mb-10">
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {t('pricing.credits.headline')}
            </h3>
            <p className="mt-2 text-slate-600">
              {t('pricing.credits.subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 max-w-2xl mx-auto">
            {CREDIT_PACKS.map((pack, i) => (
              <div
                key={pack.id}
                className={`group rounded-xl border border-slate-200 bg-white p-6 text-center landing-3d-card transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
                style={{ transitionDelay: `${1000 + i * 80}ms` }}
              >
                <div className="inline-flex rounded-xl p-2.5 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm mb-3">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {t(`pricing.credits.${pack.id}`)}
                </h4>
                <p className="text-3xl font-bold text-slate-900 mt-2">
                  {pack.credits} <span className="text-xs font-normal text-slate-500">{t('pricing.credits.credits')}</span>
                </p>
                <p className="text-xl font-bold text-slate-900 mt-2">
                  €{pack.priceEur}
                  <span className="text-xs font-normal text-slate-500 ml-1">{t('pricing.credits.oneTime')}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  €{pack.pricePerCredit.toFixed(3)} {t('pricing.credits.perCredit')}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
