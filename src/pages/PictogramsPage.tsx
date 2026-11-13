import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Files, FileType2, Layers, Loader2, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { KPIGrid, type KPIItem } from '@/components/ui/kpi-grid';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { EmptyState } from '@/components/ui/state-feedback';
import { TooltipProvider } from '@/components/ui/tooltip';
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
import { cn } from '@/lib/utils';
import {
  getTenantPictograms,
  deleteTenantPictogram,
  getTenantPictogramStorageUsage,
  TENANT_PICTOGRAM_QUOTA,
} from '@/services/supabase/tenant-pictograms';
import type { TenantPictogram } from '@/types/database';
import { PageContainer } from '@/components/layout/page-container';
import { formatBytes, validatePictogramFile } from '@/components/pictograms/pictogram-config';
import { PictogramStorageMeter } from '@/components/pictograms/PictogramStorageMeter';
import { PictogramsToolbar } from '@/components/pictograms/PictogramsToolbar';
import { PictogramCollection } from '@/components/pictograms/PictogramCollection';
import { PictogramsEmptyState } from '@/components/pictograms/PictogramsEmptyState';
import { PictogramUploadDialog } from '@/components/pictograms/PictogramUploadDialog';
import { PictogramEditDialog } from '@/components/pictograms/PictogramEditDialog';

type ViewMode = 'grid' | 'list';

export function PictogramsPage() {
  const { t } = useTranslation('products');

  // Data
  const [pictograms, setPictograms] = useState<TenantPictogram[]>([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // View + filters
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [filterYear, setFilterYear] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');

  // Dialogs. The upload dialog is re-keyed per opening so its form starts clean.
  const [upload, setUpload] = useState<{ key: number; file: File | null } | null>(null);
  const [editingPictogram, setEditingPictogram] = useState<TenantPictogram | null>(null);
  const [deletingPictogram, setDeletingPictogram] = useState<TenantPictogram | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [pics, usage] = await Promise.all([getTenantPictograms(), getTenantPictogramStorageUsage()]);
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

  const regulationYears = useMemo(() => {
    const years = new Set(pictograms.map((p) => p.regulationYear).filter(Boolean));
    return Array.from(years).sort().reverse();
  }, [pictograms]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pictograms.forEach((p) => { if (p.category) counts[p.category] = (counts[p.category] || 0) + 1; });
    return counts;
  }, [pictograms]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return pictograms.filter((p) => {
      const matchesSearch = !q
        || p.name.toLowerCase().includes(q)
        || p.description.toLowerCase().includes(q)
        || p.tags.some((tag) => tag.toLowerCase().includes(q));
      const matchesYear = filterYear === 'all' || p.regulationYear === filterYear;
      const matchesCategory = filterCategory === 'all' || p.category === filterCategory;
      return matchesSearch && matchesYear && matchesCategory;
    });
  }, [pictograms, search, filterYear, filterCategory]);

  const storageAtLimit = storageUsed >= TENANT_PICTOGRAM_QUOTA;
  const vectorCount = pictograms.filter((p) => p.fileType === 'svg').length;

  const openUpload = (file: File | null = null) => setUpload({ key: Date.now(), file });
  const resetFilters = () => { setSearch(''); setFilterYear('all'); setFilterCategory('all'); };

  const handleDelete = async () => {
    if (!deletingPictogram) return;
    try {
      setIsDeleting(true);
      await deleteTenantPictogram(deletingPictogram.id);
      toast.success(t('pictograms.delete.success', 'Pictogram deleted'));
      setDeletingPictogram(null);
      loadData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  // Dropping a file anywhere on the library opens the upload dialog with it.
  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); if (!storageAtLimit) setIsDragOver(true); },
    onDragLeave: () => setIsDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (storageAtLimit) return;
      const file = e.dataTransfer.files?.[0];
      if (!file) return;
      if (validatePictogramFile(file)) {
        toast.error(t('pictograms.upload.invalidFormat', 'Unsupported format or file too large.'));
        return;
      }
      openUpload(file);
    },
  };

  const kpis: KPIItem[] = [
    { id: 'total', label: t('Pictograms'), value: pictograms.length, icon: <Files className="h-4 w-4" />, accentClassName: 'text-primary' },
    { id: 'categories', label: t('Categories'), value: Object.keys(categoryCounts).length, icon: <Layers className="h-4 w-4" /> },
    { id: 'vector', label: t('Vector files (SVG)'), value: vectorCount, icon: <FileType2 className="h-4 w-4" />, sublabel: t('Sharpest at any print size') },
    {
      id: 'storage',
      label: t('pictograms.storageUsed', 'Storage Used'),
      value: formatBytes(storageUsed),
      sublabel: <PictogramStorageMeter used={storageUsed} quota={TENANT_PICTOGRAM_QUOTA} className="pt-1 [&>div:first-child]:hidden" />,
      accentClassName: storageAtLimit ? 'text-destructive' : undefined,
    },
  ];

  return (
    <TooltipProvider>
      <PageContainer
        size="full"
        padding={false}
        onRefresh={loadData}
        title={t('pictograms.title', 'Pictogram Database')}
        description={t('pictograms.subtitle', 'Upload and manage pictograms for your product labels')}
        actions={
          <Button onClick={() => openUpload()} disabled={storageAtLimit} className="min-h-11 sm:min-h-9">
            <Upload className="mr-2 h-4 w-4" />
            {t('pictograms.upload', 'Upload Pictogram')}
          </Button>
        }
      >
        <div className="min-w-0 space-y-6">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, i) => <ShimmerSkeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            pictograms.length > 0 && <KPIGrid items={kpis} cols={{ base: 2, lg: 4 }} />
          )}

          {storageAtLimit && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t('pictograms.quotaReached', 'Storage quota reached (200 MB). Delete pictograms to free space.')}
            </div>
          )}

          {!isLoading && pictograms.length > 0 && (
            <PictogramsToolbar
              search={search}
              onSearch={setSearch}
              year={filterYear}
              onYear={setFilterYear}
              years={regulationYears}
              category={filterCategory}
              onCategory={setFilterCategory}
              categoryCounts={categoryCounts}
              total={pictograms.length}
              shown={filtered.length}
              view={viewMode}
              onView={setViewMode}
              onReset={resetFilters}
            />
          )}

          {isLoading && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]" aria-busy="true">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border bg-card">
                  <ShimmerSkeleton className="aspect-square w-full rounded-none" />
                  <div className="space-y-2 p-3">
                    <ShimmerSkeleton className="h-3.5 w-3/4" />
                    <ShimmerSkeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && pictograms.length === 0 && (
            <PictogramsEmptyState
              isDragOver={isDragOver}
              disabled={storageAtLimit}
              onUpload={() => openUpload()}
              dropHandlers={dropHandlers}
            />
          )}

          {!isLoading && pictograms.length > 0 && filtered.length === 0 && (
            <EmptyState
              icon={Search}
              title={t('pictograms.noResults', 'No pictograms found')}
              description={t('pictograms.tryDifferentFilter', 'Try adjusting your search or filters')}
              actionLabel={t('Reset filters')}
              onAction={resetFilters}
            />
          )}

          {!isLoading && filtered.length > 0 && (
            <div
              {...dropHandlers}
              className={cn(
                'relative min-w-0 rounded-2xl transition-[outline-color] duration-150',
                isDragOver && 'outline-2 outline-offset-4 outline-dashed outline-primary',
              )}
            >
              <PictogramCollection
                pictograms={filtered}
                view={viewMode}
                onEdit={setEditingPictogram}
                onDelete={setDeletingPictogram}
              />
              {isDragOver && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-background/70 backdrop-blur-[2px]">
                  <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {t('Drop to upload')}
                  </span>
                </div>
              )}
            </div>
          )}

          {upload && (
            <PictogramUploadDialog
              key={upload.key}
              open
              initialFile={upload.file}
              onOpenChange={(open) => { if (!open) setUpload(null); }}
              onUploaded={loadData}
            />
          )}

          {editingPictogram && (
            <PictogramEditDialog
              key={editingPictogram.id}
              pictogram={editingPictogram}
              onClose={() => setEditingPictogram(null)}
              onSaved={loadData}
            />
          )}

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
      </PageContainer>
    </TooltipProvider>
  );
}
