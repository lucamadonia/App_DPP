// @api-stable
/**
 * Form wizard — the one way to build CREATE flows in Trackbliss.
 * Edit flows stay sectioned forms (see `@/components/ui/form-layout`).
 *
 * Exports
 * - `FormWizard`      Indicator + animated step + footer. Works as a page
 *                     (`variant="page"`: fixed safe-area bar on phones), inside a
 *                     Dialog/Sheet (`variant="dialog"`: sticky footer, DialogContent
 *                     gets `pb-0`), or bare (`variant="embedded"`).
 * - `useFormWizard`   The state machine, if you need the controller outside
 *                     (pass it back via `wizard`). FormWizard calls it itself.
 * - `WizardReview`, `ReviewSection`, `ReviewRow`  Summary for the final step,
 *                     with "Edit" jumping back to a step.
 *
 * Steps: `{ id, title, shortTitle?, description?, icon?, when?, validate?,
 * canNext?, nextLabel?, footer?, content? }`
 * - `when` false/() => false hides the step (conditional steps).
 * - `validate` gates Next, e.g. `() => trigger(['name', 'email'])` (react-hook-form).
 * - `canNext` false disables Next (simple state-based gating).
 * - `footer` replaces the footer for that step; `false` hides it (success step).
 * - `content` is the step body; or pass `children(step, wizard)` instead.
 *
 * Behaviour: Enter in a text input = Next. Steps are unmounted when left, so
 * keep values in the form state (react-hook-form keeps registered values by
 * default). Focus moves to the step heading on every step change. Transition:
 * opacity + 8px slide, direction-aware, 200ms ease-out; reduced motion: fade.
 * Narrow containers (< 32rem) show "Step 2 of 4 · Address" + a progress bar
 * instead of the numbered row.
 *
 * No deep scrolling: each step must fit one phone screen (~3-6 fields). Split
 * long groups into more steps and move rarely used fields into
 * <OptionalDisclosure> (form-layout).
 *
 * @example In a dialog (create supplier)
 * <DialogContent className="sm:max-w-2xl pb-0">
 *   <DialogHeader><DialogTitle>{t('New Supplier')}</DialogTitle></DialogHeader>
 *   <FormWizard
 *     variant="dialog"
 *     steps={[
 *       { id: 'company', title: t('Company'), icon: Building2, validate: () => trigger(['name']), content: <CompanyStep /> },
 *       { id: 'contact', title: t('Contact'), icon: UserRound, content: <ContactStep /> },
 *       { id: 'review', title: t('Review'), icon: ClipboardCheck, content: (
 *         <WizardReview>
 *           <ReviewSection title={t('Company')} step="company"><ReviewRow label={t('Name')}>{name}</ReviewRow></ReviewSection>
 *         </WizardReview>
 *       ) },
 *     ]}
 *     onCancel={() => onOpenChange(false)}
 *     onFinish={handleCreate}
 *     finishing={saving}
 *     finishLabel={t('Create supplier')}
 *   />
 * </DialogContent>
 *
 * @example As a page with controlled step and an extra footer action
 * <FormWizard variant="page" step={step} onStepChange={setStep} steps={steps}
 *   secondaryAction={<Button variant="outline" onClick={saveDraft}>{t('Save as draft')}</Button>}
 *   onFinish={create} finishLabel={t('Create product')} />
 */
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, Loader2, Pencil, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StickyBottomBar } from '@/components/layout/sticky-bottom-bar';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------------- */
/* Types + state                                                              */
/* ------------------------------------------------------------------------- */

export interface WizardStep {
  id: string;
  title: React.ReactNode;
  /** Label under the indicator dot (defaults to title). */
  shortTitle?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Hide the step when false. */
  when?: boolean | (() => boolean);
  /** Gate before moving forward; return false to stay (show inline errors). */
  validate?: () => boolean | Promise<boolean>;
  /** false disables Next. */
  canNext?: boolean;
  /** Label of the primary button on this step (non-final steps). */
  nextLabel?: string;
  /** Replace the footer for this step; `false` hides it. */
  footer?: React.ReactNode | false;
  content?: React.ReactNode;
}

export interface UseFormWizardOptions {
  steps: WizardStep[];
  /** Controlled step, by id or index (into the visible steps). */
  step?: string | number;
  onStepChange?: (id: string, index: number) => void;
  initialStep?: string | number;
  /** Extra async guard after `validate`, e.g. a lookup. Return false to stay. */
  onNext?: (stepId: string) => boolean | void | Promise<boolean | void>;
  onFinish?: () => void | Promise<void>;
}

export interface FormWizardController {
  steps: WizardStep[];
  index: number;
  current: WizardStep;
  isFirst: boolean;
  isLast: boolean;
  direction: 'forward' | 'back';
  /** Highest step index reached so far (for "Back to review"). */
  furthest: number;
  /** true while validate/onNext/onFinish run. */
  busy: boolean;
  next: () => Promise<boolean>;
  back: () => void;
  /** Jump to a step by id or index. Forward jumps validate the current step. */
  goTo: (target: string | number) => Promise<void>;
}

const isVisible = (s: WizardStep) => (typeof s.when === 'function' ? s.when() : s.when ?? true);

function resolveIndex(steps: WizardStep[], target: string | number | undefined, fallback: number) {
  if (target === undefined) return fallback;
  if (typeof target === 'number') return Math.min(Math.max(target, 0), steps.length - 1);
  const i = steps.findIndex(s => s.id === target);
  return i === -1 ? fallback : i;
}

export function useFormWizard({
  steps: allSteps,
  step,
  onStepChange,
  initialStep,
  onNext,
  onFinish,
}: UseFormWizardOptions): FormWizardController {
  const steps = allSteps.filter(isVisible);
  const [internalId, setInternalId] = React.useState<string>(
    () => steps[resolveIndex(steps, initialStep, 0)]?.id ?? ''
  );
  const [direction, setDirection] = React.useState<'forward' | 'back'>('forward');
  const [busy, setBusy] = React.useState(false);
  const [furthest, setFurthest] = React.useState(0);

  const controlled = step !== undefined;
  const fallback = Math.max(0, steps.findIndex(s => s.id === internalId));
  const index = controlled ? resolveIndex(steps, step, 0) : fallback;
  const current = steps[index] ?? steps[0];

  // Derive direction + furthest from index changes (also when a controlled
  // parent sets the step itself) — React "adjust state during render" pattern.
  const [prevIndex, setPrevIndex] = React.useState(index);
  if (prevIndex !== index) {
    setPrevIndex(index);
    setDirection(index < prevIndex ? 'back' : 'forward');
    if (index > furthest) setFurthest(index);
  }

  const move = (to: number) => {
    const target = steps[to];
    if (!target) return;
    if (!controlled) setInternalId(target.id);
    onStepChange?.(target.id, to);
  };

  const passGate = async () => {
    if (current?.canNext === false) return false;
    if (current?.validate && !(await current.validate())) return false;
    if (onNext && (await onNext(current.id)) === false) return false;
    return true;
  };

  const run = async <T,>(fn: () => Promise<T>) => {
    setBusy(true);
    try { return await fn(); } finally { setBusy(false); }
  };

  const next = () => run(async () => {
    if (!(await passGate())) return false;
    if (index >= steps.length - 1) {
      await onFinish?.();
      return true;
    }
    move(index + 1);
    return true;
  });

  const back = () => { if (index > 0) move(index - 1); };

  const goTo = (target: string | number) => run(async () => {
    const to = resolveIndex(steps, target, index);
    if (to === index) return;
    if (to > index && !(await passGate())) return;
    move(to);
  });

  return {
    steps, index, current, direction, busy, furthest: Math.max(furthest, index),
    isFirst: index === 0, isLast: index === steps.length - 1,
    next, back, goTo,
  };
}

/** Lets ReviewSection jump to a step; FormWizard provides it automatically. */
const ReviewContext = React.createContext<((step: string) => void) | null>(null);

/* ------------------------------------------------------------------------- */
/* Indicator                                                                  */
/* ------------------------------------------------------------------------- */

function WizardIndicator({ wizard }: { wizard: FormWizardController }) {
  const { t } = useTranslation('common');
  const { steps, index, current, goTo } = wizard;
  const total = steps.length;
  return (
    <div className="mb-5 @lg:mb-7">
      {/* Compact: phones / narrow sheets */}
      <div className="@lg:hidden">
        <p className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
          <span className="min-w-0 truncate">
            {t('Step {{current}} of {{total}}', { current: index + 1, total })}
            <span aria-hidden="true"> · </span>
            <span className="font-medium text-foreground">{current.shortTitle ?? current.title}</span>
          </span>
        </p>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={index + 1}
          aria-label={t('Progress')}
          className="mt-2 h-1 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-200 ease-out"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Full row: numbered dots joined by a hairline */}
      <ol className="hidden items-start @lg:flex">
        {steps.map((s, i) => {
          const active = i === index;
          const done = i < index;
          const last = i === total - 1;
          return (
            <li key={s.id} className={cn('relative flex min-w-0', last ? 'flex-none' : 'flex-1')}>
              <button
                type="button"
                onClick={() => void goTo(i)}
                disabled={i > wizard.furthest}
                aria-current={active ? 'step' : undefined}
                className="group flex min-h-11 min-w-0 flex-col items-center gap-1.5 rounded-md outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-default"
              >
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full border text-xs font-medium tabular-nums transition-colors duration-200 ease-out',
                    active
                      ? 'border-primary bg-primary text-primary-foreground'
                      : done
                        ? 'border-primary bg-background text-primary group-hover:bg-primary/5'
                        : 'border-border bg-background text-muted-foreground'
                  )}
                >
                  {done ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                <span className={cn('max-w-[6.5rem] truncate text-xs', active ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                  {s.shortTitle ?? s.title}
                </span>
              </button>
              {!last && (
                <span
                  aria-hidden="true"
                  className={cn('mx-2 mt-3.5 h-px flex-1 transition-colors duration-200 ease-out', done ? 'bg-primary' : 'bg-border')}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* FormWizard                                                                 */
/* ------------------------------------------------------------------------- */

export interface FormWizardProps extends UseFormWizardOptions {
  /** Use an external controller from useFormWizard (options above are then ignored). */
  wizard?: FormWizardController;
  variant?: 'page' | 'dialog' | 'embedded';
  /** Body when steps carry no `content`. */
  children?: (step: WizardStep, wizard: FormWizardController) => React.ReactNode;
  /** Primary label on the last step. Default "Create". */
  finishLabel?: string;
  /** External busy state for the final action (spinner + disabled). */
  finishing?: boolean;
  /** Extra button between Back and Next (e.g. "Save as draft"). */
  secondaryAction?: React.ReactNode;
  /** Shown instead of Back on the first step. */
  onCancel?: () => void;
  cancelLabel?: string;
  /** Shown on the first step (next to Cancel), e.g. onboarding. */
  onSkip?: () => void;
  skipLabel?: string;
  hideIndicator?: boolean;
  /** Render the step title/description heading (default true). */
  showStepHeader?: boolean;
  className?: string;
}

export function FormWizard({
  wizard: external,
  variant = 'embedded',
  children,
  finishLabel,
  finishing = false,
  secondaryAction,
  onCancel,
  cancelLabel,
  onSkip,
  skipLabel,
  hideIndicator = false,
  showStepHeader = true,
  className,
  ...options
}: FormWizardProps) {
  const { t } = useTranslation('common');
  const internal = useFormWizard(options);
  const wizard = external ?? internal;
  const { current, isFirst, isLast, direction, busy, index, steps } = wizard;

  // Move focus to the new step's heading (not on first mount).
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const mounted = React.useRef(false);
  React.useEffect(() => {
    if (mounted.current) headingRef.current?.focus({ preventScroll: false });
    mounted.current = true;
  }, [current?.id]);

  if (!current) return null;

  const working = busy || finishing;
  const nextDisabled = working || current.canNext === false;
  const canReturnToEnd = !isLast && wizard.furthest === steps.length - 1;

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    const el = e.target as HTMLElement;
    if (el.tagName !== 'INPUT') return;
    const type = (el as HTMLInputElement).type;
    if (['checkbox', 'radio', 'button', 'submit', 'file'].includes(type)) return;
    if (el.getAttribute('role') === 'combobox' || current.footer !== undefined) return;
    e.preventDefault();
    if (!nextDisabled) void wizard.next();
  };

  const primaryLabel = isLast ? finishLabel ?? t('Create') : current.nextLabel ?? t('Next');
  const defaultFooter = (
    <>
      <div className="flex min-w-0 items-center gap-2">
        {isFirst ? (
          <>
            {onCancel && (
              <Button type="button" variant="ghost" onClick={onCancel} disabled={working}>
                {cancelLabel ?? t('Cancel')}
              </Button>
            )}
            {onSkip && (
              <Button type="button" variant="ghost" onClick={onSkip} disabled={working}>
                {skipLabel ?? t('Skip')}
              </Button>
            )}
          </>
        ) : (
          <Button type="button" variant="ghost" onClick={wizard.back} disabled={working}>
            <ArrowLeft className="size-4" />
            {t('Back')}
          </Button>
        )}
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
        {canReturnToEnd && (
          <Button type="button" variant="outline" className="hidden sm:inline-flex" onClick={() => void wizard.goTo(steps.length - 1)} disabled={working}>
            {t('Back to overview')}
          </Button>
        )}
        {secondaryAction}
        <Button
          type="button"
          onClick={() => void wizard.next()}
          disabled={nextDisabled}
          className="min-w-0 flex-1 sm:flex-none sm:min-w-28"
        >
          {working && <Loader2 className="size-4 animate-spin" />}
          {primaryLabel}
          {!isLast && !working && <ArrowRight className="size-4" />}
        </Button>
      </div>
    </>
  );
  const footer = current.footer === false ? null : current.footer ?? defaultFooter;

  const footerRow = footer && (
    <div data-slot="wizard-footer" className="flex w-full items-center justify-between gap-2">
      {footer}
    </div>
  );

  return (
    <div data-slot="form-wizard" className={cn('@container flex flex-col', className)} onKeyDown={onKeyDown}>
      {!hideIndicator && steps.length > 1 && <WizardIndicator wizard={wizard} />}

      <div
        key={current.id}
        className={cn(
          'min-w-0 animate-in fade-in-0 duration-200 ease-out motion-reduce:[--tw-enter-translate-x:0px]',
          direction === 'forward' ? 'slide-in-from-right-2' : 'slide-in-from-left-2'
        )}
      >
        {showStepHeader && (
          <header className="mb-5">
            <h2
              ref={headingRef}
              tabIndex={-1}
              className="text-lg font-semibold tracking-tight text-balance outline-none"
            >
              {current.title}
            </h2>
            {current.description && (
              <p className="mt-1 text-sm text-pretty text-muted-foreground">{current.description}</p>
            )}
          </header>
        )}
        <ReviewContext.Provider value={id => void wizard.goTo(id)}>
          <div className="space-y-5">{current.content ?? children?.(current, wizard)}</div>
        </ReviewContext.Provider>
      </div>

      {/* Live region announces the step for screen readers. */}
      <p className="sr-only" aria-live="polite">
        {t('Step {{current}} of {{total}}', { current: index + 1, total: steps.length })}
      </p>

      {footerRow && variant === 'page' && (
        <>
          <div aria-hidden="true" className="h-24 md:hidden" />
          <div aria-hidden="true" className="mt-6 hidden h-4 border-t md:block" />
          <StickyBottomBar className="[&>[data-slot=wizard-footer]]:w-full">{footerRow}</StickyBottomBar>
        </>
      )}
      {footerRow && variant === 'dialog' && (
        <div
          className={cn(
            'sticky bottom-0 z-10 -mx-6 mt-6 border-t bg-background/95 px-6 pt-3 pb-[max(1rem,var(--safe-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:pb-4',
            '[.bottom-0_&]:-bottom-5 [.bottom-0_&]:-mx-5 [.bottom-0_&]:px-5'
          )}
        >
          {footerRow}
        </div>
      )}
      {footerRow && variant === 'embedded' && <div className="mt-6 border-t pt-4">{footerRow}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* Review                                                                     */
/* ------------------------------------------------------------------------- */

/**
 * Wrapper for the final review step. Inside FormWizard, ReviewSection "Edit"
 * buttons jump to their `step` automatically; outside, pass `onEdit`.
 */
export function WizardReview({ onEdit, className, children }: { onEdit?: (step: string) => void; className?: string; children: React.ReactNode }) {
  const inherited = React.useContext(ReviewContext);
  return (
    <ReviewContext.Provider value={onEdit ?? inherited}>
      <div className={cn('grid gap-3', className)}>{children}</div>
    </ReviewContext.Provider>
  );
}

export function ReviewSection({
  title,
  step,
  onEdit,
  editLabel,
  children,
}: {
  title: React.ReactNode;
  /** Step id to jump to via WizardReview's onEdit. */
  step?: string;
  onEdit?: () => void;
  editLabel?: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('common');
  const ctxEdit = React.useContext(ReviewContext);
  const handleEdit = onEdit ?? (step && ctxEdit ? () => ctxEdit(step) : undefined);
  return (
    <section className="rounded-lg border bg-background p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {handleEdit && (
          <Button type="button" variant="ghost" size="sm" className="-my-1 -mr-2" onClick={handleEdit}>
            <Pencil className="size-4" />
            {editLabel ?? t('Edit')}
          </Button>
        )}
      </div>
      <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">{children}</dl>
    </section>
  );
}

export function ReviewRow({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  const empty = children === undefined || children === null || children === '' || children === false;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('min-w-0 break-words', empty ? 'text-muted-foreground' : 'text-foreground')}>{empty ? '–' : children}</dd>
    </>
  );
}
