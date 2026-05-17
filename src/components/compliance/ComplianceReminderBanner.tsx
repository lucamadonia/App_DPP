import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, FileSpreadsheet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPendingReportStatus } from '@/services/supabase/compliance-reports';
import { getComplianceSettings } from '@/services/supabase/compliance-settings';
import { daysUntilDeadline } from '@/types/compliance';
import { cn } from '@/lib/utils';

const MONTH_NAMES_DE = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];

function formatMonth(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return `${MONTH_NAMES_DE[d.getMonth()]} ${d.getFullYear()}`;
}

interface BannerState {
  show: boolean;
  daysUntil: number;
  earPending: boolean;
  lucidPending: boolean;
  reportMonth: string;
}

/**
 * Banner für das Dashboard: erscheint ab 5 Tagen vor dem 15. wenn EAR
 * und/oder LUCID für den Vormonat noch nicht eingereicht wurden.
 * Click → leitet zur Compliance-Reports-Page.
 */
export function ComplianceReminderBanner() {
  const [state, setState] = useState<BannerState | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [settings, status] = await Promise.all([
        getComplianceSettings(),
        getPendingReportStatus(),
      ]);
      if (cancelled) return;
      const daysUntil = daysUntilDeadline();

      const earActive = settings.ear?.enabled !== false && !!settings.ear?.weeeNumber;
      const lucidActive = settings.lucid?.enabled !== false && !!settings.lucid?.lucidNumber;

      const earPending = earActive &&
        (status.ear.status === 'missing' || status.ear.status === 'draft');
      const lucidPending = lucidActive &&
        (status.lucid.status === 'missing' || status.lucid.status === 'draft');

      // Show only if at least one is pending AND we're within the warning window
      // (≤ 7 days before deadline, or overdue)
      const show = (earPending || lucidPending) && daysUntil <= 7;

      setState({
        show,
        daysUntil,
        earPending,
        lucidPending,
        reportMonth: status.ear.reportMonth,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  if (!state || !state.show || dismissed) return null;

  const overdue = state.daysUntil < 0;
  const due = state.daysUntil === 0;

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4 shadow-sm flex items-start gap-3 transition-all',
        overdue
          ? 'bg-red-50 border-red-400 text-red-900 dark:bg-red-900/30 dark:border-red-700 dark:text-red-100 animate-pulse'
          : due
          ? 'bg-amber-50 border-amber-400 text-amber-900 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-100'
          : 'bg-amber-50/70 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-600 dark:text-amber-100'
      )}
      role="alert"
    >
      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden />
      <div className="flex-1 min-w-0 space-y-1">
        <div className="font-semibold text-sm">
          {overdue
            ? `Compliance-Meldung überfällig (${Math.abs(state.daysUntil)} Tag${Math.abs(state.daysUntil) === 1 ? '' : 'e'})`
            : due
            ? 'Compliance-Meldung heute fällig!'
            : `Compliance-Meldung in ${state.daysUntil} Tag${state.daysUntil === 1 ? '' : 'en'} fällig`
          }
        </div>
        <p className="text-xs leading-relaxed">
          Für <strong>{formatMonth(state.reportMonth)}</strong> {' '}
          {state.earPending && state.lucidPending
            ? <>fehlen noch <strong>EAR</strong> und <strong>LUCID</strong></>
            : state.earPending
            ? <>fehlt noch die <strong>EAR-Meldung</strong></>
            : <>fehlt noch die <strong>LUCID-Meldung</strong></>}.
          Bitte bis zum 15. einreichen.
        </p>
        <div className="flex gap-2 pt-1">
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/compliance/reports">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Berichte öffnen
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 -mr-1 -mt-1"
        onClick={() => setDismissed(true)}
        aria-label="Banner schließen"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
