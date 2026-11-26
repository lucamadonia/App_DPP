import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { IconTile } from '@/components/ui/icon-tile';
import { cn } from '@/lib/utils';

/** Card section of the calculator form with numbered icon header. */
export function FormSection({
  icon,
  step,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
      <header className="mb-5 flex items-start gap-3">
        <IconTile icon={icon} size="md" />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            {String(step).padStart(2, '0')}
          </p>
          <h2 className="text-lg font-semibold leading-snug">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{description}</p>}
        </div>
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

/** Field label row with an optional "required" marker. */
export function FieldLabel({ children, required, htmlFor }: { children: ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-center gap-1 text-sm font-medium">
      {children}
      {required && (
        <span className="text-destructive" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/** Single- or multi-select pill group with 44px touch targets that wrap. */
export function OptionPills<T extends string>({
  options,
  isSelected,
  onToggle,
  label,
}: {
  options: SegmentedOption<T>[];
  isSelected: (value: T) => boolean;
  onToggle: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = isSelected(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onToggle(o.value)}
            className={cn(
              'inline-flex min-h-11 max-w-full items-center rounded-xl border px-3.5 py-2 text-left text-sm font-medium sm:min-h-9',
              'transition-[background-color,border-color,color,box-shadow] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              selected
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card hover:border-primary/40 hover:bg-primary/5'
            )}
          >
            <span className="break-words">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Switch row for a yes/no product property, with optional nested content. */
export function FeatureToggle({
  id,
  icon: Icon,
  label,
  checked,
  onChange,
  children,
}: {
  id: string;
  icon: LucideIcon;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border transition-colors duration-200',
        checked ? 'border-primary/40 bg-primary/[0.04]' : 'bg-card'
      )}
    >
      <label htmlFor={id} className="flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2.5">
        <span
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
            checked ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          )}
          aria-hidden="true"
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium leading-snug">{label}</span>
        <Switch id={id} checked={checked} onCheckedChange={onChange} />
      </label>
      {checked && children && <div className="border-t px-3 py-3 sm:pl-[3.75rem]">{children}</div>}
    </div>
  );
}
