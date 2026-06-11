/**
 * TransferJourney — visual "From → To" picker for stock transfers.
 *
 * Two location cards connected by an animated dashed path. The path
 * "marches" toward the destination once both ends are selected, and a
 * dot travels from A to B when a transfer succeeds (replayed via
 * `pulseKey`). Horizontal on sm+, vertical on mobile.
 */
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Warehouse, MapPin, ArrowLeftRight, Loader2, PackageCheck, PackageX } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { WhLocation } from '@/types/warehouse';

interface TransferJourneyProps {
  locations: WhLocation[];
  fromLocationId: string;
  toLocationId: string;
  onFromChange: (id: string) => void;
  onToChange: (id: string) => void;
  onSwap: () => void;
  /** Available units at source for the selected batch — null while unknown */
  available: number | null;
  checkingStock: boolean;
  /** Whether a batch is selected, i.e. availability is meaningful */
  stockReady: boolean;
  /** Increment to replay the traveling success dot */
  pulseKey: number;
  disabled?: boolean;
}

function LocationCard({
  side,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
  active,
  children,
}: {
  side: 'from' | 'to';
  label: string;
  value: string;
  onChange: (id: string) => void;
  options: WhLocation[];
  placeholder: string;
  disabled?: boolean;
  active: boolean;
  children?: React.ReactNode;
}) {
  const Icon = side === 'from' ? Warehouse : MapPin;
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-3 sm:p-4 transition-all duration-300',
        active
          ? side === 'from'
            ? 'border-orange-300 dark:border-orange-800 shadow-sm ring-1 ring-orange-200/60 dark:ring-orange-900/40'
            : 'border-green-300 dark:border-green-800 shadow-sm ring-1 ring-green-200/60 dark:ring-green-900/40'
          : 'border-border'
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
            active
              ? side === 'from'
                ? 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400'
                : 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-11 w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((l) => (
            <SelectItem key={l.id} value={l.id}>
              {l.name}
              {l.code ? ` (${l.code})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="mt-2 min-h-[1.25rem]">{children}</div>
    </div>
  );
}

export function TransferJourney({
  locations,
  fromLocationId,
  toLocationId,
  onFromChange,
  onToChange,
  onSwap,
  available,
  checkingStock,
  stockReady,
  pulseKey,
  disabled,
}: TransferJourneyProps) {
  const { t } = useTranslation('warehouse');
  const prefersReduced = useReducedMotion();

  const bothSelected = Boolean(fromLocationId && toLocationId);

  const marchingProps =
    bothSelected && !prefersReduced
      ? {
          animate: { strokeDashoffset: [0, -16] },
          transition: { repeat: Infinity, duration: 1.1, ease: 'linear' as const },
        }
      : {};

  const lineClass = bothSelected ? 'stroke-primary' : 'stroke-border';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_4.5rem_1fr] items-stretch">
      <LocationCard
        side="from"
        label={t('From Location')}
        value={fromLocationId}
        onChange={onFromChange}
        options={locations.filter((l) => l.id !== toLocationId)}
        placeholder={t('Select Warehouse')}
        disabled={disabled}
        active={Boolean(fromLocationId)}
      >
        {fromLocationId && stockReady && (
          checkingStock ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('Checking availability...')}
            </span>
          ) : available != null ? (
            available > 0 ? (
              <motion.span
                key={`avail-${available}`}
                initial={prefersReduced ? false : { opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-400"
              >
                <PackageCheck className="h-3.5 w-3.5" />
                {t('Available')}: <span className="tabular-nums font-bold">{available}</span> {t('units')}
              </motion.span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400">
                <PackageX className="h-3.5 w-3.5" />
                {t('No stock at this location')}
              </span>
            )
          ) : null
        )}
      </LocationCard>

      {/* Connector — horizontal on sm+, vertical on mobile */}
      <div className="relative flex items-center justify-center py-1.5 sm:py-0 min-h-[3.5rem] sm:min-h-0">
        {/* Horizontal path (sm+) */}
        <svg
          className="hidden sm:block absolute inset-0 h-full w-full overflow-visible"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <motion.line
            x1="0"
            y1="50%"
            x2="100%"
            y2="50%"
            strokeWidth="2"
            strokeDasharray="5 5"
            className={cn('transition-colors duration-300 fill-none', lineClass)}
            {...marchingProps}
          />
        </svg>
        {/* Vertical path (mobile) */}
        <svg
          className="sm:hidden absolute inset-0 h-full w-full overflow-visible"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <motion.line
            x1="50%"
            y1="0"
            x2="50%"
            y2="100%"
            strokeWidth="2"
            strokeDasharray="5 5"
            className={cn('transition-colors duration-300 fill-none', lineClass)}
            {...marchingProps}
          />
        </svg>

        {/* Traveling success dot — replayed via pulseKey */}
        {pulseKey > 0 && !prefersReduced && (
          <>
            <motion.span
              key={`dot-h-${pulseKey}`}
              className="hidden sm:block absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]"
              initial={{ left: '0%', opacity: 0 }}
              animate={{ left: ['0%', '92%'], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            />
            <motion.span
              key={`dot-v-${pulseKey}`}
              className="sm:hidden absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]"
              initial={{ top: '0%', opacity: 0 }}
              animate={{ top: ['0%', '88%'], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            />
          </>
        )}

        {/* Swap button */}
        <motion.button
          type="button"
          onClick={onSwap}
          disabled={disabled || !fromLocationId || !toLocationId}
          whileTap={prefersReduced ? undefined : { scale: 0.9, rotate: 180 }}
          transition={{ duration: 0.25 }}
          className={cn(
            'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-background shadow-sm transition-colors',
            bothSelected
              ? 'border-primary/40 text-primary hover:bg-primary/5'
              : 'border-border text-muted-foreground',
            'disabled:opacity-40 disabled:pointer-events-none'
          )}
          aria-label={t('Swap locations')}
          title={t('Swap locations')}
        >
          <ArrowLeftRight className="h-4 w-4 rotate-90 sm:rotate-0" />
        </motion.button>
      </div>

      <LocationCard
        side="to"
        label={t('To Location')}
        value={toLocationId}
        onChange={onToChange}
        options={locations.filter((l) => l.id !== fromLocationId)}
        placeholder={t('Select Warehouse')}
        disabled={disabled}
        active={Boolean(toLocationId)}
      />
    </div>
  );
}
