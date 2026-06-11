import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/format';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Hourglass,
  MapPin,
  Package,
  Pencil,
  StickyNote,
  Trash2,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import type { SupplyChainEntry } from '@/types/database';
import {
  PROCESS_TYPE_CONFIG,
  STATUS_CONFIG,
  TRANSPORT_CONFIG,
  getProcessTypeClasses,
  getStatusClasses,
  Leaf,
} from '@/lib/supply-chain-constants';

interface SupplyChainStationSheetProps {
  entry: SupplyChainEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  supplierName: string | null;
  canMoveEarlier: boolean;
  canMoveLater: boolean;
  onEdit: (entry: SupplyChainEntry) => void;
  onDelete: (id: string) => void;
  onMove: (entry: SupplyChainEntry, direction: 'earlier' | 'later') => void;
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="text-sm break-words">{children}</div>
      </div>
    </div>
  );
}

export function SupplyChainStationSheet({
  entry,
  open,
  onOpenChange,
  productName,
  supplierName,
  canMoveEarlier,
  canMoveLater,
  onEdit,
  onDelete,
  onMove,
}: SupplyChainStationSheetProps) {
  const { t } = useTranslation('settings');
  const locale = useLocale();

  if (!entry) {
    return <Sheet open={false} onOpenChange={onOpenChange} />;
  }

  const processConfig = entry.process_type ? PROCESS_TYPE_CONFIG[entry.process_type] : null;
  const processClasses = processConfig ? getProcessTypeClasses(processConfig.color) : null;
  const ProcessIcon = processConfig?.icon || Package;
  const statusConfig = entry.status ? STATUS_CONFIG[entry.status] : null;
  const statusClasses = statusConfig ? getStatusClasses(statusConfig.color) : null;
  const transportConfig = entry.transport_mode ? TRANSPORT_CONFIG[entry.transport_mode] : null;
  const TransportIcon = transportConfig?.icon;

  const renderRiskBadge = () => {
    switch (entry.risk_level) {
      case 'high':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {t('High')}
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="secondary" className="gap-1 bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="h-3 w-3" />
            {t('Medium')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 border-green-200 text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            {t('Low')}
          </Badge>
        );
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="pb-0">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 bg-background ${
                processClasses
                  ? `${processClasses.border} ${processClasses.text} ${processClasses.bg}`
                  : 'border-border text-muted-foreground'
              }`}
            >
              <ProcessIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <SheetTitle className="truncate">{entry.location}</SheetTitle>
              <SheetDescription className="truncate">{productName}</SheetDescription>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="tabular-nums">
              {t('Step')} {entry.step}
            </Badge>
            <Badge variant="secondary">{entry.country}</Badge>
            {processConfig && processClasses && (
              <Badge variant="outline" className={`gap-1 ${processClasses.bg} ${processClasses.text} ${processClasses.border}`}>
                <ProcessIcon className="h-3 w-3" />
                {t(processConfig.label)}
              </Badge>
            )}
            {statusConfig && statusClasses && (
              <Badge variant="outline" className={`gap-1 ${statusClasses.bg} ${statusClasses.text}`}>
                <statusConfig.icon className="h-3 w-3" />
                {t(statusConfig.label)}
              </Badge>
            )}
            {renderRiskBadge()}
            {entry.verified && (
              <Badge variant="outline" className="gap-1 border-green-200 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                {t('Verified')}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <Separator />

        <div className="flex-1 overflow-y-auto px-4">
          <DetailRow icon={Calendar} label={t('Date')}>
            {formatDate(entry.date, locale)}
          </DetailRow>
          {supplierName && (
            <DetailRow icon={Building2} label={t('Supplier')}>
              {supplierName}
            </DetailRow>
          )}
          {transportConfig && TransportIcon && (
            <DetailRow icon={TransportIcon} label={t('Transport')}>
              {t(transportConfig.label)}
            </DetailRow>
          )}
          {entry.duration_days != null && (
            <DetailRow icon={Hourglass} label={t('Duration (days)')}>
              <span className="tabular-nums">{entry.duration_days}</span>
            </DetailRow>
          )}
          {entry.emissions_kg != null && (
            <DetailRow icon={Leaf} label={t('Emissions (kg CO₂)')}>
              <span className="tabular-nums text-emerald-600">{entry.emissions_kg}</span>
            </DetailRow>
          )}
          {entry.cost != null && (
            <DetailRow icon={Banknote} label={t('Cost')}>
              <span className="tabular-nums">
                {entry.cost} {entry.currency || 'EUR'}
              </span>
            </DetailRow>
          )}
          {entry.coordinates && (
            <DetailRow icon={MapPin} label={t('Coordinates')}>
              <span className="tabular-nums">{entry.coordinates}</span>
            </DetailRow>
          )}
          {entry.facility_identifier && (
            <DetailRow icon={Warehouse} label={t('Facility Identifier')}>
              {entry.facility_identifier}
            </DetailRow>
          )}
          {entry.description && (
            <DetailRow icon={FileText} label={t('Description')}>
              {entry.description}
            </DetailRow>
          )}
          {entry.notes && (
            <DetailRow icon={StickyNote} label={t('Notes')}>
              <span className="whitespace-pre-wrap">{entry.notes}</span>
            </DetailRow>
          )}
        </div>

        <SheetFooter className="border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 flex-1"
              disabled={!canMoveEarlier}
              onClick={() => onMove(entry, 'earlier')}
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              {t('Move earlier')}
            </Button>
            <Button
              variant="outline"
              className="h-11 flex-1"
              disabled={!canMoveLater}
              onClick={() => onMove(entry, 'later')}
            >
              {t('Move later')}
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
          <Button className="h-11" onClick={() => onEdit(entry)}>
            <Pencil className="mr-2 h-4 w-4" />
            {t('Edit', { ns: 'common' })}
          </Button>
          <Button
            variant="outline"
            className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(entry.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('Delete', { ns: 'common' })}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
