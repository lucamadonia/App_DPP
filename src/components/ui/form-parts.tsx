/**
 * Form parts: controls that sit inside a `FormField` or a `FormSection`.
 * Re-exported from `@/components/ui/form-layout`, import from there.
 *
 * - `InputAffix`        Prefix/suffix around one `<Input>` (€, %, kg, h, an icon).
 * - `SecretInput`       Password/API-key input with a show/hide button.
 * - `ChoiceCards`       Radio cards for 2-4 option enums (replaces small Selects).
 * - `OptionalDisclosure` Collapsible "More details (optional)" group for rarely
 *                       used fields. Content stays mounted, so no input is lost.
 * - `FormSectionNav`    Edit forms with many sections: renders ONE section at a
 *                       time with chips (narrow) or a left rail (>= 48rem).
 */
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui';
import { ChevronDown, Eye, EyeOff, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type AriaProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

const AFFIX_FRAME = cn(
  'flex h-9 w-full min-w-0 items-stretch overflow-hidden rounded-md border border-input bg-transparent shadow-xs transition-[color,box-shadow] duration-150 ease-out dark:bg-input/30 pointer-coarse:h-11',
  'focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50',
  'has-[[aria-invalid=true]]:border-destructive has-[[aria-invalid=true]]:ring-destructive/20',
  '[&_[data-slot=input]]:h-full! [&_[data-slot=input]]:rounded-none [&_[data-slot=input]]:border-0 [&_[data-slot=input]]:bg-transparent [&_[data-slot=input]]:shadow-none [&_[data-slot=input]]:focus-visible:ring-0 dark:[&_[data-slot=input]]:bg-transparent'
);
/* ------------------------------------------------------------------------- */
/* InputAffix                                                                 */
/* ------------------------------------------------------------------------- */

export interface InputAffixProps extends AriaProps {
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  variant?: 'inline' | 'addon';
  className?: string;
  /** A single `<Input>`. */
  children: React.ReactElement;
}

export function InputAffix({
  prefix,
  suffix,
  variant = 'inline',
  className,
  children,
  ...aria
}: InputAffixProps) {
  const child = children as React.ReactElement<AriaProps>;
  const input = React.cloneElement(child, {
    id: child.props.id ?? aria.id,
    'aria-describedby': cn(child.props['aria-describedby'], aria['aria-describedby']) || undefined,
    ...(aria['aria-invalid'] ? { 'aria-invalid': true } : {}),
  });
  const affix = (content: React.ReactNode, side: 'start' | 'end') =>
    content == null ? null : (
      <span
        aria-hidden="true"
        className={cn(
          'flex shrink-0 items-center text-sm text-muted-foreground select-none',
          variant === 'addon'
            ? cn('bg-muted/60 px-3', side === 'start' ? 'border-r' : 'border-l')
            : side === 'start' ? 'pl-3' : 'pr-3'
        )}
      >
        {content}
      </span>
    );

  return (
    <div
      data-slot="input-affix"
      className={cn(
        AFFIX_FRAME,
        variant === 'inline' && prefix != null && '[&_[data-slot=input]]:pl-2',
        variant === 'inline' && suffix != null && '[&_[data-slot=input]]:pr-2',
        className
      )}
    >
      {affix(prefix, 'start')}
      {input}
      {affix(suffix, 'end')}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* ChoiceCards                                                                */
/* ------------------------------------------------------------------------- */

export interface ChoiceOption<V extends string = string> {
  value: V;
  label: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
}

export interface ChoiceCardsProps<V extends string = string> extends AriaProps {
  value: V | '' | undefined;
  onValueChange: (value: V) => void;
  options: ChoiceOption<V>[];
  /** Max columns (phones: 2). Descriptions show from a 24rem container upward. */
  columns?: 1 | 2 | 3 | 4;
  disabled?: boolean;
  name?: string;
  className?: string;
}

/* Options stay side by side even on phones. Below a 24rem container the
   description and radio dot are hidden (icon + label only) so a choice never
   costs more than two short rows — no deep scrolling. */
const CHOICE_COLS = {
  compact: {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 @md:grid-cols-4',
  },
  rich: {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-2 @xl:grid-cols-3',
    4: 'grid-cols-2 @2xl:grid-cols-4',
  },
} as const;

export function ChoiceCards<V extends string = string>({
  value,
  onValueChange,
  options,
  columns = 2,
  disabled,
  name,
  className,
  id,
  ...aria
}: ChoiceCardsProps<V>) {
  return (
    <div className="@container">
      <RadioGroupPrimitive.Root
        id={id}
        name={name}
        value={value || ''}
        onValueChange={v => onValueChange(v as V)}
        disabled={disabled}
        aria-labelledby={id ? `${id}-label` : undefined}
        aria-describedby={aria['aria-describedby']}
        aria-invalid={aria['aria-invalid']}
        data-slot="choice-cards"
        className={cn('grid gap-2', CHOICE_COLS[options.some(o => o.description) ? 'rich' : 'compact'][columns], className)}
      >
        {options.map(({ value: optionValue, label, description, icon: Icon }) => {
          // Label-only options render as a compact segmented choice (no radio dot).
          const compact = !Icon && !description;
          return (
          <RadioGroupPrimitive.Item
            key={optionValue}
            value={optionValue}
            className={cn(
              'group relative flex min-h-11 w-full min-w-0 cursor-pointer gap-2.5 rounded-lg border bg-background outline-none',
              compact ? 'items-center justify-center px-2 py-2 text-center sm:min-h-9 pointer-coarse:min-h-11' : 'items-start p-3 text-left',
              'transition-[border-color,background-color,box-shadow] duration-150 ease-out',
              'hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50',
              'data-[state=checked]:border-primary data-[state=checked]:bg-primary/5 data-[state=checked]:ring-1 data-[state=checked]:ring-primary',
              'disabled:cursor-not-allowed disabled:opacity-50'
            )}
          >
            {Icon && (
              <Icon
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-muted-foreground group-data-[state=checked]:text-primary"
              />
            )}
            <span className={cn('min-w-0', !compact && 'flex-1')}>
              <span
                className={cn(
                  'block text-sm font-medium leading-5 text-foreground',
                  compact && 'text-balance group-data-[state=checked]:text-primary'
                )}
              >
                {label}
              </span>
              {description && (
                <span className="mt-0.5 hidden text-xs text-muted-foreground @sm:block">{description}</span>
              )}
            </span>
            {!compact && (
              <span
                aria-hidden="true"
                className="mt-0.5 hidden size-4 shrink-0 items-center justify-center rounded-full border border-input group-data-[state=checked]:border-primary @sm:flex"
              >
                <span className="size-2 scale-0 rounded-full bg-primary transition-transform duration-150 ease-out group-data-[state=checked]:scale-100" />
              </span>
            )}
          </RadioGroupPrimitive.Item>
          );
        })}
      </RadioGroupPrimitive.Root>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* SecretInput                                                                */
/* ------------------------------------------------------------------------- */

/** Password / API key input with a show-hide toggle. Takes all `<Input>` props. */
export function SecretInput({ className, ...props }: React.ComponentProps<typeof Input>) {
  const { t } = useTranslation('common');
  const [visible, setVisible] = React.useState(false);
  return (
    <div data-slot="input-affix" className={cn(AFFIX_FRAME, '[&_[data-slot=input]]:pr-1', className)}>
      <Input
        {...props}
        type={visible ? 'text' : 'password'}
        autoComplete={props.autoComplete ?? 'off'}
        spellCheck={false}
        className={cn('font-mono placeholder:font-sans', !visible && 'tracking-wider')}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? t('Hide value') : t('Show value')}
        aria-pressed={visible}
        className="flex w-10 shrink-0 items-center justify-center text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:bg-muted pointer-coarse:w-11"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* OptionalDisclosure                                                         */
/* ------------------------------------------------------------------------- */

export interface OptionalDisclosureProps {
  /** Defaults to "More details (optional)" / "Weitere Angaben (optional)". */
  label?: React.ReactNode;
  /** Short preview of what is inside, e.g. "Fax, LinkedIn, notes". */
  description?: React.ReactNode;
  /** Number of filled fields inside; shown as a badge while collapsed. */
  filledCount?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
}

export function OptionalDisclosure({
  label,
  description,
  filledCount,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  className,
  children,
}: OptionalDisclosureProps) {
  const { t } = useTranslation('common');
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;
  const contentId = React.useId();
  const toggle = () => {
    setOpenState(!open);
    onOpenChange?.(!open);
  };

  return (
    <div data-slot="optional-disclosure" className={cn('rounded-lg border border-dashed', open && 'border-solid', className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={contentId}
        className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left outline-none transition-colors duration-150 ease-out hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:px-4"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label ?? t('More details (optional)')}</span>
          {description && !open && (
            <span className="mt-0.5 block truncate text-xs text-muted-foreground">{description}</span>
          )}
        </span>
        {!open && !!filledCount && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium tabular-nums text-primary">
            {filledCount}
          </span>
        )}
        <ChevronDown
          aria-hidden="true"
          className={cn('size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out', open && 'rotate-180')}
        />
      </button>
      {/* Grid-rows trick animates height; content stays mounted (inputs keep state). */}
      <div
        id={contentId}
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-5 border-t px-3 pt-4 pb-4 sm:px-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* FormSectionNav                                                             */
/* ------------------------------------------------------------------------- */

export interface FormNavSection {
  id: string;
  label: React.ReactNode;
  icon?: LucideIcon;
  /** e.g. an error count – rendered as a small badge. */
  badge?: React.ReactNode;
}

export interface FormSectionNavProps {
  sections: FormNavSection[];
  value: string;
  onValueChange: (id: string) => void;
  /** Accessible name of the nav. */
  label?: string;
  className?: string;
  /** Content of the ACTIVE section only (render one section at a time). */
  children: React.ReactNode;
}

/**
 * Section navigation for long edit forms. Narrow containers: horizontally
 * scrolling chips above the content. Containers >= 48rem: a sticky left rail.
 * Only the active section's content is rendered, so nothing scrolls deep.
 */
export function FormSectionNav({ sections, value, onValueChange, label, className, children }: FormSectionNavProps) {
  const { t } = useTranslation('common');
  const contentRef = React.useRef<HTMLDivElement>(null);
  const select = (id: string) => {
    if (id === value) return;
    onValueChange(id);
    requestAnimationFrame(() => contentRef.current?.scrollIntoView({ block: 'nearest' }));
  };

  return (
    <div data-slot="form-section-nav" className={cn('@container', className)}>
      <div className="flex flex-col gap-4 @3xl:grid @3xl:grid-cols-[13rem_minmax(0,1fr)] @3xl:gap-8">
        <nav aria-label={label ?? t('Sections')} className="-mx-1 min-w-0 @3xl:mx-0">
          <ul className="scrollbar-hide flex gap-1.5 overflow-x-auto px-1 pb-1 @3xl:sticky @3xl:top-4 @3xl:flex-col @3xl:gap-0.5 @3xl:overflow-visible @3xl:px-0">
            {sections.map(({ id, label: sectionLabel, icon: Icon, badge }) => {
              const active = id === value;
              return (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => select(id)}
                    aria-current={active ? 'true' : undefined}
                    className={cn(
                      'flex min-h-9 w-full items-center gap-2 whitespace-nowrap rounded-full border px-3 text-sm outline-none pointer-coarse:min-h-11',
                      'transition-[background-color,border-color,color] duration-150 ease-out focus-visible:ring-[3px] focus-visible:ring-ring/50',
                      '@3xl:rounded-md @3xl:border-transparent @3xl:px-2.5 @3xl:text-left',
                      active
                        ? 'border-primary bg-primary/10 font-medium text-primary @3xl:border-transparent'
                        : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground @3xl:bg-transparent'
                    )}
                  >
                    {Icon && <Icon aria-hidden="true" className="size-4 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{sectionLabel}</span>
                    {badge != null && (
                      <span className="rounded-full bg-destructive/10 px-1.5 text-xs font-medium tabular-nums text-destructive">
                        {badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div ref={contentRef} key={value} className="min-w-0 scroll-mt-4 animate-in fade-in-0 duration-150 ease-out">
          {children}
        </div>
      </div>
    </div>
  );
}
