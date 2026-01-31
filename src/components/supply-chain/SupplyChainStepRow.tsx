import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/format';
import {
  MapPin,
  Calendar,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Leaf,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TableCell,
  TableRow,
} from '@/components/ui/table';
import type { SupplyChainEntry } from '@/types/database';
import {
  PROCESS_TYPE_CONFIG,
  STATUS_CONFIG,
  TRANSPORT_CONFIG,
  getProcessTypeClasses,
  getStatusClasses,
} from '@/lib/supply-chain-constants';

interface SupplyChainStepRowProps {
  entry: SupplyChainEntry;
  supplierName?: string;
  productName?: string;
  onEdit: (entry: SupplyChainEntry) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}

export function SupplyChainStepRow({
  entry,
  supplierName,
  productName,
  onEdit,
  onDelete,
  compact = false,
}: SupplyChainStepRowProps) {
  const { t } = useTranslation('settings');
  const locale = useLocale();

  const renderRiskBadge = (level?: string) => {
    switch (level) {
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
          <Badge variant="outline" className="gap-1 text-green-600 border-green-200">
            <CheckCircle2 className="h-3 w-3" />
            {t('Low')}
          </Badge>
        );
    }
  };

  const renderProcessTypeBadge = (type?: string) => {
    if (!type) return null;
    const config = PROCESS_TYPE_CONFIG[type];
    if (!config) return null;
    const classes = getProcessTypeClasses(config.color);
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`gap-1 ${classes.bg} ${classes.text} ${classes.border}`}>
        <Icon className="h-3 w-3" />
        {t(config.label)}
      </Badge>
    );
  };

  const renderStatusBadge = (status?: string) => {
    if (!status) return null;
    const config = STATUS_CONFIG[status];
    if (!config) return null;
    const classes = getStatusClasses(config.color);
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`gap-1 ${classes.bg} ${classes.text}`}>
        <Icon className={`h-3 w-3 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
        {t(config.label)}
      </Badge>
    );
  };

  const renderTransportIcon = (mode?: string) => {
    if (!mode) return null;
    const config = TRANSPORT_CONFIG[mode];
    if (!config) return null;
    const Icon = config.icon;
    return (
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {t(config.label)}
      </span>
    );
  };

  // Compact card view
  if (compact) {
    return (
      <div className="flex items-start gap-3 rounded-lg border p-3 bg-card hover:bg-muted/30 transition-colors">
        <Badge variant="outline" className="mt-0.5 flex-shrink-0">
          {entry.step}
        </Badge>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            {renderProcessTypeBadge(entry.process_type)}
            {renderStatusBadge(entry.status)}
            {renderRiskBadge(entry.risk_level)}
          </div>

          <div className="flex items-center gap-1 text-sm">
            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{entry.location}</span>
            <Badge variant="outline" className="text-xs ml-1">{entry.country}</Badge>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(entry.date, locale)}
            </span>
            {supplierName && <span>{supplierName}</span>}
            {renderTransportIcon(entry.transport_mode)}
            {entry.emissions_kg != null && (
              <span className="flex items-center gap-1 text-green-600">
                <Leaf className="h-3 w-3" />
                {entry.emissions_kg} kg CO₂
              </span>
            )}
            {entry.cost != null && (
              <span>{entry.cost} {entry.currency || 'EUR'}</span>
            )}
            {entry.verified && (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            )}
          </div>
        </div>

        <div className="flex gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(entry)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(entry.id)}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      </div>
    );
  }

  // Table row view
  return (
    <TableRow>
      <TableCell>
        <Badge variant="outline">{entry.step}</Badge>
      </TableCell>
      {productName !== undefined && (
        <TableCell className="font-medium max-w-[120px] truncate">
          {productName}
        </TableCell>
      )}
      <TableCell>{renderProcessTypeBadge(entry.process_type)}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          <span className="truncate max-w-[120px]">{entry.location}</span>
        </div>
      </TableCell>
      <TableCell className="hidden md:table-cell">{entry.country}</TableCell>
      <TableCell>{renderStatusBadge(entry.status)}</TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          {formatDate(entry.date, locale)}
        </div>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {renderTransportIcon(entry.transport_mode)}
      </TableCell>
      <TableCell>{renderRiskBadge(entry.risk_level)}</TableCell>
      <TableCell className="hidden lg:table-cell">
        {entry.emissions_kg != null && (
          <span className="flex items-center gap-1 text-sm">
            <Leaf className="h-3 w-3 text-green-600" />
            {entry.emissions_kg}
          </span>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        {entry.cost != null && (
          <span className="text-sm">{entry.cost} {entry.currency || 'EUR'}</span>
        )}
      </TableCell>
      <TableCell>
        {entry.verified ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(entry)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(entry.id)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
