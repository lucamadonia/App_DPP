import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { blurIn, useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface KnowledgeHeroProps {
  icon: LucideIcon;
  /** Small uppercase label above the title, e.g. "Compliance & Knowledge". */
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  /** Buttons rendered top-right on desktop, full-width row on phones. */
  actions?: ReactNode;
  /** Optional stats / meta row below the title. */
  children?: ReactNode;
  className?: string;
}

/**
 * Hero header shared by the knowledge pages. Uses only theme tokens
 * (primary / chart / card) so it adapts to light, dark and every
 * `data-app-style` without per-style overrides.
 */
export function KnowledgeHero({
  icon: Icon,
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: KnowledgeHeroProps) {
  const prefersReduced = useReducedMotion();
  const Wrapper = prefersReduced ? 'section' : motion.section;
  const motionProps = prefersReduced
    ? {}
    : { variants: blurIn, initial: 'initial', animate: 'animate' };

  return (
    <Wrapper
      {...motionProps}
      className={cn(
        'relative isolate overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-6',
        className
      )}
    >
      {/* Decorative wash + grid — aria-hidden, pointer-events off */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.09] via-transparent to-chart-2/[0.08]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <span
            aria-hidden="true"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm ring-4 ring-primary/10 sm:h-12 sm:w-12"
          >
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <div className="min-w-0">
            {eyebrow && (
              <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                {eyebrow}
              </p>
            )}
            <h1 className="text-[1.6rem] font-bold leading-tight tracking-tight text-balance break-words md:text-2xl">
              {title}
            </h1>
            {description && (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground text-pretty">
                {description}
              </p>
            )}
          </div>
        </div>
        {actions && (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0 sm:justify-end [&>*]:min-h-11 [&>*]:flex-1 sm:[&>*]:min-h-9 sm:[&>*]:flex-none">
            {actions}
          </div>
        )}
      </div>

      {children && <div className="mt-4 sm:mt-5">{children}</div>}
    </Wrapper>
  );
}

interface HeroStatProps {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const STAT_TONES: Record<NonNullable<HeroStatProps['tone']>, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
};

/** Compact stat for the hero's stats row. Lay out in `HeroStats`. */
export function HeroStat({ label, value, icon: Icon, tone = 'default' }: HeroStatProps) {
  return (
    <div className="min-w-0 rounded-xl border bg-background/60 px-3 py-2.5 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
        {Icon && <Icon className={cn('h-3.5 w-3.5 shrink-0', STAT_TONES[tone])} aria-hidden="true" />}
        <span className="truncate">{label}</span>
      </div>
      <div className={cn('mt-0.5 text-xl font-semibold leading-tight tabular-nums', STAT_TONES[tone])}>
        {value}
      </div>
    </div>
  );
}

export function HeroStats({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] sm:gap-3', className)}>
      {children}
    </div>
  );
}
