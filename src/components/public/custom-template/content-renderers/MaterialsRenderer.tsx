/**
 * Materials section with 4 display modes: table, cards, horizontal-bars, donut-chart.
 */
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Material, Product } from '@/types/product';
import type { DPPMaterialsDisplayMode } from '@/types/database';
import { getProductMaterials } from '@/lib/dpp-template-helpers';

interface Props {
  product: Product;
  displayMode: DPPMaterialsDisplayMode;
  showDataLabels: boolean;
  isFieldVisible: (field: string) => boolean;
  primaryColor: string;
  t: (key: string) => string;
}

function TableMode({ materials, isFieldVisible, t }: { materials: Material[]; isFieldVisible: Props['isFieldVisible']; t: Props['t'] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b text-left">
            <th className="py-2 text-sm font-medium text-muted-foreground">{t('Material')}</th>
            <th className="py-2 text-sm font-medium text-muted-foreground text-right">{t('Share')}</th>
            <th className="py-2 text-sm font-medium text-muted-foreground text-center">{t('Recyclable')}</th>
            {isFieldVisible('materialOrigins') && (
              <th className="py-2 text-sm font-medium text-muted-foreground">{t('Origin')}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {materials.map((material, index) => (
            <tr key={index} className="border-b last:border-b-0">
              <td className="py-3 font-medium">{material.name}</td>
              <td className="py-3 text-right">{material.percentage}%</td>
              <td className="py-3 text-center">
                {material.recyclable ? (
                  <Badge variant="secondary" className="text-xs">{t('Yes')}</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">{t('No')}</Badge>
                )}
              </td>
              {isFieldVisible('materialOrigins') && (
                <td className="py-3 text-sm">
                  {material.origin && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {material.origin}
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardsMode({ materials, primaryColor, t }: { materials: Material[]; primaryColor: string; t: Props['t'] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {materials.map((material, index) => (
        <div key={index} className="p-4 border rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">{material.name}</span>
            <span className="text-lg font-bold">{material.percentage}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${material.percentage}%`, backgroundColor: primaryColor }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {material.origin && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />{material.origin}
              </span>
            )}
            <Badge variant={material.recyclable ? 'secondary' : 'outline'} className="text-xs">
              {material.recyclable ? t('Recyclable') : t('Not recyclable')}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}

function HorizontalBarsMode({ materials, primaryColor, showLabels }: { materials: Material[]; primaryColor: string; showLabels: boolean }) {
  const colors = [primaryColor, '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];
  return (
    <div className="space-y-3">
      {/* Stacked bar */}
      <div className="w-full h-8 rounded-full overflow-hidden flex">
        {materials.map((m, i) => (
          <div
            key={i}
            className="h-full transition-all relative group"
            style={{ width: `${m.percentage}%`, backgroundColor: colors[i % colors.length] }}
            title={`${m.name}: ${m.percentage}%`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {materials.map((m, i) => (
          <div key={i} className="flex items-center gap-1.5 text-sm">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: colors[i % colors.length] }} />
            <span>{m.name}</span>
            {showLabels && <span className="text-muted-foreground">({m.percentage}%)</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutChartMode({ materials, primaryColor, showLabels }: { materials: Material[]; primaryColor: string; showLabels: boolean }) {
  const colors = [primaryColor, '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4'];
  const total = materials.reduce((s, m) => s + m.percentage, 0);
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;
  const strokeWidth = 24;

  let cumulativePercent = 0;
  const segments = materials.map((m, i) => {
    const percent = m.percentage / (total || 1);
    const startAngle = cumulativePercent * 360;
    cumulativePercent += percent;
    const endAngle = cumulativePercent * 360;
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;
    return {
      d: `M ${cx + r * Math.cos(startRad)} ${cy + r * Math.sin(startRad)} A ${r} ${r} 0 ${largeArc} 1 ${cx + r * Math.cos(endRad)} ${cy + r * Math.sin(endRad)}`,
      color: colors[i % colors.length],
      name: m.name,
      percentage: m.percentage,
    };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
        {segments.map((seg, i) => (
          <path key={i} d={seg.d} fill="none" stroke={seg.color} strokeWidth={strokeWidth} strokeLinecap="round" />
        ))}
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="text-sm font-bold fill-current">
          {total}%
        </text>
      </svg>
      <div className="flex flex-wrap gap-3">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1.5 text-sm">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: seg.color }} />
            <span>{seg.name}</span>
            {showLabels && <span className="text-muted-foreground">({seg.percentage}%)</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MaterialsRenderer({ product, displayMode, showDataLabels, isFieldVisible, primaryColor, t }: Props) {
  const materials = getProductMaterials(product);

  switch (displayMode) {
    case 'cards':
      return <CardsMode materials={materials} primaryColor={primaryColor} t={t} />;
    case 'horizontal-bars':
      return <HorizontalBarsMode materials={materials} primaryColor={primaryColor} showLabels={showDataLabels} />;
    case 'donut-chart':
      return <DonutChartMode materials={materials} primaryColor={primaryColor} showLabels={showDataLabels} />;
    case 'table':
    default:
      return <TableMode materials={materials} isFieldVisible={isFieldVisible} t={t} />;
  }
}
