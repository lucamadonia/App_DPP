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
];

export function LabelElementInsertHandle({ onInsert }: LabelElementInsertHandleProps) {
  const { t } = useTranslation('products');
  const [open, setOpen] = useState(false);

  return (
    <div className="flex justify-center py-0.5 opacity-0 group-hover/section:opacity-100 hover:opacity-100 transition-opacity">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 transition-transform animate-insert-handle-pulse">
            <Plus className="h-3 w-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="center" side="right">
          <div className="grid grid-cols-3 gap-1">
            {INSERT_ITEMS.map(({ type, icon: Icon, labelKey }) => (
              <button
                key={type}
                onClick={() => {
                  onInsert(type);
                  setOpen(false);
                }}
                className="flex flex-col items-center gap-0.5 p-1.5 rounded hover:bg-accent text-center"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[8px] text-muted-foreground leading-tight">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
