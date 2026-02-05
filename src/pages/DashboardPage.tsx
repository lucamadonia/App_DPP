import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Package,
  FileWarning,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  QrCode,
  Loader2,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { getProducts, type ProductListItem } from '@/services/supabase/products';
import { getDocumentStats } from '@/services/supabase/documents';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

export function DashboardPage() {
  const { t } = useTranslation('dashboard');
  const locale = useLocale();
  const { user, isAuthenticated, tenantId, isInitializing } = useAuth();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [docStats, setDocStats] = useState({ total: 0, valid: 0, expiring: 0, expired: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Wait until auth is fully loaded
    if (isInitializing) return;

    // Only load data when authenticated AND tenantId is available
    if (isAuthenticated && tenantId) {
      loadData();
    } else {
      setIsLoading(false); // Stop loading if not authenticated
    }
  }, [isAuthenticated, tenantId, isInitializing]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [productsData, docsData] = await Promise.all([
        getProducts(),
        getDocumentStats(),
      ]);
      setProducts(productsData);
      setDocStats(docsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalBatches = products.reduce((sum, p) => sum + (p.batchCount || 0), 0);

  const stats = [
    {
      title: t('Active Products'),
      value: products.length.toString(),
      change: products.length === 0
        ? t('No products yet')
        : `${totalBatches} ${totalBatches === 1 ? 'Batch' : 'Batches'}`,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: t('Documents', { ns: 'common' }),
      value: docStats.total.toString(),
      change: docStats.total === 0 ? t('No documents yet') : t('{{count}} valid', { count: docStats.valid }),
      icon: FileWarning,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: t('Expiring Certificates'),
      value: docStats.expiring.toString(),
      change: t('next 30 days'),
      icon: AlertTriangle,
      color: docStats.expiring > 0 ? 'text-warning' : 'text-muted-foreground',
      bgColor: docStats.expiring > 0 ? 'bg-warning/10' : 'bg-muted/50',
    },
    {
      title: t('Expired Documents'),
      value: docStats.expired.toString(),
      change: docStats.expired > 0 ? t('Action required') : t('All up to date'),
      icon: TrendingUp,
      color: docStats.expired > 0 ? 'text-destructive' : 'text-success',
      bgColor: docStats.expired > 0 ? 'bg-destructive/10' : 'bg-success/10',
    },
  ];

  const recentProducts = products.slice(0, 4);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">{t('Loading dashboard...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Dashboard', { ns: 'common' })}</h1>
          <p className="text-muted-foreground">
            {user?.email ? t('Welcome back, {{name}}!', { name: user.email.split('@')[0] }) : t('Welcome back!')}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/dpp/qr-generator">
              <QrCode className="mr-2 h-4 w-4" />
              {t('Generate QR')}
            </Link>
          </Button>
          <Button asChild>
            <Link to="/products/new">
              <Package className="mr-2 h-4 w-4" />
              {t('New Product')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Products */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-muted-foreground" />
                  {t('Recent Products')}
                </CardTitle>
                <CardDescription>{t('Your most recently added products')}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
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
              <div className="space-y-4">
                {recentProducts.map((product) => (
                  <Link
                    key={product.id}
                    to={`/products/${product.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{product.name}</p>
                        <Badge
                          variant={product.status === 'live' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {product.status === 'live' && (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          )}
                          {product.status === 'draft' && <Clock className="mr-1 h-3 w-3" />}
                          {product.status || 'draft'}
                        </Badge>
                      </div>
                      <p className="font-mono text-xs text-muted-foreground">
                        GTIN: {product.gtin} · {product.batchCount || 0} {(product.batchCount || 0) === 1 ? 'Batch' : 'Batches'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {product.createdAt
                        ? formatDate(product.createdAt, locale)
                        : ''}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Getting Started / Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>{t('Quick Start')}</CardTitle>
            <CardDescription>
              {products.length === 0
                ? t('Get started with DPP Manager')
                : t('Frequently used features')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
                <Link to="/products/new">
                  <Package className="h-6 w-6" />
                  <span>{t('Create Product')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
                <Link to="/documents">
                  <FileWarning className="h-6 w-6" />
                  <span>{t('Documents', { ns: 'common' })}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
                <Link to="/dpp/qr-generator">
                  <QrCode className="h-6 w-6" />
                  <span>{t('Create QR Code')}</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
                <Link to="/regulations">
                  <TrendingUp className="h-6 w-6" />
                  <span>{t('Regulations', { ns: 'common' })}</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
