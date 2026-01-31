import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/format';
import {
  Package,
  MapPin,
  Calendar,
  Building2,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Leaf,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { SupplyChainEntry } from '@/types/database';
import {
  PROCESS_TYPE_CONFIG,
  STATUS_CONFIG,
  TRANSPORT_CONFIG,
  getProcessTypeClasses,
  getStatusClasses,
} from '@/lib/supply-chain-constants';

interface SupplyChainTimelineProps {
  entriesByProduct: Record<string, SupplyChainEntry[]>;
  getProductName: (id: string) => string;
  getSupplierName: (entry: SupplyChainEntry) => string | null;
  onEdit: (entry: SupplyChainEntry) => void;
  onDelete: (id: string) => void;
}

export function SupplyChainTimeline({
  entriesByProduct,
  getProductName,
  getSupplierName,
  onEdit,
  onDelete,
}: SupplyChainTimelineProps) {
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

  const productIds = Object.keys(entriesByProduct);

  if (productIds.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('No entries found')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {productIds.map(productId => {
        const entries = entriesByProduct[productId];
        return (
          <Card key={productId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                {getProductName(productId)}
              </CardTitle>
              <CardDescription>
                {t('{{count}} steps in the supply chain', { count: entries.length })}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-4">
                  {entries.map((entry, index) => {
                    const processConfig = entry.process_type
                      ? PROCESS_TYPE_CONFIG[entry.process_type]
                      : null;
                    const processClasses = processConfig
                      ? getProcessTypeClasses(processConfig.color)
                      : null;
                    const ProcessIcon = processConfig?.icon || Package;
                    const supplierName = getSupplierName(entry);

                    return (
                      <div
                        key={entry.id}
                        className="relative flex items-start gap-4 pl-12 animate-in fade-in"
                        style={{ animationDelay: `${index * 60}ms` }}
                      >
                        {/* Process Type Icon on timeline */}
                        <div
                          className={`absolute left-2 w-7 h-7 rounded-full border-2 bg-background flex items-center justify-center ${
                            processClasses
                              ? `${processClasses.border} ${processClasses.text}`
                              : entry.risk_level === 'high'
                              ? 'border-destructive text-destructive'
                              : entry.risk_level === 'medium'
                              ? 'border-yellow-500 text-yellow-600'
                              : 'border-green-500 text-green-600'
                          }`}
                        >
                          <ProcessIcon className="h-3.5 w-3.5" />
                        </div>

                        {/* Transport icon between steps */}
                        {index < entries.length - 1 && entry.transport_mode && (
                          <div className="absolute left-2.5 top-10 w-5 flex justify-center">
                            {(() => {
                              const tc = TRANSPORT_CONFIG[entry.transport_mode!];
                              if (!tc) return null;
                              const TIcon = tc.icon;
                              return <TIcon className="h-3 w-3 text-muted-foreground" />;
                            })()}
                          </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 min-w-0 bg-muted/30 rounded-lg p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span className="font-medium">{entry.location}</span>
                                <Badge variant="outline" className="text-xs">
                                  {entry.country}
                                </Badge>
                                {renderProcessTypeBadge(entry.process_type)}
                                {renderStatusBadge(entry.status)}
                                {renderRiskBadge(entry.risk_level)}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {entry.description}
                              </p>
                              <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {formatDate(entry.date, locale)}
                                </span>
                                {supplierName && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {supplierName}
                                  </span>
                                )}
                                {entry.transport_mode && renderTransportIcon(entry.transport_mode)}
                                {entry.emissions_kg != null && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <Leaf className="h-3 w-3" />
                                    {entry.emissions_kg} kg CO₂
                                  </span>
                                )}
                                {entry.verified && (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle2 className="h-3 w-3" />
                                    {t('Verified')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onEdit(entry)}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => onDelete(entry.id)}
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {index < entries.length - 1 && (
                          <ChevronRight className="absolute -bottom-4 left-4 h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
