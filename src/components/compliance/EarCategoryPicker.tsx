import { Snowflake, Monitor, Lightbulb, Refrigerator, Plug, Smartphone, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { EarCategory } from '@/types/compliance';
import { EAR_CATEGORY_NAMES_DE } from '@/types/compliance';

interface Props {
  value?: EarCategory | null;
  onChange: (value: EarCategory) => void;
  className?: string;
}

const CATEGORY_META: Record<EarCategory, { icon: typeof Snowflake; examples: string; color: string }> = {
  1: { icon: Snowflake,    examples: 'Kühlschrank, Klima, Wärmepumpe',              color: 'text-blue-600' },
  2: { icon: Monitor,      examples: 'TV, Monitor, Laptop, Tablet (>100 cm²)',       color: 'text-indigo-600' },
  3: { icon: Lightbulb,    examples: 'LED, Leuchtstoff, Halogen',                    color: 'text-amber-600' },
  4: { icon: Refrigerator, examples: 'Waschmaschine, Backofen (>50 cm)',             color: 'text-purple-600' },
  5: { icon: Plug,         examples: 'Wasserkocher, Bohrmaschine, Rasierer (≤50 cm)', color: 'text-emerald-600' },
  6: { icon: Smartphone,   examples: 'Smartphone, Router, Drucker (≤50 cm)',         color: 'text-rose-600' },
};

/**
 * 6-Karten-Grid für die offiziellen Stiftung-EAR-Geräte-Kategorien.
 * Touch-friendly auf Mobile, prominente Auswahl-State mit Häkchen.
 */
export function EarCategoryPicker({ value, onChange, className }: Props) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 gap-2', className)}>
      {([1, 2, 3, 4, 5, 6] as EarCategory[]).map((c) => {
        const meta = CATEGORY_META[c];
        const Icon = meta.icon;
        const selected = value === c;
        return (
          <Card
            key={c}
            onClick={() => onChange(c)}
            className={cn(
              'relative cursor-pointer transition-all p-3 hover:bg-muted/50 active:scale-[0.98]',
              selected && 'ring-2 ring-primary shadow-md bg-primary/5',
            )}
            role="radio"
            aria-checked={selected}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onChange(c);
              }
            }}
          >
            {selected && (
              <div className="absolute top-1.5 right-1.5 rounded-full bg-primary text-primary-foreground p-0.5">
                <Check className="h-3 w-3" />
              </div>
            )}
            <div className="flex items-start gap-2">
              <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', meta.color)} aria-hidden />
              <div className="min-w-0">
                <div className="text-xs font-bold tabular-nums text-muted-foreground">Kategorie {c}</div>
                <div className="text-sm font-semibold leading-tight break-words">{EAR_CATEGORY_NAMES_DE[c]}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{meta.examples}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
