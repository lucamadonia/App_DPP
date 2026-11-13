import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  AlarmClock,
  Archive,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  History,
  LayoutDashboard,
  FileSpreadsheet,
  Settings2,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/lib/motion';
import type { ComplianceReportStatus } from '@/types/compliance';
import { TONE_SURFACE, TONE_TEXT, type HubTone } from './compliance-ui';

// ---------------------------------------------------------------------------
// ToneChip — compact pill for status / deadline emphasis
// ---------------------------------------------------------------------------
export function ToneChip({
  tone,
  icon: Icon,
  children,
  className,
}: {
  tone: HubTone;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-5',
        TONE_SURFACE[tone],
        className,
      )}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// DueChip — "due in N days" / "due today" / "N days overdue"
// ---------------------------------------------------------------------------
export function DueChip({ days, soonWithin = 14, className }: { days: number; soonWithin?: number; className?: string }) {
  const { t } = useTranslation('compliance');
  if (days < 0) {
    const n = Math.abs(days);
    return (
      <ToneChip tone="danger" icon={AlarmClock} className={className}>
        {n === 1 ? t('1 day overdue') : t('{{count}} days overdue', { count: n })}
      </ToneChip>
    );
  }
  if (days === 0) {
    return <ToneChip tone="danger" icon={AlarmClock} className={className}>{t('Due today')}</ToneChip>;
  }
  return (
    <ToneChip tone={days <= soonWithin ? 'warning' : 'muted'} icon={CalendarClock} className={className}>
      {days === 1 ? t('Due tomorrow') : t('Due in {{count}} days', { count: days })}
    </ToneChip>
  );
}

// ---------------------------------------------------------------------------
// ReportStatusPill — i18n + token based status for EAR/LUCID reports
// ---------------------------------------------------------------------------
const REPORT_STATUS: Record<ComplianceReportStatus, { label: string; tone: HubTone; icon: LucideIcon }> = {
  draft: { label: 'Draft', tone: 'muted', icon: FileText },
  submitted: { label: 'Submitted', tone: 'primary', icon: Clock },
  confirmed: { label: 'Confirmed', tone: 'success', icon: CheckCircle2 },
  rejected: { label: 'Rejected', tone: 'danger', icon: XCircle },
  obsolete: { label: 'Discarded', tone: 'warning', icon: Archive },
};

export function ReportStatusPill({ status, className }: { status: ComplianceReportStatus; className?: string }) {
  const { t } = useTranslation('compliance');
  const m = REPORT_STATUS[status] ?? REPORT_STATUS.draft;
  return (
    <ToneChip tone={m.tone} icon={m.icon} className={className}>
      {t(m.label)}
    </ToneChip>
  );
}

// ---------------------------------------------------------------------------
// ScoreRing — animated radial gauge (0-100)
// ---------------------------------------------------------------------------
export function ScoreRing({
  value,
  tone,
  size = 120,
  stroke = 10,
  children,
  label,
}: {
  value: number;
  tone: HubTone;
  size?: number;
  stroke?: number;
  children?: ReactNode;
  label: string;
}) {
  const prefersReduced = useReducedMotion();
  const clamped = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        {prefersReduced ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className={TONE_TEXT[tone]}
          />
        ) : (
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            stroke="currentColor"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            className={TONE_TEXT[tone]}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComplianceSubnav — pill navigation between the compliance hub pages
// ---------------------------------------------------------------------------
const SUBNAV: Array<{ to: string; label: string; icon: LucideIcon; end?: boolean }> = [
  { to: '/compliance', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/compliance/reports', label: 'Monthly Reports', icon: FileSpreadsheet },
  { to: '/compliance/audit', label: 'Audit Trail', icon: History },
  { to: '/compliance/settings', label: 'Settings', icon: Settings2 },
];

export function ComplianceSubnav({ className }: { className?: string }) {
  const { t } = useTranslation('compliance');
  return (
    <nav
      aria-label={t('Compliance sections')}
      className={cn('-mx-1 mb-4 overflow-x-auto px-1 pb-1 scrollbar-hide sm:mb-6', className)}
    >
      <ul className="flex w-max min-w-full gap-1.5 rounded-2xl border bg-card/60 p-1 shadow-xs backdrop-blur-sm sm:w-fit sm:min-w-0">
        {SUBNAV.map(({ to, label, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t(label)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ---------------------------------------------------------------------------
// SectionHeading — small eyebrow heading used between page sections
// ---------------------------------------------------------------------------
export function SectionHeading({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
