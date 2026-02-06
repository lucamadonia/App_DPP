import { useTranslation } from 'react-i18next';
import { GraduationCap, Trophy } from 'lucide-react';

interface TrainingGuideHeroProps {
  completedCount: number;
  totalCount: number;
  percentage: number;
}

export function TrainingGuideHero({ completedCount, totalCount, percentage }: TrainingGuideHeroProps) {
  const { t } = useTranslation('training-guide');

  // SVG progress ring
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <section className="relative overflow-hidden">
      {/* Gradient mesh bg */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-violet-50/50 to-emerald-50/30" />
        <div className="absolute top-[-30%] left-[-10%] h-[400px] w-[400px] rounded-full bg-blue-400/15 blur-3xl animate-landing-gradient-mesh" />
        <div className="absolute top-[10%] right-[-10%] h-[350px] w-[350px] rounded-full bg-violet-400/10 blur-3xl animate-landing-gradient-mesh [animation-delay:3s]" />
        <div className="absolute bottom-[-20%] left-[40%] h-[300px] w-[300px] rounded-full bg-emerald-400/10 blur-3xl animate-landing-gradient-mesh [animation-delay:5s]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(226,232,240,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(226,232,240,0.2)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
        <div className="flex flex-col sm:flex-row items-center gap-8 sm:gap-12">
          {/* Left: Text */}
          <div className="flex-1 text-center sm:text-left animate-landing-reveal">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/80 border border-blue-200/60 px-3 py-1 text-xs font-semibold text-blue-700 mb-4">
              <GraduationCap className="h-3.5 w-3.5" />
              {t('title')}
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 landing-text-shimmer">
              {t('title')}
            </h1>
            <p className="mt-3 text-base text-slate-500 max-w-lg leading-relaxed">
              {t('subtitle')}
            </p>
          </div>

          {/* Right: Progress ring */}
          <div className="shrink-0 animate-landing-blur-in [animation-delay:0.3s]">
            <div className="guide-glass rounded-2xl p-6 flex flex-col items-center gap-3 min-w-[180px]">
              <div className="relative">
                <svg width="92" height="92" viewBox="0 0 92 92">
                  <circle
                    cx="46" cy="46" r={radius}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="5"
                  />
                  <circle
                    cx="46" cy="46" r={radius}
                    fill="none"
                    stroke="url(#progressGrad)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform="rotate(-90 46 46)"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {percentage === 100 ? (
                    <Trophy className="h-6 w-6 text-amber-500" />
                  ) : (
                    <span className="text-lg font-bold text-slate-800">{percentage}%</span>
                  )}
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-700">
                  {completedCount} {t('of')} {totalCount}
                </p>
                <p className="text-xs text-slate-500">{t('chapters')} {t('completed').toLowerCase()}</p>
              </div>
              {percentage === 100 && (
                <p className="text-xs text-emerald-600 font-medium text-center leading-tight">
                  {t('allComplete')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
