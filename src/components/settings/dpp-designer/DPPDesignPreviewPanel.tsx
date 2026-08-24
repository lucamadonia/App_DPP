/**
 * Right pane: live preview with viewport-responsive container.
 * Renders the actual TemplateCustom component with real/mock product data.
 */
import { Loader2 } from 'lucide-react';
import type { DPPDesignSettings } from '@/types/database';
import type { Product } from '@/types/product';
import type { Viewport } from './DPPDesignToolbar';
import { TemplateCustom } from '@/components/public/TemplateCustom';
import { resolveDesign, getPageStyle } from '@/lib/dpp-design-utils';

interface Props {
  viewport: Viewport;
  viewMode: 'consumer' | 'customs';
  designForm: DPPDesignSettings;
  product: Product;
  loading: boolean;
}

const VIEWPORT_WIDTH: Record<Viewport, string> = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

export function DPPDesignPreviewPanel({
  viewport,
  viewMode,
  designForm,
  product,
  loading,
}: Props) {
  const resolved = resolveDesign(designForm);
  const maxWidth = VIEWPORT_WIDTH[viewport];
  const pageStyle = getPageStyle(resolved);
  const isDeviceFrame = viewport !== 'desktop';

  // Below lg the settings pane is a Sheet, so the preview is the only pane and
  // takes its height from the flex parent; lg+ keeps the original frame.
  return (
    <div className="h-full lg:sticky lg:top-[53px] lg:h-[calc(100dvh-53px)] overflow-y-auto bg-muted/30 p-3 sm:p-4">
      <div
        className={`mx-auto transition-all duration-300 ${
          isDeviceFrame ? 'border-2 border-muted-foreground/20 rounded-xl shadow-lg' : ''
        }`}
        style={{ maxWidth }}
      >
        {isDeviceFrame && (
          <div className="h-2 bg-muted-foreground/10 rounded-t-lg" />
        )}

        <div
          className="overflow-y-auto"
          style={{
            ...pageStyle,
            maxHeight: isDeviceFrame ? 'calc(100dvh - 120px)' : undefined,
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <TemplateCustom
              product={product}
              visibilityV2={null}
              view={viewMode}
              dppDesign={designForm}
              tenantId={null}
            />
          )}
        </div>
      </div>
    </div>
  );
}
