import { useTranslation } from 'react-i18next';
import type { LabelElement } from '@/types/master-label-editor';
import type { MasterLabelData } from '@/types/master-label';
import { resolveFieldValue } from '@/lib/master-label-assembler';
import { getBuiltinPictogram } from '@/lib/master-label-builtin-pictograms';
import { LabelFloatingToolbar } from './LabelFloatingToolbar';

interface LabelCanvasElementProps {
  element: LabelElement;
  data: MasterLabelData | null;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (hovering: boolean) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => boolean;
  onDragEnd: () => void;
}

function ElementPreview({ element, data }: { element: LabelElement; data: MasterLabelData | null }) {
  const { t } = useTranslation('products');

  switch (element.type) {
    case 'text':
      return (
        <div
          style={{
            fontSize: `${element.fontSize * 1.2}px`,
            fontWeight: element.fontWeight,
            color: element.color,
            textAlign: element.alignment,
            fontStyle: element.italic ? 'italic' : 'normal',
            textTransform: element.uppercase ? 'uppercase' : 'none',
          }}
        >
          {element.content}
        </div>
      );

    case 'field-value': {
      const value = data ? resolveFieldValue(element.fieldKey, data) : `{${element.fieldKey}}`;
      const displayValue = element.uppercase ? (value || `{${element.fieldKey}}`).toUpperCase() : (value || `{${element.fieldKey}}`);
      const fvStyle: React.CSSProperties = {
        fontSize: `${element.fontSize * 1.2}px`,
        fontWeight: element.fontWeight,
        color: element.color,
        fontStyle: element.italic ? 'italic' : 'normal',
        lineHeight: element.lineHeight ?? 1.2,
        fontFamily: element.fontFamily || undefined,
      };
      if (element.layout === 'stacked') {
        return (
          <div style={{ textAlign: element.alignment, marginBottom: element.marginBottom != null ? `${element.marginBottom}px` : '2px' }}>
            {element.showLabel && (
              <div style={{ fontSize: `${(element.fontSize - 1) * 1.2}px`, color: element.labelColor }}>
                {element.labelText || t(`ml.field.${element.fieldKey}`)}
              </div>
            )}
            <div style={fvStyle}>{displayValue}</div>
          </div>
        );
      }
      return (
        <div className="flex gap-1" style={{ justifyContent: element.alignment === 'center' ? 'center' : element.alignment === 'right' ? 'flex-end' : 'flex-start', marginBottom: element.marginBottom != null ? `${element.marginBottom}px` : '2px' }}>
          {element.showLabel && (
            <span style={{ fontSize: `${(element.fontSize - 0.5) * 1.2}px`, color: element.labelColor, minWidth: '55px' }}>
              {element.labelText || t(`ml.field.${element.fieldKey}`)}
            </span>
          )}
          <span style={fvStyle}>{displayValue}</span>
        </div>
      );
    }

    case 'qr-code':
      return (
        <div className="flex items-center gap-2" style={{ justifyContent: element.alignment === 'center' ? 'center' : element.alignment === 'right' ? 'flex-end' : 'flex-start' }}>
          <div className="border border-gray-200" style={{ width: `${element.size * 0.8}px`, height: `${element.size * 0.8}px` }}>
            {data?.dppQr.qrDataUrl ? (
              <img src={data.dppQr.qrDataUrl} alt="QR" className="w-full h-full" loading="lazy" />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-[8px] text-muted-foreground">QR</span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {element.showLabel && (
              <div className="text-[8px] font-bold">{element.labelText}</div>
            )}
            {element.showUrl && data?.dppQr.dppUrl && (
              <div className="text-[6px] text-gray-500 break-all truncate">{data.dppQr.dppUrl}</div>
            )}
          </div>
        </div>
      );

    case 'pictogram': {
      const pic = element.source === 'builtin' ? getBuiltinPictogram(element.pictogramId) : null;
      return (
        <div style={{ textAlign: element.alignment }}>
          {pic ? (
            <svg viewBox={pic.viewBox} style={{ width: `${element.size}px`, height: `${element.size}px` }}>
              <path d={pic.svgPath} fill={element.color} />
            </svg>
          ) : (
            <div className="inline-block border border-dashed border-muted-foreground/50 rounded p-1">
              <span className="text-[8px] text-muted-foreground">{element.pictogramId}</span>
            </div>
          )}
          {element.showLabel && element.labelText && (
            <div className="text-[7px]" style={{ color: element.color }}>{element.labelText}</div>
          )}
        </div>
      );
    }

    case 'compliance-badge':
      return (
        <div style={{ textAlign: element.alignment }}>
          <span
            className="inline-block px-1 py-0.5 rounded text-center"
            style={{
              fontSize: `${element.size * 1.2}px`,
              fontWeight: 'bold',
              color: element.style === 'filled' ? '#fff' : element.color,
              borderWidth: element.style === 'minimal' ? 0 : '1px',
              borderStyle: 'solid',
              borderColor: element.color,
              backgroundColor: element.style === 'filled' ? element.backgroundColor || element.color : 'transparent',
              minWidth: '20px',
            }}
          >
            {element.symbol}
          </span>
        </div>
      );

    case 'image':
      return (
        <div style={{ textAlign: element.alignment }}>
          {element.src ? (
            <img
              src={element.src}
              alt={element.alt}
              style={{ width: `${element.width}%`, borderRadius: `${element.borderRadius}px`, display: 'inline-block' }}
            />
          ) : (
            <div className="inline-block border-2 border-dashed border-muted-foreground/30 rounded p-3">
              <span className="text-[9px] text-muted-foreground">{t('ml.element.image')}</span>
            </div>
          )}
        </div>
      );

    case 'divider':
      return (
        <div
          style={{
            marginTop: `${element.marginTop}px`,
            marginBottom: `${element.marginBottom}px`,
            borderBottomWidth: `${element.thickness}px`,
            borderBottomColor: element.color,
            borderBottomStyle: element.style,
          }}
        />
      );

    case 'spacer':
      return (
        <div
          className="border border-dashed border-muted-foreground/20 flex items-center justify-center"
          style={{ height: `${element.height}px` }}
        >
          <span className="text-[7px] text-muted-foreground/40">{element.height}pt</span>
        </div>
      );

    case 'material-code': {
      const codes = element.autoPopulate && data
        ? (data.sustainability.packagingMaterialCodes.length > 0 ? data.sustainability.packagingMaterialCodes : element.codes)
        : element.codes;
      return (
        <div className="flex flex-wrap gap-0.5" style={{ justifyContent: element.alignment === 'center' ? 'center' : element.alignment === 'right' ? 'flex-end' : 'flex-start' }}>
          {codes.length > 0 ? codes.map((code, i) => (
            <span
              key={i}
              className="px-1 py-0.5 border rounded-sm"
              style={{ fontSize: `${element.fontSize * 1.1}px`, color: element.color, borderColor: element.borderColor }}
            >
              {code}
            </span>
          )) : (
            <span className="text-[8px] text-muted-foreground italic">{t('ml.element.materialCode')}</span>
          )}
        </div>
      );
    }

    case 'barcode': {
      const value = element.autoPopulate && data ? data.identity.modelSku : element.value;
      return (
        <div style={{ textAlign: element.alignment }}>
          <div className="inline-block border border-gray-300 px-2 py-1">
            <div className="font-mono tracking-widest text-[10px]">{value || 'BARCODE'}</div>
          </div>
          {element.showText && value && (
            <div className="text-[7px] text-center mt-0.5">{value}</div>
          )}
        </div>
      );
    }

    case 'icon-text':
      return (
        <div className="flex items-center gap-1" style={{ justifyContent: element.alignment === 'center' ? 'center' : element.alignment === 'right' ? 'flex-end' : 'flex-start' }}>
          <div
            className="rounded-full flex items-center justify-center shrink-0"
            style={{
              width: `${element.iconSize * 1.2}px`,
              height: `${element.iconSize * 1.2}px`,
              backgroundColor: element.color + '20',
              color: element.color,
              fontSize: `${element.iconSize * 0.7}px`,
            }}
          >
            i
          </div>
          <span style={{ fontSize: `${element.fontSize * 1.2}px`, color: element.color }}>
            {element.text}
          </span>
        </div>
      );

    case 'package-counter': {
      const previewText = element.format === 'x-slash-y'
        ? 'X/Y'
        : element.format === 'package-x-of-y'
        ? t('ml.element.packageCounter.previewPackage')
        : element.format === 'box-x-of-y'
        ? t('ml.element.packageCounter.previewBox')
        : element.format === 'parcel-x-of-y'
        ? t('ml.element.packageCounter.previewParcel')
        : t('ml.element.packageCounter.previewXofY');

      return (
        <div
          style={{
            display: 'flex',
            justifyContent:
              element.alignment === 'center' ? 'center'
              : element.alignment === 'right' ? 'flex-end'
              : 'flex-start',
            marginBottom: '4px',
          }}
        >
          <div
            style={{
              border: element.showBorder ? `${element.borderWidth}px solid ${element.borderColor}` : 'none',
              borderRadius: `${element.borderRadius}px`,
              backgroundColor: element.showBackground ? element.backgroundColor : 'transparent',
              padding: `${element.padding * 0.75}px ${element.padding}px`,
              minWidth: '60px',
              position: 'relative',
            }}
          >
            <div
              style={{
                fontSize: `${element.fontSize * 1.2}px`,
                fontWeight: element.fontWeight,
                fontFamily: element.fontFamily || 'inherit',
                color: element.color,
                textAlign: element.alignment,
                textTransform: element.uppercase ? 'uppercase' : 'none',
                letterSpacing: '0.5px',
                opacity: 0.7,
              }}
            >
              {previewText}
            </div>
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: '#3b82f6',
                color: 'white',
                fontSize: '8px',
                fontWeight: 'bold',
                borderRadius: '4px',
                padding: '2px 4px',
              }}
            >
              {t('ml.element.packageCounter.dynamic')}
            </div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

export function LabelCanvasElement({
  element,
  data,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: LabelCanvasElementProps) {
  return (
    <div
      className={`relative group transition-all duration-100 ${
        isSelected
          ? 'ring-2 ring-primary border-primary rounded-sm'
          : isHovered
            ? 'border-primary/30 -translate-y-[1px] shadow-sm rounded-sm'
            : 'border-transparent'
      }`}
      style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: isSelected ? 'hsl(var(--primary))' : isHovered ? 'hsl(var(--primary) / 0.3)' : 'transparent' }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const handled = onDrop();
        if (handled) e.stopPropagation();
      }}
      onDragEnd={onDragEnd}
    >
      <ElementPreview element={element} data={data} />

      {/* Floating toolbar on hover */}
      {isHovered && (
        <LabelFloatingToolbar
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
