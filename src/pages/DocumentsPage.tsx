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
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { classifyDocument } from '@/services/ai/classify-document';
import { AiSuggestionBadge } from '@/components/documents/AiSuggestionBadge';
import { AiHintsList } from '@/components/documents/AiHintsList';
import { BulkDocumentUploadDialog } from '@/components/documents/BulkDocumentUploadDialog';
import { DocumentHintsPopover } from '@/components/documents/DocumentHintsPopover';
import { DocumentRowContextMenu } from '@/components/documents/DocumentRowContextMenu';
import type { DocumentClassificationResult, DocumentHint } from '@/services/openrouter/document-classification-prompts';
import type { PrematchProduct } from '@/lib/product-prematch';
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

import { motion } from 'framer-motion';
import { blurIn, useReducedMotion } from '@/lib/motion';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
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
  const prefersReduced = useReducedMotion();
  const MotionDiv = prefersReduced ? 'div' as const : motion.div;

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
    description: '',
  });

  // AI classification state (single upload)
  const [aiResult, setAiResult] = useState<DocumentClassificationResult | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [aiProducts, setAiProducts] = useState<PrematchProduct[]>([]);
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);

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
    if ((isUploadDialogOpen || isBulkDialogOpen) && productOptions.length === 0) {
      getProducts().then((prods) => {
        setProductOptions(prods.map((p) => ({ id: p.id, name: p.name })));
        // Keep richer list for AI pre-match (includes gtin, manufacturer, etc.)
        setAiProducts(
          prods.map((p) => ({
            id: p.id,
            name: p.name,
            manufacturer: p.manufacturer ?? undefined,
            gtin: p.gtin ?? undefined,
            serialNumber: p.serialNumber ?? undefined,
            category: p.category ?? undefined,
          }))
        );
      });
      getSuppliers().then((supps) =>
        setSupplierOptions(supps.map((s) => ({ id: s.id, name: s.name })))
      );
    }
  }, [isUploadDialogOpen, isBulkDialogOpen, productOptions.length]);

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
      setAiResult(null); // reset previous AI result for fresh file
      if (!newDoc.name) {
        setNewDoc((prev) => ({ ...prev, name: file.name }));
      }
    }
  }

  // Trigger AI classification — applies result to form fields
  async function handleClassifyWithAI() {
    if (!selectedFile) return;
    setIsClassifying(true);
    setAiResult(null);

    const outcome = await classifyDocument({
      file: selectedFile,
      products: aiProducts,
    });

    setIsClassifying(false);

    if (!outcome.ok) {
      toast.error(outcome.error);
      return;
    }

    const { result } = outcome;
    setAiResult(result);

    if (result.unclear) {
      toast.warning(
        result.unclearReason
          ? t('AI could not classify: {{reason}}', { reason: result.unclearReason })
          : t('AI could not classify this document — please fill in manually.')
      );
      return;
    }

    // Apply AI suggestions to form fields
    setNewDoc((prev) => ({
      ...prev,
      name: result.name || prev.name,
      category: (result.category as Document['category']) || prev.category,
      visibility: (result.visibility as VisibilityLevel) || prev.visibility,
      validUntil: result.validUntil || prev.validUntil,
      description: result.description || prev.description,
    }));

    // Apply product suggestion (only if it's in the user's product list)
    if (
      result.suggestedProductId &&
      productOptions.some((p) => p.id === result.suggestedProductId)
    ) {
      setAssignmentType('product');
      setAssignmentId(result.suggestedProductId);
    }

    toast.success(
      t('AI classified this document ({{credits}} credits used)', {
        credits: outcome.creditsCosted,
      })
    );
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
      const aiMeta = aiResult
        ? {
            description: newDoc.description || aiResult.description,
            hints: aiResult.hints,
            aiClassification: aiResult as unknown as Record<string, unknown>,
            aiConfidence: aiResult.confidence.overall,
            aiModel: 'anthropic/claude-sonnet-4',
          }
        : { description: newDoc.description || undefined };

      const result = await uploadDocument(selectedFile, {
        name: newDoc.name,
        category: newDoc.category,
        validUntil: newDoc.validUntil || undefined,
        visibility: newDoc.visibility,
        ...assignMeta,
        ...aiMeta,
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
    setNewDoc({ name: '', category: 'Conformity', visibility: 'internal', validUntil: '', description: '' });
    setSelectedFile(null);
    setAssignmentType('none');
    setAssignmentId('');
    setAiResult(null);
    setIsClassifying(false);
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
      <MotionDiv
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        {...(!prefersReduced && { variants: blurIn, initial: 'initial', animate: 'animate' })}
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Documents & Certificates')}</h1>
          <p className="text-muted-foreground">
            {t('Manage all documents for your products')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsBulkDialogOpen(true)}>
            <UploadCloud className="mr-2 h-4 w-4" />
            {t('Bulk Upload')}
          </Button>
          <Button onClick={openUploadDialog}>
            <Plus className="mr-2 h-4 w-4" />
            {t('Add Document')}
          </Button>
        </div>
      </MotionDiv>

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
            <div className="space-y-4">
              <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }, (_, i) => (
                  <Card key={i}>
                    <CardContent className="pt-6 space-y-2">
                      <ShimmerSkeleton className="h-4 w-20" />
                      <ShimmerSkeleton className="h-7 w-12" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <ShimmerSkeleton className="h-10 rounded" />
                  {Array.from({ length: 5 }, (_, i) => (
                    <ShimmerSkeleton key={i} className="h-12 rounded" />
                  ))}
                </CardContent>
              </Card>
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
                    {filteredDocs.map((doc, index) => {
                      const status = statusConfig[doc.status as keyof typeof statusConfig] || statusConfig.valid;
                      const vis = visibilityBadgeConfig[doc.visibility || 'internal'];
                      const VisIcon = vis.icon;
                      return (
                        <DocumentRowContextMenu
                          key={doc.id}
                          doc={doc}
                          onPreview={rowActions.onPreview}
                          onDownload={rowActions.onDownload}
                          onEdit={rowActions.onEdit}
                          onDelete={rowActions.onDelete}
                          onChanged={refreshData}
                        >
                          <TableRow
                            style={!prefersReduced ? {
                              animation: `fadeSlideIn 0.3s ease-out ${index * 0.04}s both`,
                            } : undefined}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded bg-muted shrink-0">
                                  {doc.type === 'pdf' ? (
                                    <FileText className="h-5 w-5 text-red-500" />
                                  ) : (
                                    <FileImage className="h-5 w-5 text-blue-500" />
                                  )}
                                </div>
                                <span
                                  className="font-medium truncate max-w-[200px] sm:max-w-[320px] md:max-w-[400px] lg:max-w-[500px] xl:max-w-[640px]"
                                  title={doc.name}
                                >
                                  {doc.name}
                                </span>
                                {doc.hints && doc.hints.length > 0 && (
                                  <DocumentHintsPopover
                                    documentId={doc.id}
                                    hints={doc.hints as DocumentHint[]}
                                    confidence={doc.aiConfidence}
                                    className="flex-shrink-0"
                                    onChanged={refreshData}
                                  />
                                )}
                              </div>
                              {doc.description && (
                                <p className="text-xs text-muted-foreground mt-1 ml-[52px] line-clamp-1" title={doc.description}>
                                  {doc.description}
                                </p>
                              )}
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
                        </DocumentRowContextMenu>
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
                  <DocumentRowContextMenu
                    key={doc.id}
                    doc={doc}
                    onPreview={rowActions.onPreview}
                    onDownload={rowActions.onDownload}
                    onEdit={rowActions.onEdit}
                    onDelete={rowActions.onDelete}
                    onChanged={refreshData}
                  >
                    <Card className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded bg-muted shrink-0">
                          {doc.type === 'pdf' ? (
                            <FileText className="h-4 w-4 text-red-500" />
                          ) : (
                            <FileImage className="h-4 w-4 text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-medium text-sm truncate flex-1" title={doc.name}>{doc.name}</p>
                            {doc.hints && doc.hints.length > 0 && (
                              <DocumentHintsPopover
                                documentId={doc.id}
                                hints={doc.hints as DocumentHint[]}
                                confidence={doc.aiConfidence}
                                compact
                                className="flex-shrink-0"
                                onChanged={refreshData}
                              />
                            )}
                          </div>
                          {doc.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5" title={doc.description}>
                              {doc.description}
                            </p>
                          )}
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
                  </DocumentRowContextMenu>
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

            {/* AI Classification Button */}
            {selectedFile && (
              <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/40 dark:to-violet-950/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <Sparkles className="size-4 flex-shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {t('AI Auto-Classification')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {selectedFile.type.startsWith('image/') || selectedFile.type === 'application/pdf'
                          ? t('Uses Vision AI (4 credits)')
                          : t('Uses Text AI (2 credits)')}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant={aiResult ? 'outline' : 'default'}
                    onClick={handleClassifyWithAI}
                    disabled={isClassifying}
                  >
                    {isClassifying ? (
                      <>
                        <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                        {t('Analyzing...')}
                      </>
                    ) : aiResult ? (
                      <>
                        <Sparkles className="size-3.5 mr-1.5" />
                        {t('Re-classify')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-3.5 mr-1.5" />
                        {t('Classify with AI')}
                      </>
                    )}
                  </Button>
                </div>
                {aiResult && aiResult.hints.length > 0 && (
                  <div className="mt-3">
                    <AiHintsList hints={aiResult.hints} />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="doc-name">{t('Document Name')}</Label>
                {aiResult && aiResult.confidence.name > 0 && (
                  <AiSuggestionBadge confidence={aiResult.confidence.name} />
                )}
              </div>
              <Input
                id="doc-name"
                placeholder="e.g. CE_Declaration_of_Conformity.pdf"
                value={newDoc.name}
                onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="doc-description">{t('Description')}</Label>
                {aiResult && aiResult.description && (
                  <AiSuggestionBadge confidence={aiResult.confidence.overall} />
                )}
              </div>
              <Textarea
                id="doc-description"
                placeholder={t('Short summary of the document content (optional)')}
                value={newDoc.description}
                onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="doc-category">{t('Category')}</Label>
                {aiResult && aiResult.confidence.category > 0 && (
                  <AiSuggestionBadge confidence={aiResult.confidence.category} />
                )}
              </div>
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
              {aiResult && aiResult.certificationHints.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {aiResult.certificationHints.map((cert) => (
                    <Badge key={cert} variant="secondary" className="text-[10px]">
                      {cert}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t('Visibility')}</Label>
                {aiResult && aiResult.confidence.visibility > 0 && (
                  <AiSuggestionBadge confidence={aiResult.confidence.visibility} />
                )}
              </div>
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
              <div className="flex items-center justify-between">
                <Label htmlFor="doc-valid">{t('Valid Until (optional)')}</Label>
                {aiResult && aiResult.validUntil && aiResult.confidence.validUntil > 0 && (
                  <AiSuggestionBadge confidence={aiResult.confidence.validUntil} />
                )}
              </div>
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

      {/* Bulk Upload Dialog (AI-assisted) */}
      <BulkDocumentUploadDialog
        open={isBulkDialogOpen}
        onOpenChange={setIsBulkDialogOpen}
        products={aiProducts}
        productOptions={productOptions}
        onFilesSaved={() => {
          refreshData();
        }}
      />
    </div>
  );
}
