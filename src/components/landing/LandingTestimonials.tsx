import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { Building2, Cpu, Info, Lightbulb, Shirt, ShoppingBag, TrendingUp, Users } from 'lucide-react';

/**
 * Illustrative scenarios, NOT customer quotes. The previous version showed
 * named people, companies and 5-star ratings without any real source, which is
 * an unfair-commercial-practice risk (UWG Annex no. 23b/23c). Until real,
 * approved pilot quotes exist, every card is labelled as an example scenario.
 */
const scenarios = [
  { key: 'testimonial1', icon: Shirt, accent: 'from-blue-500 to-indigo-500', companySize: '50–200' },
  { key: 'testimonial2', icon: Cpu, accent: 'from-emerald-500 to-teal-500', companySize: '200–500' },
  { key: 'testimonial3', icon: ShoppingBag, accent: 'from-violet-500 to-fuchsia-500', companySize: '10–50' },
] as const;

export function LandingTestimonials() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24 bg-white">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
          className={`text-center max-w-3xl mx-auto mb-14 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
            <Lightbulb className="h-4 w-4" />
            {t('testimonials.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            {t('testimonials.headline')}
          </h2>
          <p className="mt-4 text-lg text-slate-600">{t('testimonials.subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {scenarios.map((item, i) => {
            const Icon = item.icon;
            return (
              <article
                key={item.key}
                className={`relative flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm landing-card-hover transition-all duration-500 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                }`}
                style={{ transitionDelay: `${200 + i * 150}ms` }}
              >
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.accent} text-white shadow-md`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {t('testimonials.scenarioLabel')}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-slate-900">
                  {t(`testimonials.${item.key}.persona`)}
                </h3>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" aria-hidden="true" />
                    {t(`testimonials.${item.key}.industry`)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" aria-hidden="true" />
                    {t('testimonials.employees', { range: item.companySize })}
                  </span>
                </div>

                <p className="mt-4 flex-1 leading-relaxed text-slate-700">
                  {t(`testimonials.${item.key}.scenario`)}
                </p>

                <div className="mt-6 rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-violet-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-600/80">
                    {t('testimonials.outcomeLabel')}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                    <TrendingUp className="h-4 w-4 text-blue-600" aria-hidden="true" />
                    {t(`testimonials.${item.key}.metric`)}
                  </p>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mx-auto mt-8 flex max-w-2xl items-start justify-center gap-2 text-center text-xs text-slate-500">
          <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{t('testimonials.disclaimer')}</span>
        </p>
      </div>
    </section>
  );
}
