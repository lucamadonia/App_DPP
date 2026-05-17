import { Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { EarCategoryPicker } from './EarCategoryPicker';
import type { Product } from '@/types/product';
import type { EarCategory } from '@/types/compliance';

interface Props {
  /** Subset of Product carrying the EAR fields. */
  product: Pick<Product,
    'isElectronic' | 'earCategory' | 'earDeviceType' | 'earBrand' |
    'earIncludesBattery' | 'earBatteryWeightGrams' | 'earB2b' | 'manufacturer'>;
  onChange: (patch: Partial<Product>) => void;
}

/**
 * Section für ProductFormPage zur Erfassung der EAR-Pflichtfelder.
 * Toggle-driven: nur sichtbar wenn isElectronic = true.
 */
export function ProductEarFields({ product, onChange }: Props) {
  const isElectronic = product.isElectronic ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4" />
          EAR / ElektroG (Stiftung Elektro-Altgeräte-Register)
        </CardTitle>
        <CardDescription>
          Pflicht für Elektro- und Elektronik-Geräte: monatliche Meldung bis zum 15. an die Stiftung EAR.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Toggle */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-medium">Dies ist ein Elektro-/Elektronikgerät</div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aktivieren wenn das Produkt unter das deutsche Elektrogesetz (ElektroG) fällt — z. B. mit
              Stecker, Akku, Sensor, Display oder Funkfunktion.
            </p>
          </div>
          <Switch
            checked={isElectronic}
            onCheckedChange={(v) => onChange({ isElectronic: v })}
          />
        </div>

        {isElectronic && (
          <>
            {/* Category */}
            <div className="space-y-1.5 pt-2 border-t border-border/50">
              <label className="text-sm font-medium">
                Geräte-Kategorie <span className="text-destructive">*</span>
              </label>
              <p className="text-xs text-muted-foreground">
                Eine der 6 amtlichen Stiftung-EAR-Kategorien.
              </p>
              <EarCategoryPicker
                value={product.earCategory ?? null}
                onChange={(c: EarCategory) => onChange({ earCategory: c })}
              />
            </div>

            {/* Device Type + Brand */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Gerätebezeichnung</label>
                <Input
                  value={product.earDeviceType ?? ''}
                  onChange={(e) => onChange({ earDeviceType: e.target.value })}
                  placeholder="z. B. Smart Sensor"
                />
                <p className="text-[10px] text-muted-foreground">
                  Was würde der Hersteller in der EAR-Meldung als Gerätetyp eintragen?
                </p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">EAR-Marke</label>
                <Input
                  value={product.earBrand ?? ''}
                  onChange={(e) => onChange({ earBrand: e.target.value })}
                  placeholder={product.manufacturer || 'Marken-Name'}
                />
                <p className="text-[10px] text-muted-foreground">
                  Marke, unter der bei Stiftung EAR registriert wurde (kann vom Hersteller abweichen).
                </p>
              </div>
            </div>

            {/* Battery */}
            <div className="pt-2 border-t border-border/50 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">Enthält Batterie / Akku</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Pflichtangabe für BattG. Wenn ja, bitte Gewicht der Batterie pro Stück angeben.
                  </p>
                </div>
                <Switch
                  checked={product.earIncludesBattery ?? false}
                  onCheckedChange={(v) => onChange({ earIncludesBattery: v })}
                />
              </div>
              {product.earIncludesBattery && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Batterie-Gewicht pro Stück (g)</label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={product.earBatteryWeightGrams ?? ''}
                    onChange={(e) => onChange({ earBatteryWeightGrams: Number(e.target.value) || undefined })}
                    placeholder="z. B. 25"
                    className="w-40"
                  />
                </div>
              )}
            </div>

            {/* B2B Flag */}
            <div className="flex items-start justify-between gap-3 pt-2 border-t border-border/50">
              <div className="min-w-0">
                <div className="text-sm font-medium flex items-center gap-1.5">
                  Nur an Geschäftskunden (B2B)
                  <Badge variant="outline" className="text-[10px]">EAR-Spalte</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Wenn das Produkt ausschließlich an Geschäftskunden geht (anders zu melden als B2C).
                </p>
              </div>
              <Switch
                checked={product.earB2b ?? false}
                onCheckedChange={(v) => onChange({ earB2b: v })}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
