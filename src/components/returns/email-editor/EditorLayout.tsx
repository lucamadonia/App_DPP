import type { ReactNode } from 'react';

interface EditorLayoutProps {
  sidebar: ReactNode;
  canvas: ReactNode;
  rightPane: ReactNode;
}

export function EditorLayout({ sidebar, canvas, rightPane }: EditorLayoutProps) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden rounded-lg border bg-muted/30">
      {/* Left sidebar */}
      <div className="w-[72px] shrink-0 border-r bg-background overflow-y-auto">
        {sidebar}
      </div>

      {/* Center canvas */}
      <div
        className="flex-1 overflow-y-auto animate-canvas-dot-fade"
        style={{
          backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      >
        <div className="py-6 pl-14 pr-4 flex justify-center min-h-full">
          {canvas}
        </div>
      </div>

      {/* Right pane */}
      <div className="w-[380px] shrink-0 border-l bg-background overflow-y-auto animate-panel-slide-in">
        {rightPane}
      </div>
    </div>
  );
}
