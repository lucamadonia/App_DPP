/**
 * Recycling section with 3 display modes: progress-bar, donut, info-cards.
 */
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SafeHtml } from '@/components/ui/safe-html';
import type { Product } from '@/types/product';
import type { DPPRecyclingDisplayMode } from '@/types/database';

interface Props {
  product: Product;
  displayMode: DPPRecyclingDisplayMode;
  isFieldVisible: (field: string) => boolean;
  primaryColor: string;
  t: (key: string) => string;
}

function InstructionsAndDisposal({ product, isFieldVisible, t }: Pick<Props, 'product' | 'isFieldVisible' | 't'>) {
  return (
    <>
      {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            {t('Recycling Instructions')}
          </h4>
          <SafeHtml html={product.recyclability.instructions} className="text-sm text-muted-foreground" />
        </div>
      )}
      {isFieldVisible('disposalMethods') && product.recyclability.disposalMethods.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">{t('Disposal Methods')}</h4>
          <div className="flex flex-wrap gap-2">
            {product.recyclability.disposalMethods.map((method, index) => (
              <Badge key={index} variant="outline">{method}</Badge>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function ProgressBarMode({ product, isFieldVisible, t }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">
            {product.recyclability.recyclablePercentage}%
          </div>
          <p className="text-sm text-muted-foreground">{t('Recyclable')}</p>
        </div>
        <Progress value={product.recyclability.recyclablePercentage} className="flex-1 h-3" />
      </div>
      <InstructionsAndDisposal product={product} isFieldVisible={isFieldVisible} t={t} />
    </div>
  );
}

function DonutMode({ product, isFieldVisible, primaryColor, t }: Props) {
  const pct = product.recyclability.recyclablePercentage;
  const circumference = 2 * Math.PI * 50;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <div className="relative flex-shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="50" fill="none" stroke="#e5e7eb" strokeWidth="12" />
            <circle
              cx="60" cy="60" r="50" fill="none"
              stroke={primaryColor}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">{pct}%</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="font-semibold text-lg">{t('Recyclable')}</p>
          <p className="text-sm text-muted-foreground">{pct}% {t('of materials can be recycled')}</p>
        </div>
      </div>
      <InstructionsAndDisposal product={product} isFieldVisible={isFieldVisible} t={t} />
    </div>
  );
}

function InfoCardsMode({ product, isFieldVisible, primaryColor, t }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg text-center space-y-2" style={{ borderColor: `${primaryColor}30` }}>
          <div className="text-4xl font-bold" style={{ color: primaryColor }}>{product.recyclability.recyclablePercentage}%</div>
          <p className="text-sm text-muted-foreground">{t('Recyclable Materials')}</p>
          <Progress value={product.recyclability.recyclablePercentage} className="h-2" />
        </div>
        {product.recyclability.disposalMethods.length > 0 && (
          <div className="p-4 border rounded-lg space-y-2">
            <h4 className="font-medium text-sm">{t('Disposal Methods')}</h4>
            <div className="flex flex-wrap gap-1.5">
              {product.recyclability.disposalMethods.map((method, i) => (
                <Badge key={i} variant="outline" className="text-xs">{method}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
      {isFieldVisible('recyclingInstructions') && product.recyclability.instructions && (
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            {t('Recycling Instructions')}
          </h4>
          <SafeHtml html={product.recyclability.instructions} className="text-sm text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export function RecyclingRenderer({ product, displayMode, isFieldVisible, primaryColor, t }: Props) {
  switch (displayMode) {
    case 'donut':
      return <DonutMode product={product} displayMode={displayMode} isFieldVisible={isFieldVisible} primaryColor={primaryColor} t={t} />;
    case 'info-cards':
      return <InfoCardsMode product={product} displayMode={displayMode} isFieldVisible={isFieldVisible} primaryColor={primaryColor} t={t} />;
    case 'progress-bar':
    default:
      return <ProgressBarMode product={product} displayMode={displayMode} isFieldVisible={isFieldVisible} primaryColor={primaryColor} t={t} />;
  }
}
