import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  QrCode,
  ExternalLink,
  CheckCircle2,
  Clock,
  Archive,
  Download,
  Loader2,
  Package,
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
import { getProducts, type ProductListItem } from '@/services/supabase';

interface DPPItem extends Omit<ProductListItem, 'status'> {
  status: 'live' | 'draft' | 'archived';
  createdAt: string;
  views: number;
  lastAccessed: string;
}

const statusConfig = {
  live: {
    label: 'Veröffentlicht',
    icon: CheckCircle2,
    className: 'bg-success text-success-foreground',
  },
  draft: {
    label: 'Entwurf',
    icon: Clock,
    className: '',
  },
  archived: {
    label: 'Archiviert',
    icon: Archive,
    className: 'bg-muted text-muted-foreground',
  },
};

export function DPPOverviewPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [dpps, setDpps] = useState<DPPItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      const products = await getProducts();

      // Transform products to DPP items
      const dppItems: DPPItem[] = products.map((product) => ({
        ...product,
        status: 'live' as const, // All products in DB are considered live
        createdAt: new Date().toISOString().split('T')[0], // Would come from created_at in real impl
        views: 0, // Would come from analytics
        lastAccessed: '-', // Would come from analytics
      }));

      setDpps(dppItems);
      setIsLoading(false);
    }

    loadProducts();
  }, []);

  const filteredDpps = dpps.filter((dpp) => {
    const matchesSearch =
      dpp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dpp.gtin.includes(searchQuery);
    const matchesStatus = !statusFilter || dpp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: dpps.length,
    live: dpps.filter((d) => d.status === 'live').length,
    draft: dpps.filter((d) => d.status === 'draft').length,
    archived: dpps.filter((d) => d.status === 'archived').length,
    totalViews: dpps.reduce((acc, d) => acc + d.views, 0),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Digital Product Passports</h1>
          <p className="text-muted-foreground">
            Übersicht aller DPPs und deren Status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/dpp/qr-generator">
              <QrCode className="mr-2 h-4 w-4" />
              QR-Generator
            </Link>
          </Button>
          <Button asChild>
            <Link to="/products/new">
              Neuen DPP erstellen
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gesamt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Veröffentlicht
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.live}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entwürfe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.draft}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aufrufe gesamt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suche nach Produkt oder GTIN..."
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
                  Alle Status
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredDpps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">Keine DPPs gefunden</h3>
              <p className="text-muted-foreground mt-1">
                {dpps.length === 0
                  ? 'Erstellen Sie Ihr erstes Produkt, um einen DPP zu generieren.'
                  : 'Keine Produkte entsprechen Ihren Suchkriterien.'}
              </p>
              {dpps.length === 0 && (
                <Button className="mt-4" asChild>
                  <Link to="/products/new">Erstes Produkt erstellen</Link>
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produkt</TableHead>
                  <TableHead>GTIN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Erstellt am</TableHead>
                  <TableHead>Aufrufe</TableHead>
                  <TableHead>Letzter Zugriff</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDpps.map((dpp) => {
                  const status = statusConfig[dpp.status as keyof typeof statusConfig];
                  return (
                    <TableRow key={dpp.id}>
                      <TableCell className="font-medium">{dpp.name}</TableCell>
                      <TableCell>
                        <code className="font-mono text-sm">{dpp.gtin}</code>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={status.className}>
                          <status.icon className="mr-1 h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(dpp.createdAt).toLocaleDateString('de-DE')}
                      </TableCell>
                      <TableCell>{dpp.views.toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {dpp.lastAccessed}
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
                              <Link to={`/products/${dpp.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link to="/dpp/qr-generator">
                                <QrCode className="mr-2 h-4 w-4" />
                                QR-Code
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a
                                href={`/p/${dpp.gtin}/${dpp.serial}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Öffentliche Ansicht
                              </a>
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
        </CardContent>
      </Card>
    </div>
  );
}
