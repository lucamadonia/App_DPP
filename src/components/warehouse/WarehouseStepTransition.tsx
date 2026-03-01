import type { ReactNode } from 'react';

interface WarehouseStepTransitionProps {
  children: ReactNode;
  direction: 'forward' | 'backward';
  stepKey: number;
}

export function WarehouseStepTransition({ children, direction, stepKey }: WarehouseStepTransitionProps) {
  return (
    <div
      key={stepKey}
      className={direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'}
    >
      {children}
    </div>
  );
}
