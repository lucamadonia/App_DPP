import { useState, useEffect, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ChevronDown, Package } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/adaptive-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  FormActions, FormField, FormGrid, InputAffix, OptionalDisclosure,
} from '@/components/ui/form-layout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { WarehouseZone, WarehouseZoneType } from '@/types/warehouse';
import { ZONE_TYPES } from '@/lib/warehouse-constants';
import { FURNITURE_CATALOG } from '@/components/warehouse/floor-map/furniture-catalog';

interface ZoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone?: WarehouseZone;
  existingCodes: string[];
  onSave: (zone: WarehouseZone) => void;
}

function generateCode(name: string, existingCodes: string[]): string {
  const prefix = name
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 3)
    .toUpperCase();
  if (!prefix) return '';
  let idx = 1;
  let code = `${prefix}-${idx}`;
  while (existingCodes.includes(code)) {
    idx++;
    code = `${prefix}-${idx}`;
  }
  return code;
}

export function ZoneDialog({
  open,
  onOpenChange,
  zone,
  existingCodes,
  onSave,
}: ZoneDialogProps) {
  const { t } = useTranslation('warehouse');
  const isEditing = !!zone;

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<WarehouseZoneType>('storage');
  const [areaM2, setAreaM2] = useState('');
  const [volumeM3, setVolumeM3] = useState('');
  const [binLocations, setBinLocations] = useState<string[]>([]);
  const [binInput, setBinInput] = useState('');
  const [codeError, setCodeError] = useState('');

  // Reset form when dialog opens or zone changes
  useEffect(() => {
    if (open) {
      if (zone) {
        setName(zone.name);
        setCode(zone.code);
        setType(zone.type ?? 'storage');
        setAreaM2(zone.areaM2 != null ? String(zone.areaM2) : '');
        setVolumeM3(zone.volumeM3 != null ? String(zone.volumeM3) : '');
        setBinLocations(zone.binLocations ?? []);
      } else {
        setName('');
        setCode('');
        setType('storage');
        setAreaM2('');
        setVolumeM3('');
        setBinLocations([]);
      }
      setBinInput('');
      setCodeError('');
    }
  }, [open, zone]);

  // Auto-generate code from name (create mode only)
  useEffect(() => {
    if (!isEditing && name) {
      setCode(generateCode(name, existingCodes));
    }
  }, [name, isEditing, existingCodes]);

  // Validate code uniqueness
  useEffect(() => {
    if (!code) {
      setCodeError('');
      return;
    }
    const codesExcludingSelf = isEditing
      ? existingCodes.filter((c) => c !== zone?.code)
      : existingCodes;
    setCodeError(
      codesExcludingSelf.includes(code) ? t('Code already exists') : ''
    );
  }, [code, existingCodes, isEditing, zone?.code, t]);

  function handleBinKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = binInput.trim();
      if (val && !binLocations.includes(val)) {
        setBinLocations((prev) => [...prev, val]);
      }
      setBinInput('');
    }
  }

  function removeBin(bin: string) {
    setBinLocations((prev) => prev.filter((b) => b !== bin));
  }

  function handleSave() {
    const result: WarehouseZone = {
      name: name.trim(),
      code: code.trim(),
      type,
      areaM2: areaM2 ? Number(areaM2) : undefined,
      volumeM3: volumeM3 ? Number(volumeM3) : undefined,
      binLocations: binLocations.length > 0 ? binLocations : undefined,
      // Preserve existing floor-map data when editing
      ...(zone?.mapPosition ? { mapPosition: zone.mapPosition } : {}),
      ...(zone?.furniture ? { furniture: zone.furniture } : {}),
    };
    onSave(result);
  }

  const canSave = name.trim() && code.trim() && !codeError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto pb-0">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('Edit Zone') : t('Add Zone')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <FormGrid cols={6}>
            <FormField label={t('Zone Name')} htmlFor="zone-name" required span={4}>
              <Input
                id="zone-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </FormField>
            <FormField
              label={t('Zone Code')}
              htmlFor="zone-code"
              required
              span={2}
              error={codeError || undefined}
            >
              <Input
                id="zone-code"
                value={code}
                autoCapitalize="characters"
                className="font-mono"
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </FormField>
            <FormField label={t('Zone Type')} htmlFor="zone-type" span="full">
              <Select
                value={type}
                onValueChange={(v) => setType(v as WarehouseZoneType)}
              >
                <SelectTrigger id="zone-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ZONE_TYPES.map((zt) => (
                    <SelectItem key={zt} value={zt}>
                      {t(zt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </FormGrid>

          <OptionalDisclosure
            label={t('Size & bin locations')}
            description={t('Area, volume and bin locations')}
            filledCount={[areaM2, volumeM3].filter(Boolean).length + (binLocations.length > 0 ? 1 : 0)}
            defaultOpen={isEditing && Boolean(areaM2 || volumeM3 || binLocations.length)}
          >
            <FormGrid cols={2}>
              <FormField label={t('Area')} htmlFor="zone-area" optional>
                <InputAffix suffix="m²">
                  <Input
                    id="zone-area"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={areaM2}
                    onChange={(e) => setAreaM2(e.target.value)}
                  />
                </InputAffix>
              </FormField>
              <FormField label={t('Capacity Volume')} htmlFor="zone-volume" optional>
                <InputAffix suffix="m³">
                  <Input
                    id="zone-volume"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={volumeM3}
                    onChange={(e) => setVolumeM3(e.target.value)}
                  />
                </InputAffix>
              </FormField>
              <FormField
                label={t('Bin Locations')}
                htmlFor="zone-bins"
                optional
                span="full"
                hint={t('Press Enter to add each bin location.')}
              >
                <Input
                  id="zone-bins"
                  placeholder={t('Add bin location...')}
                  enterKeyHint="done"
                  value={binInput}
                  onChange={(e) => setBinInput(e.target.value)}
                  onKeyDown={handleBinKeyDown}
                />
              </FormField>
            </FormGrid>
            {binLocations.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {binLocations.map((bin) => (
                  <Badge
                    key={bin}
                    variant="secondary"
                    className="gap-1 pr-0.5 font-mono"
                  >
                    {bin}
                    <button
                      type="button"
                      onClick={() => removeBin(bin)}
                      aria-label={`${t('Remove', { ns: 'common' })} ${bin}`}
                      className="relative ml-0.5 rounded-full p-0.5 transition-colors duration-150 ease-out hover:bg-muted-foreground/20 after:absolute after:-inset-2.5 after:content-['']"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </OptionalDisclosure>

          {/* Furniture summary (read-only, editing in ZoneFurnitureManager) */}
          {isEditing && zone?.furniture && zone.furniture.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="group flex min-h-11 w-full items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors duration-150 ease-out hover:bg-muted/50"
                >
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t('Shelves & Racks')}</span>
                  <Badge variant="secondary" className="ml-auto text-xs tabular-nums">
                    {zone.furniture.length} {t('shelves')}
                  </Badge>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 ease-out group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-1 rounded-lg border p-2">
                  {zone.furniture.map((f) => {
                    const catalog = FURNITURE_CATALOG[f.type];
                    return (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 text-xs px-2 py-1.5 rounded hover:bg-muted/30"
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: catalog.stroke }}
                        />
                        <span className="truncate">{f.name}</span>
                        <span className="text-muted-foreground ml-auto tabular-nums">
                          {f.sections.length} {t('sections')}
                        </span>
                      </div>
                    );
                  })}
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    {t('Manage Shelves')} →
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        <FormActions sticky="dialog">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEditing ? t('Save', { ns: 'common' }) : t('Add Zone')}
          </Button>
        </FormActions>
      </DialogContent>
    </Dialog>
  );
}
