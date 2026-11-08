import { useReducedMotion } from 'framer-motion';
import type { MotionBudget } from '@/hooks/use-motion-budget';

export interface SplashStageProps {
  logoSrc: string;
  budget: MotionBudget;
  active: boolean;
  showWordmark: boolean;
}

/** Local brand assets and compositor-only motion, started after native handoff. */
export function SplashStage({ logoSrc, budget, active, showWordmark }: SplashStageProps) {
  const prefersReduced = useReducedMotion();
  return (
    <div className="app-launch-stage" data-active={active} data-reduced={!!prefersReduced || budget === 'reduced'}>
      <div className="app-launch-aura" aria-hidden />
      <div className="app-launch-orbit" aria-hidden>
        <div className="app-launch-orbit-inner" />
        <span className="app-launch-orbit-light" />
      </div>
      <div className="app-launch-mark">
        <img src={logoSrc} alt="" width={128} height={128} draggable={false} />
        <span className="app-launch-glint" aria-hidden />
      </div>
      {showWordmark && (
        <div className="app-launch-wordmark">
          <span>Trackbliss</span>
          <span className="app-launch-subtitle">PRODUCT PASSPORT</span>
        </div>
      )}
    </div>
  );
}
