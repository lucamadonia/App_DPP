import { useState } from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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

// Demo-Produkte
const products = [
  {
    id: '1',
    name: 'Eco Sneaker Pro',
    internalId: 'PRD-001',
    gtin: '4012345678901',
    category: 'Textil / Schuhe',
    status: 'live',
    lastModified: '2026-01-27',
    qrStatus: 'active',
    compliance: 95,
  },
  {
    id: '2',
    name: 'Solar Powerbank 20000',
    internalId: 'PRD-002',
    gtin: '4098765432101',
    category: 'Elektronik',
    status: 'live',
    lastModified: '2026-01-25',
    qrStatus: 'active',
    compliance: 88,
  },
  {
    id: '3',
    name: 'Bio Cotton T-Shirt',
    internalId: 'PRD-003',
    gtin: '4056789012345',
    category: 'Textil',
    status: 'draft',
    lastModified: '2026-01-24',
    qrStatus: 'pending',
    compliance: 72,
  },
  {
    id: '4',
    name: 'Recycled Backpack',
    internalId: 'PRD-004',
    gtin: '4034567890123',
    category: 'Textil / Taschen',
    status: 'review',
    lastModified: '2026-01-20',
    qrStatus: 'pending',
    compliance: 60,
  },
  {
    id: '5',
    name: 'LED Desk Lamp Eco',
    internalId: 'PRD-005',
    gtin: '4023456789012',
    category: 'Elektronik',
    status: 'live',
    lastModified: '2026-01-18',
    qrStatus: 'active',
    compliance: 100,
  },
  {
    id: '6',
    name: 'Bamboo Water Bottle',
    internalId: 'PRD-006',
    gtin: '4045678901234',
    category: 'Haushalt',
    status: 'expired',
    lastModified: '2025-12-15',
    qrStatus: 'expired',
    compliance: 45,
  },
];

const statusConfig = {
  live: {
    label: 'Live',
    icon: CheckCircle2,
    variant: 'default' as const,
    className: 'bg-success text-success-foreground',
  },
  draft: {
    label: 'Entwurf',
    icon: Clock,
    variant: 'secondary' as const,
    className: '',
  },
  review: {
    label: 'Prüfung',
    icon: AlertCircle,
    variant: 'outline' as const,
    className: 'border-warning text-warning',
  },
  expired: {
    label: 'Abgelaufen',
    icon: AlertCircle,
    variant: 'destructive' as const,
    className: '',
  },
};

export function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.gtin.includes(searchQuery) ||
      product.internalId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || product.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produkte</h1>
          <p className="text-muted-foreground">
            Verwalten Sie Ihre Produkte und deren Digital Product Passports
          </p>
        </div>
        <Button asChild>
          <Link to="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Neues Produkt
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filter & Suche</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suche nach Name, GTIN oder ID..."
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

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produktname</TableHead>
                <TableHead>Interne ID</TableHead>
                <TableHead>GTIN/EAN</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Letzte Änderung</TableHead>
                <TableHead>QR-Status</TableHead>
                <TableHead>Konformität</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const status = statusConfig[product.status as keyof typeof statusConfig];
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
                      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                        {product.internalId}
                      </code>
                    </TableCell>
                    <TableCell>
                      <code className="font-mono text-sm">{product.gtin}</code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.category}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant} className={status.className}>
                        <status.icon className="mr-1 h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(product.lastModified).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.qrStatus === 'active' ? 'default' : 'secondary'}
                        className={
                          product.qrStatus === 'active'
                            ? 'bg-success text-success-foreground'
                            : product.qrStatus === 'expired'
                              ? 'bg-destructive text-destructive-foreground'
                              : ''
                        }
                      >
                        {product.qrStatus === 'active'
                          ? 'Aktiv'
                          : product.qrStatus === 'expired'
                            ? 'Abgelaufen'
                            : 'Ausstehend'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={product.compliance} className="h-2 w-16" />
                        <span
                          className={`text-sm font-medium ${
                            product.compliance >= 90
                              ? 'text-success'
                              : product.compliance >= 70
                                ? 'text-warning'
                                : 'text-destructive'
                          }`}
                        >
                          {product.compliance}%
                        </span>
                      </div>
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
                              Anzeigen
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link to={`/products/${product.id}/edit`}>
                              <Edit className="mr-2 h-4 w-4" />
                              Bearbeiten
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <QrCode className="mr-2 h-4 w-4" />
                            QR-Code
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Löschen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredProducts.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">Keine Produkte gefunden</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
