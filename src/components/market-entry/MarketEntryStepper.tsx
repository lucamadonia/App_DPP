import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  label: string;
  done: boolean;
  active: boolean;
}

/** Three-step progress indicator for the market entry wizard. */
export function MarketEntryStepper({ steps }: { steps: Step[] }) {
  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((step, i) => (
        <li key={step.label} className="min-w-0">
          <div
            className={cn(
              'h-1 rounded-full transition-colors duration-300 motion-reduce:transition-none',
              step.done ? 'bg-primary' : step.active ? 'bg-primary/40' : 'bg-muted'
            )}
          />
          <div className="mt-2 flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                step.done
                  ? 'bg-primary text-primary-foreground'
                  : step.active
                    ? 'bg-primary/15 text-primary ring-1 ring-primary/40'
                    : 'bg-muted text-muted-foreground'
              )}
              aria-hidden="true"
            >
              {step.done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span
              className={cn(
                'truncate text-xs font-medium',
                step.active || step.done ? 'text-foreground' : 'text-muted-foreground'
              )}
              aria-current={step.active ? 'step' : undefined}
            >
              {step.label}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Numbered heading used on each wizard card. */
export function StepHeading({ step, label, done }: { step: number; label: string; done?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
          done ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
        )}
      >
        {done ? <Check className="h-4 w-4" aria-hidden="true" /> : step}
      </span>
      <span className="min-w-0 font-semibold leading-snug">{label}</span>
    </div>
  );
}
