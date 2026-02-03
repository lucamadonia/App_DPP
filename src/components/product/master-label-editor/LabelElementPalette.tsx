import { useTranslation } from 'react-i18next';
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

interface LabelElementPaletteProps {
  onDragStart: (type: LabelElementType) => void;
  onClickAdd: (type: LabelElementType) => void;
}

const PALETTE_ITEMS: Array<{ type: LabelElementType; icon: typeof Type; labelKey: string }> = [
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

export function LabelElementPalette({ onDragStart, onClickAdd }: LabelElementPaletteProps) {
  const { t } = useTranslation('products');

  return (
    <div className="p-1.5 space-y-1">
      {PALETTE_ITEMS.map(({ type, icon: Icon, labelKey }) => (
        <button
          key={type}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', type);
            onDragStart(type);
          }}
          onClick={() => onClickAdd(type)}
          className="w-full flex flex-col items-center gap-0.5 p-1.5 rounded-md cursor-grab active:cursor-grabbing hover:bg-accent hover:scale-110 transition-all"
          title={t(labelKey)}
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-[9px] text-muted-foreground leading-tight text-center">
            {t(labelKey)}
          </span>
        </button>
      ))}
    </div>
  );
}
