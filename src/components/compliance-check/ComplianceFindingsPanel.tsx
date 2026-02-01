import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import type { ComplianceFinding, FindingCategory, FindingSeverity, FindingStatus } from '@/types/compliance-check';

interface ComplianceFindingsPanelProps {
  findings: ComplianceFinding[];
}

const SEVERITY_CONFIG: Record<FindingSeverity, { label: string; className: string }> = {
  critical: { label: 'Critical', className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  high: { label: 'High', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
  medium: { label: 'Medium', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  low: { label: 'Low', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  info: { label: 'Info', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
};

const STATUS_CONFIG: Record<FindingStatus, { icon: typeof CheckCircle2; className: string; label: string }> = {
  compliant: { icon: CheckCircle2, className: 'text-green-600', label: 'Compliant' },
  partial: { icon: AlertTriangle, className: 'text-yellow-600', label: 'Partial' },
  non_compliant: { icon: XCircle, className: 'text-red-600', label: 'Non-Compliant' },
  unknown: { icon: HelpCircle, className: 'text-muted-foreground', label: 'Unknown' },
};

const ALL_CATEGORIES: FindingCategory[] = [
  'ESPR', 'Battery', 'PPWR', 'GPSR', 'CE', 'REACH', 'RoHS', 'EMC', 'RED', 'LVD', 'Docs', 'DPP', 'National', 'Other',
];

export function ComplianceFindingsPanel({ findings }: ComplianceFindingsPanelProps) {
  const { t } = useTranslation('compliance');
  const [activeCategory, setActiveCategory] = useState<FindingCategory | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Only show categories that have findings
  const categoriesWithFindings = ALL_CATEGORIES.filter(cat =>
    findings.some(f => f.category === cat)
  );

  const filtered = activeCategory === 'all'
    ? findings
    : findings.filter(f => f.category === activeCategory);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Sort: critical first, then high, etc.
  const severityOrder: Record<FindingSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  const sorted = [...filtered].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <div className="space-y-4">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {t('All', { defaultValue: 'All' })} ({findings.length})
        </button>
        {categoriesWithFindings.map(cat => {
          const count = findings.filter(f => f.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {cat} ({count})
            </button>
          );
        })}
      </div>

      {/* Findings list */}
      <div className="space-y-2">
        {sorted.map((finding, index) => {
          const isExpanded = expandedIds.has(finding.id);
          const severity = SEVERITY_CONFIG[finding.severity];
          const status = STATUS_CONFIG[finding.status];
          const StatusIcon = status.icon;

          return (
            <div
              key={finding.id}
              className="border rounded-lg overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
            >
              <button
                onClick={() => toggleExpand(finding.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <StatusIcon className={`h-4 w-4 shrink-0 ${status.className}`} />
                <span className="flex-1 text-sm font-medium truncate">{finding.title}</span>
                <Badge className={`shrink-0 ${severity.className}`}>
                  {severity.label}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                  {finding.regulation}
                </span>
              </button>

              {isExpanded && (
                <div className="px-3 pb-3 pl-10 space-y-2 border-t bg-muted/20">
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">{finding.description}</p>
                  </div>
                  {finding.recommendation && (
                    <div className="p-2 rounded bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-0.5">
                        {t('Recommendation', { defaultValue: 'Recommendation' })}
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">{finding.recommendation}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{t('Category', { defaultValue: 'Category' })}: {finding.category}</span>
                    <span>{t('Status', { defaultValue: 'Status' })}: {status.label}</span>
                    <span>{finding.regulation}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          {t('No findings in this category', { defaultValue: 'No findings in this category' })}
        </p>
      )}
    </div>
  );
}
