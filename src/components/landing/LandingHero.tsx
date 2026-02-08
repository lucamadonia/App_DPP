import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, BarChart3, QrCode, Users } from 'lucide-react';

const heroImages = [
  { src: '/hero-website.png', alt: 'Digital Product Passports & AI Compliance' },
  { src: '/hero-retail.png', alt: 'Consumer scanning QR code with Trackbliss' },
  { src: '/hero-photorealistic.png', alt: 'Warehouse tracking with Trackbliss' },
  { src: '/hero-illustration.png', alt: 'Global supply chain traceability' },
];

const particles = [
  { size: 6, color: 'bg-blue-400/40', top: '12%', left: '8%', delay: '0s' },
  { size: 4, color: 'bg-violet-400/30', top: '25%', left: '85%', delay: '1s' },
  { size: 5, color: 'bg-cyan-400/35', top: '60%', left: '5%', delay: '2s' },
  { size: 3, color: 'bg-emerald-400/30', top: '70%', left: '92%', delay: '3s' },
  { size: 4, color: 'bg-blue-400/25', top: '85%', left: '15%', delay: '4s' },
  { size: 5, color: 'bg-violet-400/35', top: '15%', left: '70%', delay: '1.5s' },
  { size: 3, color: 'bg-rose-400/25', top: '45%', left: '95%', delay: '2.5s' },
  { size: 4, color: 'bg-amber-400/20', top: '35%', left: '3%', delay: '3.5s' },
];

export function LandingHero() {
  const { t } = useTranslation('landing');
  const navigate = useNavigate();
  const [activeImg, setActiveImg] = useState(0);

  const nextImage = useCallback(() => {
    setActiveImg((prev) => (prev + 1) % heroImages.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextImage, 5000);
    return () => clearInterval(timer);
  }, [nextImage]);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Gradient Mesh Background + Grid Pattern */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(226,232,240,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(226,232,240,0.3)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-400/20 blur-3xl animate-landing-gradient-mesh" />
        <div className="absolute top-[20%] right-[-10%] h-[400px] w-[400px] rounded-full bg-violet-400/15 blur-3xl animate-landing-gradient-mesh [animation-delay:2s]" />
        <div className="absolute bottom-[-10%] left-[30%] h-[350px] w-[350px] rounded-full bg-cyan-400/15 blur-3xl animate-landing-gradient-mesh [animation-delay:4s]" />
        <div className="absolute top-[40%] left-[50%] h-[300px] w-[300px] rounded-full bg-emerald-400/10 blur-3xl animate-landing-gradient-mesh [animation-delay:6s]" />
      </div>

      {/* Floating Particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className={`landing-particle ${p.color}`}
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            animationDelay: p.delay,
            animationDuration: `${5 + i * 0.7}s`,
          }}
        />
      ))}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text */}
          <div className="animate-landing-reveal">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 mb-6">
              <ShieldCheck className="h-4 w-4" />
              EU ESPR 2024
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
              <span className="landing-text-shimmer">
                {t('hero.headline')}
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-xl leading-relaxed animate-landing-blur-in [animation-delay:0.3s]">
              {t('hero.sub1')}
            </p>
            <p className="mt-2 text-lg sm:text-xl text-slate-500 animate-landing-blur-in [animation-delay:0.5s]">
              {t('hero.sub2')}
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <button
                onClick={() => navigate('/login')}
                className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-700 hover:shadow-blue-600/40 transition-all hover:scale-[1.03] active:scale-[0.98] animate-landing-cta-glow"
              >
                {t('hero.cta.primary')}
              </button>
              <button
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="rounded-xl border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {t('hero.cta.secondary')}
              </button>
            </div>

            {/* Social Proof */}
            <div className="mt-8 flex items-center gap-3 animate-landing-blur-in [animation-delay:0.7s]">
              <div className="flex -space-x-2">
                {['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'].map((c, i) => (
                  <div key={i} className={`h-8 w-8 rounded-full ${c} border-2 border-white flex items-center justify-center`}>
                    <Users className="h-3.5 w-3.5 text-white" />
                  </div>
                ))}
              </div>
              <span className="text-sm text-slate-500">{t('hero.socialProof')}</span>
            </div>
          </div>

          {/* Right: Hero Image Carousel */}
          <div className="animate-landing-reveal [animation-delay:0.3s] hidden lg:block">
            <div className="relative">
              {/* Floating Badges */}
              <div className="absolute -top-3 -right-3 z-20 landing-glass rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg animate-landing-float">
                <ShieldCheck className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-700">ESPR 2024</span>
              </div>
              <div className="absolute top-1/3 -right-4 z-20 landing-glass rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg animate-landing-float [animation-delay:2s]">
                <QrCode className="h-4 w-4 text-violet-600" />
                <span className="text-xs font-semibold text-slate-700">GS1</span>
              </div>
              <div className="absolute bottom-12 -right-2 z-20 landing-glass rounded-xl px-3 py-2 flex items-center gap-2 shadow-lg animate-landing-float [animation-delay:4s]">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-slate-700">AI</span>
              </div>

              {/* Image Carousel */}
              <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/50 overflow-hidden animate-landing-glow-pulse">
                <div className="relative aspect-[16/10]">
                  {heroImages.map((img, i) => (
                    <img
                      key={img.src}
                      src={img.src}
                      alt={img.alt}
                      className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
                        i === activeImg ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Dot Indicators */}
              <div className="flex justify-center gap-2 mt-4">
                {heroImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === activeImg
                        ? 'w-6 bg-blue-600'
                        : 'w-2 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Hint - Animated Mouse */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="text-xs text-slate-400">{t('hero.scrollHint')}</span>
        <div className="h-8 w-5 rounded-full border-2 border-slate-300 flex justify-center pt-1.5">
          <div className="h-1.5 w-1 rounded-full bg-slate-400 animate-bounce" />
        </div>
      </div>
    </section>
  );
}
