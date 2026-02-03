import { Package, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { ProductComponent } from '@/types/product';
import type { CSSProperties } from 'react';

interface DPPSetComponentsSectionProps {
  components: ProductComponent[];
  cardStyle?: CSSProperties;
  headingStyle?: CSSProperties;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function DPPSetComponentsSection({
  components,
  cardStyle = {},
  headingStyle = {},
  t,
}: DPPSetComponentsSectionProps) {
  if (!components || components.length === 0) return null;

  return (
    <div className="backdrop-blur hover:shadow-md transition-all p-6 sm:p-8" style={cardStyle}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-xl bg-primary/10">
          <Package className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 style={headingStyle} className="text-xl">{t('Included Products')}</h2>
          <p className="text-sm text-muted-foreground">
            {t('{{count}} products in this set', { count: components.length })}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {components.map((comp) => {
          const cp = comp.componentProduct;
          if (!cp) return null;

          const dppLink = cp.gtin ? `/p/${cp.gtin}/` : undefined;

          return (
            <div
              key={comp.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 ring-1 ring-black/5 hover:ring-primary/20 transition-all"
            >
              {cp.imageUrl ? (
                <img
                  src={cp.imageUrl}
                  alt={cp.name}
                  className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                  <Package className="h-6 w-6 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{cp.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {cp.manufacturer}
                  {cp.gtin && <> &middot; {cp.gtin}</>}
                </p>
              </div>

              {comp.quantity > 1 && (
                <Badge variant="secondary" className="flex-shrink-0 text-xs">
                  {comp.quantity}×
                </Badge>
              )}

              {dppLink && (
                <a
                  href={dppLink}
                  className="flex-shrink-0 text-primary hover:text-primary/80 transition-colors"
                  title={t('View Digital Product Passport')}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
