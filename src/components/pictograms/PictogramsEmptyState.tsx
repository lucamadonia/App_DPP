import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FileImage, FlaskConical, Flame, Plus, Recycle, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/lib/motion';
import { cn } from '@/lib/utils';

interface PictogramsEmptyStateProps {
  isDragOver: boolean;
  disabled?: boolean;
  onUpload: () => void;
  dropHandlers: {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: () => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

const ORBIT = [ShieldCheck, Recycle, Flame, FlaskConical, Zap];

/** First-run state: doubles as a drop target so the first upload is one gesture. */
export function PictogramsEmptyState({ isDragOver, disabled, onUpload, dropHandlers }: PictogramsEmptyStateProps) {
  const { t } = useTranslation('products');
  const prefersReduced = useReducedMotion();

  return (
    <div
      {...dropHandlers}
      className={cn(
        'relative isolate flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed px-5 py-14 text-center sm:py-20',
        'transition-[border-color,background-color] duration-200 ease-out',
        isDragOver ? 'border-primary bg-primary/5' : 'border-border bg-card/50',
      )}
    >
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <div aria-hidden="true" className="relative mb-6 flex h-28 w-28 items-center justify-center">
        {ORBIT.map((Icon, i) => {
          const angle = (i / ORBIT.length) * Math.PI * 2 - Math.PI / 2;
          return (
            <motion.span
              key={i}
              className="absolute flex h-8 w-8 items-center justify-center rounded-lg border bg-card text-muted-foreground shadow-sm"
              style={{ left: `calc(50% + ${Math.cos(angle) * 52}px - 1rem)`, top: `calc(50% + ${Math.sin(angle) * 52}px - 1rem)` }}
              initial={prefersReduced ? false : { opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.06, type: 'spring', stiffness: 320, damping: 22 }}
            >
              <Icon className="h-4 w-4" />
            </motion.span>
          );
        })}
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
          <FileImage className="h-7 w-7" />
        </span>
      </div>

      <h2 className="text-lg font-semibold">{t('pictograms.emptyState.title', 'No pictograms yet')}</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {t(
          'pictograms.emptyState.description',
          'Upload your first pictogram to start building your label library. Drag & drop files here or click the button below.',
        )}
      </p>
      <Button onClick={onUpload} size="lg" disabled={disabled} className="mt-6 min-h-11 w-full max-w-xs sm:w-auto">
        <Plus className="mr-2 h-4 w-4" />
        {t('pictograms.upload', 'Upload Pictogram')}
      </Button>
      <p className="mt-4 text-xs text-muted-foreground">
        {t('pictograms.upload.formats', 'SVG, PNG, JPG')} · {t('pictograms.upload.maxSize', 'Max 5 MB per file')}
      </p>
    </div>
  );
}
