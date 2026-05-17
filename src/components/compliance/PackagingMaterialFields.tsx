import { useState } from 'react';
import { Recycle, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LucidMaterialPicker } from './LucidMaterialPicker';
import { MaterialSplitEditor } from './MaterialSplitEditor';
import type { LucidMaterial, MaterialSplitEntry } from '@/types/compliance';

interface Props {
  primaryMaterial?: LucidMaterial | null;
  materialSplit?: MaterialSplitEntry[] | null;
  tareWeightGrams: number;
  onChange: (patch: { primaryMaterial?: LucidMaterial | null; materialSplit?: MaterialSplitEntry[] | null }) => void;
}

/**
 * Material-Setup für eine Verpackung. Ein Hauptmaterial + optional ein
 * Verbund-Split für Mehrkomponenten-Verpackungen (z. B. Karton mit
 * Plastik-Sichtfenster).
 */
export function PackagingMaterialFields({ primaryMaterial, materialSplit, tareWeightGrams, onChange }: Props) {
  const hasSplit = Array.isArray(materialSplit) && materialSplit.length > 0;
  const [splitOpen, setSplitOpen] = useState(hasSplit);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Recycle className="h-4 w-4 text-emerald-600" />
          <span className="text-sm font-medium">Material (LUCID / VerpackG)</span>
          <Badge variant="outline" className="text-[10px]">Pflicht für Monatsmeldung</Badge>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Hauptmaterial</label>
          <LucidMaterialPicker
            value={primaryMaterial ?? null}
            onChange={(m) => onChange({ primaryMaterial: m as LucidMaterial })}
          />
        </div>

        {primaryMaterial && (
          <div className="pt-2 border-t border-border/50">
            <button
              type="button"
              onClick={() => setSplitOpen((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronDown className={`h-3 w-3 transition-transform ${splitOpen ? 'rotate-180' : ''}`} />
              {hasSplit
                ? `Verbund-Material aufgeschlüsselt (${materialSplit!.length} Komponenten)`
                : 'Verbund-Verpackung? Material aufschlüsseln (optional)'}
            </button>
            {splitOpen && (
              <div className="mt-3 space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Falls die Verpackung mehrere Materialien enthält (z. B. Karton + Plastikfenster),
                  gib hier das Gewicht pro Material an. Die Summe sollte das Gesamt-Tara-Gewicht
                  treffen. Lässt du es leer, wird das gesamte Tara-Gewicht dem Hauptmaterial zugeordnet.
                </p>
                <MaterialSplitEditor
                  value={materialSplit || []}
                  onChange={(next) => onChange({ materialSplit: next.length === 0 ? null : next })}
                  tareWeightGrams={tareWeightGrams}
                />
                {hasSplit && (
                  <Button variant="ghost" size="sm" onClick={() => onChange({ materialSplit: null })}>
                    Split entfernen — gesamtes Tara auf Hauptmaterial
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
