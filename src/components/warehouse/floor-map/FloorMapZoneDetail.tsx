import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ZONE_FILL_COLORS } from './floor-map-constants';
import { ZONE_TYPE_CONFIG } from '@/lib/warehouse-constants';
import { getStockByZone, getZoneFillRatio } from './floor-map-utils';
import type { WarehouseZone, WhStockLevel } from '@/types/warehouse';

interface FloorMapZoneDetailProps {
  zone: WarehouseZone | null;
  stock: WhStockLevel[];
  allZones: WarehouseZone[];
  locationId: string;
  onClose: () => void;
}

export function FloorMapZoneDetail({
  zone,
  stock,
  allZones,
  locationId,
  onClose,
}: FloorMapZoneDetailProps) {
  const { t, i18n } = useTranslation('warehouse');
  const navigate = useNavigate();

  const colors = zone ? ZONE_FILL_COLORS[zone.type ?? 'other'] : null;
  const cfg = zone?.type ? ZONE_TYPE_CONFIG[zone.type] : ZONE_TYPE_CONFIG.other;
  const label = i18n.language.startsWith('de') ? cfg.labelDe : cfg.labelEn;

  const stockData = useMemo(() => {
    if (!zone) return { totalUnits: 0, totalBatches: 0, reserved: 0 };
    return getStockByZone(stock, zone.name);
  }, [zone, stock]);

  const zoneStock = useMemo(() => {
    if (!zone) return [];
    return stock.filter((s) => s.zone === zone.name);
  }, [zone, stock]);

  const damaged = useMemo(
    () => zoneStock.reduce((sum, s) => sum + s.quantityDamaged, 0),
    [zoneStock],
  );
  const quarantine = useMemo(
    () => zoneStock.reduce((sum, s) => sum + s.quantityQuarantine, 0),
    [zoneStock],
  );

  const fillRatio = useMemo(() => {
    if (!zone) return 0;
    return getZoneFillRatio(stock, allZones, zone.name);
  }, [zone, stock, allZones]);

  const fillPercent = Math.round(fillRatio * 100);

  // CSS-only ring chart
  const ringSize = 80;
  const ringStroke = 8;
  const ringRadius = (ringSize - ringStroke) / 2;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference - (fillRatio * ringCircumference);
  const ringColor =
    fillPercent > 90 ? '#EF4444' : fillPercent > 70 ? '#F59E0B' : '#22C55E';

  return (
    <Sheet open={!!zone} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px] p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            {colors && (
              <div
                className="h-3 w-3 rounded-full shrink-0"
                style={{ background: colors.stroke }}
              />
            )}
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base truncate">{zone?.name}</SheetTitle>
              <p className="text-xs text-muted-foreground font-mono">{zone?.code}</p>
            </div>
            {zone?.type && (
              <Badge
                variant="secondary"
                className="shrink-0 text-[10px]"
                style={{
                  background: colors?.fill,
                  color: colors?.text,
                  border: `1px solid ${colors?.stroke}40`,
                }}
              >
                {label}
              </Badge>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-6 space-y-6">
            {/* Stock Summary */}
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t('Stock Summary')}
              </h4>
              <div className="space-y-2">
                {[
                  { label: t('Available'), value: stockData.totalUnits, color: '#22C55E' },
                  { label: t('Reserved'), value: stockData.reserved, color: '#F59E0B' },
                  { label: t('Damaged'), value: damaged, color: '#EF4444' },
                  { label: t('Quarantine'), value: quarantine, color: '#8B5CF6' },
                ].map((row) => {
                  const total = stockData.totalUnits + stockData.reserved + damaged + quarantine;
                  const pct = total > 0 ? (row.value / total) * 100 : 0;
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-semibold tabular-nums">{row.value.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: row.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Capacity Ring */}
            <section className="flex flex-col items-center">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 self-start">
                {t('Capacity')}
              </h4>
              <svg width={ringSize} height={ringSize} className="transform -rotate-90">
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  fill="none"
                  stroke="currentColor"
                  className="text-muted"
                  strokeWidth={ringStroke}
                />
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={ringRadius}
                  fill="none"
                  stroke={ringColor}
                  strokeWidth={ringStroke}
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="text-lg font-bold mt-2 tabular-nums">{fillPercent}%</div>
              <div className="text-xs text-muted-foreground">{t('utilization')}</div>
            </section>

            {/* Bin Locations */}
            {zone?.binLocations && zone.binLocations.length > 0 && (
              <section>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {t('Bin Locations')} ({zone.binLocations.length})
                </h4>
                <div className="grid grid-cols-3 gap-1.5">
                  {zone.binLocations.map((bin) => {
                    const binStock = zoneStock.find((s) => s.binLocation === bin);
                    const hasBinStock = binStock && binStock.quantityAvailable > 0;
                    return (
                      <div
                        key={bin}
                        className="text-[10px] font-mono px-2 py-1 rounded border text-center truncate"
                        style={{
                          background: hasBinStock ? `${colors?.fill}80` : undefined,
                          borderColor: hasBinStock ? `${colors?.stroke}40` : undefined,
                        }}
                      >
                        {bin}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Zone Properties */}
            <section>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {t('Zone Properties')}
              </h4>
              <div className="space-y-2 text-xs">
                {zone?.areaM2 != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('Area (m²)')}</span>
                    <span className="font-semibold tabular-nums">{zone.areaM2}</span>
                  </div>
                )}
                {zone?.volumeM3 != null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('Volume (m³)')}</span>
                    <span className="font-semibold tabular-nums">{zone.volumeM3}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Batches')}</span>
                  <span className="font-semibold tabular-nums">{stockData.totalBatches}</span>
                </div>
              </div>
            </section>

            {/* Quick Action */}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/warehouse/locations/${locationId}`)}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-2" />
              {t('View Location')}
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
