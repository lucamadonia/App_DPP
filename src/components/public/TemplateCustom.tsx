/**
 * Custom DPP Template — Entry point.
 *
 * Delegates to CustomConsumerView or CustomCustomsView sub-components
 * which handle all 36+ custom layout settings and content renderers.
 */
import type { VisibilityConfigV2, VisibilityConfigV3 } from '@/types/visibility';
import type { Product } from '@/types/product';
import type { DPPDesignSettings } from '@/types/database';
import { useDPPTemplateData } from '@/hooks/use-dpp-template-data';
import { CustomConsumerView } from './custom-template/CustomConsumerView';
import { CustomCustomsView } from './custom-template/CustomCustomsView';

interface DPPTemplateProps {
  product: Product;
  visibilityV2: VisibilityConfigV2 | VisibilityConfigV3 | null;
  view: 'consumer' | 'customs';
  dppDesign?: DPPDesignSettings | null;
  tenantId: string | null;
}

export function TemplateCustom({ product, visibilityV2, view, dppDesign, tenantId }: DPPTemplateProps) {
  const data = useDPPTemplateData(product, visibilityV2, view, dppDesign);

  if (view === 'customs') {
    return <CustomCustomsView data={data} tenantId={tenantId} />;
  }

  return <CustomConsumerView data={data} tenantId={tenantId} />;
}
