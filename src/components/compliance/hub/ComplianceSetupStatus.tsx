import { useTranslation } from 'react-i18next';
import { Circle, CircleCheck, Recycle, Zap, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { IconTile, type IconTileTone } from '@/components/ui/icon-tile';
import { cn } from '@/lib/utils';
import type { ComplianceEarSettings, ComplianceLucidSettings } from '@/types/compliance';
import { ToneChip } from './hub-primitives';
import { TONE_FILL } from './compliance-ui';

interface Check {
  label: string;
  done: boolean;
}

function RegisterStatus({
  icon,
  tone,
  title,
  enabled,
  checks,
}: {
  icon: LucideIcon;
  tone: IconTileTone;
  title: string;
  enabled: boolean;
  checks: Check[];
}) {
  const { t } = useTranslation('compliance');
  const done = checks.filter((c) => c.done).length;
  const pct = Math.round((done / checks.length) * 100);
  const ready = enabled && done === checks.length;

  return (
    <Card className="min-w-0 gap-3 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <IconTile icon={icon} tone={tone} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs tabular-nums text-muted-foreground">
            {t('{{done}} of {{total}} set up', { done, total: checks.length })}
          </p>
        </div>
        {!enabled ? (
          <ToneChip tone="muted">{t('Inactive')}</ToneChip>
        ) : ready ? (
          <ToneChip tone="success">{t('Ready')}</ToneChip>
        ) : (
          <ToneChip tone="warning">{t('Incomplete')}</ToneChip>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', ready ? TONE_FILL.success : TONE_FILL.warning)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="grid gap-1">
        {checks.map((c) => (
          <li key={c.label} className="flex min-w-0 items-center gap-2 text-xs">
            {c.done ? (
              <CircleCheck className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className={cn('min-w-0 truncate', c.done ? 'text-foreground' : 'text-muted-foreground')}>{c.label}</span>
            <span className="sr-only">{c.done ? t('done') : t('open')}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Live readiness summary that updates as the user types — before saving. */
export function ComplianceSetupStatus({ ear, lucid }: { ear: ComplianceEarSettings; lucid: ComplianceLucidSettings }) {
  const { t } = useTranslation('compliance');
  return (
    <div className="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
      <RegisterStatus
        icon={Zap}
        tone="primary"
        title="EAR / ElektroG"
        enabled={ear.enabled}
        checks={[
          { label: t('Module active'), done: ear.enabled },
          { label: t('WEEE registration number'), done: ear.weeeNumber.trim().length > 0 },
          { label: t('Brand'), done: ear.stiftungEarBrand.trim().length > 0 },
          { label: t('Reminder recipients'), done: (ear.contactEmails || []).length > 0 },
        ]}
      />
      <RegisterStatus
        icon={Recycle}
        tone="success"
        title="LUCID / VerpackG"
        enabled={lucid.enabled}
        checks={[
          { label: t('Module active'), done: lucid.enabled },
          { label: t('LUCID number'), done: lucid.lucidNumber.trim().length > 0 },
          { label: t('Role'), done: Boolean(lucid.distributorRole) },
          { label: t('Reminder recipients'), done: (lucid.contactEmails || []).length > 0 },
        ]}
      />
    </div>
  );
}
