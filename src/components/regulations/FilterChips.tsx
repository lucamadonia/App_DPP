import { Search, X, type LucideIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface FilterChipOption {
  value: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * Single-select chip row. Scrolls sideways inside itself on phones (never the
 * page) and wraps from `sm` up. Each chip is a 44px tap target on touch.
 */
export function FilterChips({ options, value, onChange, ariaLabel, className }: FilterChipsProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'scrollbar-hide -mx-1 flex min-w-0 gap-2 overflow-x-auto px-1 py-0.5 sm:flex-wrap sm:overflow-visible',
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium whitespace-nowrap',
              'transition-[background-color,color,border-color,box-shadow] duration-150 ease-out sm:min-h-9',
              'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
              active
                ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
            {opt.label}
            {typeof opt.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px] tabular-nums leading-5',
                  active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  clearLabel: string;
  className?: string;
}

/** Search input with a leading icon and a 44px clear button on touch. */
export function SearchField({ value, onChange, placeholder, clearLabel, className }: SearchFieldProps) {
  return (
    <div className={cn('relative min-w-0', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 pl-9 pr-10 sm:h-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={clearLabel}
          className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground sm:h-9 sm:w-9"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
