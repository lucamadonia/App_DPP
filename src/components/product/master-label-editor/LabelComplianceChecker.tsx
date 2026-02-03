import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Plus,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LabelDesign, LabelFieldKey } from '@/types/master-label-editor';
import type { MasterLabelData, ProductGroup, LabelVariant } from '@/types/master-label';
import {
  runComplianceChecks,
  calculateComplianceScore,
  type ComplianceCheckItem,
  type ComplianceCheckFixAction,
} from '@/lib/master-label-compliance-checker';

interface LabelComplianceCheckerProps {
  design: LabelDesign;
  data: MasterLabelData | null;
  productGroup: ProductGroup;
  variant: LabelVariant;
  onAddField?: (fieldKey: LabelFieldKey) => void;
  onAddBadge?: (badgeId: string, symbol: string) => void;
  onAddPictogram?: (pictogramId: string) => void;
  onSelectElement?: (elementId: string) => void;
}

// ---------------------------------------------------------------------------
// Score Ring SVG
// ---------------------------------------------------------------------------

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    let raf: number;
    const start = performance.now();
    const duration = 800;
    const from = animatedScore;

    function animate(now: number) {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setAnimatedScore(Math.round(from + (score - from) * eased));
      if (t < 1) raf = requestAnimationFrame(animate);
    }
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
    // Only re-animate when score changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score]);

  const offset = circumference - (animatedScore / 100) * circumference;
  const color = animatedScore >= 90 ? '#22c55e' : animatedScore >= 70 ? '#eab308' : animatedScore >= 50 ? '#f97316' : '#ef4444';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-muted/20" strokeWidth={6} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{animatedScore}</span>
        <span className="text-[8px] text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Severity Group
// ---------------------------------------------------------------------------

function CheckGroup({
  items,
  severity,
  icon: Icon,
  iconColor,
  onFix,
}: {
  items: ComplianceCheckItem[];
  severity: string;
  icon: typeof ShieldAlert;
  iconColor: string;
  onFix: (action: ComplianceCheckFixAction) => void;
}) {
  const { t } = useTranslation('products');
  const [expanded, setExpanded] = useState(true);

  if (items.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 py-1 text-xs font-medium hover:text-foreground transition-colors"
      >
        <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
        <span style={{ color: iconColor }}>
          {severity} ({items.length})
        </span>
      </button>

      <div
        className="overflow-hidden transition-all duration-200"
        style={{
          maxHeight: expanded ? `${items.length * 70}px` : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        {items.map(item => (
          <div
            key={item.id}
            className="ml-5 mb-1.5 p-2 rounded-md border bg-background/50"
          >
            <div className="text-xs font-medium">{t(item.labelKey)}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{t(item.descriptionKey)}</div>
            {item.fixAction && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] px-2 mt-1 text-primary"
                onClick={() => onFix(item.fixAction!)}
              >
                {item.fixAction.type === 'fix-element' ? (
                  <>
                    <ArrowRight className="h-3 w-3 mr-1" />
                    {t('ml.check.fix')}
                  </>
                ) : (
                  <>
                    <Plus className="h-3 w-3 mr-1" />
                    {item.fixAction.type === 'add-badge' ? t('ml.check.addBadge') :
                     item.fixAction.type === 'add-pictogram' ? t('ml.check.addPictogram') :
                     t('ml.check.addField')}
                  </>
                )}
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Passed items list
// ---------------------------------------------------------------------------

function PassedList({ items }: { items: ComplianceCheckItem[] }) {
  const { t } = useTranslation('products');
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 py-1 text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
      >
        <ChevronRight className={`h-3 w-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>{t('ml.check.passed')} ({items.length})</span>
      </button>

      <div
        className="overflow-hidden transition-all duration-200"
        style={{
          maxHeight: expanded ? `${items.length * 24}px` : '0px',
          opacity: expanded ? 1 : 0,
        }}
      >
        {items.map(item => (
          <div key={item.id} className="ml-5 flex items-center gap-1.5 py-0.5">
            <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
            <span className="text-[10px] text-muted-foreground">{t(item.labelKey)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LabelComplianceChecker({
  design,
  data,
  productGroup,
  variant,
  onAddField,
  onAddBadge,
  onAddPictogram,
  onSelectElement,
}: LabelComplianceCheckerProps) {
  const { t } = useTranslation('products');

  const checks = useMemo(() => {
    if (!data) return [];
    return runComplianceChecks(design, data, productGroup, variant);
  }, [design, data, productGroup, variant]);

  const score = useMemo(() => calculateComplianceScore(checks), [checks]);

  const critical = checks.filter(c => !c.passed && c.severity === 'critical');
  const warnings = checks.filter(c => !c.passed && c.severity === 'warning');
  const infos = checks.filter(c => !c.passed && c.severity === 'info');
  const passed = checks.filter(c => c.passed);

  const handleFix = (action: ComplianceCheckFixAction) => {
    switch (action.type) {
      case 'add-field':
        if (action.fieldKey) onAddField?.(action.fieldKey);
        break;
      case 'add-badge':
        if (action.badgeId && action.symbol) onAddBadge?.(action.badgeId, action.symbol);
        break;
      case 'add-pictogram':
        if (action.pictogramId) onAddPictogram?.(action.pictogramId);
        break;
      case 'fix-element':
        if (action.elementId) onSelectElement?.(action.elementId);
        break;
    }
  };

  if (!data) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        {t('ml.check.noData')}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 animate-panel-slide-in">
      {/* Header with score */}
      <div className="flex items-center gap-4">
        <ScoreRing score={score} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{t('ml.check.title')}</h3>
          </div>
          <p className="text-[10px] text-muted-foreground">{t('ml.check.subtitle')}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px]">
            {critical.length > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <ShieldAlert className="h-3 w-3" />
                {critical.length} {t('ml.check.critical')}
              </span>
            )}
            {warnings.length > 0 && (
              <span className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="h-3 w-3" />
                {warnings.length} {t('ml.check.warnings')}
              </span>
            )}
            {infos.length > 0 && (
              <span className="flex items-center gap-1 text-blue-500">
                <Info className="h-3 w-3" />
                {infos.length} {t('ml.check.info')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Check groups */}
      <CheckGroup
        items={critical}
        severity={t('ml.check.critical')}
        icon={ShieldAlert}
        iconColor="#ef4444"
        onFix={handleFix}
      />

      <CheckGroup
        items={warnings}
        severity={t('ml.check.warnings')}
        icon={AlertTriangle}
        iconColor="#eab308"
        onFix={handleFix}
      />

      <CheckGroup
        items={infos}
        severity={t('ml.check.info')}
        icon={Info}
        iconColor="#3b82f6"
        onFix={handleFix}
      />

      <PassedList items={passed} />

      {/* 100% message */}
      {score === 100 && (
        <div className="text-center py-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900">
          <CheckCircle2 className="h-6 w-6 text-green-500 mx-auto mb-1" />
          <p className="text-xs font-medium text-green-700 dark:text-green-400">{t('ml.check.allPassed')}</p>
        </div>
      )}
    </div>
  );
}
