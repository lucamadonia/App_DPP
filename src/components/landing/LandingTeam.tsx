import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Package, Sparkles } from 'lucide-react';

export function LandingTeam() {
  const { t } = useTranslation('landing');
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className={`text-center mb-14 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-4 py-1.5 text-sm font-medium text-blue-700 mb-4">
            <Sparkles className="h-4 w-4" />
            {t('team.badge')}
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
            {t('team.headline')}
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            {t('team.description')}
          </p>
        </div>

        {/* Two Images */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Team Collaboration */}
          <div
            className={`group relative rounded-2xl overflow-hidden shadow-lg transition-all duration-700 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '200ms' }}
          >
            <img
              src="/team-collaboration.png"
              alt={t('team.collaboration.alt')}
              className="w-full aspect-[16/10] object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <Users className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {t('team.collaboration.title')}
                </h3>
              </div>
              <p className="text-sm text-white/80">
                {t('team.collaboration.description')}
              </p>
            </div>
          </div>

          {/* Daily Operations */}
          <div
            className={`group relative rounded-2xl overflow-hidden shadow-lg transition-all duration-700 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={{ transitionDelay: '400ms' }}
          >
            <img
              src="/team-operations.png"
              alt={t('team.operations.alt')}
              className="w-full aspect-[16/10] object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  {t('team.operations.title')}
                </h3>
              </div>
              <p className="text-sm text-white/80">
                {t('team.operations.description')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
