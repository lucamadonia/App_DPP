import { Trash2, Plus, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LucidMaterialPicker } from './LucidMaterialPicker';
import type { LucidMaterial, MaterialSplitEntry } from '@/types/compliance';
import { cn } from '@/lib/utils';

interface Props {
  value: MaterialSplitEntry[];
  onChange: (next: MaterialSplitEntry[]) => void;
  /** Gesamtgewicht der Verpackung in g — für Validierung */
  tareWeightGrams: number;
  className?: string;
}

/**
 * Editor für Verbund-Verpackungen: Liste von {material, weight_grams}.
 * Zeigt eine Live-Warnung, wenn die Summe nicht zum tare_weight_grams passt.
 */
export function MaterialSplitEditor({ value, onChange, tareWeightGrams, className }: Props) {
  const sum = value.reduce((s, e) => s + (e.weight_grams || 0), 0);
  const mismatch = tareWeightGrams > 0 && Math.abs(sum - tareWeightGrams) > 1;

  function update(idx: number, patch: Partial<MaterialSplitEntry>) {
    onChange(value.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }
  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...value, { material: 'paper', weight_grams: 0 }]);
  }

  return (
    <div className={cn('space-y-2', className)}>
      {value.map((entry, idx) => (
        <div key={idx} className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <LucidMaterialPicker
              value={entry.material}
              onChange={(m) => update(idx, { material: m as LucidMaterial })}
            />
          </div>
          <div className="w-28 shrink-0">
            <Input
              type="number"
              min={0}
              step={1}
              value={entry.weight_grams}
              onChange={(e) => update(idx, { weight_grams: Math.max(0, Number(e.target.value) || 0) })}
              placeholder="Gramm"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => remove(idx)}
            aria-label="Entfernen"
            className="shrink-0"
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="gap-1">
        <Plus className="h-3.5 w-3.5" />
        Material hinzufügen
      </Button>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Badge variant="outline" className="tabular-nums">
          Summe: {sum} g
        </Badge>
        <Badge variant="outline" className="tabular-nums">
          Tara: {tareWeightGrams} g
        </Badge>
        {mismatch && (
          <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200">
            <AlertTriangle className="h-3 w-3" />
            Summe sollte dem Tara-Gewicht entsprechen
          </Badge>
        )}
      </div>
    </div>
  );
}
