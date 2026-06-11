import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Package, ArrowRight, Plus, CheckCircle2, Clock } from 'lucide-react';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedList, AnimatedListItem } from '@/components/ui/animated-list';
import { useLocale } from '@/hooks/use-locale';
import { spring } from '@/lib/motion';
import { relativeTime } from '@/lib/animations';
import type { ProductListItem } from '@/services/supabase/products';
import { cn } from '@/lib/utils';

export function RecentProductsCard({ products, className }: { products: ProductListItem[]; className?: string }) {
  const { t } = useTranslation('dashboard');
  const locale = useLocale();
  const prefersReduced = useReducedMotion();
  const recentProducts = products.slice(0, 4);

  return (
    <GlassCard className={cn('h-full', className)}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-muted-foreground" />
              {t('Recent Products')}
            </CardTitle>
            <CardDescription className="hidden sm:block">
              {t('Your most recently added products')}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="shrink-0" asChild>
            <Link to="/products">
              {t('View All', { ns: 'common' })}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recentProducts.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t('No products yet')}
            </p>
            <Button className="mt-4" size="sm" asChild>
              <Link to="/products/new">
                <Plus className="mr-2 h-4 w-4" />
                {t('Create First Product')}
              </Link>
            </Button>
          </div>
        ) : (
          <AnimatedList className="space-y-2.5">
            {recentProducts.map((product) => {
              // DB contains 'active' alongside the typed 'live' status.
              const rawStatus = (product.status as string) || 'draft';
              const isLive = rawStatus === 'live' || rawStatus === 'active';
              return (
                <AnimatedListItem key={product.id} itemKey={product.id}>
                  <motion.div
                    whileHover={prefersReduced ? undefined : { x: 4 }}
                    transition={spring.snappy}
                  >
                    <Link
                      to={`/products/${product.id}`}
                      className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          loading="lazy"
                          className="h-10 w-10 shrink-0 rounded-lg border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/25 to-primary/5 font-semibold text-primary">
                          {(product.name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{product.name}</p>
                          <Badge
                            variant={isLive ? 'default' : 'secondary'}
                            className="shrink-0 text-xs"
                          >
                            {isLive && <CheckCircle2 className="mr-1 h-3 w-3" />}
                            {rawStatus === 'draft' && <Clock className="mr-1 h-3 w-3" />}
                            {t(rawStatus)}
                          </Badge>
                        </div>
                        <p className="truncate font-mono text-xs text-muted-foreground">
                          GTIN: {product.gtin} · {t('{{count}} Batches', { count: product.batchCount || 0 })}
                        </p>
                      </div>
                      <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                        {product.createdAt ? relativeTime(product.createdAt, locale) : ''}
                      </span>
                    </Link>
                  </motion.div>
                </AnimatedListItem>
              );
            })}
          </AnimatedList>
        )}
      </CardContent>
    </GlassCard>
  );
}
