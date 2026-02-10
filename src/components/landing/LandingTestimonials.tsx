import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { Star, Quote, Building2, Users } from 'lucide-react';

const testimonials = [
  {
    key: 'testimonial1',
    avatar: 'bg-blue-500',
    initials: 'MK',
    stars: 5,
    companySize: '50-200',
  },
  {
    key: 'testimonial2',
    avatar: 'bg-emerald-500',
    initials: 'SB',
    stars: 5,
    companySize: '200-500',
  },
  {
    key: 'testimonial3',
    avatar: 'bg-violet-500',
    initials: 'JR',
    stars: 5,
    companySize: '10-50',
  },
];

export function LandingTestimonials() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24 bg-white">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
            <Quote className="h-4 w-4" />
            {t('testimonials.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            {t('testimonials.headline')}
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            {t('testimonials.subtitle')}
          </p>
        </div>

        {/* Testimonial Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((item, i) => (
            <div
              key={item.key}
              className={`relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm landing-card-hover transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: `${200 + i * 150}ms` }}
            >
              {/* Quote Icon */}
              <Quote className="h-8 w-8 text-blue-100 mb-4" />

              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: item.stars }).map((_, s) => (
                  <Star
                    key={s}
                    className="h-4 w-4 text-amber-400 fill-amber-400"
                  />
                ))}
              </div>

              {/* Quote Text */}
              <p className="text-slate-700 leading-relaxed mb-6">
                "{t(`testimonials.${item.key}.quote`)}"
              </p>

              {/* Metric Highlight */}
              <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 mb-6">
                <p className="text-sm font-semibold text-blue-700">
                  {t(`testimonials.${item.key}.metric`)}
                </p>
              </div>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${item.avatar} text-white text-sm font-bold`}
                >
                  {item.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {t(`testimonials.${item.key}.name`)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t(`testimonials.${item.key}.role`)}
                  </p>
                </div>
              </div>

              {/* Company Info */}
              <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {t(`testimonials.${item.key}.industry`)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {item.companySize}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
