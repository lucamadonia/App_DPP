import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { PLAN_CONFIGS, MODULE_CONFIGS, CREDIT_PACKS } from '@/types/billing';
import type { BillingPlan, ModuleId } from '@/types/billing';
import {
  Check, X, ArrowLeft, ArrowRight, Globe, Sparkles, Zap, Crown,
  ShieldCheck, CreditCard, Clock, RotateCcw, Building2, Users,
  Calculator, ChevronDown, Headphones, Server, Lock,
} from 'lucide-react';

const plans: BillingPlan[] = ['free', 'pro', 'enterprise'];

const moduleKeyMap: Record<ModuleId, string> = {
  returns_hub_starter: 'returnsHubStarter',
  returns_hub_professional: 'returnsHubProfessional',
  returns_hub_business: 'returnsHubBusiness',
  supplier_portal: 'supplierPortal',
  customer_portal: 'customerPortal',
  custom_domain: 'customDomain',
  warehouse_starter: 'warehouseStarter',
  warehouse_professional: 'warehouseProfessional',
  warehouse_business: 'warehouseBusiness',
};

const FEATURE_ROWS = [
  { key: 'products', free: '5', pro: '50', enterprise: 'unlimited' },
  { key: 'batchesPerProduct', free: '3', pro: '20', enterprise: 'unlimited' },
  { key: 'documents', free: '10', pro: '200', enterprise: 'unlimited' },
  { key: 'storage', free: '100 MB', pro: '2 GB', enterprise: '20 GB' },
  { key: 'adminUsers', free: '1', pro: '5', enterprise: '25' },
  { key: 'aiCredits', free: '3/mo', pro: '25/mo', enterprise: '100/mo' },
  { key: 'dppTemplates', free: '3', pro: '11', enterprise: '11 + CSS' },
  { key: 'visibilityTiers', free: '1', pro: '2', enterprise: '3' },
  { key: 'customBranding', free: false, pro: true, enterprise: true },
  { key: 'qrBranding', free: false, pro: true, enterprise: true },
  { key: 'whiteLabel', free: false, pro: false, enterprise: true },
  { key: 'customCSS', free: false, pro: false, enterprise: true },
  { key: 'complianceFull', free: false, pro: true, enterprise: true },
  { key: 'supplyChainEntries', free: '5/product', pro: '50/product', enterprise: 'unlimited' },
] as const;

const LANGS = ['en', 'de', 'el'] as const;
const LANG_LABELS: Record<string, string> = { en: 'English', de: 'Deutsch', el: '\u0395\u03bb\u03bb\u03b7\u03bd\u03b9\u03ba\u03ac' };

export function PricingPage() {
  const { t, i18n } = useTranslation('landing');
  const { t: tLegal } = useTranslation('legal');
  const navigate = useNavigate();
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [roiProducts, setRoiProducts] = useState(20);

  const cycleLang = () => {
    const idx = LANGS.indexOf(i18n.language as typeof LANGS[number]);
    const next = LANGS[(idx + 1) % LANGS.length];
    i18n.changeLanguage(next);
  };

  const getPrice = (plan: BillingPlan) => {
    const config = PLAN_CONFIGS[plan];
    if (plan === 'free') return 0;
    return interval === 'yearly'
      ? Math.round(config.priceYearly / 12)
      : config.priceMonthly;
  };

  // ROI calculator logic
  const manualHoursPerProduct = 4;
  const hourlyRate = 45;
  const trackblissHoursPerProduct = 0.5;
  const monthlySaved = roiProducts * (manualHoursPerProduct - trackblissHoursPerProduct) * hourlyRate;
  const recommendedPlan: BillingPlan = roiProducts <= 5 ? 'free' : roiProducts <= 50 ? 'pro' : 'enterprise';
  const planCost = getPrice(recommendedPlan);
  const netSavings = monthlySaved - planCost;

  const faqItems = [
    'switchPlans', 'cancelAnytime', 'creditsExpire', 'modulesStandalone',
    'trialLength', 'paymentMethods', 'vatIncluded', 'enterpriseCustom',
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/landing"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {tLegal('backToHome')}
          </Link>
          <div className="flex items-center gap-4">
            <button
              onClick={cycleLang}
              className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Globe className="h-4 w-4" />
              {LANG_LABELS[i18n.language] ?? 'English'}
            </button>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-violet-600 text-white font-bold text-[10px]">
              TB
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
            <Sparkles className="h-4 w-4" />
            {t('pricingPage.badge')}
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
            {t('pricingPage.headline')}
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            {t('pricingPage.subtitle')}
          </p>
        </div>

        {/* Monthly / Yearly Toggle */}
        <div className="flex justify-center mb-14">
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
          {plans.map((plan) => {
            const price = getPrice(plan);
            const isPro = plan === 'pro';
            const isEnterprise = plan === 'enterprise';

            return (
              <div key={plan} className="relative rounded-2xl flex flex-col">
                {isPro && (
                  <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-blue-500 via-violet-500 to-blue-500 bg-[length:200%_100%] animate-gradient-shift opacity-80" />
                )}
                {isEnterprise && (
                  <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-violet-400/20 to-purple-500/20" />
                )}

                <div className={`relative rounded-2xl bg-white p-7 flex flex-col flex-1 border ${
                  isPro ? 'border-transparent shadow-xl shadow-blue-500/10' :
                  isEnterprise ? 'border-violet-200/80 shadow-lg' :
                  'border-slate-200 shadow-sm'
                }`}>
                  {isPro && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-1.5 text-xs font-bold text-white shadow-lg shadow-blue-600/20 flex items-center gap-1.5">
                        <Zap className="h-3 w-3" />
                        {t('pricing.popular')}
                      </span>
                    </div>
                  )}

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

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-4xl font-bold ${
                        isPro ? 'landing-gradient-text' :
                        isEnterprise ? 'text-violet-700' :
                        'text-slate-900'
                      }`}>
                        {plan === 'free' ? t('pricing.free') : `\u20AC${price}`}
                      </span>
                      {plan !== 'free' && (
                        <span className="text-slate-500 text-sm">{t('pricing.perMonth')}</span>
                      )}
                    </div>
                    {plan !== 'free' && interval === 'yearly' && (
                      <p className="mt-1 text-xs text-emerald-600 font-medium">{t('pricing.billedYearly')}</p>
                    )}
                  </div>

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

        {/* Trust Signals */}
        <div className="flex flex-wrap justify-center gap-6 mt-10">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            {t('pricing.trust.noCreditCard')}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Clock className="h-4 w-4 text-blue-500" />
            {t('pricing.trust.cancelAnytime')}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ShieldCheck className="h-4 w-4 text-violet-500" />
            {t('pricing.trust.gdpr')}
          </div>
        </div>

        {/* Extended Feature Comparison */}
        <div className="mt-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {t('pricingPage.comparison.headline')}
            </h2>
            <p className="mt-2 text-slate-600">
              {t('pricingPage.comparison.subtitle')}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-4 px-4 font-semibold text-slate-700 w-2/5">{t('pricing.comparison.feature')}</th>
                  <th className="text-center py-4 px-4 font-semibold text-slate-700 w-1/5">Free</th>
                  <th className="text-center py-4 px-4 font-semibold text-blue-600 w-1/5 bg-blue-50/50 rounded-t-lg">Pro</th>
                  <th className="text-center py-4 px-4 font-semibold text-violet-600 w-1/5">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row) => (
                  <tr key={row.key} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 text-slate-700">{t(`pricingPage.featureRow.${row.key}`)}</td>
                    {(['free', 'pro', 'enterprise'] as const).map((plan) => {
                      const val = row[plan];
                      const isPro = plan === 'pro';
                      return (
                        <td key={plan} className={`text-center py-3 px-4 ${isPro ? 'bg-blue-50/30' : ''}`}>
                          {typeof val === 'boolean' ? (
                            val ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <X className="h-4 w-4 text-slate-300 mx-auto" />
                          ) : (
                            <span className="text-slate-700 font-medium">
                              {val === 'unlimited' ? t('pricing.comparison.unlimited') : val}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add-on Modules */}
        <div className="mt-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {t('pricing.addons.headline')}
            </h2>
            <p className="mt-2 text-slate-600">
              {t('pricing.addons.subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {([
              { id: 'returns_hub_starter' as ModuleId, icon: RotateCcw, gradient: 'from-rose-500 to-orange-500' },
              { id: 'returns_hub_professional' as ModuleId, icon: RotateCcw, gradient: 'from-orange-500 to-amber-500' },
              { id: 'returns_hub_business' as ModuleId, icon: RotateCcw, gradient: 'from-red-500 to-rose-500' },
              { id: 'supplier_portal' as ModuleId, icon: Building2, gradient: 'from-emerald-500 to-teal-500' },
              { id: 'customer_portal' as ModuleId, icon: Users, gradient: 'from-cyan-500 to-blue-500' },
              { id: 'custom_domain' as ModuleId, icon: Globe, gradient: 'from-violet-500 to-purple-500' },
            ]).map((mod) => {
              const config = MODULE_CONFIGS[mod.id];
              const key = moduleKeyMap[mod.id];
              return (
                <div key={mod.id} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow">
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
                      {'\u20AC'}{config.priceMonthly}
                      <span className="text-xs font-normal text-slate-500">{t('pricing.addons.perMonth')}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Credit Packs */}
        <div className="mt-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {t('pricing.credits.headline')}
            </h2>
            <p className="mt-2 text-slate-600">
              {t('pricing.credits.subtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-5 max-w-2xl mx-auto">
            {CREDIT_PACKS.map((pack) => (
              <div key={pack.id} className="rounded-xl border border-slate-200 bg-white p-6 text-center hover:shadow-md transition-shadow">
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
                  {'\u20AC'}{pack.priceEur}
                  <span className="text-xs font-normal text-slate-500 ml-1">{t('pricing.credits.oneTime')}</span>
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {'\u20AC'}{pack.pricePerCredit.toFixed(3)} {t('pricing.credits.perCredit')}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ROI Calculator */}
        <div className="mt-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center justify-center gap-3">
              <Calculator className="h-7 w-7 text-blue-600" />
              {t('pricingPage.roi.headline')}
            </h2>
            <p className="mt-2 text-slate-600">
              {t('pricingPage.roi.subtitle')}
            </p>
          </div>

          <div className="max-w-xl mx-auto rounded-2xl border border-slate-200 bg-slate-50 p-8">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              {t('pricingPage.roi.productsLabel')}
            </label>
            <input
              type="range"
              min={1}
              max={200}
              value={roiProducts}
              onChange={(e) => setRoiProducts(Number(e.target.value))}
              className="w-full accent-blue-600 mb-2"
            />
            <div className="flex justify-between text-sm text-slate-500 mb-6">
              <span>1</span>
              <span className="font-bold text-slate-900 text-lg">{roiProducts}</span>
              <span>200+</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">{t('pricingPage.roi.timeSaved')}</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {Math.round(roiProducts * (manualHoursPerProduct - trackblissHoursPerProduct))}h
                </p>
                <p className="text-xs text-slate-500">{t('pricingPage.roi.perMonth')}</p>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 p-4 text-center">
                <p className="text-xs text-slate-500 mb-1">{t('pricingPage.roi.moneySaved')}</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {'\u20AC'}{Math.round(netSavings > 0 ? netSavings : 0).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500">{t('pricingPage.roi.perMonth')}</p>
              </div>
            </div>

            <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-center">
              <p className="text-xs text-blue-600 font-medium mb-1">{t('pricingPage.roi.recommended')}</p>
              <p className="text-lg font-bold text-slate-900">
                {t(`pricing.plan.${recommendedPlan}.name`)}
                {recommendedPlan !== 'free' && (
                  <span className="text-sm font-normal text-slate-500 ml-2">
                    {'\u20AC'}{planCost}{t('pricing.perMonth')}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Enterprise Section */}
        <div className="mt-24">
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-purple-700 p-8 sm:p-12 text-white">
            <div className="max-w-3xl mx-auto text-center">
              <Crown className="h-10 w-10 mx-auto mb-4 text-amber-300" />
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                {t('pricingPage.enterprise.headline')}
              </h2>
              <p className="text-violet-200 text-lg mb-8">
                {t('pricingPage.enterprise.subtitle')}
              </p>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: Headphones, key: 'support' },
                  { icon: ShieldCheck, key: 'sla' },
                  { icon: Server, key: 'customDomain' },
                  { icon: Lock, key: 'security' },
                ].map((item) => (
                  <div key={item.key} className="rounded-xl bg-white/10 backdrop-blur-sm p-4 border border-white/10">
                    <item.icon className="h-6 w-6 text-amber-300 mb-2 mx-auto" />
                    <p className="text-sm font-medium">{t(`pricingPage.enterprise.feature.${item.key}`)}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-violet-700 px-8 py-3 text-sm font-semibold hover:bg-violet-50 transition-colors group"
              >
                {t('pricing.contactSales')}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Pricing FAQ */}
        <div className="mt-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
              {t('pricingPage.faq.headline')}
            </h2>
          </div>

          <div className="max-w-2xl mx-auto divide-y divide-slate-200">
            {faqItems.map((key, i) => (
              <div key={key}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between py-5 text-left"
                >
                  <span className="font-medium text-slate-900 pr-4">
                    {t(`pricingPage.faq.${key}.q`)}
                  </span>
                  <ChevronDown className={`h-5 w-5 text-slate-400 shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                <div className={`grid transition-all duration-300 ${openFaq === i ? 'grid-rows-[1fr] pb-5' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {t(`pricingPage.faq.${key}.a`)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-24 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
            {t('pricingPage.bottomCta.headline')}
          </h2>
          <p className="text-slate-600 mb-8 max-w-lg mx-auto">
            {t('pricingPage.bottomCta.subtitle')}
          </p>
          <button
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white px-8 py-3.5 text-sm font-semibold shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all group"
          >
            {t('pricingPage.bottomCta.cta')}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </main>
    </div>
  );
}
