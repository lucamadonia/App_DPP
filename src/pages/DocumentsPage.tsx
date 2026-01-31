import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
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
import {
  getDocuments,
  createDocument,
  uploadDocument,
  deleteDocument as deleteDocumentService,
  type Document,
} from '@/services/supabase';

const statusConfig = {
  valid: {
    label: 'Valid',
    icon: CheckCircle2,
    className: 'bg-success/10 text-success border-success',
  },
  expiring: {
    label: 'Expiring soon',
    icon: AlertTriangle,
    className: 'bg-warning/10 text-warning border-warning',
  },
  expired: {
    label: 'Expired',
    icon: Clock,
    className: 'bg-destructive/10 text-destructive border-destructive',
  },
};

import { DOCUMENT_CATEGORIES } from '@/lib/document-categories';

const documentCategories = DOCUMENT_CATEGORIES;

export function DocumentsPage() {
  const { t } = useTranslation('documents');
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New document form
  const [newDoc, setNewDoc] = useState({
    name: '',
    category: 'Conformity' as Document['category'],
    validUntil: '',
  });

  // Load documents from Supabase
  useEffect(() => {
    async function loadDocuments() {
      setIsLoading(true);
      const data = await getDocuments();
      setDocuments(data);
      setIsLoading(false);
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

  // Select file
  function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!newDoc.name) {
        setNewDoc((prev) => ({ ...prev, name: file.name }));
      }
    }
  }

  // Create / upload document
  async function handleCreateDocument() {
    if (!newDoc.name) return;

    setIsUploading(true);

    if (selectedFile) {
      // Upload with file
      const result = await uploadDocument(selectedFile, {
        name: newDoc.name,
        category: newDoc.category,
        validUntil: newDoc.validUntil || undefined,
      });

      if (result.success) {
        const updatedDocs = await getDocuments();
        setDocuments(updatedDocs);
        setIsUploadDialogOpen(false);
        setNewDoc({ name: '', category: 'Conformity', validUntil: '' });
        setSelectedFile(null);
      }
    } else {
      // Metadata only (no file)
      const result = await createDocument({
        name: newDoc.name,
        type: newDoc.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'other',
        category: newDoc.category,
        validUntil: newDoc.validUntil || undefined,
        status: 'valid',
      });

      if (result.success) {
        const updatedDocs = await getDocuments();
        setDocuments(updatedDocs);
        setIsUploadDialogOpen(false);
        setNewDoc({ name: '', category: 'Conformity', validUntil: '' });
        setSelectedFile(null);
      }
    }

    setIsUploading(false);
  }

  // Delete document
  async function handleDeleteDocument(id: string) {
    setIsDeleting(id);
    const result = await deleteDocumentService(id);

    if (result.success) {
      setDocuments(documents.filter((d) => d.id !== id));
    }

    setIsDeleting(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Documents & Certificates')}</h1>
          <p className="text-muted-foreground">
            {t('Manage all documents for your products')}
          </p>
        </div>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('Add Document')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Total')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Valid')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.valid}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Expiring Soon')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.expiring}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('Expired')}
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
              <p className="mt-2 text-sm font-medium">{t('Drag files here')}</p>
              <p className="text-xs text-muted-foreground">{t('or click to select')}</p>
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
                placeholder={t('Search by document or category...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {t('Filter', { ns: 'common' })}
            </Button>
            <Button variant="outline">
              <Calendar className="mr-2 h-4 w-4" />
              {t('Validity Tracker')}
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
      {!isLoading && filteredDocs.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Document')}</TableHead>
                  <TableHead>{t('Category')}</TableHead>
                  <TableHead>{t('Uploaded')}</TableHead>
                  <TableHead>{t('Valid Until')}</TableHead>
                  <TableHead>{t('Status', { ns: 'common' })}</TableHead>
                  <TableHead>{t('Size')}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => {
                  const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.valid;
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
                        {doc.uploadedAt ? formatDate(doc.uploadedAt, locale) : '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {doc.validUntil
                          ? formatDate(doc.validUntil, locale)
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
                              {t('Preview')}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Download className="mr-2 h-4 w-4" />
                              {t('Download', { ns: 'common' })}
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
                              {t('Delete', { ns: 'common' })}
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
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">{t('No documents found')}</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery ? t('Try a different search term') : t('Upload your first document')}
            </p>
            {!searchQuery && (
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                {t('Add Document')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Add Document')}</DialogTitle>
            <DialogDescription>
              {t('Add a new document to your product portfolio.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('Select File')}</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                onChange={handleFileSelect}
              />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-name">{t('Document Name')}</Label>
              <Input
                id="doc-name"
                placeholder="e.g. CE_Declaration_of_Conformity.pdf"
                value={newDoc.name}
                onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="doc-category">{t('Category')}</Label>
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
              <Label htmlFor="doc-valid">{t('Valid Until (optional)')}</Label>
              <Input
                id="doc-valid"
                type="date"
                value={newDoc.validUntil}
                onChange={(e) => setNewDoc({ ...newDoc, validUntil: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsUploadDialogOpen(false); setSelectedFile(null); }}>
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleCreateDocument} disabled={!newDoc.name || isUploading}>
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {isUploading ? t('Uploading...') : selectedFile ? t('Upload') : t('Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
