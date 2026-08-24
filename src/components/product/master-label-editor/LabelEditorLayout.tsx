import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

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
      <div className="flex flex-1 min-h-0">
        {/* Left: Element Palette — hidden on mobile & tablet, visible on lg+ */}
        <div className="hidden lg:block w-[150px] shrink-0 border-r bg-muted/30 overflow-y-auto">
          {palette}
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-auto bg-muted/10" style={{ backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          {canvas}
        </div>

        {/* Right: Settings Pane — hidden on mobile & tablet, visible on lg+ */}
        <div className="hidden lg:block w-[380px] shrink-0 border-l bg-background overflow-y-auto">
          {rightPane}
        </div>
      </div>
    </div>
  );
}

/** Wrapper that adds Sheet-based mobile panels around the LabelEditorLayout */
export function ResponsiveLabelEditorLayout({
  toolbar,
  palette,
  canvas,
  rightPane,
  showMobilePalette,
  onMobilePaletteChange,
  showMobileRightPane,
  onMobileRightPaneChange,
}: LabelEditorLayoutProps & {
  showMobilePalette: boolean;
  onMobilePaletteChange: (open: boolean) => void;
  showMobileRightPane: boolean;
  onMobileRightPaneChange: (open: boolean) => void;
}) {
  const { t } = useTranslation('products');

  return (
    <>
      <LabelEditorLayout
        toolbar={toolbar}
        palette={palette}
        canvas={canvas}
        rightPane={rightPane}
      />

      {/* Mobile element palette sheet — left side */}
      <Sheet open={showMobilePalette} onOpenChange={onMobilePaletteChange}>
        <SheetContent side="left" className="w-[260px] sm:w-[300px] p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className="text-sm">{t('ml.editor.mobileElements')}</SheetTitle>
            <SheetDescription className="text-xs">{t('ml.editor.mobileElementsHint')}</SheetDescription>
          </SheetHeader>
          <div className="overflow-y-auto flex-1">
            {palette}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile settings pane sheet — right side */}
      <Sheet open={showMobileRightPane} onOpenChange={onMobileRightPaneChange}>
        <SheetContent side="right" className="w-[340px] sm:w-[380px] p-0 flex flex-col">
          <SheetHeader className="sr-only">
            <SheetTitle>{t('ml.editor.mobileSettings')}</SheetTitle>
          </SheetHeader>
          <div className="overflow-y-auto flex-1 pt-8">
            {rightPane}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
