import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw, Copy, Trash2, Info } from 'lucide-react';
import type { ZoneFurniture } from '@/types/warehouse';

interface FloorMapFurnitureContextMenuProps {
  x: number;
  y: number;
  furniture: ZoneFurniture;
  onRotate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
  onClose: () => void;
}

export function FloorMapFurnitureContextMenu({
  x,
  y,
  onRotate,
  onDuplicate,
  onDelete,
  onOpenDetail,
  onClose,
}: FloorMapFurnitureContextMenuProps) {
  const { t } = useTranslation('warehouse');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const items = [
    { icon: Info, label: t('Furniture Detail'), action: onOpenDetail, shortcut: 'Enter' },
    { icon: RotateCw, label: t('Rotate'), action: onRotate, shortcut: 'R' },
    { icon: Copy, label: t('Duplicate'), action: onDuplicate, shortcut: 'Ctrl+D' },
    { icon: Trash2, label: t('Delete Furniture'), action: onDelete, shortcut: 'Del', destructive: true },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] rounded-xl border shadow-xl py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: x,
        top: y,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-xs hover:bg-muted/60 transition-colors ${
            item.destructive ? 'text-destructive hover:bg-destructive/10' : 'text-foreground'
          }`}
          onClick={item.action}
        >
          <item.icon className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.shortcut && (
            <span className="text-[10px] text-muted-foreground font-mono">
              {item.shortcut}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
