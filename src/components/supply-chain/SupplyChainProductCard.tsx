import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Package,
  ChevronDown,
  ChevronRight,
  MapPin,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { SupplyChainEntry, Supplier } from '@/types/database';
import {
  PROCESS_TYPE_CONFIG,
  STATUS_CONFIG,
  getProcessTypeClasses,
  getStatusClasses,
} from '@/lib/supply-chain-constants';

interface SupplyChainProductCardProps {
  productId: string;
  productName: string;
  entries: SupplyChainEntry[];
  suppliers: Supplier[];
  onEdit: (entry: SupplyChainEntry) => void;
  onDelete: (id: string) => void;
}

export function SupplyChainProductCard({
  productId: _productId,
  productName,
  entries,
  suppliers,
  onEdit,
  onDelete,
}: SupplyChainProductCardProps) {
  const { t } = useTranslation('settings');
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => a.step - b.step);
  }, [entries]);

  const completionPercentage = useMemo(() => {
    if (entries.length === 0) return 0;
    const completed = entries.filter(e => e.status === 'completed').length;
    return Math.round((completed / entries.length) * 100);
  }, [entries]);

  const borderColor = completionPercentage > 80
    ? 'border-l-green-500'
    : completionPercentage > 50
    ? 'border-l-yellow-500'
    : 'border-l-red-500';

  const getSupplierName = (entry: SupplyChainEntry): string | null => {
    const id = entry.supplier_id || entry.supplier;
    if (!id) return null;
    return suppliers.find(s => s.id === id)?.name || id;
  };

  const renderRiskBadge = (level?: string) => {
    switch (level) {
      case 'high':
        return (
          <Badge variant="destructive" className="gap-1 text-xs">
            <AlertTriangle className="h-3 w-3" />
            {t('High')}
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="secondary" className="gap-1 text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <Clock className="h-3 w-3" />
            {t('Medium')}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1 text-xs text-green-600 border-green-200">
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
      <Badge variant="outline" className={`gap-1 text-xs ${classes.bg} ${classes.text} ${classes.border}`}>
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
      <Badge variant="outline" className={`gap-1 text-xs ${classes.bg} ${classes.text}`}>
        <Icon className={`h-3 w-3 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
        {t(config.label)}
      </Badge>
    );
  };

  return (
    <div
      className={`rounded-xl border border-l-4 ${borderColor} bg-card overflow-hidden transition-all duration-300`}
    >
      {/* Header - always visible */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-4 p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2 flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <Package className="h-5 w-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold truncate">{productName}</span>
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              {entries.length} {t('Supply Chain Steps')}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={completionPercentage} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground flex-shrink-0 w-10 text-right">
              {completionPercentage}%
            </span>
          </div>
        </div>
      </button>

      {/* Expanded content */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="border-t px-4 py-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground text-xs border-b">
                  <th className="pb-2 pr-3 font-medium">{t('Step')}</th>
                  <th className="pb-2 pr-3 font-medium">{t('Process Type')}</th>
                  <th className="pb-2 pr-3 font-medium">{t('Location')}</th>
                  <th className="pb-2 pr-3 font-medium hidden sm:table-cell">{t('Country')}</th>
                  <th className="pb-2 pr-3 font-medium">{t('Status')}</th>
                  <th className="pb-2 pr-3 font-medium">{t('Risk')}</th>
                  <th className="pb-2 font-medium w-[80px]">{t('Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {sortedEntries.map((entry, index) => {
                  const supplierName = getSupplierName(entry);
                  return (
                    <tr
                      key={entry.id}
                      className="border-b last:border-0 animate-in fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className="text-xs">
                          {entry.step}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">{renderProcessTypeBadge(entry.process_type)}</td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="truncate max-w-[120px]">{entry.location}</span>
                          {supplierName && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({supplierName})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-3 hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">{entry.country}</Badge>
                      </td>
                      <td className="py-2 pr-3">{renderStatusBadge(entry.status)}</td>
                      <td className="py-2 pr-3">{renderRiskBadge(entry.risk_level)}</td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onEdit(entry)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onDelete(entry.id)}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
