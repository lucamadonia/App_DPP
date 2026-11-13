import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChipRailProps {
  children: ReactNode;
  /** Accessible group label. */
  label: string;
  className?: string;
}

/**
 * Selection chips that scroll sideways inside their own rail on phones
 * (the page itself never scrolls horizontally) and wrap from `md` up.
 */
export function ChipRail({ children, label, className }: ChipRailProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        '-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide',
        'md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ChipProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
  /** Small count / status at the end of the chip. */
  trailing?: ReactNode;
  className?: string;
  disabled?: boolean;
}

export function Chip({ selected, onClick, children, icon, trailing, className, disabled }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        'inline-flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full border px-3.5 text-sm font-medium',
        'transition-[background-color,border-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50 md:min-h-9',
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5',
        className
      )}
    >
      {icon && <span className="inline-flex shrink-0 items-center">{icon}</span>}
      <span className="whitespace-nowrap">{children}</span>
      {trailing}
    </button>
  );
}
