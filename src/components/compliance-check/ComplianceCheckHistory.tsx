import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Trash2, Eye } from 'lucide-react';
import type { SavedComplianceCheck, RiskLevel } from '@/types/compliance-check';

interface ComplianceCheckHistoryProps {
  checks: SavedComplianceCheck[];
  onView: (check: SavedComplianceCheck) => void;
  onDelete: (checkId: string) => void;
}

const RISK_BADGE_CLASS: Record<RiskLevel, string> = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

function getScoreColor(score: number): string {
  if (score >= 81) return 'text-green-600';
  if (score >= 61) return 'text-yellow-600';
  if (score >= 41) return 'text-orange-600';
  return 'text-red-600';
}

export function ComplianceCheckHistory({ checks, onView, onDelete }: ComplianceCheckHistoryProps) {
  const { t } = useTranslation('compliance');

  if (checks.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        {t('Previous Checks', { defaultValue: 'Previous Checks' })}
      </h3>
      <div className="space-y-2">
        {checks.map((check) => (
          <div
            key={check.id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className={`text-2xl font-bold ${getScoreColor(check.overallScore)}`}>
              {check.overallScore}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge className={RISK_BADGE_CLASS[check.riskLevel]}>
                  {check.riskLevel}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {check.findings?.length || 0} findings
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {new Date(check.createdAt).toLocaleString()}
                {check.batchId && ` · Batch`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(check)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => {
                  if (confirm(t('Delete this check?', { defaultValue: 'Delete this check?' }))) {
                    onDelete(check.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
