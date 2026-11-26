import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { BlockInsertSidebarContent } from './BlockInsertSidebar';
import type { EmailBlockType } from './emailEditorTypes';

interface EditorLayoutProps {
  sidebar: ReactNode;
  canvas: ReactNode;
  rightPane: ReactNode;
}

export function EditorLayout({ sidebar, canvas, rightPane }: EditorLayoutProps) {
  return (
    <div className="flex flex-1 min-h-0 overflow-hidden rounded-lg border bg-muted/30">
      {/* Left sidebar — hidden on mobile & tablet, visible on lg+ */}
      <div className="hidden lg:block w-[72px] shrink-0 border-r bg-background overflow-y-auto">
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
        <div className="py-4 sm:py-6 px-3 sm:px-6 lg:pl-14 lg:pr-4 flex justify-center min-h-full">
          {canvas}
        </div>
      </div>

      {/* Right pane — hidden on mobile & tablet, visible on lg+ */}
      <div className="hidden lg:block w-[380px] shrink-0 border-l bg-background overflow-y-auto animate-panel-slide-in">
        {rightPane}
      </div>
    </div>
  );
}

/** Wrapper that adds Sheet-based mobile panels around the EditorLayout */
export function ResponsiveEditorLayout({
  sidebar,
  canvas,
  rightPane,
  onAddBlockMobile,
  onDragStartMobile,
  showMobileBlockSidebar,
  onMobileBlockSidebarChange,
  showMobileRightPane,
  onMobileRightPaneChange,
}: EditorLayoutProps & {
  onAddBlockMobile?: (type: EmailBlockType) => void;
  onDragStartMobile?: (type: EmailBlockType) => void;
  showMobileBlockSidebar: boolean;
  onMobileBlockSidebarChange: (open: boolean) => void;
  showMobileRightPane: boolean;
  onMobileRightPaneChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('returns');
  return (
    <>
      <EditorLayout
        sidebar={sidebar}
        canvas={canvas}
        rightPane={rightPane}
      />

      {/* Mobile block sidebar sheet — left side */}
      <Sheet open={showMobileBlockSidebar} onOpenChange={onMobileBlockSidebarChange}>
        <SheetContent side="left" className="w-[min(18rem,85vw)] sm:w-[300px] p-0">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="text-sm">{t('Add Block')}</SheetTitle>
            <SheetDescription className="text-xs">{t('Tap a block to add it to your email')}</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto flex-1">
            <BlockInsertSidebarContent
              onDragStart={onDragStartMobile || (() => {})}
              onAddBlock={(type) => {
                onAddBlockMobile?.(type);
                onMobileBlockSidebarChange(false);
              }}
              layout="grid"
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile right pane sheet — right side */}
      <Sheet open={showMobileRightPane} onOpenChange={onMobileRightPaneChange}>
        <SheetContent side="right" className="w-[min(23.75rem,92vw)] p-0 overflow-y-auto overscroll-contain" showCloseButton={false}>
          <div className="relative">
            <button
              onClick={() => onMobileRightPaneChange(false)}
              className="absolute top-1 right-1 z-10 flex h-11 w-11 items-center justify-center rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              aria-label={t('Close')}
            >
              <X className="h-4 w-4" />
            </button>
            {rightPane}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
