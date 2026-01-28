import { useState, useEffect } from 'react';
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
  Loader2,
  Plus,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getDocuments, createDocument, deleteDocument, setTenant, getCurrentTenant } from '@/services/api';
import type { Document } from '@/types/database';

// Fallback-Dokumente für den Fall, dass die API nicht erreichbar ist
const fallbackDocuments: Document[] = [
  {
    id: '1',
    tenant_id: 'demo',
    name: 'CE_Konformitaetserklarung_EcoSneaker.pdf',
    type: 'pdf',
    product_id: '1',
    category: 'Konformität',
    uploadedAt: '2024-06-10',
    validUntil: '2027-06-10',
    status: 'valid',
    size: '245 KB',
  },
  {
    id: '2',
    tenant_id: 'demo',
    name: 'OEKO-TEX_Zertifikat_100.pdf',
    type: 'pdf',
    product_id: '1',
    category: 'Zertifikat',
    uploadedAt: '2024-03-15',
    validUntil: '2025-06-30',
    status: 'expiring',
    size: '1.2 MB',
  },
  {
    id: '3',
    tenant_id: 'demo',
    name: 'EU_Ecolabel_Certificate.pdf',
    type: 'pdf',
    product_id: '1',
    category: 'Zertifikat',
    uploadedAt: '2024-01-20',
    validUntil: '2026-12-31',
    status: 'valid',
    size: '890 KB',
  },
  {
    id: '4',
    tenant_id: 'demo',
    name: 'LCA_Report_2024.pdf',
    type: 'pdf',
    product_id: '2',
    category: 'Bericht',
    uploadedAt: '2024-08-15',
    validUntil: undefined,
    status: 'valid',
    size: '3.4 MB',
  },
  {
    id: '5',
    tenant_id: 'demo',
    name: 'Materialdatenblatt_PET.pdf',
    type: 'pdf',
    product_id: '1',
    category: 'Datenblatt',
    uploadedAt: '2024-05-20',
    validUntil: undefined,
    status: 'valid',
    size: '156 KB',
  },
  {
    id: '6',
    tenant_id: 'demo',
    name: 'Testbericht_TUV.pdf',
    type: 'pdf',
    product_id: '2',
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

const documentCategories = ['Konformität', 'Zertifikat', 'Bericht', 'Datenblatt', 'Testbericht'] as const;

export function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>(fallbackDocuments);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Neues Dokument Formular
  const [newDoc, setNewDoc] = useState({
    name: '',
    category: 'Konformität' as Document['category'],
    validUntil: '',
  });

  // Demo-Tenant setzen wenn nicht vorhanden
  useEffect(() => {
    if (!getCurrentTenant()) {
      setTenant('demo');
    }
  }, []);

  // Dokumente aus der API laden
  useEffect(() => {
    async function loadDocuments() {
      try {
        const apiDocuments = await getDocuments();
        if (apiDocuments.length > 0) {
          setDocuments(apiDocuments);
        }
      } catch (error) {
        console.warn('Dokumente konnten nicht geladen werden, verwende Fallback-Daten:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadDocuments();
  }, []);

  const filteredDocs = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: documents.length,
    valid: documents.filter((d) => d.status === 'valid').length,
    expiring: documents.filter((d) => d.status === 'expiring').length,
    expired: documents.filter((d) => d.status === 'expired').length,
  };

  // Dokument erstellen
  async function handleCreateDocument() {
    if (!newDoc.name) return;

    const result = await createDocument({
      name: newDoc.name,
      type: newDoc.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'other',
      category: newDoc.category,
      validUntil: newDoc.validUntil || undefined,
      status: 'valid',
    });

    if (result.success && result.id) {
      // Dokumente neu laden
      const updatedDocs = await getDocuments();
      if (updatedDocs.length > 0) {
        setDocuments(updatedDocs);
      } else {
        // Fallback: Lokal hinzufügen
        setDocuments([
          ...documents,
          {
            id: result.id,
            tenant_id: getCurrentTenant() || 'demo',
            name: newDoc.name,
            type: newDoc.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'other',
            category: newDoc.category,
            uploadedAt: new Date().toISOString().split('T')[0],
            validUntil: newDoc.validUntil || undefined,
            status: 'valid',
          },
        ]);
      }

      // Dialog schließen und Formular zurücksetzen
      setIsUploadDialogOpen(false);
      setNewDoc({ name: '', category: 'Konformität', validUntil: '' });
    }
  }

  // Dokument löschen
  async function handleDeleteDocument(id: string) {
    setIsDeleting(id);
    const result = await deleteDocument(id);

    if (result.success) {
      setDocuments(documents.filter((d) => d.id !== id));
    }

    setIsDeleting(null);
  }

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
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Dokument hinzufügen
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
          <div
            className="flex h-32 items-center justify-center rounded-lg border-2 border-dashed cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => setIsUploadDialogOpen(true)}
          >
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
                placeholder="Suche nach Dokument oder Kategorie..."
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

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Documents Table */}
      {!isLoading && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dokument</TableHead>
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
                      <TableCell className="text-muted-foreground">{doc.size || '-'}</TableCell>
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
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteDocument(doc.id)}
                              disabled={isDeleting === doc.id}
                            >
                              {isDeleting === doc.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
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
      )}

      {/* Empty State */}
      {!isLoading && filteredDocs.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Keine Dokumente gefunden</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? 'Versuchen Sie einen anderen Suchbegriff' : 'Laden Sie Ihr erstes Dokument hoch'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Dokument hinzufügen
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dokument hinzufügen</DialogTitle>
            <DialogDescription>
              Fügen Sie ein neues Dokument zu Ihrem Produktportfolio hinzu.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-name">Dokumentname</Label>
              <Input
                id="doc-name"
                placeholder="z.B. CE_Konformitaetserklarung.pdf"
                value={newDoc.name}
                onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-category">Kategorie</Label>
              <Select
                value={newDoc.category}
                onValueChange={(value) => setNewDoc({ ...newDoc, category: value as Document['category'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {documentCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-valid">Gültig bis (optional)</Label>
              <Input
                id="doc-valid"
                type="date"
                value={newDoc.validUntil}
                onChange={(e) => setNewDoc({ ...newDoc, validUntil: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreateDocument} disabled={!newDoc.name}>
              <Upload className="mr-2 h-4 w-4" />
              Hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
