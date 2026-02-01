import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, TrendingUp, Target, Clock, User, ArrowRight } from 'lucide-react';
import type { ActionPlanItem, Recommendation, ActionPriority, RecommendationType } from '@/types/compliance-check';

interface ComplianceActionPlanProps {
  actionPlan: ActionPlanItem[];
  recommendations: Recommendation[];
}

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; className: string; dotClass: string }> = {
  P1: {
    label: 'P1 — Immediate',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    dotClass: 'bg-red-500',
  },
  P2: {
    label: 'P2 — Short-term',
    className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    dotClass: 'bg-orange-500',
  },
  P3: {
    label: 'P3 — Medium-term',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    dotClass: 'bg-blue-500',
  },
};

const REC_ICONS: Record<RecommendationType, typeof Zap> = {
  quick_win: Zap,
  improvement: TrendingUp,
  strategic: Target,
};

const REC_COLORS: Record<RecommendationType, string> = {
  quick_win: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950',
  improvement: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950',
  strategic: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950',
};

const REC_LABELS: Record<RecommendationType, string> = {
  quick_win: 'Quick Win',
  improvement: 'Improvement',
  strategic: 'Strategic',
};

export function ComplianceActionPlan({ actionPlan, recommendations }: ComplianceActionPlanProps) {
  const { t } = useTranslation('compliance');

  return (
    <div className="space-y-6">
      {/* Action Plan Timeline */}
      {actionPlan.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            {t('Action Plan', { defaultValue: 'Action Plan' })}
          </h3>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-border" />

            <div className="space-y-3">
              {actionPlan.map((item, index) => {
                const priority = PRIORITY_CONFIG[item.priority];

                return (
                  <div
                    key={item.id}
                    className="relative pl-8 animate-fade-in-up"
                    style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
                  >
                    {/* Timeline dot */}
                    <div className={`absolute left-1.5 top-3 h-4 w-4 rounded-full border-2 border-background ${priority.dotClass}`} />

                    <div className="border rounded-lg p-3 bg-card">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={priority.className}>{item.priority}</Badge>
                            <h4 className="text-sm font-medium truncate">{item.title}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {item.responsible && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.responsible}
                          </span>
                        )}
                        {item.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.deadline}
                          </span>
                        )}
                        {item.estimatedEffort && (
                          <span>{item.estimatedEffort}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            {t('Recommendations', { defaultValue: 'Recommendations' })}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommendations.map((rec, index) => {
              const Icon = REC_ICONS[rec.type] || TrendingUp;
              return (
                <Card
                  key={rec.id}
                  className={`border ${REC_COLORS[rec.type]} animate-fade-in-up`}
                  style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-medium">{rec.title}</h4>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {REC_LABELS[rec.type]}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{rec.description}</p>
                        {rec.impact && (
                          <p className="text-xs text-primary mt-1 font-medium">{rec.impact}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
