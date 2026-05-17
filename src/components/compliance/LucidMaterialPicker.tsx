import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LucidMaterial } from '@/types/compliance';
import { LUCID_MATERIAL_NAMES_DE, LUCID_MATERIAL_ORDER } from '@/types/compliance';

interface Props {
  value?: LucidMaterial | null;
  onChange: (value: LucidMaterial) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const HINT: Record<LucidMaterial, string> = {
  paper: 'PAP (20–22)',
  plastic: 'LDPE (04), HDPE (02), PP (05), PET (01), PS (06)',
  glass: 'GL (70–79)',
  aluminum: 'ALU (41)',
  steel: 'FE (40), Weißblech',
  composite: 'C/PAP, C/PE, C/ALU — mehrere Materialien fest verbunden',
  wood: 'FOR (50), Holz',
  other: 'Keramik, Textil, sonstige',
};

export function LucidMaterialPicker({ value, onChange, placeholder = 'Material wählen…', className, disabled }: Props) {
  return (
    <Select value={value ?? undefined} onValueChange={v => onChange(v as LucidMaterial)} disabled={disabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {LUCID_MATERIAL_ORDER.map((m) => (
          <SelectItem key={m} value={m}>
            <div className="flex flex-col">
              <span className="font-medium">{LUCID_MATERIAL_NAMES_DE[m]}</span>
              <span className="text-[10px] text-muted-foreground">{HINT[m]}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
