import { useState, useEffect, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { WarehouseZone, WarehouseZoneType } from '@/types/warehouse';
import { ZONE_TYPES } from '@/lib/warehouse-constants';

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
    };
    onSave(result);
  }

  const canSave = name.trim() && code.trim() && !codeError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('Edit Zone') : t('Add Zone')}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Zone Name */}
          <div className="grid gap-1.5">
            <Label htmlFor="zone-name">{t('Zone Name')} *</Label>
            <Input
              id="zone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          {/* Zone Code */}
          <div className="grid gap-1.5">
            <Label htmlFor="zone-code">{t('Zone Code')} *</Label>
            <Input
              id="zone-code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className={codeError ? 'border-destructive' : ''}
            />
            {codeError && (
              <p className="text-xs text-destructive">{codeError}</p>
            )}
          </div>

          {/* Zone Type */}
          <div className="grid gap-1.5">
            <Label>{t('Zone Type')}</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as WarehouseZoneType)}
            >
              <SelectTrigger>
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
          </div>

          {/* Area & Volume */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="zone-area">{t('Area (m\u00B2)')}</Label>
              <Input
                id="zone-area"
                type="number"
                min={0}
                step="any"
                value={areaM2}
                onChange={(e) => setAreaM2(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="zone-volume">{t('Volume (m\u00B3)')}</Label>
              <Input
                id="zone-volume"
                type="number"
                min={0}
                step="any"
                value={volumeM3}
                onChange={(e) => setVolumeM3(e.target.value)}
              />
            </div>
          </div>

          {/* Bin Locations */}
          <div className="grid gap-1.5">
            <Label>{t('Bin Locations')}</Label>
            <Input
              placeholder={t('Add bin location...')}
              value={binInput}
              onChange={(e) => setBinInput(e.target.value)}
              onKeyDown={handleBinKeyDown}
            />
            {binLocations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {binLocations.map((bin) => (
                  <Badge
                    key={bin}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {bin}
                    <button
                      type="button"
                      onClick={() => removeBin(bin)}
                      className="ml-0.5 rounded-full hover:bg-muted-foreground/20 p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button onClick={handleSave} disabled={!canSave}>
            {isEditing ? t('Edit Zone') : t('Add Zone')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
