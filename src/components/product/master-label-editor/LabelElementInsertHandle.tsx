import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Type,
  Tag,
  QrCode,
  Image,
  ShieldCheck,
  Minus,
  Space,
  Recycle,
  Barcode,
  Info,
  Stamp,
  Hash,
} from 'lucide-react';
import type { LabelElementType } from '@/types/master-label-editor';

interface LabelElementInsertHandleProps {
  onInsert: (type: LabelElementType) => void;
}

const INSERT_ITEMS: Array<{ type: LabelElementType; icon: typeof Type; labelKey: string }> = [
  { type: 'text', icon: Type, labelKey: 'ml.element.text' },
  { type: 'field-value', icon: Tag, labelKey: 'ml.element.fieldValue' },
  { type: 'qr-code', icon: QrCode, labelKey: 'ml.element.qrCode' },
  { type: 'pictogram', icon: Stamp, labelKey: 'ml.element.pictogram' },
  { type: 'compliance-badge', icon: ShieldCheck, labelKey: 'ml.element.complianceBadge' },
  { type: 'image', icon: Image, labelKey: 'ml.element.image' },
  { type: 'divider', icon: Minus, labelKey: 'ml.element.divider' },
  { type: 'spacer', icon: Space, labelKey: 'ml.element.spacer' },
  { type: 'material-code', icon: Recycle, labelKey: 'ml.element.materialCode' },
  { type: 'barcode', icon: Barcode, labelKey: 'ml.element.barcode' },
  { type: 'icon-text', icon: Info, labelKey: 'ml.element.iconText' },
  { type: 'package-counter', icon: Hash, labelKey: 'ml.element.packageCounter' },
];

export function LabelElementInsertHandle({ onInsert }: LabelElementInsertHandleProps) {
  const { t } = useTranslation('products');
  const [open, setOpen] = useState(false);

  return (
    <div className="flex justify-center py-0.5 opacity-0 group-hover/section:opacity-100 hover:opacity-100 transition-opacity">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="h-8 w-10 rounded-full bg-primary/80 hover:bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 transition-all">
            <Plus className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-2" align="center" side="right">
          <div className="grid grid-cols-4 gap-1">
            {INSERT_ITEMS.map(({ type, icon: Icon, labelKey }) => (
              <button
                key={type}
                onClick={() => {
                  onInsert(type);
                  setOpen(false);
                }}
                className="flex flex-col items-center gap-0.5 p-2 rounded hover:bg-accent text-center"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-[7px] text-muted-foreground leading-tight">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
