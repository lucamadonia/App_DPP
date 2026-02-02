import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';

export function LandingCTA() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700 text-white">
      <div ref={ref} className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <div className={isVisible ? 'animate-landing-reveal' : 'opacity-0 translate-y-8'}>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
            {t('cta.headline')}
          </h2>
          <p className="mt-6 text-lg text-blue-100 max-w-2xl mx-auto">
            {t('cta.subtitle')}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/login')}
              className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-all"
            >
              {t('cta.primary')}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="rounded-xl border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-all"
            >
              {t('cta.secondary')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
