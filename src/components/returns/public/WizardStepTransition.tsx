import type { ReactNode } from 'react';

interface WizardStepTransitionProps {
  children: ReactNode;
  direction: 'forward' | 'backward';
  stepKey: number;
}

export function WizardStepTransition({ children, direction, stepKey }: WizardStepTransitionProps) {
  return (
    <div
      key={stepKey}
      className={direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'}
    >
      {children}
    </div>
  );
}
