import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw, Copy, Trash2, Info, Move } from 'lucide-react';
import type { ZoneFurniture } from '@/types/warehouse';

interface FloorMapFurnitureContextMenuProps {
  x: number;
  y: number;
  furniture: ZoneFurniture;
  onRotate: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onOpenDetail: () => void;
  onMoveTo?: (pos: { x: number; y: number }) => void;
  onClose: () => void;
}

export function FloorMapFurnitureContextMenu({
  x,
  y,
  furniture,
  onRotate,
  onDuplicate,
  onDelete,
  onOpenDetail,
  onMoveTo,
  onClose,
}: FloorMapFurnitureContextMenuProps) {
  const { t } = useTranslation('warehouse');
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMoveInput, setShowMoveInput] = useState(false);
  const [moveX, setMoveX] = useState(String(furniture.position.x));
  const [moveY, setMoveY] = useState(String(furniture.position.y));

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
    { icon: Copy, label: t('Duplicate'), action: onDuplicate, shortcut: '\u2318D' },
    ...(onMoveTo ? [{ icon: Move, label: t('Move to Position...'), action: () => setShowMoveInput(true), shortcut: '\u2190\u2191\u2192\u2193' }] : []),
    { icon: Trash2, label: t('Delete Furniture'), action: onDelete, shortcut: 'Del', destructive: true },
  ];

  const handleMoveSubmit = () => {
    const px = parseInt(moveX, 10);
    const py = parseInt(moveY, 10);
    if (!isNaN(px) && !isNaN(py) && onMoveTo) {
      onMoveTo({ x: px, y: py });
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] rounded-xl border shadow-xl py-1 min-w-[180px] sm:min-w-[200px] max-w-[calc(100vw-16px)] animate-in fade-in zoom-in-95 duration-100"
      style={{
        left: Math.min(x, typeof window !== 'undefined' ? window.innerWidth - 210 : x),
        top: Math.min(y, typeof window !== 'undefined' ? window.innerHeight - 180 : y),
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {items.map((item, i) => (
        <button
          key={i}
          className={`w-full flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3 py-1.5 text-xs hover:bg-muted/60 transition-colors ${
            item.destructive ? 'text-destructive hover:bg-destructive/10' : 'text-foreground'
          }`}
          onClick={item.action}
        >
          <item.icon className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.shortcut && (
            <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
              {item.shortcut}
            </span>
          )}
        </button>
      ))}

      {/* Move to Position inline form */}
      {showMoveInput && (
        <div className="px-2.5 py-2 border-t flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">X</span>
          <input
            type="number"
            value={moveX}
            onChange={(e) => setMoveX(e.target.value)}
            className="w-12 h-6 text-xs text-center border rounded bg-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleMoveSubmit()}
            autoFocus
          />
          <span className="text-[10px] text-muted-foreground">Y</span>
          <input
            type="number"
            value={moveY}
            onChange={(e) => setMoveY(e.target.value)}
            className="w-12 h-6 text-xs text-center border rounded bg-transparent"
            onKeyDown={(e) => e.key === 'Enter' && handleMoveSubmit()}
          />
          <button
            className="h-6 px-2 text-[10px] font-medium rounded bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleMoveSubmit}
          >
            OK
          </button>
        </div>
      )}
    </div>
  );
}
