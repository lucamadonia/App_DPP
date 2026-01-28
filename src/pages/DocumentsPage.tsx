import { useState } from 'react';
import {
  Search,
  Filter,
  Upload,
  FileText,
  Download,
  Eye,
  Trash2,
  MoreHorizontal,
  FileImage,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

const documents = [
  {
    id: '1',
    name: 'CE_Konformitaetserklarung_EcoSneaker.pdf',
    type: 'pdf',
    product: 'Eco Sneaker Pro',
    category: 'Konformität',
    uploadedAt: '2024-06-10',
    validUntil: '2027-06-10',
    status: 'valid',
    size: '245 KB',
  },
  {
    id: '2',
    name: 'OEKO-TEX_Zertifikat_100.pdf',
    type: 'pdf',
    product: 'Eco Sneaker Pro',
    category: 'Zertifikat',
    uploadedAt: '2024-03-15',
    validUntil: '2025-06-30',
    status: 'expiring',
    size: '1.2 MB',
  },
  {
    id: '3',
    name: 'EU_Ecolabel_Certificate.pdf',
    type: 'pdf',
    product: 'Eco Sneaker Pro',
    category: 'Zertifikat',
    uploadedAt: '2024-01-20',
    validUntil: '2026-12-31',
    status: 'valid',
    size: '890 KB',
  },
  {
    id: '4',
    name: 'LCA_Report_2024.pdf',
    type: 'pdf',
    product: 'Solar Powerbank 20000',
    category: 'Bericht',
    uploadedAt: '2024-08-15',
    validUntil: null,
    status: 'valid',
    size: '3.4 MB',
  },
  {
    id: '5',
    name: 'Materialdatenblatt_PET.pdf',
    type: 'pdf',
    product: 'Eco Sneaker Pro',
    category: 'Datenblatt',
    uploadedAt: '2024-05-20',
    validUntil: null,
    status: 'valid',
    size: '156 KB',
  },
  {
    id: '6',
    name: 'Testbericht_TUV.pdf',
    type: 'pdf',
    product: 'Solar Powerbank 20000',
    category: 'Testbericht',
    uploadedAt: '2024-07-30',
    validUntil: '2025-01-15',
    status: 'expired',
    size: '2.1 MB',
  },
];

const statusConfig = {
  valid: {
    label: 'Gültig',
    icon: CheckCircle2,
    className: 'bg-success/10 text-success border-success',
  },
  expiring: {
    label: 'Läuft bald ab',
    icon: AlertTriangle,
    className: 'bg-warning/10 text-warning border-warning',
  },
  expired: {
    label: 'Abgelaufen',
    icon: Clock,
    className: 'bg-destructive/10 text-destructive border-destructive',
  },
};

export function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredDocs = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: documents.length,
    valid: documents.filter((d) => d.status === 'valid').length,
    expiring: documents.filter((d) => d.status === 'expiring').length,
    expired: documents.filter((d) => d.status === 'expired').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dokumente & Zertifikate</h1>
          <p className="text-muted-foreground">
            Verwalten Sie alle Dokumente zu Ihren Produkten
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Hochladen
        </Button>
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
              Gültig
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.valid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Läuft bald ab
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.expiring}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Abgelaufen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Zone */}
      <Card>
        <CardContent className="py-6">
          <div className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="text-center">
              <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">Dateien hierher ziehen</p>
              <p className="text-xs text-muted-foreground">oder klicken zum Auswählen</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suche nach Dokument, Produkt oder Kategorie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              Gültigkeits-Tracker
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dokument</TableHead>
                <TableHead>Produkt</TableHead>
                <TableHead>Kategorie</TableHead>
                <TableHead>Hochgeladen</TableHead>
                <TableHead>Gültig bis</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Größe</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.map((doc) => {
                const status = statusConfig[doc.status as keyof typeof statusConfig];
                return (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                          {doc.type === 'pdf' ? (
                            <FileText className="h-5 w-5 text-red-500" />
                          ) : (
                            <FileImage className="h-5 w-5 text-blue-500" />
                          )}
                        </div>
                        <span className="font-medium truncate max-w-[200px]">{doc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{doc.product}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{doc.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(doc.uploadedAt).toLocaleDateString('de-DE')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {doc.validUntil
                        ? new Date(doc.validUntil).toLocaleDateString('de-DE')
                        : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={status.className}>
                        <status.icon className="mr-1 h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{doc.size}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Vorschau
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Herunterladen
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
        </CardContent>
      </Card>
    </div>
  );
}
