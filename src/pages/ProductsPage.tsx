import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  QrCode,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Download,
  Package,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getProducts, deleteProduct, type ProductListItem } from '@/services/supabase/products';

const statusConfig = {
  live: {
    label: 'Live',
    icon: CheckCircle2,
    variant: 'default' as const,
    className: 'bg-success text-success-foreground',
  },
  draft: {
    label: 'Draft',
    icon: Clock,
    variant: 'secondary' as const,
    className: '',
  },
  review: {
    label: 'Review',
    icon: AlertCircle,
    variant: 'outline' as const,
    className: 'border-warning text-warning',
  },
  expired: {
    label: 'Expired',
    icon: AlertCircle,
    variant: 'destructive' as const,
    className: '',
  },
};

export function ProductsPage() {
  const location = useLocation();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [location.key]);

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) {
      return;
    }
    const result = await deleteProduct(id);
    if (result.success) {
      setProducts(products.filter(p => p.id !== id));
    } else {
      alert('Error deleting: ' + result.error);
    }
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.gtin.includes(searchQuery) ||
      (product.serialNumber && product.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = !statusFilter || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products</h1>
          <p className="text-muted-foreground">
            Manage your products and their Digital Product Passports
          </p>
        </div>
        <Button asChild>
          <Link to="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            New Product
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, GTIN or serial number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Status
                  {statusFilter && (
                    <Badge variant="secondary" className="ml-2">
                      {statusConfig[statusFilter as keyof typeof statusConfig]?.label}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                  All Statuses
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {Object.entries(statusConfig).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                    <config.icon className="mr-2 h-4 w-4" />
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table or Empty State */}
      <Card>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No products available</h3>
              <p className="mt-2 text-muted-foreground">
                Create your first product to get started with DPP Manager.
              </p>
              <Button className="mt-6" asChild>
                <Link to="/products/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Product
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>GTIN/EAN</TableHead>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => {
                  const status = statusConfig[(product.status as keyof typeof statusConfig) || 'draft'];
                  return (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Link
                          to={`/products/${product.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {product.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <code className="font-mono text-sm">{product.gtin}</code>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                          {product.serialNumber}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.category}
                      </TableCell>
                      <TableCell>
                        {status && (
                          <Badge variant={status.variant} className={status.className}>
                            <status.icon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {product.createdAt
                          ? new Date(product.createdAt).toLocaleDateString('en-US')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link to={`/products/${product.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/products/${product.id}/edit`}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to={`/dpp/qr-generator?product=${product.id}`}>
                                <QrCode className="mr-2 h-4 w-4" />
                                QR-Code
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {products.length > 0 && filteredProducts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No products found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
