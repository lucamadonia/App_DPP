import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { CreditCard, Sparkles, Shield } from 'lucide-react';

export function LandingCTA() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="relative py-24 overflow-hidden text-white">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-violet-700" />

      {/* Animated mesh blobs */}
      <div className="absolute top-[-10%] left-[-5%] h-[300px] w-[300px] rounded-full bg-blue-500/20 blur-3xl animate-landing-gradient-mesh" />
      <div className="absolute bottom-[-10%] right-[-5%] h-[350px] w-[350px] rounded-full bg-violet-500/20 blur-3xl animate-landing-gradient-mesh [animation-delay:3s]" />
      <div className="absolute top-[30%] right-[20%] h-[200px] w-[200px] rounded-full bg-cyan-500/10 blur-3xl animate-landing-gradient-mesh [animation-delay:5s]" />

      {/* Floating Badges */}
      <div className="absolute top-12 left-[8%] hidden lg:flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 animate-landing-badge-float">
        <CreditCard className="h-4 w-4 text-blue-200" />
        <span className="text-xs font-medium text-blue-100">{t('cta.noCreditCard', 'No Credit Card')}</span>
      </div>
      <div className="absolute bottom-16 right-[10%] hidden lg:flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 animate-landing-badge-float [animation-delay:1.5s]">
        <Shield className="h-4 w-4 text-emerald-300" />
        <span className="text-xs font-medium text-blue-100">{t('cta.gdprCompliant', 'GDPR Compliant')}</span>
      </div>
      <div className="absolute top-20 right-[15%] hidden lg:flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2 animate-landing-badge-float [animation-delay:0.8s]">
        <Sparkles className="h-4 w-4 text-amber-300" />
        <span className="text-xs font-medium text-blue-100">{t('cta.startFree', 'Start Free')}</span>
      </div>

      <div ref={ref} className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
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
              className="rounded-xl bg-white px-8 py-3.5 text-base font-semibold text-blue-700 shadow-lg hover:bg-blue-50 transition-all hover:scale-[1.03] active:scale-[0.98] animate-landing-cta-glow"
            >
              {t('cta.primary')}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="rounded-xl border-2 border-white/30 px-8 py-3.5 text-base font-semibold text-white hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {t('cta.secondary')}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
