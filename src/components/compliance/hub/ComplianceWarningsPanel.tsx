import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  BadgeAlert,
  ChevronDown,
  FileWarning,
  FileX2,
  ListChecks,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { staggerContainer, staggerItem, useReducedMotion } from '@/lib/motion';
import type { ComplianceOverview } from '@/services/supabase';
import { DueChip, ToneChip } from './hub-primitives';
import { daysFromToday } from './compliance-ui';

type Warning = ComplianceOverview['warnings'][number];

const TYPE_ICON: Record<Warning['type'], LucideIcon> = {
  expiring_document: FileWarning,
  expired_document: FileX2,
  missing_document: FileX2,
  incomplete_checklist: ListChecks,
  expired_certificate: BadgeAlert,
};

const SEVERITY_RANK: Record<Warning['severity'], number> = { high: 0, medium: 1, low: 2 };
const COLLAPSED = 5;

export function ComplianceWarningsPanel({ warnings }: { warnings: Warning[] }) {
  const { t } = useTranslation('compliance');
  const locale = useLocale();
  const prefersReduced = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  // Most urgent first: severity, then nearest due date.
  const sorted = useMemo(
    () =>
      [...warnings].sort((a, b) => {
        const s = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
        if (s !== 0) return s;
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        return da - db;
      }),
    [warnings],
  );

  if (sorted.length === 0) return null;

  const high = sorted.filter((w) => w.severity === 'high').length;
  const visible = expanded ? sorted.slice(0, 50) : sorted.slice(0, COLLAPSED);
  const List = prefersReduced ? 'ul' : motion.ul;
  const Row = prefersReduced ? 'li' : motion.li;

  return (
    <Card className="gap-0 overflow-hidden border-warning/40 p-0">
      <div className="flex flex-wrap items-center gap-3 border-b border-warning/20 bg-warning/5 px-4 py-3 sm:px-5">
        <IconTile icon={ShieldAlert} tone="warning" size="sm" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">
            {t('Active Warnings')} <span className="tabular-nums text-muted-foreground">({sorted.length})</span>
          </h2>
          <p className="text-xs text-muted-foreground">{t('Sorted by urgency — resolve the red ones first.')}</p>
        </div>
        {high > 0 && (
          <ToneChip tone="danger" icon={AlertTriangle}>
            {t('{{count}} critical', { count: high })}
          </ToneChip>
        )}
      </div>

      <List
        className="divide-y"
        {...(!prefersReduced && { variants: staggerContainer, initial: 'initial', animate: 'animate' })}
      >
        {visible.map((w, i) => {
          const Icon = TYPE_ICON[w.type] ?? AlertTriangle;
          const isHigh = w.severity === 'high';
          return (
            <Row
              key={`${w.entityId ?? 'w'}-${i}`}
              className="flex min-w-0 items-start gap-3 px-4 py-3 sm:px-5"
              {...(!prefersReduced && { variants: staggerItem })}
            >
              <IconTile icon={Icon} tone={isHigh ? 'danger' : 'warning'} size="sm" className="mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug break-words [overflow-wrap:anywhere]">{w.message}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {w.dueDate && <DueChip days={daysFromToday(w.dueDate)} soonWithin={30} />}
                  {w.dueDate && (
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {formatDate(w.dueDate, locale)}
                    </span>
                  )}
                  {w.entityName && (
                    <span className="min-w-0 max-w-full truncate text-[11px] text-muted-foreground">
                      · {w.entityName}
                    </span>
                  )}
                </div>
              </div>
            </Row>
          );
        })}
      </List>

      {sorted.length > COLLAPSED && (
        <div className="border-t px-2 py-1">
          <Button
            variant="ghost"
            className="min-h-11 w-full gap-1.5 text-sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? t('Show fewer') : t('Show all {{count}} warnings', { count: sorted.length })}
          </Button>
        </div>
      )}
    </Card>
  );
}
