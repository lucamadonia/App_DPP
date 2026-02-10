import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FileWarning,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { getComplianceOverview, type ComplianceOverview, type ComplianceWarning } from '@/services/supabase/compliance';

interface ComplianceWidgetProps {
  className?: string;
}

function scoreColor(rate: number): string {
  if (rate >= 80) return 'text-success';
  if (rate >= 50) return 'text-warning';
  return 'text-destructive';
}

function progressColor(rate: number): string {
  if (rate >= 80) return '[&>[data-slot=progress-indicator]]:bg-success';
  if (rate >= 50) return '[&>[data-slot=progress-indicator]]:bg-warning';
  return '[&>[data-slot=progress-indicator]]:bg-destructive';
}

export function ComplianceWidget({ className }: ComplianceWidgetProps) {
  const { t } = useTranslation('dashboard');
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getComplianceOverview().then((data) => {
      if (!cancelled) {
        setOverview(data);
        setIsLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {t('Compliance')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            <div className="h-10 w-20 rounded bg-muted" />
            <div className="h-2 w-full rounded bg-muted" />
            <div className="space-y-2">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!overview || overview.totalProducts === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {t('Compliance')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-4 text-center">
            <Shield className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mt-2 text-sm text-muted-foreground">
              {t('Add products to see compliance status')}
            </p>
            <Button className="mt-3" size="sm" variant="outline" asChild>
              <Link to="/products/new">
                {t('New Product')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const rate = Math.round(overview.overallRate);
  const topWarnings = overview.warnings.slice(0, 3);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {t('Compliance')}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/compliance">
              {t('Details')}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div className="flex items-end gap-3">
          <span className={`text-3xl font-bold tabular-nums ${scoreColor(rate)}`}>
            {rate}%
          </span>
          <span className="mb-1 text-sm text-muted-foreground">
            {t('overall compliance')}
          </span>
        </div>

        <Progress value={rate} className={`h-2 ${progressColor(rate)}`} />

        {/* Summary row */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span className="text-muted-foreground">
              {overview.compliant} {t('compliant')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" />
            <span className="text-muted-foreground">
              {overview.pending} {t('pending')}
            </span>
          </div>
        </div>

        {/* Warnings */}
        {topWarnings.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            {topWarnings.map((w, i) => (
              <WarningRow key={i} warning={w} />
            ))}
            {overview.warnings.length > 3 && (
              <Link
                to="/compliance"
                className="block text-xs text-primary hover:underline"
              >
                +{overview.warnings.length - 3} {t('more warnings')}
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WarningRow({ warning }: { warning: ComplianceWarning }) {
  const severityVariant = warning.severity === 'high' ? 'destructive' : 'secondary';
  return (
    <div className="flex items-start gap-2">
      <FileWarning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-foreground">{warning.message}</p>
        {warning.entityName && (
          <p className="truncate text-xs text-muted-foreground">{warning.entityName}</p>
        )}
      </div>
      <Badge variant={severityVariant} className="shrink-0 text-[10px] px-1.5">
        {warning.severity}
      </Badge>
    </div>
  );
}
