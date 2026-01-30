import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

export function DashboardPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [docStats, setDocStats] = useState({ total: 0, valid: 0, expiring: 0, expired: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

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

  const stats = [
    {
      title: 'Active Products',
      value: products.length.toString(),
      change: products.length === 0 ? 'No products yet' : `${products.length} total`,
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Documents',
      value: docStats.total.toString(),
      change: docStats.total === 0 ? 'No documents yet' : `${docStats.valid} valid`,
      icon: FileWarning,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Expiring Certificates',
      value: docStats.expiring.toString(),
      change: 'next 30 days',
      icon: AlertTriangle,
      color: docStats.expiring > 0 ? 'text-warning' : 'text-muted-foreground',
      bgColor: docStats.expiring > 0 ? 'bg-warning/10' : 'bg-muted/50',
    },
    {
      title: 'Expired Documents',
      value: docStats.expired.toString(),
      change: docStats.expired > 0 ? 'Action required' : 'All up to date',
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
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" asChild>
            <Link to="/dpp/qr-generator">
              <QrCode className="mr-2 h-4 w-4" />
              Generate QR
            </Link>
          </Button>
          <Button asChild>
            <Link to="/products/new">
              <Package className="mr-2 h-4 w-4" />
              New Product
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
                  Recent Products
                </CardTitle>
                <CardDescription>Your most recently added products</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/products">
                  View All
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
                  No products yet
                </p>
                <Button className="mt-4" size="sm" asChild>
                  <Link to="/products/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Product
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
                        GTIN: {product.gtin}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {product.createdAt
                        ? new Date(product.createdAt).toLocaleDateString('en-US')
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
            <CardTitle>Quick Start</CardTitle>
            <CardDescription>
              {products.length === 0
                ? 'Get started with DPP Manager'
                : 'Frequently used features'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
                <Link to="/products/new">
                  <Package className="h-6 w-6" />
                  <span>Create Product</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
                <Link to="/documents">
                  <FileWarning className="h-6 w-6" />
                  <span>Documents</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
                <Link to="/dpp/qr-generator">
                  <QrCode className="h-6 w-6" />
                  <span>Create QR Code</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-auto flex-col gap-2 p-4" asChild>
                <Link to="/regulations">
                  <TrendingUp className="h-6 w-6" />
                  <span>Regulations</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
