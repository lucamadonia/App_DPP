// @api-stable
/**
 * Form layout system — the one way to lay out forms in Trackbliss.
 * Wizards (create flows) live in `@/components/ui/form-wizard`.
 *
 * Layout reacts to the space the form actually gets (CSS container queries),
 * not the viewport, so the same markup works in a 4xl dialog, a phone sheet,
 * a settings page and a public wizard card.
 *
 * Layout
 * - `FormSections`  Vertical stack of sections. `divided` adds hairlines.
 * - `FormSection`   Titled group (title, description?, icon?, aside?, footer?).
 *                   Containers >= 48rem: title left third, fields right two
 *                   thirds; narrow: stacked. `variant="card"` (default) wraps
 *                   fields in a card, `"plain"` does not (inside an existing
 *                   Card/wizard). `layout="stacked"` forces stacking. `footer`
 *                   renders a tinted action strip at the bottom of the card.
 * - `FormGrid`      1 column when narrow, `cols` (2|3|4|6) from a 28rem container.
 * - `FormField`     Label + control + hint/error; wires id/aria onto its single
 *                   child. `span` (1-6|'full'), `required` (dot), `optional` (tag).
 *                   For Selects put the id on <SelectTrigger id> and pass htmlFor.
 * - `FormToggleRow` Label + description + Switch/Checkbox (settings row, 44px).
 * - `FormActions`   Cancel + primary. `sticky="dialog"` pins it inside a dialog/
 *                   sheet (caller passes `pb-0` on DialogContent); `sticky="page"`
 *                   is a fixed safe-area bar on phones, inline row on desktop.
 *                   `dirty` shows "Unsaved changes". Alias: `StickyActionBar`.
 *
 * Parts (re-exported from ./form-parts)
 * - `InputAffix`, `SecretInput`, `ChoiceCards`, `OptionalDisclosure`, `FormSectionNav`.
 *
 * No deep scrolling: keep a visible group to ~3-6 fields, move rarely used
 * fields into <OptionalDisclosure>, and give long edit forms a <FormSectionNav>
 * (one section rendered at a time) instead of one giant page.
 *
 * Inputs inside FormField/InputAffix get 44px height on touch devices so they
 * line up with Select triggers.
 *
 * @example Edit form in a dialog
 * <DialogContent className="sm:max-w-3xl pb-0">
 *   <FormSections divided>
 *     <FormSection icon={Building2} title={t('Company')} description={t('…')}>
 *       <FormGrid cols={6}>
 *         <FormField label={t('Name')} htmlFor="name" required span={4} error={errors.name?.message}>
 *           <Input id="name" {...register('name', { required: t('This field is required') })} />
 *         </FormField>
 *         <FormField label={t('Code')} htmlFor="code" optional span={2}><Input /></FormField>
 *         <FormField label={t('Min. order')} htmlFor="mov" span={3}>
 *           <InputAffix suffix="EUR"><Input type="number" /></InputAffix>
 *         </FormField>
 *       </FormGrid>
 *       <OptionalDisclosure description={t('Fax, LinkedIn, notes')}>…</OptionalDisclosure>
 *     </FormSection>
 *   </FormSections>
 *   <FormActions sticky="dialog" dirty={isDirty}>
 *     <Button variant="ghost" onClick={close}>{t('Cancel', { ns: 'common' })}</Button>
 *     <Button onClick={save}>{t('Save', { ns: 'common' })}</Button>
 *   </FormActions>
 * </DialogContent>
 */
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { StickyBottomBar } from '@/components/layout/sticky-bottom-bar';
import { cn } from '@/lib/utils';

export * from './form-parts';

/* Inputs sized to the 44px touch floor on coarse pointers. */
const TOUCH_INPUT = 'pointer-coarse:[&_[data-slot=input]]:h-11';

/* ------------------------------------------------------------------------- */
/* FormSections                                                               */
/* ------------------------------------------------------------------------- */

export function FormSections({
  divided = false,
  className,
  children,
}: { divided?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div
      data-slot="form-sections"
      className={cn(
        divided
          ? 'flex flex-col divide-y divide-border [&>*]:py-6 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0 sm:[&>*]:py-8'
          : 'flex flex-col gap-6 sm:gap-8',
        className
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* FormSection                                                                */
/* ------------------------------------------------------------------------- */

export interface FormSectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  /** Rendered at the end of the header row (e.g. an "Add" button). */
  aside?: React.ReactNode;
  /** Action strip at the bottom of the section card (e.g. a section-level Save). */
  footer?: React.ReactNode;
  variant?: 'card' | 'plain';
  layout?: 'auto' | 'stacked';
  className?: string;
  children: React.ReactNode;
}

export function FormSection({
  title,
  description,
  icon: Icon,
  aside,
  footer,
  variant = 'card',
  layout = 'auto',
  className,
  children,
}: FormSectionProps) {
  const headingId = React.useId();
  const split = layout === 'auto';

  return (
    <section data-slot="form-section" aria-labelledby={headingId} className={cn('@container', className)}>
      <div className={cn('flex flex-col gap-3', split && '@3xl:grid @3xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] @3xl:gap-8')}>
        <div className={cn('flex items-start gap-3', split && '@3xl:flex-col @3xl:gap-2')}>
          {Icon && (
            <span
              aria-hidden="true"
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground',
                split && '@3xl:mb-1'
              )}
            >
              <Icon className="size-4" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h3 id={headingId} className="text-sm font-semibold leading-6 text-foreground">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{description}</p>
            )}
          </div>
          {aside && <div className={cn('shrink-0', split && '@3xl:mt-2')}>{aside}</div>}
        </div>
        <div
          className={cn(
            'min-w-0 space-y-5',
            variant === 'card' && 'rounded-xl border bg-card p-4 shadow-xs sm:p-6'
          )}
        >
          {children}
          {footer && (
            <div
              className={cn(
                'flex flex-wrap items-center justify-end gap-2',
                variant === 'card'
                  ? '-mx-4 -mb-4 rounded-b-xl border-t bg-muted/40 px-4 py-3 sm:-mx-6 sm:-mb-6 sm:px-6'
                  : 'border-t pt-4'
              )}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------------- */
/* FormGrid                                                                   */
/* ------------------------------------------------------------------------- */

const GRID_COLS = {
  1: '',
  2: '@md:grid-cols-2',
  3: '@md:grid-cols-3',
  4: '@md:grid-cols-2 @xl:grid-cols-4',
  6: '@md:grid-cols-6',
} as const;

export function FormGrid({
  cols = 2,
  className,
  children,
}: { cols?: keyof typeof GRID_COLS; className?: string; children: React.ReactNode }) {
  return (
    <div className="@container">
      <div data-slot="form-grid" className={cn('grid grid-cols-1 gap-x-4 gap-y-5', GRID_COLS[cols], className)}>
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* FormField                                                                  */
/* ------------------------------------------------------------------------- */

const SPAN = {
  1: '',
  2: '@md:col-span-2',
  3: '@md:col-span-3',
  4: '@md:col-span-4',
  5: '@md:col-span-5',
  6: '@md:col-span-6',
  full: 'col-span-full',
} as const;

export type FormFieldSpan = keyof typeof SPAN;

export interface FormFieldProps {
  label: React.ReactNode;
  /** id of the control. Generated (and set on the child) when omitted. */
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  span?: FormFieldSpan;
  /** Extra content at the end of the label row (counter, link). */
  labelAside?: React.ReactNode;
  className?: string;
  children: React.ReactElement;
}

type AriaProps = {
  id?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
};

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  required,
  optional,
  span = 1,
  labelAside,
  className,
  children,
}: FormFieldProps) {
  const { t } = useTranslation('common');
  const autoId = React.useId();
  const child = children as React.ReactElement<AriaProps>;
  const id = htmlFor ?? child.props.id ?? autoId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;

  const control = React.cloneElement(child, {
    id: child.props.id ?? id,
    'aria-describedby': cn(child.props['aria-describedby'], describedBy) || undefined,
    ...(error ? { 'aria-invalid': true } : {}),
  });

  return (
    <div data-slot="form-field" className={cn('min-w-0', SPAN[span], TOUCH_INPUT, className)}>
      <div className="mb-2 flex min-h-5 items-center justify-between gap-2">
        <Label id={`${id}-label`} htmlFor={id} className="gap-1.5 leading-5">
          {label}
          {required && (
            <>
              <span aria-hidden="true" className="size-1.5 rounded-full bg-destructive" />
              <span className="sr-only">({t('Required')})</span>
            </>
          )}
          {optional && !required && (
            <span className="text-xs font-normal text-muted-foreground">{t('Optional')}</span>
          )}
        </Label>
        {labelAside && <div className="shrink-0 text-xs text-muted-foreground">{labelAside}</div>}
      </div>
      {control}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-pretty text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* FormToggleRow                                                              */
/* ------------------------------------------------------------------------- */

export interface FormToggleRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  /** id of the Switch/Checkbox. */
  htmlFor: string;
  /** Where the control sits. `start` suits checkboxes (consent), `end` switches. */
  controlPosition?: 'start' | 'end';
  /** Draw the row as a bordered tile. */
  bordered?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormToggleRow({
  label,
  description,
  htmlFor,
  controlPosition = 'end',
  bordered = true,
  className,
  children,
}: FormToggleRowProps) {
  return (
    <div
      data-slot="form-toggle-row"
      className={cn(
        'flex min-h-11 items-start gap-3',
        controlPosition === 'end' && 'flex-row-reverse justify-between',
        bordered && 'rounded-lg border bg-background p-3 sm:p-4',
        className
      )}
    >
      <div className="flex min-h-5 shrink-0 items-center">{children}</div>
      <div className="min-w-0 flex-1">
        <Label htmlFor={htmlFor} className="block cursor-pointer leading-5">
          {label}
        </Label>
        {description && (
          <p id={`${htmlFor}-description`} className="mt-1 text-xs text-pretty text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* FormActions                                                                */
/* ------------------------------------------------------------------------- */

export interface FormActionsProps {
  /** Buttons, secondary first, primary last. */
  children: React.ReactNode;
  /** 'dialog': sticky inside a dialog/sheet (DialogContent gets pb-0). 'page': fixed safe-area bar on phones, inline row from md. */
  sticky?: false | 'dialog' | 'page';
  /** Show the "Unsaved changes" indicator. */
  dirty?: boolean;
  /** Custom status content (replaces the dirty indicator). */
  status?: React.ReactNode;
  className?: string;
}

export function FormActions({ children, sticky = false, dirty, status, className }: FormActionsProps) {
  const { t } = useTranslation('common');
  const statusNode =
    status ??
    (dirty ? (
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
        {t('Unsaved changes')}
      </span>
    ) : null);

  const content = (
    <>
      <div aria-live="polite" className={cn('min-h-0 text-xs text-muted-foreground sm:mr-auto', !statusNode && 'sr-only')}>
        {statusNode}
      </div>
      <div className="grid auto-cols-fr grid-flow-col gap-2 sm:ml-auto sm:flex sm:justify-end">{children}</div>
    </>
  );

  if (sticky === 'page') {
    return (
      <>
        {/* Reserves room so the fixed phone bar never covers the last field. */}
        <div aria-hidden="true" className="h-24 md:hidden" />
        <StickyBottomBar className={cn('flex-col items-stretch gap-2', className)}>
          <div data-slot="form-actions" className="flex w-full flex-col gap-2 md:flex-row md:items-center md:gap-3">
            {content}
          </div>
        </StickyBottomBar>
      </>
    );
  }

  return (
    <div
      data-slot="form-actions"
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3',
        sticky &&
          'sticky bottom-0 z-10 border-t bg-background/95 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80',
        // Desktop dialogs use p-6 (callers pass pb-0); the mobile bottom sheet
        // (.bottom-0) is padded 1.25rem by mobile-app.css, so bleed by that.
        sticky === 'dialog' &&
          '-mx-6 mt-2 px-6 pb-[max(1rem,var(--safe-bottom))] sm:pb-4 [.bottom-0>&]:-bottom-5 [.bottom-0>&]:-mx-5 [.bottom-0>&]:px-5',
        className
      )}
    >
      {content}
    </div>
  );
}

/** Page-level sticky save bar. Same as `<FormActions sticky="page">`. */
export function StickyActionBar(props: Omit<FormActionsProps, 'sticky'>) {
  return <FormActions {...props} sticky="page" />;
}
