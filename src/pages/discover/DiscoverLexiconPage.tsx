import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, Copy, Hash, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { GlassCard } from '@/components/ui/glass-card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { CERTIFICATION_CATEGORIES } from '@/lib/certification-options';
import { REGISTRATION_FIELDS } from '@/lib/registration-fields';

/** Stable i18n key fragment for a certification name. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-|-$/g, '');
}

type LexiconTab = 'certs' | 'numbers';

/**
 * Certificates and registration-number formats, explained.
 *
 * Entirely static and therefore fully offline: both source files are bundled
 * TypeScript with no network or auth behind them.
 *
 * The explanatory copy lives in the `journey` i18n namespace under
 * `discover.lexicon.*` rather than in a new data file, so it stays translatable.
 * A `.name` key exists for every certification because the canonical names in
 * certification-options.ts are German-flavoured (CE-Kennzeichnung, Blauer
 * Engel) and are reused as stored values in product forms — the display name
 * has to be able to differ from the stored one.
 *
 * Deliberately no ui/table: GlassCard lists keep audit-mobile's `raw-table`
 * rule from firing, and read better on a phone anyway.
 */
export function DiscoverLexiconPage() {
  const { t } = useTranslation('journey');
  const [tab, setTab] = useState<LexiconTab>('certs');
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const certGroups = useMemo(() => {
    if (!q) return CERTIFICATION_CATEGORIES;
    return CERTIFICATION_CATEGORIES.map((group) => ({
      ...group,
      options: group.options.filter((o) => o.name.toLowerCase().includes(q)),
    })).filter((group) => group.options.length > 0);
  }, [q]);

  const numbers = useMemo(() => {
    if (!q) return REGISTRATION_FIELDS;
    return REGISTRATION_FIELDS.filter(
      (f) =>
        f.label.toLowerCase().includes(q) ||
        f.tooltip.toLowerCase().includes(q) ||
        f.placeholder.toLowerCase().includes(q)
    );
  }, [q]);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('discover.lexicon.copied'));
    } catch {
      toast.error(t('discover.lexicon.copyFailed'));
    }
  };

  const tabs: Array<{ value: LexiconTab; labelKey: string }> = [
    { value: 'certs', labelKey: 'discover.lexicon.tab.certs' },
    { value: 'numbers', labelKey: 'discover.lexicon.tab.numbers' },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header className="space-y-1.5">
        <h2 className="text-title-lg font-bold tracking-tight">
          {t('discover.tools.lexicon.title')}
        </h2>
        <p className="text-body leading-relaxed text-muted-foreground">
          {t('discover.tools.lexicon.desc')}
        </p>
      </header>

      <div role="tablist" className="flex gap-1.5">
        {tabs.map((x) => (
          <button
            key={x.value}
            type="button"
            role="tab"
            aria-selected={tab === x.value}
            onClick={() => setTab(x.value)}
            className={`touch-target flex-1 rounded-xl px-4 text-caption font-medium transition-colors ${
              tab === x.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {t(x.labelKey)}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('discover.lexicon.search')}
          className="pl-9"
          aria-label={t('discover.lexicon.search')}
        />
      </div>

      {tab === 'certs' ? (
        certGroups.length === 0 ? (
          <p className="py-8 text-center text-body text-muted-foreground">
            {t('discover.lexicon.noResults')}
          </p>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {certGroups.map((group) => (
              <AccordionItem
                key={group.label}
                value={group.label}
                className="rounded-2xl border px-4"
              >
                <AccordionTrigger className="text-body font-semibold">
                  <span className="flex items-center gap-2">
                    <BadgeCheck className="size-4 text-primary" aria-hidden />
                    {group.label}
                    <span className="text-caption font-normal text-muted-foreground">
                      {group.options.length}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-2.5 pb-4">
                  {group.options.map((option) => {
                    const slug = slugify(option.name);
                    return (
                      <GlassCard key={option.name} className="space-y-1.5 p-3.5">
                        <p className="text-body font-medium leading-snug">
                          {t(`discover.lexicon.cert.${slug}.name`, { defaultValue: option.name })}
                        </p>
                        <p className="text-caption leading-relaxed text-muted-foreground">
                          {t(`discover.lexicon.cert.${slug}.what`, {
                            defaultValue: t('discover.lexicon.noDescription'),
                          })}
                        </p>
                      </GlassCard>
                    );
                  })}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )
      ) : numbers.length === 0 ? (
        <p className="py-8 text-center text-body text-muted-foreground">
          {t('discover.lexicon.noResults')}
        </p>
      ) : (
        <div className="space-y-3">
          {numbers.map((field) => {
            const Icon = field.icon;
            return (
              <GlassCard key={field.key} className="space-y-2.5 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/15 to-violet-500/15">
                    <Icon className="size-4 text-primary" aria-hidden />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="text-body font-semibold leading-snug">{field.label}</p>
                    <p className="text-caption leading-relaxed text-muted-foreground">
                      {field.tooltip}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copy(field.placeholder)}
                  className="flex w-full items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-left"
                  aria-label={t('discover.lexicon.copyFormat')}
                >
                  <Hash className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                  <code className="min-w-0 flex-1 truncate font-mono text-caption">
                    {field.placeholder}
                  </code>
                  <Copy className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
