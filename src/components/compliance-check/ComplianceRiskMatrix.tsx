import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { RiskMatrixEntry } from '@/types/compliance-check';

interface ComplianceRiskMatrixProps {
  entries: RiskMatrixEntry[];
}

const LEVEL_COLORS = {
  low: 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
  medium: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800',
  high: 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800',
};

const IMPACT_BAR_COLORS = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

const LIKELIHOOD_ICONS = {
  low: ShieldCheck,
  medium: Shield,
  high: ShieldAlert,
};

function overallSeverity(likelihood: string, impact: string): 'low' | 'medium' | 'high' {
  const levels = { low: 1, medium: 2, high: 3 };
  const l = levels[likelihood as keyof typeof levels] || 2;
  const i = levels[impact as keyof typeof levels] || 2;
  const combined = l * i;
  if (combined <= 2) return 'low';
  if (combined <= 4) return 'medium';
  return 'high';
}

export function ComplianceRiskMatrix({ entries }: ComplianceRiskMatrixProps) {
  const { t } = useTranslation('compliance');

  if (!entries || entries.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry, index) => {
        const severity = overallSeverity(entry.likelihood, entry.impact);
        const Icon = LIKELIHOOD_ICONS[entry.likelihood] || Shield;

        return (
          <Card
            key={index}
            className={`border ${LEVEL_COLORS[severity]} animate-fade-in-up`}
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <Icon className={`h-5 w-5 ${
                    severity === 'high' ? 'text-red-500' :
                    severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold truncate">{entry.area}</h4>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{entry.description}</p>
                  {entry.regulation && (
                    <p className="text-xs text-muted-foreground/70 mt-1 italic">{entry.regulation}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {t('Likelihood', { defaultValue: 'Likelihood' })}
                      </span>
                      <div className={`h-1.5 w-8 rounded-full ${IMPACT_BAR_COLORS[entry.likelihood]}`} />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {t('Impact', { defaultValue: 'Impact' })}
                      </span>
                      <div className={`h-1.5 w-8 rounded-full ${IMPACT_BAR_COLORS[entry.impact]}`} />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
