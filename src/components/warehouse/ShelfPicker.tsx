import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FURNITURE_CATALOG } from '@/components/warehouse/floor-map/furniture-catalog';
import type { WhLocation } from '@/types/warehouse';

export interface ShelfPickerValue {
  binLocation: string; // "uuid:sectionId" or plain text
  zone: string; // zone name
  displayLabel: string; // human-readable
}

interface ShelfPickerProps {
  location: WhLocation;
  value?: string;
  zone?: string;
  onSelect: (value: ShelfPickerValue) => void;
  onClear?: () => void;
  disabled?: boolean;
}

export function ShelfPicker({
  location,
  value,
  zone: initialZone,
  onSelect,
  onClear,
  disabled,
}: ShelfPickerProps) {
  const { t, i18n } = useTranslation('warehouse');
  const isDE = i18n.language.startsWith('de');

  const [manual, setManual] = useState(false);
  const [manualValue, setManualValue] = useState(value ?? '');
  const [selectedZone, setSelectedZone] = useState(initialZone ?? '');
  const [selectedFurnitureId, setSelectedFurnitureId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  const zones = location.zones.filter((z) => (z.furniture?.length ?? 0) > 0 || (z.binLocations?.length ?? 0) > 0);
  const currentZone = zones.find((z) => z.name === selectedZone);
  const furniture = currentZone?.furniture ?? [];
  const currentFurniture = furniture.find((f) => f.id === selectedFurnitureId);
  const sections = currentFurniture?.sections ?? [];

  const handleZoneChange = (zoneName: string) => {
    setSelectedZone(zoneName);
    setSelectedFurnitureId('');
    setSelectedSectionId('');
  };

  const handleFurnitureChange = (furnitureId: string) => {
    setSelectedFurnitureId(furnitureId);
    setSelectedSectionId('');
  };

  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    if (!selectedFurnitureId || !selectedZone) return;
    const f = furniture.find((f) => f.id === selectedFurnitureId);
    const s = f?.sections.find((s) => s.id === sectionId);
    if (f && s) {
      onSelect({
        binLocation: `${f.id}:${s.id}`,
        zone: selectedZone,
        displayLabel: `${currentZone?.name} > ${f.name} > ${s.label}`,
      });
    }
  };

  const handleManualSubmit = () => {
    if (!manualValue.trim()) return;
    onSelect({
      binLocation: manualValue.trim(),
      zone: selectedZone || '',
      displayLabel: manualValue.trim(),
    });
  };

  const handleClear = () => {
    setSelectedZone('');
    setSelectedFurnitureId('');
    setSelectedSectionId('');
    setManualValue('');
    onClear?.();
  };

  // Show selected value as chip
  if (value && !manual) {
    // Try to resolve display label
    let display = value;
    for (const z of location.zones) {
      for (const f of z.furniture ?? []) {
        if (value.startsWith(`${f.id}:`)) {
          const secId = value.slice(f.id.length + 1);
          const sec = f.sections.find((s) => s.id === secId);
          display = `${z.name} > ${f.name} > ${sec?.label ?? secId}`;
          break;
        }
      }
    }

    return (
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1.5 text-[10px] sm:text-xs py-1 px-2 sm:px-2.5 max-w-full">
          <span className="truncate">{display}</span>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5 shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </Badge>
      </div>
    );
  }

  // No zones with furniture? Show just a text input
  if (zones.length === 0 || !zones.some((z) => (z.furniture?.length ?? 0) > 0)) {
    return (
      <Input
        value={manualValue}
        onChange={(e) => setManualValue(e.target.value)}
        onBlur={handleManualSubmit}
        placeholder="z.B. A-03-12"
        disabled={disabled}
      />
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3">
      {/* Toggle manual/picker */}
      <div className="flex items-center gap-2 justify-end">
        <Label htmlFor="manual-toggle" className="text-[10px] sm:text-xs text-muted-foreground cursor-pointer">
          {t('or enter manually')}
        </Label>
        <Switch
          id="manual-toggle"
          checked={manual}
          onCheckedChange={setManual}
          disabled={disabled}
        />
      </div>

      {manual ? (
        <Input
          value={manualValue}
          onChange={(e) => setManualValue(e.target.value)}
          onBlur={handleManualSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
          placeholder="z.B. A-03-12"
          disabled={disabled}
        />
      ) : (
        <div className="grid gap-1.5 sm:gap-2">
          {/* Zone select */}
          <Select
            value={selectedZone}
            onValueChange={handleZoneChange}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('Select Zone')} />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z.code} value={z.name}>
                  {z.name} ({z.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Furniture select */}
          {selectedZone && furniture.length > 0 && (
            <Select
              value={selectedFurnitureId}
              onValueChange={handleFurnitureChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('Select Shelf')} />
              </SelectTrigger>
              <SelectContent>
                {furniture.map((f) => {
                  const catalog = FURNITURE_CATALOG[f.type];
                  const label = isDE ? catalog.labelDe : catalog.labelEn;
                  return (
                    <SelectItem key={f.id} value={f.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: catalog.stroke }}
                        />
                        {f.name}
                        <span className="text-xs text-muted-foreground">
                          ({label})
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {/* Section select */}
          {selectedFurnitureId && sections.length > 0 && (
            <Select
              value={selectedSectionId}
              onValueChange={handleSectionChange}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('Select Section')} />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                    {s.capacity != null && (
                      <span className="text-xs text-muted-foreground ml-1">
                        ({t('Capacity')}: {s.capacity})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
    </div>
  );
}
