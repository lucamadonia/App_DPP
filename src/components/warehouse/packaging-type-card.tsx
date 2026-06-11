/**
 * PackagingTypeCard — gallery card for a single outer-packaging type
 * (carton / mailer) with a true-to-scale isometric box silhouette,
 * tare badge, material chip, stock fill bar and the full action set.
 *
 * Also exports:
 *  - PackagingBoxSilhouette: pure SVG isometric box, proportions derived
 *    from the inner dimensions (normalized to a max edge of ~80px)
 *  - PackagingTypeCardSkeleton: shimmer placeholder in card shape
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { PackagePlus, Pencil, Ruler, SlidersHorizontal, Star, Trash2, Weight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { gridItem } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';
import { LUCID_MATERIAL_NAMES_DE, LUCID_MATERIAL_NAMES_EN } from '@/types/compliance';
import type { WhPackagingType } from '@/services/supabase/wh-packaging-types';

// ---------------------------------------------------------------------------
// Isometric box silhouette
// ---------------------------------------------------------------------------

const ISO_COS = Math.cos(Math.PI / 6); // ≈ 0.866
const ISO_SIN = 0.5;

/** Projects a 3D box corner (x=length, y=width, z=height) to 2D iso space. */
function projectIso(x: number, y: number, z: number): [number, number] {
  return [(x - y) * ISO_COS, (x + y) * ISO_SIN - z];
}

interface PackagingBoxSilhouetteProps {
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  /** Max edge of the rendered silhouette in px (default 80). */
  maxPx?: number;
  className?: string;
}

/**
 * Pure CSS/SVG isometric carton. Proportions come from the inner dimensions;
 * the projection is normalized so the longer screen axis equals `maxPx`.
 * Falls back to a translucent generic box when dimensions are missing.
 */
export function PackagingBoxSilhouette({
  lengthCm,
  widthCm,
  heightCm,
  maxPx = 80,
  className,
}: PackagingBoxSilhouetteProps) {
  const gradientId = useId();
  const hasDims = [lengthCm, widthCm, heightCm].every(
    (v) => typeof v === 'number' && Number.isFinite(v) && v > 0,
  );
  const l = hasDims ? (lengthCm as number) : 32;
  const w = hasDims ? (widthCm as number) : 22;
  const h = hasDims ? (heightCm as number) : 16;

  // Visible faces of the box (top, front-left, front-right)
  const top = [projectIso(0, 0, h), projectIso(l, 0, h), projectIso(l, w, h), projectIso(0, w, h)];
  const left = [projectIso(0, w, 0), projectIso(l, w, 0), projectIso(l, w, h), projectIso(0, w, h)];
  const right = [projectIso(l, 0, 0), projectIso(l, w, 0), projectIso(l, w, h), projectIso(l, 0, h)];
  // Carton seam across the top face
  const seam = [projectIso(l / 2, 0, h), projectIso(l / 2, w, h)];

  const all = [...top, ...left, ...right];
  const minX = Math.min(...all.map((p) => p[0]));
  const maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1]));
  const maxY = Math.max(...all.map((p) => p[1]));
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  const scale = maxPx / Math.max(spanX, spanY);
  const width = spanX * scale;
  const height = spanY * scale;

  const toSvg = (p: [number, number]) =>
    `${((p[0] - minX) * scale).toFixed(2)},${((p[1] - minY) * scale).toFixed(2)}`;
  const poly = (pts: Array<[number, number]>) => pts.map(toSvg).join(' ');

  const PAD = 2;
  const stroke = {
    stroke: 'currentColor',
    strokeOpacity: 0.3,
    strokeWidth: 1,
    strokeLinejoin: 'round' as const,
  };

  return (
    <svg
      width={width + PAD * 2}
      height={height + PAD * 2}
      viewBox={`${-PAD} ${-PAD} ${width + PAD * 2} ${height + PAD * 2}`}
      className={cn('block', !hasDims && 'opacity-40', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.5" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.24" />
        </linearGradient>
      </defs>
      <polygon points={poly(top)} fill={`url(#${gradientId})`} {...stroke} />
      <polygon points={poly(left)} fill="currentColor" fillOpacity="0.55" {...stroke} />
      <polygon points={poly(right)} fill="currentColor" fillOpacity="0.78" {...stroke} />
      <polyline
        points={poly(seam)}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1"
        strokeDasharray="3 2.5"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatGrams(g: number): string {
  if (g >= 1000) {
    const kg = g / 1000;
    return `${kg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
  }
  return `${g.toLocaleString()} g`;
}

function materialLabel(row: WhPackagingType, locale: 'en' | 'de'): string | null {
  const names = locale === 'de' ? LUCID_MATERIAL_NAMES_DE : LUCID_MATERIAL_NAMES_EN;
  if (row.primaryMaterial) return names[row.primaryMaterial];
  if (row.materialSplit && row.materialSplit.length > 0) {
    const top = [...row.materialSplit].sort((a, b) => b.weight_grams - a.weight_grams)[0];
    return names[top.material];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface PackagingTypeCardProps {
  row: WhPackagingType;
  onEdit: (row: WhPackagingType) => void;
  onDelete: (id: string) => void;
  onReceipt: (row: WhPackagingType) => void;
  onAdjust: (row: WhPackagingType) => void;
  onToggleActive: (row: WhPackagingType) => void;
}

export function PackagingTypeCard({
  row,
  onEdit,
  onDelete,
  onReceipt,
  onAdjust,
  onToggleActive,
}: PackagingTypeCardProps) {
  const { t } = useTranslation('warehouse');
  const locale = useLocale();
  const prefersReduced = useReducedMotion();

  const qty = row.stockOnHand ?? 0;
  const thr = row.stockThreshold ?? 10;
  const barColor = qty <= 0 ? 'bg-red-500' : qty <= thr ? 'bg-amber-500' : 'bg-emerald-500';
  const pct = qty <= 0 ? 0 : Math.min(100, Math.round((qty / Math.max(thr * 2, qty)) * 100));
  const material = materialLabel(row, locale);
  const hasDims = Boolean(row.innerLengthCm && row.innerWidthCm && row.innerHeightCm);

  return (
    <motion.div
      variants={prefersReduced ? undefined : gridItem}
      whileHover={prefersReduced ? undefined : { y: -3 }}
      whileTap={prefersReduced ? undefined : { scale: 0.97 }}
      className="min-w-0 h-full"
    >
      <Card
        className={cn(
          'h-full gap-0 py-0 overflow-hidden transition-shadow duration-200 hover:shadow-md',
          !row.isActive && 'opacity-60',
        )}
      >
        <CardContent className="flex h-full flex-col gap-3 p-4">
          {/* Silhouette + identity */}
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={cn(
                'flex h-[84px] w-[88px] shrink-0 items-center justify-center rounded-lg bg-muted/40',
                row.isActive ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <PackagingBoxSilhouette
                lengthCm={row.innerLengthCm}
                widthCm={row.innerWidthCm}
                heightCm={row.innerHeightCm}
                maxPx={72}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold leading-tight truncate">{row.name}</span>
                {row.isDefault && (
                  <Star
                    className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400"
                    role="img"
                    aria-label={t('Default')}
                  />
                )}
              </div>
              {row.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{row.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <Badge variant="secondary" className="gap-1 text-xs font-normal tabular-nums" title={t('Tara')}>
                  <Weight className="h-3 w-3" />
                  {formatGrams(row.tareWeightGrams)}
                </Badge>
                {material && (
                  <Badge variant="outline" className="text-xs font-normal max-w-full">
                    <span className="truncate">{material}</span>
                  </Badge>
                )}
              </div>
              <div
                className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground tabular-nums"
                title={t('Innenmaße')}
              >
                <Ruler className="h-3 w-3 shrink-0" />
                {hasDims
                  ? `${row.innerLengthCm} × ${row.innerWidthCm} × ${row.innerHeightCm} cm`
                  : '—'}
                {row.maxLoadGrams != null && (
                  <span className="ml-1 truncate">
                    · {t('Max Last')} {formatGrams(row.maxLoadGrams)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stock fill bar */}
          {row.stockTracked ? (
            <button
              type="button"
              onClick={() => onAdjust(row)}
              title={t('Inventur-Korrektur')}
              className="group w-full min-h-11 text-left rounded-md -mx-1 px-1 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="flex items-baseline justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">{t('Stock')}</span>
                <span className="font-semibold tabular-nums">
                  {qty.toLocaleString()}
                  <span className="font-normal text-muted-foreground"> / {thr.toLocaleString()}</span>
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className={cn('h-full rounded-full', barColor)}
                  initial={prefersReduced ? false : { width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                />
              </div>
            </button>
          ) : (
            <div className="flex min-h-11 items-center text-xs text-muted-foreground">
              {t('Stock not tracked')}
            </div>
          )}

          {/* Footer: active switch + actions */}
          <div className="mt-auto flex items-center justify-between gap-2 border-t pt-2.5">
            <label className="flex min-h-11 cursor-pointer items-center gap-2">
              <Switch
                checked={row.isActive}
                onCheckedChange={() => onToggleActive(row)}
                aria-label={t('Aktiv')}
              />
              <span className="text-xs text-muted-foreground">{t('Aktiv')}</span>
            </label>
            <div className="flex items-center -mr-1.5">
              {row.stockTracked && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 text-muted-foreground"
                    onClick={() => onReceipt(row)}
                    aria-label={t('Wareneingang buchen')}
                    title={t('Wareneingang buchen')}
                  >
                    <PackagePlus className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 text-muted-foreground"
                    onClick={() => onAdjust(row)}
                    aria-label={t('Inventur-Korrektur')}
                    title={t('Inventur-Korrektur')}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-11 w-11 text-muted-foreground"
                onClick={() => onEdit(row)}
                aria-label={t('Edit')}
                title={t('Edit')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-11 w-11 text-muted-foreground"
                    aria-label={t('Delete')}
                    title={t('Delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('Umverpackung löschen?')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('„{{name}}" wird aus der Liste entfernt. Shipments, die diesen Typ nutzen, verlieren die Zuordnung.', { name: row.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(row.id)}>{t('Delete')}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

/** Shimmer placeholder mirroring the card layout (used while loading). */
export function PackagingTypeCardSkeleton() {
  return (
    <Card className="h-full gap-0 py-0 overflow-hidden">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <ShimmerSkeleton className="h-[84px] w-[88px] rounded-lg shrink-0" />
          <div className="flex-1 space-y-2 pt-1 min-w-0">
            <ShimmerSkeleton className="h-4 w-2/3" />
            <ShimmerSkeleton className="h-3 w-1/2" />
            <div className="flex gap-1.5">
              <ShimmerSkeleton className="h-5 w-16 rounded-full" />
              <ShimmerSkeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>
        </div>
        <ShimmerSkeleton className="h-2 w-full rounded-full" />
        <div className="mt-auto flex items-center justify-between border-t pt-3">
          <ShimmerSkeleton className="h-6 w-16 rounded-full" />
          <ShimmerSkeleton className="h-8 w-32 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
