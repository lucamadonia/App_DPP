import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BatteryCharging,
  Building2,
  ClipboardList,
  Clock,
  FileText,
  ListChecks,
  RefreshCw,
  ShieldAlert,
  Tag,
  Target,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { IconTile, MonogramTile } from '@/components/ui/icon-tile';
import { KPIGrid, type KPIItem } from '@/components/ui/kpi-grid';
import { ResponsiveTable, type ResponsiveTableColumn } from '@/components/ui/responsive-table';
import { EmptyState } from '@/components/ui/state-feedback';
import type { Requirement } from '@/data/requirements-database';
import type { Country } from '@/data/calculator-options';
import { PriorityBadge } from '@/components/knowledge/PriorityBadge';
import { RequirementItem } from './RequirementItem';

/** One row of the "All Required Documents" summary table. */
interface DocumentChecklistRow {
  id: string;
  doc: string;
  requirement: string;
  priority: Requirement['priority'];
}

/**
 * Icon for a required marking. Matched on substrings because the symbol
 * strings are free-form label text from the requirements dataset
 * ("WEEE-Symbol (durchgestrichene Mülltonne)"), not stable identifiers.
 * CE is handled at the call site — it renders as lettering, not an icon.
 */
function getSymbolIcon(symbol: string): LucideIcon {
  if (symbol.includes('WEEE')) return Trash2;
  if (symbol.includes('Triman')) return RefreshCw;
  if (symbol.includes('Batterie') || symbol.includes('Battery')) return BatteryCharging;
  return ClipboardList;
}

function ResultSection({
  icon,
  tone = 'primary',
  title,
  count,
  children,
}: {
  icon: LucideIcon;
  tone?: 'primary' | 'danger';
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <section
      className={
        tone === 'danger'
          ? 'rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-3 sm:p-5'
          : 'rounded-2xl border bg-card p-3 shadow-sm sm:p-5'
      }
    >
      <header className="mb-3 flex items-center gap-3 px-1 sm:mb-4 sm:px-0">
        <IconTile icon={icon} size="md" tone={tone} />
        <h2 className={tone === 'danger' ? 'min-w-0 flex-1 font-semibold leading-snug text-destructive' : 'min-w-0 flex-1 font-semibold leading-snug'}>
          {title}
        </h2>
        {count !== undefined && (
          <Badge variant="secondary" className="shrink-0 tabular-nums">
            {count}
          </Badge>
        )}
      </header>
      {children}
    </section>
  );
}

interface CalculatorResultsProps {
  requirements: Requirement[];
  productLabel: string;
  subcategory: string;
  selectedCountries: string[];
  countries: Country[];
  properties: string[];
  renderAI: (req: Requirement) => ReactNode;
  /** AI assessment blocks — rendered between sections when AI is available. */
  aiOverall?: ReactNode;
  aiAdditional?: ReactNode;
  aiActionPlan?: ReactNode;
  aiChat?: ReactNode;
}

export function CalculatorResults({
  requirements,
  productLabel,
  subcategory,
  selectedCountries,
  countries,
  properties,
  renderAI,
  aiOverall,
  aiAdditional,
  aiActionPlan,
  aiChat,
}: CalculatorResultsProps) {
  const { t } = useTranslation('compliance');

  const critical = requirements.filter((r) => r.priority === 'critical');
  const high = requirements.filter((r) => r.priority === 'high');
  const other = requirements.filter((r) => r.priority !== 'critical' && r.priority !== 'high');
  const docCount = requirements.reduce((acc, r) => acc + r.documents.length, 0);
  const regCount = requirements.reduce((acc, r) => acc + r.registrations.length, 0);
  const symbols = [...new Set(requirements.flatMap((r) => r.symbols))];

  const kpis: KPIItem[] = [
    {
      id: 'critical',
      label: t('Critical Requirements'),
      value: <AnimatedCounter value={critical.length} />,
      icon: <IconTile icon={AlertTriangle} size="sm" tone="danger" />,
      accentClassName: critical.length > 0 ? 'text-destructive' : undefined,
    },
    {
      id: 'high',
      label: t('High Priority'),
      value: <AnimatedCounter value={high.length} />,
      icon: <IconTile icon={Clock} size="sm" tone="warning" />,
    },
    {
      id: 'docs',
      label: t('Documents Required'),
      value: <AnimatedCounter value={docCount} />,
      icon: <IconTile icon={FileText} size="sm" />,
    },
    {
      id: 'regs',
      label: t('Registrations'),
      value: <AnimatedCounter value={regCount} />,
      icon: <IconTile icon={Building2} size="sm" tone="success" />,
    },
  ];

  const documentColumns: ResponsiveTableColumn<DocumentChecklistRow>[] = [
    { id: 'doc', header: t('Document'), className: 'font-medium', mobilePriority: 'title', cell: (item) => item.doc },
    { id: 'requirement', header: t('Requirement'), mobilePriority: 'subtitle', cell: (item) => item.requirement },
    {
      id: 'priority',
      header: t('Priority'),
      mobilePriority: 'badge',
      cell: (item) => <PriorityBadge priority={item.priority} />,
    },
  ];
  const documentRows = requirements.flatMap((req) =>
    req.documents.map((doc, idx) => ({ id: `${req.id}-${idx}`, doc, requirement: req.name, priority: req.priority }))
  );

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Summary */}
      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <IconTile icon={Target} size="md" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{t('Product Summary')}</p>
            <p className="font-semibold leading-snug break-words">
              {productLabel}
              {subcategory && <span className="text-muted-foreground"> · {subcategory}</span>}
            </p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('Target Markets')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedCountries.map((code) => {
                const country = countries.find((c) => c.code === code);
                return (
                  <Badge key={code} variant="outline" className="h-7 gap-1.5 text-xs">
                    <span aria-hidden="true">{country?.flag}</span>
                    {country?.name ?? code}
                  </Badge>
                );
              })}
            </div>
          </div>
          <div className="min-w-0">
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('Properties')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {properties.length === 0 ? (
                <span className="text-sm text-muted-foreground">—</span>
              ) : (
                properties.map((p) => (
                  <Badge key={p} variant="secondary" className="h-7 text-xs">
                    {p}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <KPIGrid items={kpis} cols={{ base: 2, lg: 4 }} />

      {aiOverall}

      {requirements.length === 0 && (
        <div className="rounded-2xl border border-dashed bg-card">
          <EmptyState icon={ListChecks} illustration={false} title={t('No requirements found')} />
        </div>
      )}

      {critical.length > 0 && (
        <ResultSection
          icon={ShieldAlert}
          tone="danger"
          title={t('Critical Requirements (Mandatory before placing on market)')}
          count={critical.length}
        >
          <Accordion type="multiple" className="space-y-2">
            {critical.map((req) => (
              <RequirementItem key={req.id} req={req} aiSlot={renderAI(req)} />
            ))}
          </Accordion>
        </ResultSection>
      )}

      {high.length + other.length > 0 && (
        <ResultSection icon={ListChecks} title={t('Additional Requirements')} count={high.length + other.length}>
          <Accordion type="multiple" className="space-y-2">
            {[...high, ...other].map((req) => (
              <RequirementItem key={req.id} req={req} aiSlot={renderAI(req)} />
            ))}
          </Accordion>
        </ResultSection>
      )}

      {aiAdditional}
      {aiActionPlan}

      {documentRows.length > 0 && (
        <ResultSection icon={FileText} title={t('Summary: All Required Documents')} count={documentRows.length}>
          <ResponsiveTable data={documentRows} columns={documentColumns} rowKey={(item) => item.id} />
        </ResultSection>
      )}

      {symbols.length > 0 && (
        <ResultSection icon={Tag} title={t('Required Symbols and Markings')} count={symbols.length}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,15rem),1fr))] gap-3">
            {symbols.map((symbol) => (
              <div key={symbol} className="flex min-w-0 items-center gap-3 rounded-xl border bg-card p-3">
                {/* CE stays lettering — the marking itself *is* the two
                    letters, so an icon would misrepresent it. */}
                {symbol.includes('CE') ? (
                  <MonogramTile text="CE" size="lg" />
                ) : (
                  <IconTile icon={getSymbolIcon(symbol)} size="lg" />
                )}
                <div className="min-w-0">
                  <p className="font-medium leading-snug break-words">{symbol}</p>
                  <p className="text-xs text-muted-foreground">{t('On product/packaging')}</p>
                </div>
              </div>
            ))}
          </div>
        </ResultSection>
      )}

      {aiChat}
    </div>
  );
}
