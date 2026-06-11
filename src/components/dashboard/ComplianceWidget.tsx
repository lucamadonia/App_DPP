import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  FileWarning,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

const GAUGE_R = 30;
const GAUGE_C = 2 * Math.PI * GAUGE_R;

function ComplianceGauge({ rate }: { rate: number }) {
  const prefersReduced = useReducedMotion();
  const offset = GAUGE_C * (1 - Math.min(Math.max(rate, 0), 100) / 100);
  return (
    <div className="relative h-24 w-24 shrink-0">
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle
          cx="36" cy="36" r={GAUGE_R}
          fill="none" strokeWidth="7"
          className="stroke-muted"
        />
        <motion.circle
          cx="36" cy="36" r={GAUGE_R}
          fill="none" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={GAUGE_C}
          initial={prefersReduced ? { strokeDashoffset: offset } : { strokeDashoffset: GAUGE_C }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className={`${scoreColor(rate)} stroke-current`}
        />
      </svg>
      <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums ${scoreColor(rate)}`}>
        {rate}%
      </span>
    </div>
  );
}

export function ComplianceWidget({ className }: ComplianceWidgetProps) {
  const { t } = useTranslation('dashboard');
  const [overview, setOverview] = useState<ComplianceOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getComplianceOverview()
      .then((data) => {
        if (!cancelled) {
          setOverview(data);
          setIsError(false);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsError(true);
          setIsLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [reloadKey]);

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
          <div className="flex animate-pulse items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-3/4 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-3 w-2/3 rounded bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
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
              {t('Failed to load compliance data')}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => { setIsLoading(true); setReloadKey((k) => k + 1); }}
            >
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              {t('Try again')}
            </Button>
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
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-muted-foreground" />
            {t('Compliance')}
          </CardTitle>
          <Button variant="ghost" size="sm" className="shrink-0" asChild>
            <Link to="/compliance">
              {t('Details')}
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gauge + summary */}
        <div className="flex items-center gap-4 sm:gap-5">
          <ComplianceGauge rate={rate} />
          <div className="min-w-0 space-y-1.5">
            <p className="text-sm font-medium text-foreground">
              {t('overall compliance')}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                {overview.compliant} {t('compliant')}
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                {overview.pending} {t('pending')}
              </span>
            </div>
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
      <Badge variant={severityVariant} className="shrink-0 px-1.5 text-[10px]">
        {warning.severity}
      </Badge>
    </div>
  );
}
