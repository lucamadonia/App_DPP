import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Plus, Package, CheckCircle2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { SupplyChainEntry } from '@/types/database';
import {
  PROCESS_TYPE_CONFIG,
  TRANSPORT_CONFIG,
  getProcessTypeClasses,
  Leaf,
} from '@/lib/supply-chain-constants';
import { useReducedMotion } from '@/lib/motion';

const STATUS_DOT_CLASSES: Record<string, string> = {
  planned: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  delayed: 'bg-yellow-500',
  cancelled: 'bg-red-500',
};

interface SupplyChainJourneyProps {
  entriesByProduct: Record<string, SupplyChainEntry[]>;
  getProductName: (id: string) => string;
  getSupplierName: (entry: SupplyChainEntry) => string | null;
  onSelectStation: (entry: SupplyChainEntry) => void;
  /** position = 1-based insertion index within the product's journey */
  onAddStation: (productId: string, position: number) => void;
}

interface StationVisuals {
  Icon: typeof Package;
  circleClasses: string;
  statusDot: string | null;
}

function getStationVisuals(entry: SupplyChainEntry): StationVisuals {
  const config = entry.process_type ? PROCESS_TYPE_CONFIG[entry.process_type] : null;
  const classes = config ? getProcessTypeClasses(config.color) : null;
  return {
    Icon: config?.icon || Package,
    circleClasses: classes
      ? `${classes.border} ${classes.text} ${classes.bg}`
      : 'border-border text-muted-foreground bg-muted/30',
    statusDot: entry.status ? STATUS_DOT_CLASSES[entry.status] || null : null,
  };
}

/* ------------------------------------------------------------------ */
/* Desktop: horizontal journey                                         */
/* ------------------------------------------------------------------ */

function DesktopStation({
  entry,
  index,
  supplierName,
  reduced,
  onClick,
}: {
  entry: SupplyChainEntry;
  index: number;
  supplierName: string | null;
  reduced: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation('settings');
  const { Icon, circleClasses, statusDot } = getStationVisuals(entry);
  const processLabel = entry.process_type
    ? PROCESS_TYPE_CONFIG[entry.process_type]
      ? t(PROCESS_TYPE_CONFIG[entry.process_type].label)
      : entry.process_type
    : null;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`${t('Station details')}: ${entry.location}`}
      className="group flex w-28 shrink-0 flex-col items-center gap-1.5 rounded-lg p-1.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      initial={reduced ? false : { opacity: 0, y: 12, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22, delay: reduced ? 0 : 0.1 + index * 0.12 }}
      whileHover={reduced ? undefined : { y: -3 }}
      whileTap={{ scale: 0.97 }}
    >
      <span
        className={`relative flex h-12 w-12 items-center justify-center rounded-full border-2 bg-background shadow-sm transition-shadow group-hover:shadow-md ${circleClasses}`}
      >
        <Icon className="h-5 w-5" />
        {statusDot && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${statusDot}`}
            aria-hidden
          />
        )}
        {entry.verified && (
          <CheckCircle2 className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-background text-green-600" />
        )}
      </span>
      <span className="flex items-center gap-1">
        <Badge variant="outline" className="px-1 py-0 text-[10px] tabular-nums">
          {entry.step}
        </Badge>
        <Badge variant="secondary" className="px-1 py-0 text-[10px]">
          {entry.country}
        </Badge>
      </span>
      <span className="w-full truncate text-xs font-medium leading-tight">
        {supplierName || entry.location}
      </span>
      <span className="w-full truncate text-[10px] text-muted-foreground">
        {supplierName ? entry.location : processLabel || ' '}
      </span>
    </motion.button>
  );
}

function DesktopConnector({
  entry,
  index,
  reduced,
  onAdd,
}: {
  entry: SupplyChainEntry;
  index: number;
  reduced: boolean;
  onAdd: () => void;
}) {
  const { t } = useTranslation('settings');
  const transportConfig = entry.transport_mode ? TRANSPORT_CONFIG[entry.transport_mode] : null;
  const TransportIcon = transportConfig?.icon;
  const hasInfo = !!TransportIcon || entry.emissions_kg != null;

  return (
    <div className="flex w-20 shrink-0 grow flex-col items-center lg:w-28" style={{ maxWidth: '9rem' }}>
      <div className="relative flex h-12 w-full items-center justify-center">
        <svg
          className="absolute inset-x-0 top-1/2 h-0.5 w-full -translate-y-1/2 text-border"
          viewBox="0 0 100 2"
          preserveAspectRatio="none"
          aria-hidden
        >
          <motion.line
            x1="0"
            y1="1"
            x2="100"
            y2="1"
            stroke="currentColor"
            strokeWidth="2"
            initial={reduced ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, delay: reduced ? 0 : 0.18 + index * 0.12, ease: 'easeOut' }}
          />
        </svg>
        {hasInfo && (
          <motion.span
            className="relative z-10 flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground shadow-sm"
            title={transportConfig ? t(transportConfig.label) : undefined}
            initial={reduced ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: reduced ? 0 : 0.32 + index * 0.12 }}
          >
            {TransportIcon && <TransportIcon className="h-3 w-3" />}
            {entry.emissions_kg != null && (
              <span className="flex items-center gap-0.5 text-emerald-600 tabular-nums">
                <Leaf className="h-2.5 w-2.5" />
                {entry.emissions_kg} kg
              </span>
            )}
          </motion.span>
        )}
      </div>
      <AddStationButton onClick={onAdd} className="opacity-40 hover:opacity-100 focus-visible:opacity-100" />
    </div>
  );
}

function AddStationButton({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  const { t } = useTranslation('settings');
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={t('Add station here')}
      title={t('Add station here')}
      whileTap={{ scale: 0.97 }}
      className={`flex h-11 w-11 items-center justify-center text-muted-foreground transition-all hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full ${className}`}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-current">
        <Plus className="h-3.5 w-3.5" />
      </span>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile: vertical journey with rail                                  */
/* ------------------------------------------------------------------ */

function MobileStation({
  entry,
  index,
  supplierName,
  reduced,
  onClick,
}: {
  entry: SupplyChainEntry;
  index: number;
  supplierName: string | null;
  reduced: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation('settings');
  const { Icon, circleClasses, statusDot } = getStationVisuals(entry);

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={`${t('Station details')}: ${entry.location}`}
      className="relative flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      initial={reduced ? false : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24, delay: reduced ? 0 : 0.08 + index * 0.08 }}
      whileTap={{ scale: 0.97 }}
    >
      <span
        className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-background shadow-sm ${circleClasses}`}
      >
        <Icon className="h-5 w-5" />
        {statusDot && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${statusDot}`}
            aria-hidden
          />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{supplierName || entry.location}</span>
          {entry.verified && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-600" />}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <Badge variant="outline" className="px-1 py-0 text-[10px] tabular-nums">
            {entry.step}
          </Badge>
          <Badge variant="secondary" className="px-1 py-0 text-[10px]">
            {entry.country}
          </Badge>
          {supplierName && (
            <span className="truncate text-[11px] text-muted-foreground">{entry.location}</span>
          )}
        </span>
      </span>
    </motion.button>
  );
}

function MobileConnector({
  entry,
  onAdd,
}: {
  entry: SupplyChainEntry;
  onAdd: () => void;
}) {
  const { t } = useTranslation('settings');
  const transportConfig = entry.transport_mode ? TRANSPORT_CONFIG[entry.transport_mode] : null;
  const TransportIcon = transportConfig?.icon;

  return (
    <div className="relative flex min-h-6 items-center gap-2 pl-[3.25rem]">
      <AddStationButton onClick={onAdd} className="-ml-1 opacity-60" />
      {(TransportIcon || entry.emissions_kg != null) && (
        <span className="flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
          {TransportIcon && (
            <span className="flex items-center gap-1">
              <TransportIcon className="h-3 w-3" />
              {transportConfig && t(transportConfig.label)}
            </span>
          )}
          {entry.emissions_kg != null && (
            <span className="flex items-center gap-0.5 text-emerald-600 tabular-nums">
              <Leaf className="h-2.5 w-2.5" />
              {entry.emissions_kg} kg
            </span>
          )}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main journey component                                              */
/* ------------------------------------------------------------------ */

export function SupplyChainJourney({
  entriesByProduct,
  getProductName,
  getSupplierName,
  onSelectStation,
  onAddStation,
}: SupplyChainJourneyProps) {
  const { t } = useTranslation('settings');
  const prefersReduced = !!useReducedMotion();
  const productIds = Object.keys(entriesByProduct);

  if (productIds.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">{t('No entries found')}</div>
    );
  }

  return (
    <div className="space-y-6">
      {productIds.map(productId => {
        const entries = entriesByProduct[productId];
        return (
          <Card key={productId} className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                {getProductName(productId)}
              </CardTitle>
              <CardDescription>
                {t('From raw material to delivery')} ·{' '}
                {t('{{count}} steps in the supply chain', { count: entries.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop: horizontal path */}
              <div className="hidden overflow-x-auto md:block">
                <div className="flex min-w-max items-start px-1 py-2">
                  {entries.map((entry, i) => (
                    <Fragment key={entry.id}>
                      <DesktopStation
                        entry={entry}
                        index={i}
                        supplierName={getSupplierName(entry)}
                        reduced={prefersReduced}
                        onClick={() => onSelectStation(entry)}
                      />
                      {i < entries.length - 1 ? (
                        <DesktopConnector
                          entry={entry}
                          index={i}
                          reduced={prefersReduced}
                          onAdd={() => onAddStation(productId, i + 2)}
                        />
                      ) : (
                        <div className="flex h-12 items-center pl-1">
                          <AddStationButton
                            onClick={() => onAddStation(productId, entries.length + 1)}
                            className="opacity-60 hover:opacity-100"
                          />
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>

              {/* Mobile: vertical journey with rail */}
              <div className="relative md:hidden">
                <motion.div
                  className="absolute bottom-6 left-[29px] top-6 w-0.5 origin-top bg-border"
                  initial={prefersReduced ? false : { scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  aria-hidden
                />
                <div>
                  {entries.map((entry, i) => (
                    <Fragment key={entry.id}>
                      <MobileStation
                        entry={entry}
                        index={i}
                        supplierName={getSupplierName(entry)}
                        reduced={prefersReduced}
                        onClick={() => onSelectStation(entry)}
                      />
                      {i < entries.length - 1 && (
                        <MobileConnector
                          entry={entry}
                          onAdd={() => onAddStation(productId, i + 2)}
                        />
                      )}
                    </Fragment>
                  ))}
                  <div className="relative pl-[3.25rem]">
                    <AddStationButton
                      onClick={() => onAddStation(productId, entries.length + 1)}
                      className="-ml-1 opacity-60"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
