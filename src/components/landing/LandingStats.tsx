import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Scale, QrCode, Mail, GitBranch, LayoutGrid, Settings, Eye } from 'lucide-react';

const stats = [
  { value: 38, suffix: '+', key: 'stats.countries', icon: Globe, color: 'text-blue-600 bg-blue-100' },
  { value: 50, suffix: '+', key: 'stats.regulations', icon: Scale, color: 'text-emerald-600 bg-emerald-100' },
  { value: 11, suffix: '', key: 'stats.dppTemplates', icon: QrCode, color: 'text-violet-600 bg-violet-100' },
  { value: 15, suffix: '', key: 'stats.emailTemplates', icon: Mail, color: 'text-cyan-600 bg-cyan-100' },
  { value: 12, suffix: '', key: 'stats.returnStatus', icon: GitBranch, color: 'text-rose-600 bg-rose-100' },
  { value: 9, suffix: '', key: 'stats.blockTypes', icon: LayoutGrid, color: 'text-amber-600 bg-amber-100' },
  { value: 7, suffix: '', key: 'stats.settingsTabs', icon: Settings, color: 'text-indigo-600 bg-indigo-100' },
  { value: 3, suffix: '', key: 'stats.visibilityTiers', icon: Eye, color: 'text-teal-600 bg-teal-100' },
];

export function LandingStats() {
  const { t } = useTranslation('landing');
  const sectionRef = useRef<HTMLDivElement>(null);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTriggered(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="stats" ref={sectionRef} className="py-20 bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <div
              key={stat.key}
              className={`text-center rounded-2xl border border-slate-200/80 bg-white p-5 landing-card-hover transition-all duration-500 ${
                triggered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={`inline-flex rounded-xl p-2.5 ${stat.color} mb-3`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} triggered={triggered} />
              </div>
              <p className="mt-1.5 text-sm text-slate-600 font-medium">
                {t(stat.key)}
              </p>
              <div className="mt-2 h-0.5 w-10 mx-auto rounded-full bg-gradient-to-r from-blue-400 to-violet-400 opacity-40" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AnimatedCounter({ target, suffix, triggered }: { target: number; suffix: string; triggered: boolean }) {
  const [count, setCount] = useState(0);
  const frameRef = useRef<number>(0);

  const animate = useCallback(() => {
    const duration = 1500;
    const start = performance.now();

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      }
    }

    frameRef.current = requestAnimationFrame(step);
  }, [target]);

  useEffect(() => {
    if (triggered) {
      animate();
    }
    return () => cancelAnimationFrame(frameRef.current);
  }, [triggered, animate]);

  return (
    <span className={`text-3xl sm:text-4xl font-bold text-slate-900 tabular-nums ${triggered ? 'animate-landing-counter-pop' : ''}`}>
      {count}{suffix}
    </span>
  );
}
