import type { ReactNode } from 'react';

interface LabelEditorLayoutProps {
  toolbar: ReactNode;
  palette: ReactNode;
  canvas: ReactNode;
  rightPane: ReactNode;
}

export function LabelEditorLayout({ toolbar, palette, canvas, rightPane }: LabelEditorLayoutProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Toolbar */}
      {toolbar}

      {/* 3-column layout */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Element Palette */}
        <div className="w-[150px] shrink-0 border-r bg-muted/30 overflow-y-auto">
          {palette}
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-auto bg-muted/10" style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          {canvas}
        </div>

        {/* Right: Settings Pane */}
        <div className="w-[380px] shrink-0 border-l bg-background overflow-y-auto">
          {rightPane}
        </div>
      </div>
    </div>
  );
}
