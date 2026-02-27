import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Upload,
  Loader2,
  Pencil,
  Trash2,
  ImageIcon,
  Plus,
  X,
  FileImage,
  AlertTriangle,
  ShieldCheck,
  Recycle,
  Flame,
  FlaskConical,
  Zap,
  Package,
  Truck,
  Shapes,
  HardDrive,
  Filter,
  LayoutGrid,
  List,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
import { Separator } from '@/components/ui/separator';
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

// ---------------------------------------------------------------------------
// Category styling — each category gets a color + icon for visual distinction
// ---------------------------------------------------------------------------
const CATEGORY_CONFIG: Record<string, { icon: typeof ShieldCheck; color: string; bg: string }> = {
  custom:     { icon: Shapes,      color: 'text-slate-600 dark:text-slate-400',   bg: 'bg-slate-100 dark:bg-slate-800' },
  compliance: { icon: ShieldCheck,  color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-950' },
  recycling:  { icon: Recycle,      color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950' },
  safety:     { icon: Flame,        color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950' },
  chemicals:  { icon: FlaskConical, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950' },
  energy:     { icon: Zap,          color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-50 dark:bg-yellow-950' },
  packaging:  { icon: Package,      color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950' },
  transport:  { icon: Truck,        color: 'text-cyan-600 dark:text-cyan-400',     bg: 'bg-cyan-50 dark:bg-cyan-950' },
};

const CATEGORY_OPTIONS = Object.keys(CATEGORY_CONFIG);

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] || CATEGORY_CONFIG.custom;
}

// ---------------------------------------------------------------------------
// View modes
// ---------------------------------------------------------------------------
type ViewMode = 'grid' | 'list';

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function PictogramsPage() {
  const { t } = useTranslation('products');

  // Data
  const [pictograms, setPictograms] = useState<TenantPictogram[]>([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // View
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

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

  // Category counts for filter badges
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pictograms.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return counts;
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

  // Storage
  const storagePercent = Math.min(100, (storageUsed / TENANT_PICTOGRAM_QUOTA) * 100);
  const storageWarning = storagePercent >= 80;
  const storageAtLimit = storagePercent >= 100;
  const hasActiveFilters = search || filterYear !== 'all' || filterCategory !== 'all';

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

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {t('pictograms.title', 'Pictogram Database')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('pictograms.subtitle', 'Upload and manage pictograms for your product labels')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Compact storage indicator */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden sm:flex items-center gap-2.5 rounded-lg border px-3 py-2 bg-card">
                  <HardDrive className={cn(
                    'h-4 w-4 shrink-0',
                    storageAtLimit ? 'text-destructive' : storageWarning ? 'text-amber-500' : 'text-muted-foreground',
                  )} />
                  <div className="w-24">
                    <Progress
                      value={storagePercent}
                      className={cn(
                        'h-1.5',
                        storageAtLimit && '[&>div]:bg-destructive',
                        storageWarning && !storageAtLimit && '[&>div]:bg-amber-500',
                      )}
                    />
                  </div>
                  <span className={cn(
                    'text-xs font-medium tabular-nums whitespace-nowrap',
                    storageAtLimit && 'text-destructive',
                    storageWarning && !storageAtLimit && 'text-amber-600 dark:text-amber-400',
                  )}>
                    {formatBytes(storageUsed)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{formatBytes(storageUsed)} / {formatBytes(TENANT_PICTOGRAM_QUOTA)} {t('pictograms.storageUsed', 'Storage Used')}</p>
              </TooltipContent>
            </Tooltip>

            <Button onClick={() => setShowUpload(true)} disabled={storageAtLimit}>
              <Upload className="mr-2 h-4 w-4" />
              {t('pictograms.upload', 'Upload Pictogram')}
            </Button>
          </div>
        </div>

        {/* Mobile storage bar */}
        <div className="sm:hidden">
          <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-card">
            <HardDrive className={cn(
              'h-4 w-4 shrink-0',
              storageAtLimit ? 'text-destructive' : storageWarning ? 'text-amber-500' : 'text-muted-foreground',
            )} />
            <div className="flex-1">
              <Progress
                value={storagePercent}
                className={cn(
                  'h-1.5',
                  storageAtLimit && '[&>div]:bg-destructive',
                  storageWarning && !storageAtLimit && '[&>div]:bg-amber-500',
                )}
              />
            </div>
            <span className={cn(
              'text-xs font-medium tabular-nums whitespace-nowrap',
              storageAtLimit && 'text-destructive',
              storageWarning && !storageAtLimit && 'text-amber-600 dark:text-amber-400',
            )}>
              {formatBytes(storageUsed)} / 200 MB
            </span>
          </div>
        </div>

        {storageAtLimit && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {t('pictograms.quotaReached', 'Storage quota reached (200 MB). Delete pictograms to free space.')}
          </div>
        )}

        {/* ── Filters ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('pictograms.search', 'Search pictograms...')}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={filterYear} onValueChange={setFilterYear}>
                <SelectTrigger className="w-[170px]">
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
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder={t('pictograms.category', 'Category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('pictograms.allCategories', 'All Categories')}</SelectItem>
                  {categories.map(c => {
                    const cfg = getCategoryConfig(c);
                    const Icon = cfg.icon;
                    return (
                      <SelectItem key={c} value={c}>
                        <span className="flex items-center gap-2">
                          <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                          <span className="capitalize">{c}</span>
                          {categoryCounts[c] && (
                            <span className="text-muted-foreground ml-1">({categoryCounts[c]})</span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSearch(''); setFilterYear('all'); setFilterCategory('all'); }}
                  className="h-9 px-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* View toggle + count */}
          <div className="flex items-center gap-3">
            {!isLoading && (
              <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                {filtered.length} / {pictograms.length}
              </span>
            )}
            <Separator orientation="vertical" className="h-5 hidden sm:block" />
            <div className="hidden sm:flex items-center rounded-md border p-0.5">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('grid')}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-7 w-7"
                onClick={() => setViewMode('list')}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* ── Loading ─────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground mt-3">
              {t('Loading...', { ns: 'common' })}
            </p>
          </div>
        )}

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {!isLoading && pictograms.length === 0 && (
          <div
            className={cn(
              'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 px-6 transition-all duration-200',
              isDragOver
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : 'border-muted-foreground/20 hover:border-muted-foreground/30',
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            {/* Decorative background icons */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none overflow-hidden">
              <div className="grid grid-cols-5 gap-8">
                {[ShieldCheck, Recycle, Flame, FlaskConical, Zap, Package, Truck, Shapes, ShieldCheck, Recycle,
                  Flame, FlaskConical, Zap, Package, Truck, Shapes, ShieldCheck, Recycle, Flame, FlaskConical,
                  Zap, Package, Truck, Shapes, ShieldCheck].map((Icon, i) => (
                  <Icon key={i} className="h-12 w-12" />
                ))}
              </div>
            </div>

            <div className="relative flex items-center justify-center mb-6">
              <div className="absolute h-20 w-20 rounded-full bg-primary/10 animate-pulse" />
              <div className="relative h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-primary/60" />
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-2">
              {t('pictograms.emptyState.title', 'No pictograms yet')}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md leading-relaxed">
              {t('pictograms.emptyState.description', 'Upload your first pictogram to start building your label library. Drag & drop files here or click the button below.')}
            </p>
            <Button onClick={() => setShowUpload(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              {t('pictograms.upload', 'Upload Pictogram')}
            </Button>
            <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileImage className="h-3 w-3" />
                {t('pictograms.upload.formats', 'SVG, PNG, JPG')}
              </span>
              <span className="text-muted-foreground/40">|</span>
              <span>{t('pictograms.upload.maxSize', 'Max 5 MB per file')}</span>
            </div>
          </div>
        )}

        {/* ── No results after filtering ─────────────────────────────────── */}
        {!isLoading && pictograms.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center py-16">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">{t('pictograms.noResults', 'No pictograms found')}</p>
            <p className="text-xs text-muted-foreground">
              {t('pictograms.tryDifferentFilter', 'Try adjusting your search or filters')}
            </p>
          </div>
        )}

        {/* ── Grid view ──────────────────────────────────────────────────── */}
        {!isLoading && filtered.length > 0 && viewMode === 'grid' && (
          <div
            className={cn(
              'grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
              isDragOver && 'opacity-50',
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            {filtered.map((pic, index) => {
              const catConfig = getCategoryConfig(pic.category);
              const CatIcon = catConfig.icon;

              return (
                <Card
                  key={pic.id}
                  className="group overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 animate-stagger-fade-in"
                  style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                >
                  {/* Image area with checkerboard for transparency */}
                  <div className="relative aspect-square flex items-center justify-center p-3"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, hsl(var(--muted)/0.5) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)/0.5) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)/0.5) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)/0.5) 75%)',
                      backgroundSize: '16px 16px',
                      backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                    }}
                  >
                    <img
                      src={pic.fileUrl}
                      alt={pic.name}
                      className="max-w-full max-h-full object-contain drop-shadow-sm"
                      loading="lazy"
                    />

                    {/* File type badge */}
                    <span className="absolute top-1.5 right-1.5 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-background/90 text-muted-foreground border shadow-sm">
                      {pic.fileType}
                    </span>

                    {/* Category indicator */}
                    <div className={cn(
                      'absolute top-1.5 left-1.5 h-6 w-6 rounded-md flex items-center justify-center border shadow-sm',
                      catConfig.bg,
                    )}>
                      <CatIcon className={cn('h-3 w-3', catConfig.color)} />
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="icon" variant="outline" className="h-9 w-9 shadow-sm" onClick={() => startEdit(pic)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{t('Edit', { ns: 'common' })}</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 shadow-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeletingPictogram(pic)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{t('Delete', { ns: 'common' })}</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>

                  <CardContent className="p-2.5 space-y-1.5">
                    <p className="text-sm font-medium leading-tight truncate" title={pic.name}>
                      {pic.name}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {pic.regulationYear && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                          {pic.regulationYear}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-1.5 py-0 capitalize gap-0.5', catConfig.color)}
                      >
                        <CatIcon className="h-2.5 w-2.5" />
                        {pic.category}
                      </Badge>
                    </div>
                    {pic.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {pic.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="text-[9px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-sm">
                            {tag}
                          </span>
                        ))}
                        {pic.tags.length > 3 && (
                          <span className="text-[9px] text-muted-foreground/60">+{pic.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* ── List view ──────────────────────────────────────────────────── */}
        {!isLoading && filtered.length > 0 && viewMode === 'list' && (
          <div
            className="space-y-1.5"
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
          >
            {filtered.map((pic, index) => {
              const catConfig = getCategoryConfig(pic.category);
              const CatIcon = catConfig.icon;

              return (
                <div
                  key={pic.id}
                  className="group flex items-center gap-4 rounded-lg border bg-card px-4 py-3 hover:shadow-sm transition-all duration-150 animate-stagger-fade-in"
                  style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
                >
                  {/* Thumbnail */}
                  <div
                    className="h-12 w-12 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, hsl(var(--muted)/0.5) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)/0.5) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)/0.5) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)/0.5) 75%)',
                      backgroundSize: '8px 8px',
                      backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px',
                    }}
                  >
                    <img
                      src={pic.fileUrl}
                      alt={pic.name}
                      className="max-w-[36px] max-h-[36px] object-contain"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pic.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge
                        variant="outline"
                        className={cn('text-[10px] px-1.5 py-0 capitalize gap-0.5', catConfig.color)}
                      >
                        <CatIcon className="h-2.5 w-2.5" />
                        {pic.category}
                      </Badge>
                      {pic.regulationYear && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {pic.regulationYear}
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">
                        {pic.fileType}
                      </span>
                      {pic.tags.length > 0 && (
                        <span className="text-[10px] text-muted-foreground hidden md:inline">
                          {pic.tags.slice(0, 3).join(', ')}
                          {pic.tags.length > 3 && ` +${pic.tags.length - 3}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(pic)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeletingPictogram(pic)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Upload Dialog ──────────────────────────────────────────────── */}
        <Dialog open={showUpload} onOpenChange={(open) => { if (!open) resetUploadForm(); setShowUpload(open); }}>
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
                    'flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 cursor-pointer transition-all duration-200',
                    isDragOver
                      ? 'border-primary bg-primary/5 scale-[1.02]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
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
                  <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                    <FileImage className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium mb-0.5">
                    {t('pictograms.upload.dropzone', 'Drop file here or click to browse')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('pictograms.upload.formats', 'SVG, PNG, JPG')} &middot; {t('pictograms.upload.maxSize', 'Max 5 MB per file')}
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3">
                  <div
                    className="h-16 w-16 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)',
                      backgroundSize: '10px 10px',
                      backgroundPosition: '0 0, 0 5px, 5px -5px, -5px 0px',
                    }}
                  >
                    <img src={uploadPreview} alt="" className="max-w-[52px] max-h-[52px] object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{uploadFile.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBytes(uploadFile.size)}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={resetUploadForm}>
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
                      {CATEGORY_OPTIONS.map(c => {
                        const cfg = getCategoryConfig(c);
                        const Icon = cfg.icon;
                        return (
                          <SelectItem key={c} value={c}>
                            <span className="flex items-center gap-2">
                              <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                              <span className="capitalize">{c}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
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

        {/* ── Edit Dialog ────────────────────────────────────────────────── */}
        <Dialog open={!!editingPictogram} onOpenChange={(open) => { if (!open) setEditingPictogram(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('pictograms.edit.title', 'Edit Pictogram')}</DialogTitle>
            </DialogHeader>

            {editingPictogram && (
              <div className="space-y-4">
                {/* Preview */}
                <div className="flex justify-center">
                  <div
                    className="h-24 w-24 rounded-xl flex items-center justify-center border"
                    style={{
                      backgroundImage: 'linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)',
                      backgroundSize: '12px 12px',
                      backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                    }}
                  >
                    <img src={editingPictogram.fileUrl} alt={editName} className="max-w-[72px] max-h-[72px] object-contain" />
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
                        {CATEGORY_OPTIONS.map(c => {
                          const cfg = getCategoryConfig(c);
                          const Icon = cfg.icon;
                          return (
                            <SelectItem key={c} value={c}>
                              <span className="flex items-center gap-2">
                                <Icon className={cn('h-3.5 w-3.5', cfg.color)} />
                                <span className="capitalize">{c}</span>
                              </span>
                            </SelectItem>
                          );
                        })}
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

        {/* ── Delete confirmation ─────────────────────────────────────────── */}
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
    </TooltipProvider>
  );
}
