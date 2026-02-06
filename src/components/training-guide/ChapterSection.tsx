import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { cn } from '@/lib/utils';
import { GuideStep } from './GuideStep';
import { GuideTip } from './GuideTip';
import type { ChapterId } from '@/hooks/useTrainingGuideProgress';
import { useState, useCallback } from 'react';

interface StepDef {
  titleKey: string;
  descKey: string;
  detailKey?: string;
  tipKey?: string;
  tipVariant?: 'tip' | 'important' | 'note' | 'shortcut';
}

interface ChapterSectionProps {
  id: ChapterId;
  index: number;
  icon: React.ReactNode;
  gradient: string;
  bgTint: string;
  steps: StepDef[];
  mockup: React.ReactNode;
  isCompleted: boolean;
  onToggleComplete: () => void;
}

export function ChapterSection({
  id,
  index,
  icon,
  gradient,
  bgTint,
  steps,
  mockup,
  isCompleted,
  onToggleComplete,
}: ChapterSectionProps) {
  const { t } = useTranslation('training-guide');
  const navigate = useNavigate();
  const { ref, isVisible } = useScrollReveal({ threshold: 0.08 });
  const isEven = index % 2 === 0;
  const [confetti, setConfetti] = useState(false);

  const handleToggle = useCallback(() => {
    if (!isCompleted) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 1000);
    }
    onToggleComplete();
  }, [isCompleted, onToggleComplete]);

  const linkPath = t(`${id}.link`);

  return (
    <section
      id={`chapter-${id}`}
      data-chapter={id}
      ref={ref}
      className={cn(
        'relative py-12 sm:py-16 transition-all duration-700',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      )}
    >
      {/* Tinted bg */}
      <div className={cn('absolute inset-0 -z-10', bgTint)} />

      <div className="mx-auto max-w-5xl px-4">
        {/* Chapter header */}
        <div className="flex items-center gap-3 mb-8">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md', gradient)}>
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {t(`${id}.title`)}
              </h2>
              {isCompleted && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            </div>
            <p className="text-sm text-slate-500">{t(`${id}.subtitle`)}</p>
          </div>
        </div>

        {/* Content: mockup + steps */}
        <div className={cn(
          'grid gap-8 lg:gap-12',
          'lg:grid-cols-2',
          isEven ? '' : 'lg:[direction:rtl]'
        )}>
          {/* Mockup */}
          <div className={cn('lg:[direction:ltr]', isVisible ? 'animate-guide-mockup-float' : '')}>
            <div className="guide-chapter-glow rounded-xl overflow-hidden bg-white border border-slate-200/80">
              {mockup}
            </div>
          </div>

          {/* Steps */}
          <div className="lg:[direction:ltr]">
            {steps.map((step, i) => (
              <GuideStep
                key={i}
                number={i + 1}
                title={t(step.titleKey)}
                description={t(step.descKey)}
                detail={step.detailKey ? t(step.detailKey) : undefined}
                gradient={gradient}
                delay={i * 60}
                isVisible={isVisible}
              >
                {step.tipKey && (
                  <GuideTip
                    variant={step.tipVariant || 'tip'}
                    label={t(step.tipVariant || 'tip')}
                  >
                    {t(step.tipKey)}
                  </GuideTip>
                )}
              </GuideStep>
            ))}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap items-center gap-3 pl-12">
              {/* Mark complete */}
              <button
                onClick={handleToggle}
                className={cn(
                  'relative inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200'
                )}
              >
                <CheckCircle2 className={cn('h-4 w-4', isCompleted ? 'animate-guide-check-bounce' : '')} />
                {t('markComplete')}

                {/* Mini confetti */}
                {confetti && (
                  <span className="absolute inset-0 pointer-events-none overflow-visible">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span
                        key={i}
                        className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full animate-guide-confetti-mini"
                        style={{
                          background: ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899'][i],
                          '--cx': `${(i - 2) * 18}px`,
                          '--cy': `${-20 - Math.random() * 20}px`,
                          animationDelay: `${i * 60}ms`,
                        } as React.CSSProperties}
                      />
                    ))}
                  </span>
                )}
              </button>

              {/* Go to page */}
              {linkPath && linkPath !== `${id}.link` && (
                <button
                  onClick={() => navigate(linkPath)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t('goToPage')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
