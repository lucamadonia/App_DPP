import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { Atom, AlertTriangle, AlertCircle, Info, OctagonAlert, Check, FileDown, Waypoints } from 'lucide-react';

const phases = [
  { key: 'espr', progress: 100, color: 'bg-blue-500' },
  { key: 'reach', progress: 100, color: 'bg-violet-500' },
  { key: 'gpsr', progress: 85, color: 'bg-emerald-500' },
  { key: 'battery', progress: 100, color: 'bg-amber-500' },
  { key: 'ppwr', progress: 70, color: 'bg-rose-500' },
  { key: 'rohs', progress: 100, color: 'bg-cyan-500' },
];

const findings = ['finding1', 'finding2', 'finding3', 'finding4', 'finding5', 'finding6'];

const actionPlan = [
  { key: 'p1', priority: 'P1', color: 'bg-red-500', borderColor: 'border-red-500/30' },
  { key: 'p2', priority: 'P2', color: 'bg-amber-500', borderColor: 'border-amber-500/30' },
  { key: 'p3', priority: 'P3', color: 'bg-blue-500', borderColor: 'border-blue-500/30' },
];

function useAnimatedScore(target: number, isVisible: boolean) {
  const [score, setScore] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 1500;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      setScore(current);
      if (progress < 1) {
        ref.current = requestAnimationFrame(tick);
      }
    }

    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [isVisible, target]);

  return score;
}

export function LandingAISection() {
  const { t } = useTranslation('landing');
  const { ref, isVisible } = useScrollReveal();
  const score = useAnimatedScore(87, isVisible);

  // Stroke-dashoffset: 188 total, 87/100 = target offset ~24
  const gaugeOffset = isVisible ? 188 - (188 * score) / 100 : 188;

  const features = [
    t('ai.feature1'),
    t('ai.feature2'),
    t('ai.feature3'),
    t('ai.feature4'),
  ];

  return (
    <section id="ai" className="py-24 bg-white">
      <div ref={ref} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left: Score Gauge Mockup */}
          <div className={isVisible ? 'animate-landing-reveal-left' : 'opacity-0 -translate-x-10'}>
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg max-w-md mx-auto lg:mx-0" style={{ borderImage: 'linear-gradient(135deg, #3b82f6, #8b5cf6) 1' }}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 p-2.5">
                    <Atom className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{t('ai.scoreLabel')}</p>
                    <p className="text-xs text-slate-500">ESPR · REACH · GPSR · Battery · PPWR · RoHS</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600">
                  <FileDown className="h-3.5 w-3.5" />
                  {t('ai.pdfExport')}
                </div>
              </div>

              {/* 6-Phase Progress */}
              <div className="mb-5 space-y-1.5">
                {phases.map((phase) => (
                  <div key={phase.key} className="flex items-center gap-3">
                    <span className="text-[10px] font-medium text-slate-500 w-20 truncate">{t(`ai.phase.${phase.key}`)}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100">
                      <div
                        className={`h-1.5 rounded-full ${phase.color} transition-all duration-1000`}
                        style={{ width: isVisible ? `${phase.progress}%` : '0%' }}
                      />
                    </div>
                    {phase.progress === 100 ? (
                      <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-[9px] text-slate-400 w-7 text-right">{phase.progress}%</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Score Gauge with animated counter */}
              <div className="flex justify-center mb-5">
                <svg width="160" height="100" viewBox="0 0 160 100">
                  <path d="M 20 90 A 60 60 0 0 1 140 90" fill="none" stroke="#e2e8f0" strokeWidth="12" strokeLinecap="round" />
                  <path
                    d="M 20 90 A 60 60 0 0 1 140 90"
                    fill="none"
                    stroke="url(#gauge-gradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray="188"
                    strokeDashoffset={gaugeOffset}
                    style={{ transition: 'stroke-dashoffset 0.05s linear' }}
                  />
                  <defs>
                    <linearGradient id="gauge-gradient" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <text x="80" y="78" textAnchor="middle" fontSize="32" fontWeight="bold" fill="#3b82f6">
                    {score}
                  </text>
                  {score >= 70 && (
                    <text x="80" y="92" textAnchor="middle" fontSize="9" fill="#16a34a" fontWeight="600">
                      {t('ai.scoreGood')}
                    </text>
                  )}
                </svg>
              </div>

              {/* Risk Cards — 4 levels */}
              <div className="space-y-1.5 mb-4">
                {[
                  { icon: OctagonAlert, label: t('ai.risk.critical'), desc: t('ai.risk.criticalDesc'), color: 'text-red-700 bg-red-50 border-red-200', severity: 95 },
                  { icon: AlertTriangle, label: t('ai.risk.high'), desc: t('ai.risk.highDesc'), color: 'text-red-600 bg-red-50 border-red-100', severity: 75 },
                  { icon: AlertCircle, label: t('ai.risk.medium'), desc: t('ai.risk.mediumDesc'), color: 'text-amber-600 bg-amber-50 border-amber-100', severity: 50 },
                  { icon: Info, label: t('ai.risk.low'), desc: t('ai.risk.lowDesc'), color: 'text-blue-600 bg-blue-50 border-blue-100', severity: 20 },
                ].map((risk) => (
                  <div key={risk.label} className={`flex items-start gap-2.5 rounded-xl border p-2.5 ${risk.color}`}>
                    <risk.icon className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{risk.label}</p>
                      <p className="text-[10px] opacity-80 mt-0.5">{risk.desc}</p>
                      <div className="mt-1 h-1 w-full rounded-full bg-white/50">
                        <div className="h-1 rounded-full bg-current opacity-40" style={{ width: `${risk.severity}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Findings with streaming effect */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 mb-3">
                <p className="text-[9px] font-medium text-slate-400 uppercase mb-2">Findings</p>
                <div className="space-y-1.5">
                  {findings.map((key, i) => (
                    <div
                      key={key}
                      className="flex items-start gap-2"
                      style={isVisible ? { animation: `landing-typewriter 0.8s steps(50) ${0.5 + i * 0.3}s both` } : { opacity: 0 }}
                    >
                      <div className={`h-1 w-1 rounded-full mt-1.5 shrink-0 ${i < 2 ? 'bg-red-400' : i < 4 ? 'bg-amber-400' : 'bg-blue-400'}`} />
                      <p className="text-[10px] text-slate-600 overflow-hidden whitespace-nowrap">{t(`ai.${key}`)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Plan */}
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Waypoints className="h-3 w-3 text-slate-400" />
                  <p className="text-[9px] font-medium text-slate-400 uppercase">{t('ai.actionPlan')}</p>
                </div>
                <div className="space-y-1.5">
                  {actionPlan.map((item) => (
                    <div key={item.key} className={`flex items-center gap-2 rounded-lg border ${item.borderColor} bg-white p-2`}>
                      <span className={`text-[8px] font-bold text-white ${item.color} rounded px-1.5 py-0.5`}>{item.priority}</span>
                      <p className="text-[10px] text-slate-600 flex-1">{t(`ai.action.${item.key}`)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Text */}
          <div className={isVisible ? 'animate-landing-reveal-right' : 'opacity-0 translate-x-10'}>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
              {t('ai.title')}
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              {t('ai.subtitle')}
            </p>
            <ul className="mt-8 space-y-4">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-100 p-1 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <span className="text-slate-700">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
