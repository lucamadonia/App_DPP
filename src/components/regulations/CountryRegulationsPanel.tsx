import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, ExternalLink, Gavel, Landmark, PackageSearch, ShieldAlert, X } from 'lucide-react';
import type { Country, NationalRegulation } from '@/types/database';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/state-feedback';
import { Chip, DeadlineChip } from './DeadlineChip';
import { FilterChips } from './FilterChips';

interface CountryRegulationsPanelProps {
  country: Country;
  regulations: NationalRegulation[];
  onClose: () => void;
}

export function CountryRegulationsPanel({ country, regulations, onClose }: CountryRegulationsPanelProps) {
  const { t } = useTranslation('compliance');
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of regulations) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [regulations]);

  const visible = useMemo(
    () =>
      regulations
        .filter((r) => category === 'all' || r.category === category)
        // Mandatory first: that is what a seller entering the market must act on.
        .sort((a, b) => Number(b.mandatory) - Number(a.mandatory) || a.name.localeCompare(b.name)),
    [regulations, category],
  );

  const mandatory = regulations.filter((r) => r.mandatory).length;

  return (
    <section
      aria-labelledby={`country-panel-${country.code}`}
      className="min-w-0 scroll-mt-24 overflow-hidden rounded-2xl border bg-card shadow-sm"
    >
      <header className="relative isolate flex items-start gap-4 border-b bg-gradient-to-br from-primary/10 via-card to-card p-4 sm:p-6">
        <span
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-background text-3xl shadow-sm ring-1 ring-border"
        >
          {country.flag}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={`country-panel-${country.code}`} className="text-lg font-semibold leading-tight break-words sm:text-xl">
            {t('Regulations in {{country}}', { country: country.name })}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('Detailed overview of national requirements')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip tone="primary" icon={Landmark}>{t('{{count}} Regulations', { count: regulations.length })}</Chip>
            <Chip tone="danger" icon={ShieldAlert}>{t('{{count}} mandatory', { count: mandatory })}</Chip>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label={t('Close', { ns: 'common' })}
          className="-mr-2 -mt-2 h-11 w-11 shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </header>

      <div className="space-y-4 p-4 sm:p-6">
        {country.authorities.length > 0 && (
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {t('Authorities')}:
            </span>
            {country.authorities.map((a) => (
              <Chip key={a}>{a}</Chip>
            ))}
          </div>
        )}

        {categories.length > 1 && (
          <FilterChips
            ariaLabel={t('Filter by category')}
            value={category}
            onChange={setCategory}
            options={[
              { value: 'all', label: t('All'), count: regulations.length },
              ...categories.map(([c, n]) => ({ value: c, label: c, count: n })),
            ]}
          />
        )}

        {visible.length === 0 ? (
          <EmptyState
            icon={PackageSearch}
            illustration={false}
            title={t('No national regulations recorded yet')}
            description={t('EU-wide rules still apply. Check the EU Regulations tab.')}
          />
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {visible.map((reg) => (
              <AccordionItem
                key={reg.id}
                value={reg.id}
                className="rounded-xl border bg-background/60 px-4 last:border-b data-[state=open]:border-primary/30 data-[state=open]:bg-card data-[state=open]:shadow-sm"
              >
                <AccordionTrigger className="min-h-11 gap-3 py-3 hover:no-underline">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <p className="font-medium leading-snug break-words">{reg.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Chip tone={reg.mandatory ? 'danger' : 'muted'}>
                        {reg.mandatory ? t('Mandatory') : t('Optional')}
                      </Chip>
                      {reg.category && <Chip>{reg.category}</Chip>}
                      <DeadlineChip value={reg.effectiveDate} />
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  {reg.description && <p className="text-sm leading-relaxed text-muted-foreground">{reg.description}</p>}
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div className="min-w-0 rounded-lg bg-muted/50 p-3">
                      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                        {t('Responsible Authority')}
                      </dt>
                      <dd className="mt-1 text-sm break-words">{reg.authority || '—'}</dd>
                    </div>
                    {reg.penalties && (
                      <div className="min-w-0 rounded-lg bg-destructive/5 p-3 ring-1 ring-inset ring-destructive/15">
                        <dt className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                          <Gavel className="h-3.5 w-3.5" aria-hidden="true" />
                          {t('Penalties')}
                        </dt>
                        <dd className="mt-1 text-sm break-words text-foreground">{reg.penalties}</dd>
                      </div>
                    )}
                  </dl>
                  {reg.products.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{t('Affected Products')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {reg.products.map((p) => (
                          <Chip key={p}>{p}</Chip>
                        ))}
                      </div>
                    </div>
                  )}
                  {reg.link && (
                    <Button asChild variant="outline" size="sm" className="min-h-11 sm:min-h-8">
                      <a href={reg.link} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        {t('Official source')}
                      </a>
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </section>
  );
}
