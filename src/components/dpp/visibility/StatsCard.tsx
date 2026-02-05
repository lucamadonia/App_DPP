/**
 * Stats Card Component
 *
 * Live statistics with animated counters.
 */

import { Users, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface VisibilityStats {
  totalFields: number;
  consumerVisible: number;
  customsVisible: number;
  bothVisible: number;
  noneVisible: number;
}

interface StatsCardProps {
  stats: VisibilityStats;
}

export function StatsCard({ stats }: StatsCardProps) {
  const { t } = useTranslation('dpp');

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t('Live Stats')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Total Fields */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('Total Fields')}</span>
            <span className="text-lg font-semibold">{stats.totalFields}</span>
          </div>

          {/* Consumer Visible */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span className="text-sm text-muted-foreground">{t('Consumer')}</span>
            </div>
            <span className="text-lg font-semibold text-green-600">{stats.consumerVisible}</span>
          </div>

          {/* Customs Visible */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-muted-foreground">{t('Customs')}</span>
            </div>
            <span className="text-lg font-semibold text-amber-600">{stats.customsVisible}</span>
          </div>

          {/* Both Visible */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-muted-foreground">{t('Both Visible')}</span>
            </div>
            <span className="text-sm font-medium text-blue-600">{stats.bothVisible}</span>
          </div>

          {/* None Visible */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-muted-foreground">{t('None Visible')}</span>
            </div>
            <span className="text-sm font-medium text-gray-400">{stats.noneVisible}</span>
          </div>
        </CardContent>
      </Card>

      {/* Coverage Percentages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">{t('Coverage')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{t('Consumer')}</span>
              <span className="font-medium">
                {Math.round((stats.consumerVisible / stats.totalFields) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 transition-all"
                style={{ width: `${(stats.consumerVisible / stats.totalFields) * 100}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{t('Customs')}</span>
              <span className="font-medium">
                {Math.round((stats.customsVisible / stats.totalFields) * 100)}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all"
                style={{ width: `${(stats.customsVisible / stats.totalFields) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
