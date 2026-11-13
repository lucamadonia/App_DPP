import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TenantPictogram } from '@/types/database';
import { cn } from '@/lib/utils';
import { checkerboard, formatBytes, getCategoryConfig } from './pictogram-config';
import { useCategoryLabel } from './use-category-label';

interface PictogramCollectionProps {
  pictograms: TenantPictogram[];
  view: 'grid' | 'list';
  onEdit: (p: TenantPictogram) => void;
  onDelete: (p: TenantPictogram) => void;
}

const ENTER = 'animate-stagger-fade-in motion-reduce:animate-none';

export function PictogramCollection({ pictograms, view, onEdit, onDelete }: PictogramCollectionProps) {
  if (view === 'list') {
    return (
      <ul className="min-w-0 divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
        {pictograms.map((pic, index) => (
          <ListRow key={pic.id} pic={pic} index={index} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </ul>
    );
  }
  return (
    <ul className="grid min-w-0 grid-cols-[repeat(auto-fill,minmax(min(100%,10rem),1fr))] gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))]">
      {pictograms.map((pic, index) => (
        <GridCard key={pic.id} pic={pic} index={index} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </ul>
  );
}

interface ItemProps {
  pic: TenantPictogram;
  index: number;
  onEdit: (p: TenantPictogram) => void;
  onDelete: (p: TenantPictogram) => void;
}

function Actions({ pic, onEdit, onDelete, compact }: Omit<ItemProps, 'index'> & { compact?: boolean }) {
  const { t } = useTranslation('products');
  const size = compact ? 'h-11 w-11 sm:h-8 sm:w-8' : 'h-11 w-11 sm:h-9 sm:w-9';
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className={cn(size, 'bg-card shadow-sm')}
            onClick={() => onEdit(pic)}
            aria-label={`${t('Edit', { ns: 'common' })}: ${pic.name}`}
          >
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
            className={cn(size, 'bg-card text-destructive shadow-sm hover:bg-destructive/10 hover:text-destructive')}
            onClick={() => onDelete(pic)}
            aria-label={`${t('Delete', { ns: 'common' })}: ${pic.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t('Delete', { ns: 'common' })}</TooltipContent>
      </Tooltip>
    </>
  );
}

function GridCard({ pic, index, onEdit, onDelete }: ItemProps) {
  const categoryLabel = useCategoryLabel();
  const cfg = getCategoryConfig(pic.category);
  const CatIcon = cfg.icon;

  return (
    <li
      className={cn(
        'group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm',
        'transition-[box-shadow,border-color,transform] duration-200 ease-out hover:border-primary/30 hover:shadow-md hover-lift',
        ENTER,
      )}
      style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
    >
      <div className="relative flex aspect-square items-center justify-center border-b p-5" style={checkerboard(16)}>
        <img
          src={pic.fileUrl}
          alt={pic.name}
          loading="lazy"
          className="max-h-full max-w-full object-contain drop-shadow-sm transition-transform duration-300 ease-out group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
        <span
          aria-hidden="true"
          className={cn('absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-border', cfg.bg, cfg.color)}
        >
          <CatIcon className="h-3.5 w-3.5" />
        </span>
        <span className="absolute right-2 top-2 rounded-md border bg-card/95 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground shadow-sm">
          {pic.fileType}
        </span>
        {/* Hover/focus reveal on pointer devices; always visible on touch. */}
        <div
          className={cn(
            'absolute inset-x-2 bottom-2 flex justify-end gap-1.5 transition-opacity duration-200',
            'opacity-0 group-hover:opacity-100 focus-within:opacity-100 pointer-coarse:opacity-100',
          )}
        >
          <Actions pic={pic} onEdit={onEdit} onDelete={onDelete} />
        </div>
      </div>

      <div className="min-w-0 space-y-1.5 p-3">
        <p className="truncate text-sm font-semibold leading-tight" title={pic.name}>{pic.name}</p>
        <div className="flex min-w-0 flex-wrap gap-1">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 text-[11px] font-medium leading-5', cfg.bg, cfg.color)}>
            {categoryLabel(pic.category)}
          </span>
          {pic.regulationYear && (
            <span className="max-w-full truncate rounded-full bg-muted px-2 text-[11px] font-medium leading-5 text-muted-foreground">
              {pic.regulationYear}
            </span>
          )}
        </div>
        {pic.tags.length > 0 && (
          <p className="truncate text-[11px] text-muted-foreground" title={pic.tags.join(', ')}>
            {pic.tags.slice(0, 3).map((tag) => `#${tag}`).join(' ')}
            {pic.tags.length > 3 && ` +${pic.tags.length - 3}`}
          </p>
        )}
      </div>
    </li>
  );
}

function ListRow({ pic, index, onEdit, onDelete }: ItemProps) {
  const categoryLabel = useCategoryLabel();
  const cfg = getCategoryConfig(pic.category);
  const CatIcon = cfg.icon;

  return (
    <li
      className={cn('group flex min-w-0 items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40 sm:gap-4 sm:px-4', ENTER)}
      style={{ animationDelay: `${Math.min(index * 20, 200)}ms` }}
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-card" style={checkerboard(8)}>
        <img src={pic.fileUrl} alt={pic.name} loading="lazy" className="max-h-9 max-w-9 object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{pic.name}</p>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 font-medium leading-5', cfg.bg, cfg.color)}>
            <CatIcon className="h-3 w-3" aria-hidden="true" />
            {categoryLabel(pic.category)}
          </span>
          {pic.regulationYear && (
            <span className="rounded-full bg-muted px-2 font-medium leading-5 text-muted-foreground">{pic.regulationYear}</span>
          )}
          <span className="font-medium uppercase text-muted-foreground">
            {pic.fileType} · {formatBytes(pic.fileSize)}
          </span>
          {pic.tags.length > 0 && (
            <span className="hidden min-w-0 truncate text-muted-foreground md:inline">
              {pic.tags.slice(0, 3).join(', ')}
              {pic.tags.length > 3 && ` +${pic.tags.length - 3}`}
            </span>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 pointer-coarse:opacity-100">
        <Actions pic={pic} onEdit={onEdit} onDelete={onDelete} compact />
      </div>
    </li>
  );
}
