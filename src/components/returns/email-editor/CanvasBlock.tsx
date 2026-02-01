import { useTranslation } from 'react-i18next';
import type { EmailBlock } from './emailEditorTypes';
import { FloatingBlockToolbar } from './FloatingBlockToolbar';
import { getSocialIconDataUri, SOCIAL_PLATFORM_LABELS } from './SocialIconSvgs';

interface CanvasBlockProps {
  block: EmailBlock;
  index: number;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  isDragSource: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onDragStart: () => void;
}

const BLOCK_TYPE_LABELS: Record<string, string> = {
  text: 'Text',
  button: 'Button',
  divider: 'Divider',
  spacer: 'Spacer',
  'info-box': 'Info Box',
  image: 'Image',
  'social-links': 'Social Links',
  columns: 'Columns',
  hero: 'Hero',
};

function BlockPreview({ block }: { block: EmailBlock }) {
  const { t } = useTranslation('returns');

  switch (block.type) {
    case 'text':
      return <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-3">{block.content}</p>;
    case 'button':
      return (
        <div style={{ textAlign: block.alignment }}>
          <span
            className="inline-block px-4 py-1.5 text-xs font-medium"
            style={{ backgroundColor: block.backgroundColor, color: block.textColor, borderRadius: block.borderRadius }}
          >
            {block.text}
          </span>
        </div>
      );
    case 'divider':
      return <hr style={{ borderColor: block.color, borderWidth: block.thickness }} />;
    case 'spacer':
      return (
        <div className="flex items-center justify-center text-xs text-muted-foreground" style={{ height: Math.min(block.height, 40) }}>
          {block.height}px
        </div>
      );
    case 'info-box':
      return (
        <div className="rounded border px-3 py-2" style={{ backgroundColor: block.backgroundColor, borderColor: block.borderColor }}>
          <span className="text-[10px] uppercase text-muted-foreground">{block.label}</span>
          <p className="text-sm font-medium">{block.value}</p>
        </div>
      );
    case 'image':
      return (
        <div style={{ textAlign: block.alignment }}>
          {block.src ? (
            <img
              src={block.src}
              alt={block.alt}
              className="inline-block max-h-24 object-contain"
              style={{ borderRadius: block.borderRadius, maxWidth: Math.min(block.width, 300) }}
            />
          ) : (
            <div className="inline-flex items-center justify-center w-full h-20 bg-muted rounded text-xs text-muted-foreground">
              {t('Image')} ({block.width}px)
            </div>
          )}
        </div>
      );
    case 'social-links':
      return (
        <div style={{ textAlign: block.alignment }} className="flex gap-2 flex-wrap" data-align={block.alignment}>
          {block.links.map((link, i) => (
            <img
              key={i}
              src={getSocialIconDataUri(link.platform, block.iconStyle, block.iconSize)}
              width={Math.min(block.iconSize, 24)}
              height={Math.min(block.iconSize, 24)}
              alt={SOCIAL_PLATFORM_LABELS[link.platform]}
            />
          ))}
          {block.links.length === 0 && (
            <span className="text-xs text-muted-foreground">{t('Add Platform')}</span>
          )}
        </div>
      );
    case 'columns':
      return (
        <div className="flex gap-2">
          {block.columns.slice(0, block.columnCount).map((col, i) => (
            <div key={i} className="flex-1 bg-muted/50 rounded p-2 min-h-[40px] border border-dashed border-muted-foreground/20">
              <span className="text-[9px] text-muted-foreground">
                {t('Column')} {i + 1} ({col.blocks.length})
              </span>
            </div>
          ))}
        </div>
      );
    case 'hero':
      return (
        <div
          className="rounded-lg overflow-hidden relative"
          style={{
            backgroundColor: block.backgroundColor,
            backgroundImage: block.backgroundImage ? `url(${block.backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: Math.min(block.minHeight, 100),
          }}
        >
          {block.overlayOpacity > 0 && (
            <div
              className="absolute inset-0"
              style={{ backgroundColor: block.backgroundColor, opacity: block.overlayOpacity }}
            />
          )}
          <div className="relative z-10 p-4" style={{ textAlign: block.alignment }}>
            <p className="text-sm font-bold" style={{ color: block.titleColor }}>{block.title || 'Hero Title'}</p>
            {block.subtitle && (
              <p className="text-xs mt-0.5" style={{ color: block.subtitleColor }}>{block.subtitle}</p>
            )}
            {block.ctaText && (
              <span
                className="inline-block mt-1.5 px-3 py-1 text-[10px] font-medium rounded"
                style={{ backgroundColor: block.ctaBackgroundColor, color: block.ctaTextColor }}
              >
                {block.ctaText}
              </span>
            )}
          </div>
        </div>
      );
    default:
      return null;
  }
}

export function CanvasBlock({
  block,
  index,
  isSelected,
  isFirst,
  isLast,
  isDragSource,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onDragStart,
}: CanvasBlockProps) {
  const { t } = useTranslation('returns');

  return (
    <div
      className={`group relative transition-all duration-150 ${
        isDragSource ? 'opacity-40 border-dashed' : ''
      }`}
    >
      {/* Floating toolbar */}
      <FloatingBlockToolbar
        isFirst={isFirst}
        isLast={isLast}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onDragHandleMouseDown={onDragStart}
      />

      {/* Block card */}
      <div
        className={`rounded-lg border transition-all cursor-pointer ${
          isSelected
            ? 'border-primary ring-2 ring-primary/20 shadow-md'
            : 'border-transparent hover:border-primary/30 hover:-translate-y-0.5 hover:shadow-sm'
        }`}
        onClick={onSelect}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', `reorder:${index}`);
          e.dataTransfer.effectAllowed = 'move';
          onDragStart();
        }}
      >
        {/* Type label */}
        <div className="flex items-center px-3 py-1 border-b bg-muted/30 rounded-t-lg">
          <span className="text-[10px] font-medium text-muted-foreground">
            {t(BLOCK_TYPE_LABELS[block.type] || block.type)}
          </span>
        </div>

        {/* Preview */}
        <div className="px-4 py-3 bg-background rounded-b-lg">
          <BlockPreview block={block} />
        </div>
      </div>
    </div>
  );
}
