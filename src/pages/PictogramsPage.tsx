import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Upload,
  Loader2,
  Pencil,
  Trash2,
  ImageIcon,
  HardDrive,
  Plus,
  X,
  FileImage,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  getTenantPictograms,
  uploadTenantPictogram,
  updateTenantPictogram,
  deleteTenantPictogram,
  getTenantPictogramStorageUsage,
  TENANT_PICTOGRAM_QUOTA,
} from '@/services/supabase/tenant-pictograms';
import type { TenantPictogram } from '@/types/database';

// Default category options
const CATEGORY_OPTIONS = [
  'custom',
  'compliance',
  'recycling',
  'safety',
  'chemicals',
  'energy',
  'packaging',
  'transport',
];

export function PictogramsPage() {
  const { t } = useTranslation('products');

  // Data
  const [pictograms, setPictograms] = useState<TenantPictogram[]>([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Dialogs
  const [showUpload, setShowUpload] = useState(false);
  const [editingPictogram, setEditingPictogram] = useState<TenantPictogram | null>(null);
  const [deletingPictogram, setDeletingPictogram] = useState<TenantPictogram | null>(null);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>('');
  const [uploadName, setUploadName] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadCategory, setUploadCategory] = useState('custom');
  const [uploadRegulationYear, setUploadRegulationYear] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Edit state
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editRegulationYear, setEditRegulationYear] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [pics, usage] = await Promise.all([
        getTenantPictograms(),
        getTenantPictogramStorageUsage(),
      ]);
      setPictograms(pics);
      setStorageUsed(usage);
    } catch (err) {
      console.error('Failed to load pictograms:', err);
      toast.error(t('pictograms.loadError', 'Failed to load pictograms'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => { loadData(); }, [loadData]);

  // Derived filter data
  const regulationYears = useMemo(() => {
    const years = new Set(pictograms.map(p => p.regulationYear).filter(Boolean));
    return Array.from(years).sort().reverse();
  }, [pictograms]);

  const categories = useMemo(() => {
    const cats = new Set(pictograms.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [pictograms]);

  // Filtered pictograms
  const filtered = useMemo(() => {
    return pictograms.filter(p => {
      const matchesSearch = !search
        || p.name.toLowerCase().includes(search.toLowerCase())
        || p.description.toLowerCase().includes(search.toLowerCase())
        || p.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
      const matchesYear = filterYear === 'all' || p.regulationYear === filterYear;
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
      return matchesSearch && matchesYear && matchesCategory;
    });
  }, [pictograms, search, filterYear, filterCategory]);

  // Storage bar
  const storagePercent = Math.min(100, (storageUsed / TENANT_PICTOGRAM_QUOTA) * 100);
  const storageWarning = storagePercent >= 80;
  const storageAtLimit = storagePercent >= 100;

  function formatBytes(bytes: number): string {
    if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(1)} GB`;
    if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${bytes} B`;
  }

  // File handling
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!['svg', 'png', 'jpg', 'jpeg'].includes(ext)) {
      toast.error(t('pictograms.upload.invalidFormat', 'Unsupported format. Use SVG, PNG, or JPG.'));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('pictograms.upload.tooLarge', 'File too large. Max 5 MB per file.'));
      return;
    }

    setUploadFile(file);
    setUploadName(file.name.replace(/\.[^.]+$/, ''));

    // Preview
    const reader = new FileReader();
    reader.onload = () => setUploadPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!uploadFile || !uploadName.trim()) return;

    try {
      setIsUploading(true);
      await uploadTenantPictogram(uploadFile, {
        name: uploadName.trim(),
        description: uploadDescription.trim(),
        category: uploadCategory,
        regulationYear: uploadRegulationYear.trim(),
        tags: uploadTags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      });
      toast.success(t('pictograms.upload.success', 'Pictogram uploaded successfully'));
      resetUploadForm();
      setShowUpload(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadPreview('');
    setUploadName('');
    setUploadDescription('');
    setUploadCategory('custom');
    setUploadRegulationYear('');
    setUploadTags('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Edit
  const startEdit = (pic: TenantPictogram) => {
    setEditingPictogram(pic);
    setEditName(pic.name);
    setEditDescription(pic.description);
    setEditCategory(pic.category);
    setEditRegulationYear(pic.regulationYear);
    setEditTags(pic.tags.join(', '));
  };

  const handleSaveEdit = async () => {
    if (!editingPictogram || !editName.trim()) return;

    try {
      setIsSaving(true);
      await updateTenantPictogram(editingPictogram.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        category: editCategory,
        regulationYear: editRegulationYear.trim(),
        tags: editTags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean),
      });
      toast.success(t('pictograms.edit.success', 'Pictogram updated'));
      setEditingPictogram(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Update failed';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  const handleDelete = async () => {
    if (!deletingPictogram) return;

    try {
      setIsDeleting(true);
      await deleteTenantPictogram(deletingPictogram.id);
      toast.success(t('pictograms.delete.success', 'Pictogram deleted'));
      setDeletingPictogram(null);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Drop zone
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (['svg', 'png', 'jpg', 'jpeg'].includes(ext) && file.size <= 5 * 1024 * 1024) {
        setUploadFile(file);
        setUploadName(file.name.replace(/\.[^.]+$/, ''));
        const reader = new FileReader();
        reader.onload = () => setUploadPreview(reader.result as string);
        reader.readAsDataURL(file);
        setShowUpload(true);
      } else {
        toast.error(t('pictograms.upload.invalidFormat', 'Unsupported format or file too large.'));
      }
    }
  }, [t]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('pictograms.title', 'Pictogram Database')}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('pictograms.subtitle', 'Upload and manage pictograms for your product labels')}
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)} disabled={storageAtLimit}>
          <Upload className="mr-2 h-4 w-4" />
          {t('pictograms.upload', 'Upload Pictogram')}
        </Button>
      </div>

      {/* Storage usage */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <HardDrive className={cn('h-5 w-5', storageAtLimit ? 'text-destructive' : storageWarning ? 'text-amber-500' : 'text-muted-foreground')} />
            <div className="flex-1">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">{t('pictograms.storageUsed', 'Storage Used')}</span>
                <span className={cn(
                  'font-medium tabular-nums',
                  storageAtLimit && 'text-destructive',
                  storageWarning && !storageAtLimit && 'text-amber-600 dark:text-amber-400',
                )}>
                  {formatBytes(storageUsed)} / {formatBytes(TENANT_PICTOGRAM_QUOTA)}
                </span>
              </div>
              <Progress
                value={storagePercent}
                className={cn(
                  'h-2',
                  storageAtLimit && '[&>div]:bg-destructive',
                  storageWarning && !storageAtLimit && '[&>div]:bg-amber-500',
                )}
              />
            </div>
          </div>
          {storageAtLimit && (
            <p className="text-xs text-destructive mt-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {t('pictograms.quotaReached', 'Storage quota reached (200 MB). Delete pictograms to free space.')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('pictograms.search', 'Search pictograms...')}
            className="pl-9"
          />
        </div>
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('pictograms.regulationYear', 'Regulation Year')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('pictograms.allYears', 'All Years')}</SelectItem>
            {regulationYears.map(y => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('pictograms.category', 'Category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('pictograms.allCategories', 'All Categories')}</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(search || filterYear !== 'all' || filterCategory !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setFilterYear('all'); setFilterCategory('all'); }}>
            <X className="h-4 w-4 mr-1" />
            {t('Clear', { ns: 'common' })}
          </Button>
        )}
      </div>

      {/* Count */}
      {!isLoading && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} {t('pictograms.of', 'of')} {pictograms.length} {t('pictograms.pictograms', 'pictograms')}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && pictograms.length === 0 && (
        <div
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 transition-colors',
            isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <ImageIcon className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-1">{t('pictograms.emptyState.title', 'No pictograms yet')}</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-md">
            {t('pictograms.emptyState.description', 'Upload your first pictogram to start building your label library. Drag & drop files here or click the button below.')}
          </p>
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('pictograms.upload', 'Upload Pictogram')}
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            {t('pictograms.upload.formats', 'SVG, PNG, JPG')} &middot; {t('pictograms.upload.maxSize', 'Max 5 MB per file')}
          </p>
        </div>
      )}

      {/* No results after filtering */}
      {!isLoading && pictograms.length > 0 && filtered.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground">{t('pictograms.noResults', 'No pictograms found')}</p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && filtered.length > 0 && (
        <div
          className={cn(
            'grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
            isDragOver && 'opacity-50',
          )}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          {filtered.map(pic => (
            <Card
              key={pic.id}
              className="group overflow-hidden transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-square bg-muted/30 flex items-center justify-center p-4">
                <img
                  src={pic.fileUrl}
                  alt={pic.name}
                  className="max-w-full max-h-full object-contain"
                  loading="lazy"
                />
                {/* Overlay actions */}
                <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => startEdit(pic)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingPictogram(pic)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3 space-y-1.5">
                <p className="text-sm font-medium leading-tight truncate" title={pic.name}>
                  {pic.name}
                </p>
                <div className="flex flex-wrap gap-1">
                  {pic.regulationYear && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {pic.regulationYear}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {pic.category}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 uppercase">
                    {pic.fileType}
                  </Badge>
                </div>
                {pic.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {pic.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="text-[9px] text-muted-foreground bg-muted px-1 rounded">
                        {tag}
                      </span>
                    ))}
                    {pic.tags.length > 3 && (
                      <span className="text-[9px] text-muted-foreground">+{pic.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={(open) => { if (!open) { resetUploadForm(); } setShowUpload(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('pictograms.upload', 'Upload Pictogram')}</DialogTitle>
            <DialogDescription>
              {t('pictograms.upload.formats', 'SVG, PNG, JPG')} &middot; {t('pictograms.upload.maxSize', 'Max 5 MB per file')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File drop zone */}
            {!uploadFile ? (
              <div
                className={cn(
                  'flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-8 cursor-pointer transition-colors',
                  isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    const ext = file.name.split('.').pop()?.toLowerCase() || '';
                    if (['svg', 'png', 'jpg', 'jpeg'].includes(ext) && file.size <= 5 * 1024 * 1024) {
                      setUploadFile(file);
                      setUploadName(file.name.replace(/\.[^.]+$/, ''));
                      const reader = new FileReader();
                      reader.onload = () => setUploadPreview(reader.result as string);
                      reader.readAsDataURL(file);
                    } else {
                      toast.error(t('pictograms.upload.invalidFormat', 'Unsupported format or file too large.'));
                    }
                  }
                }}
              >
                <FileImage className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">{t('pictograms.upload.dropzone', 'Drop file here or click to browse')}</p>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="h-14 w-14 rounded bg-muted/50 flex items-center justify-center shrink-0">
                  <img src={uploadPreview} alt="" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{uploadFile.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(uploadFile.size)}</p>
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={resetUploadForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg"
              className="hidden"
              onChange={handleFileSelect}
            />

            {/* Name */}
            <div className="space-y-1.5">
              <Label>{t('pictograms.name', 'Name')} *</Label>
              <Input value={uploadName} onChange={(e) => setUploadName(e.target.value)} />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>{t('pictograms.description', 'Description')}</Label>
              <Textarea value={uploadDescription} onChange={(e) => setUploadDescription(e.target.value)} rows={2} />
            </div>

            {/* Category + Regulation Year */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t('pictograms.category', 'Category')}</Label>
                <Select value={uploadCategory} onValueChange={setUploadCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_OPTIONS.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('pictograms.regulationYear', 'Regulation Year')}</Label>
                <Input
                  value={uploadRegulationYear}
                  onChange={(e) => setUploadRegulationYear(e.target.value)}
                  placeholder="e.g. ESPR 2024"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1.5">
              <Label>{t('pictograms.tags', 'Tags')}</Label>
              <Input
                value={uploadTags}
                onChange={(e) => setUploadTags(e.target.value)}
                placeholder={t('pictograms.tagsPlaceholder', 'Comma-separated, e.g. CE, WEEE, RoHS')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { resetUploadForm(); setShowUpload(false); }}>
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleUpload} disabled={!uploadFile || !uploadName.trim() || isUploading}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('pictograms.upload', 'Upload Pictogram')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPictogram} onOpenChange={(open) => { if (!open) setEditingPictogram(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('pictograms.edit.title', 'Edit Pictogram')}</DialogTitle>
          </DialogHeader>

          {editingPictogram && (
            <div className="space-y-4">
              {/* Preview */}
              <div className="flex justify-center">
                <div className="h-20 w-20 rounded-lg bg-muted/50 flex items-center justify-center">
                  <img src={editingPictogram.fileUrl} alt={editName} className="max-w-full max-h-full object-contain" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t('pictograms.name', 'Name')} *</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <Label>{t('pictograms.description', 'Description')}</Label>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={2} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('pictograms.category', 'Category')}</Label>
                  <Select value={editCategory} onValueChange={setEditCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{t('pictograms.regulationYear', 'Regulation Year')}</Label>
                  <Input value={editRegulationYear} onChange={(e) => setEditRegulationYear(e.target.value)} placeholder="e.g. ESPR 2024" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>{t('pictograms.tags', 'Tags')}</Label>
                <Input
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  placeholder={t('pictograms.tagsPlaceholder', 'Comma-separated, e.g. CE, WEEE, RoHS')}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPictogram(null)}>
              {t('Cancel', { ns: 'common' })}
            </Button>
            <Button onClick={handleSaveEdit} disabled={!editName.trim() || isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('Save', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingPictogram} onOpenChange={(open) => { if (!open) setDeletingPictogram(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pictograms.delete.confirm', 'Delete this pictogram?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pictograms.delete.warning', 'This will also remove it from any labels using it. This action cannot be undone.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
