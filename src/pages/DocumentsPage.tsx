import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Search,
  Upload,
  FileText,
  FileImage,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
  Plus,
  Lock,
  ShieldCheck,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
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
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getDocuments,
  createDocument,
  uploadDocument,
  deleteDocument as deleteDocumentService,
  getDocumentDownloadUrl,
  getDocumentContextCounts,
  getDocumentFolders,
  createDocumentFolder,
  renameDocumentFolder,
  deleteDocumentFolder,
  getProducts,
  getSuppliers,
  type Document,
} from '@/services/supabase';
import { DocumentSidebar, type SelectedContext } from '@/components/documents/DocumentSidebar';
import { DocumentRowActions } from '@/components/documents/DocumentRowActions';
import { DocumentPreviewSheet } from '@/components/documents/DocumentPreviewSheet';
import { DocumentDetailDialog } from '@/components/documents/DocumentDetailDialog';
import type { DocumentFolder } from '@/types/database';

import { DOCUMENT_CATEGORIES } from '@/lib/document-categories';
import type { VisibilityLevel } from '@/types/visibility';

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

const documentCategories = DOCUMENT_CATEGORIES;

const visibilityBadgeConfig: Record<VisibilityLevel, { icon: typeof Lock; label: string; className: string }> = {
  internal: { icon: Lock, label: 'Internal Only', className: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600' },
  customs: { icon: ShieldCheck, label: 'Customs', className: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700' },
  consumer: { icon: Users, label: 'Consumer', className: 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700' },
};

type AssignmentType = 'none' | 'product' | 'supplier' | 'folder';

export function DocumentsPage() {
  const { t } = useTranslation('documents');
  const locale = useLocale();
  const isMobile = useIsMobile();

  const [searchQuery, setSearchQuery] = useState('');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview, Edit, Delete states
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [editDoc, setEditDoc] = useState<Document | null>(null);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sidebar state
  const [selectedContext, setSelectedContext] = useState<SelectedContext>({ type: 'all' });
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [contextCounts, setContextCounts] = useState<{
    products: Array<{ id: string; name: string; count: number }>;
    suppliers: Array<{ id: string; name: string; count: number }>;
    folders: Array<{ id: string; name: string; parentId?: string; count: number }>;
    unassigned: number;
  }>({ products: [], suppliers: [], folders: [], unassigned: 0 });
  const [folders, setFolders] = useState<DocumentFolder[]>([]);

  // Upload dialog assignment
  const [assignmentType, setAssignmentType] = useState<AssignmentType>('none');
  const [assignmentId, setAssignmentId] = useState('');
  const [productOptions, setProductOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [supplierOptions, setSupplierOptions] = useState<Array<{ id: string; name: string }>>([]);

  // New document form
  const [newDoc, setNewDoc] = useState({
    name: '',
    category: 'Conformity' as Document['category'],
    visibility: 'internal' as VisibilityLevel,
    validUntil: '',
  });

  // Load all data
  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const [docs, counts, fldrs] = await Promise.all([
        getDocuments(),
        getDocumentContextCounts(),
        getDocumentFolders(),
      ]);
      setDocuments(docs);
      setContextCounts(counts);
      setFolders(fldrs);
      setIsLoading(false);
    }
    load();
  }, []);

  async function refreshData() {
    const [docs, counts, fldrs] = await Promise.all([
      getDocuments(),
      getDocumentContextCounts(),
      getDocumentFolders(),
    ]);
    setDocuments(docs);
    setContextCounts(counts);
    setFolders(fldrs);
  }

  // Load product/supplier options when upload dialog opens
  useEffect(() => {
    if (isUploadDialogOpen && productOptions.length === 0) {
      getProducts().then((prods) =>
        setProductOptions(prods.map((p) => ({ id: p.id, name: p.name })))
      );
      getSuppliers().then((supps) =>
        setSupplierOptions(supps.map((s) => ({ id: s.id, name: s.name })))
      );
    }
  }, [isUploadDialogOpen, productOptions.length]);

  // Pre-fill assignment from sidebar context when opening upload dialog
  function openUploadDialog() {
    if (selectedContext.type === 'product' && selectedContext.id) {
      setAssignmentType('product');
      setAssignmentId(selectedContext.id);
    } else if (selectedContext.type === 'supplier' && selectedContext.id) {
      setAssignmentType('supplier');
      setAssignmentId(selectedContext.id);
    } else if (selectedContext.type === 'folder' && selectedContext.id) {
      setAssignmentType('folder');
      setAssignmentId(selectedContext.id);
    } else {
      setAssignmentType('none');
      setAssignmentId('');
    }
    setIsUploadDialogOpen(true);
  }

  // Filter documents based on sidebar context + search
  const filteredDocs = useMemo(() => {
    let docs = documents;

    switch (selectedContext.type) {
      case 'product':
        docs = docs.filter((d) => d.product_id === selectedContext.id);
        break;
      case 'supplier':
        docs = docs.filter((d) => d.supplier_id === selectedContext.id);
        break;
      case 'folder':
        docs = docs.filter((d) => d.folder_id === selectedContext.id);
        break;
      case 'unassigned':
        docs = docs.filter((d) => !d.product_id && !d.supplier_id && !d.folder_id);
        break;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(
        (doc) =>
          doc.name.toLowerCase().includes(q) ||
          (doc.category || '').toLowerCase().includes(q)
      );
    }

    return docs;
  }, [documents, selectedContext, searchQuery]);

  const stats = useMemo(() => ({
    total: documents.length,
    valid: documents.filter((d) => d.status === 'valid').length,
    expiring: documents.filter((d) => d.status === 'expiring').length,
    expired: documents.filter((d) => d.status === 'expired').length,
  }), [documents]);

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

    const assignMeta: { productId?: string; supplierId?: string; folderId?: string } = {};
    if (assignmentType === 'product' && assignmentId) assignMeta.productId = assignmentId;
    if (assignmentType === 'supplier' && assignmentId) assignMeta.supplierId = assignmentId;
    if (assignmentType === 'folder' && assignmentId) assignMeta.folderId = assignmentId;

    if (selectedFile) {
      const result = await uploadDocument(selectedFile, {
        name: newDoc.name,
        category: newDoc.category,
        validUntil: newDoc.validUntil || undefined,
        visibility: newDoc.visibility,
        ...assignMeta,
      });

      if (result.success) {
        await refreshData();
        closeUploadDialog();
      }
    } else {
      const result = await createDocument({
        name: newDoc.name,
        type: newDoc.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'other',
        category: newDoc.category,
        validUntil: newDoc.validUntil || undefined,
        status: 'valid',
        visibility: newDoc.visibility,
        product_id: assignMeta.productId,
        supplier_id: assignMeta.supplierId,
        folder_id: assignMeta.folderId,
      });

      if (result.success) {
        await refreshData();
        closeUploadDialog();
      }
    }

    setIsUploading(false);
  }

  function closeUploadDialog() {
    setIsUploadDialogOpen(false);
    setNewDoc({ name: '', category: 'Conformity', visibility: 'internal', validUntil: '' });
    setSelectedFile(null);
    setAssignmentType('none');
    setAssignmentId('');
  }

  // Download handler
  async function handleDownload(doc: Document) {
    if (!doc.storagePath) return;
    const url = await getDocumentDownloadUrl(doc.storagePath);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      a.click();
    }
  }

  // Delete document (with confirmation)
  async function handleConfirmDelete() {
    if (!deleteDocId) return;
    setIsDeleting(true);
    const result = await deleteDocumentService(deleteDocId);

    if (result.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== deleteDocId));
      getDocumentContextCounts().then(setContextCounts);
    }

    setIsDeleting(false);
    setDeleteDocId(null);
  }

  // Folder actions
  async function handleCreateFolder(name: string) {
    const result = await createDocumentFolder(name);
    if (result.success) {
      await Promise.all([
        getDocumentFolders().then(setFolders),
        getDocumentContextCounts().then(setContextCounts),
      ]);
    }
  }

  async function handleRenameFolder(id: string, name: string) {
    const result = await renameDocumentFolder(id, name);
    if (result.success) {
      await Promise.all([
        getDocumentFolders().then(setFolders),
        getDocumentContextCounts().then(setContextCounts),
      ]);
    }
  }

  async function handleDeleteFolder(id: string) {
    const result = await deleteDocumentFolder(id);
    if (result.success) {
      if (selectedContext.type === 'folder' && selectedContext.id === id) {
        setSelectedContext({ type: 'all' });
      }
      await refreshData();
    }
  }

  // Context label for header
  const contextLabel = useMemo(() => {
    switch (selectedContext.type) {
      case 'product': {
        const p = contextCounts.products.find((x) => x.id === selectedContext.id);
        return p?.name;
      }
      case 'supplier': {
        const s = contextCounts.suppliers.find((x) => x.id === selectedContext.id);
        return s?.name;
      }
      case 'folder': {
        const f = folders.find((x) => x.id === selectedContext.id);
        return f?.name;
      }
      case 'unassigned':
        return t('Unassigned');
      default:
        return undefined;
    }
  }, [selectedContext, contextCounts, folders, t]);

  // Shared action handlers for DocumentRowActions
  const rowActions = {
    onPreview: (doc: Document) => setPreviewDoc(doc),
    onDownload: handleDownload,
    onEdit: (doc: Document) => setEditDoc(doc),
    onDelete: (doc: Document) => setDeleteDocId(doc.id),
  };

  // Sidebar content (shared between desktop inline and mobile sheet)
  const sidebarContent = (
    <DocumentSidebar
      selectedContext={selectedContext}
      onSelectContext={setSelectedContext}
      contextCounts={contextCounts}
      folders={folders}
      totalCount={documents.length}
      onCreateFolder={handleCreateFolder}
      onRenameFolder={handleRenameFolder}
      onDeleteFolder={handleDeleteFolder}
      sidebarSearch={sidebarSearch}
      onSidebarSearchChange={setSidebarSearch}
    />
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Documents & Certificates')}</h1>
          <p className="text-muted-foreground">
            {t('Manage all documents for your products')}
          </p>
        </div>
        <Button onClick={openUploadDialog}>
          <Plus className="mr-2 h-4 w-4" />
          {t('Add Document')}
        </Button>
      </div>

      {/* Main layout: Sidebar + Content */}
      <div className="flex gap-0 rounded-lg border bg-card overflow-hidden" style={{ minHeight: '600px' }}>
        {/* Sidebar — desktop: inline, mobile: sheet */}
        {isMobile ? (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="m-2 h-8 w-8 shrink-0 md:hidden">
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] p-0">
              {sidebarContent}
            </SheetContent>
          </Sheet>
        ) : (
          !sidebarCollapsed && (
            <div className="w-[240px] shrink-0">
              {sidebarContent}
            </div>
          )
        )}

        {/* Content area */}
        <div className="flex-1 min-w-0 p-4 space-y-4">
          {/* Sidebar toggle (desktop) + context breadcrumb / Mobile context label */}
          {!isMobile ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? (
                  <PanelLeftOpen className="h-4 w-4" />
                ) : (
                  <PanelLeftClose className="h-4 w-4" />
                )}
              </Button>
              {contextLabel && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span>/</span>
                  <span className="font-medium text-foreground">{contextLabel}</span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {filteredDocs.length}
                  </Badge>
                </div>
              )}
            </div>
          ) : (
            contextLabel && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{contextLabel}</span>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {filteredDocs.length}
                </Badge>
              </div>
            )
          )}

          {/* Stats */}
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
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

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('Search by document or category...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Documents — Table (desktop) / Cards (mobile) */}
          {!isLoading && filteredDocs.length > 0 && !isMobile && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Document')}</TableHead>
                      <TableHead>{t('Category')}</TableHead>
                      <TableHead className="hidden md:table-cell">{t('Visibility')}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t('Uploaded')}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('Valid Until')}</TableHead>
                      <TableHead>{t('Status', { ns: 'common' })}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t('Size')}</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocs.map((doc) => {
                      const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.valid;
                      const vis = visibilityBadgeConfig[doc.visibility || 'internal'];
                      const VisIcon = vis.icon;
                      return (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded bg-muted shrink-0">
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
                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className={vis.className}>
                              <VisIcon className="mr-1 h-3 w-3" />
                              {t(vis.label)}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground">
                            {doc.uploadedAt ? formatDate(doc.uploadedAt, locale) : '-'}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
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
                          <TableCell className="hidden lg:table-cell text-muted-foreground">{doc.size || '-'}</TableCell>
                          <TableCell>
                            <DocumentRowActions doc={doc} {...rowActions} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Mobile: Card view */}
          {!isLoading && filteredDocs.length > 0 && isMobile && (
            <div className="space-y-2">
              {filteredDocs.map((doc) => {
                const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.valid;
                return (
                  <Card key={doc.id} className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded bg-muted shrink-0">
                        {doc.type === 'pdf' ? (
                          <FileText className="h-4 w-4 text-red-500" />
                        ) : (
                          <FileImage className="h-4 w-4 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.name}</p>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] h-5">{doc.category}</Badge>
                          <Badge variant="outline" className={`text-[10px] h-5 ${status.className}`}>
                            <status.icon className="mr-0.5 h-2.5 w-2.5" />
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                      <DocumentRowActions doc={doc} {...rowActions} />
                    </div>
                  </Card>
                );
              })}
            </div>
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
                  <Button onClick={openUploadDialog}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('Add Document')}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={(open) => { if (!open) closeUploadDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Add Document')}</DialogTitle>
            <DialogDescription>
              {t('Add a new document to your product portfolio.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
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
              <Label>{t('Visibility')}</Label>
              <Select
                value={newDoc.visibility}
                onValueChange={(value) => setNewDoc({ ...newDoc, visibility: value as VisibilityLevel })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">
                    <div className="flex items-center gap-2">
                      <Lock className="h-3.5 w-3.5" />
                      {t('Internal Only')}
                    </div>
                  </SelectItem>
                  <SelectItem value="customs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      {t('Customs')}
                    </div>
                  </SelectItem>
                  <SelectItem value="consumer">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5" />
                      {t('Consumer')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignment */}
            <div className="space-y-2">
              <Label>{t('Assignment')}</Label>
              <Select
                value={assignmentType}
                onValueChange={(value) => { setAssignmentType(value as AssignmentType); setAssignmentId(''); }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('No assignment')}</SelectItem>
                  <SelectItem value="product">{t('Product')}</SelectItem>
                  <SelectItem value="supplier">{t('Supplier')}</SelectItem>
                  <SelectItem value="folder">{t('Folder')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignment target */}
            {assignmentType === 'product' && (
              <div className="space-y-2">
                <Label>{t('Product')}</Label>
                <Select value={assignmentId} onValueChange={setAssignmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select product...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {productOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignmentType === 'supplier' && (
              <div className="space-y-2">
                <Label>{t('Supplier')}</Label>
                <Select value={assignmentId} onValueChange={setAssignmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select supplier...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {supplierOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {assignmentType === 'folder' && (
              <div className="space-y-2">
                <Label>{t('Folder')}</Label>
                <Select value={assignmentId} onValueChange={setAssignmentId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select folder...')} />
                  </SelectTrigger>
                  <SelectContent>
                    {folders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
            <Button variant="outline" onClick={closeUploadDialog}>
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

      {/* Preview Sheet */}
      <DocumentPreviewSheet
        doc={previewDoc}
        open={!!previewDoc}
        onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}
        onDownload={handleDownload}
      />

      {/* Detail/Edit Dialog */}
      <DocumentDetailDialog
        doc={editDoc}
        open={!!editDoc}
        onOpenChange={(open) => { if (!open) setEditDoc(null); }}
        folders={folders}
        onSaved={refreshData}
        onDelete={(doc) => setDeleteDocId(doc.id)}
      />

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteDocId} onOpenChange={(open) => { if (!open) setDeleteDocId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete document?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Delete', { ns: 'common' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
