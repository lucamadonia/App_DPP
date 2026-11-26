import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, CircleSlash, Recycle, X } from 'lucide-react';
import type { PackagingMaterial } from '@/data/calculator-options';
import { cn } from '@/lib/utils';

interface PackagingMaterialPickerProps {
  materials: PackagingMaterial[];
  selected: string[];
  onToggle: (id: string) => void;
}

/**
 * Packaging material cards grouped by material family. Groups are derived from
 * the (localised) data itself, so German category names ("Kunststoff") show
 * up instead of silently vanishing behind a hard-coded English list.
 */
export function PackagingMaterialPicker({ materials, selected, onToggle }: PackagingMaterialPickerProps) {
  const { t } = useTranslation('compliance');

  const groups = useMemo(() => {
    const order: string[] = [];
    const byCat: Record<string, PackagingMaterial[]> = {};
    for (const m of materials) {
      if (!byCat[m.category]) {
        byCat[m.category] = [];
        order.push(m.category);
      }
      byCat[m.category].push(m);
    }
    return order.map((cat) => ({ cat, items: byCat[cat] }));
  }, [materials]);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-semibold">{t('Select packaging materials')}</p>
        <p className="text-sm text-muted-foreground">
          {t('Select all materials used in your packaging. The codes correspond to Decision 97/129/EC.')}
        </p>
      </div>

      {groups.map(({ cat, items }) => (
        <div key={cat} className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{cat}</p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-2">
            {items.map((pm) => {
              const isOn = selected.includes(pm.id);
              return (
                <button
                  key={pm.id}
                  type="button"
                  aria-pressed={isOn}
                  onClick={() => onToggle(pm.id)}
                  className={cn(
                    'relative min-w-0 rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow] duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isOn
                      ? 'border-primary bg-primary/[0.07] ring-1 ring-primary/40'
                      : 'bg-card hover:border-primary/30 hover:bg-muted/40'
                  )}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <span className="min-w-0 text-sm font-medium leading-snug break-words">{pm.name}</span>
                    <span
                      className={cn(
                        'inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[11px] font-semibold',
                        isOn ? 'border-primary bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                      )}
                    >
                      {isOn && <Check className="h-3 w-3" aria-hidden="true" />}
                      {pm.code}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{pm.description}</p>
                  {pm.recyclable !== undefined && (
                    <span
                      className={cn(
                        'mt-2 inline-flex items-center gap-1 text-[11px] font-medium',
                        pm.recyclable ? 'text-success' : 'text-muted-foreground'
                      )}
                    >
                      {pm.recyclable ? <Recycle className="h-3 w-3" /> : <CircleSlash className="h-3 w-3" />}
                      {pm.recyclable ? t('Recyclable') : t('Difficult to recycle')}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {selected.length > 0 && (
        <div className="rounded-xl border bg-muted/40 p-3">
          <p className="text-sm font-medium">
            {t('Selected Materials')} ({selected.length})
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selected.map((id) => {
              const pm = materials.find((m) => m.id === id);
              return pm ? (
                <button
                  key={id}
                  type="button"
                  onClick={() => onToggle(id)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  aria-label={t('Remove {{name}}', { name: pm.name })}
                >
                  {pm.code}
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
