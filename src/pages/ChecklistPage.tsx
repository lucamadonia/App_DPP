import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem, useReducedMotion } from '@/lib/motion';
import { ClipboardCheck, Download, Filter, Loader2, Printer, Search, SearchX, X } from 'lucide-react';
import { toast } from 'sonner';
import { getChecklistTemplates } from '@/services/supabase';
import {
  supabaseChecklistStore,
  type ChecklistProgressStore,
  type ChecklistStatus,
} from '@/lib/checklist-progress-store';
import { canPrint } from '@/lib/download-file';
import { getCategoryIcon } from '@/lib/category-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { EmptyState } from '@/components/ui/state-feedback';
import { PageContainer } from '@/components/layout/page-container';
import { KnowledgeHero } from '@/components/knowledge/KnowledgeHero';
import { Chip, ChipRail } from '@/components/knowledge/ChipRail';
import { ChecklistOverview } from '@/components/checklists/ChecklistOverview';
import { ChecklistGroup } from '@/components/checklists/ChecklistGroup';
import {
  COUNTRY_CODES,
  PRODUCT_CATEGORIES,
  STATUS_ORDER,
  type ChecklistItem,
} from '@/components/checklists/checklist-meta';

export interface ChecklistPageProps {
  /**
   * Where ticks are persisted. Defaults to the tenant-scoped Supabase store,
   * i.e. exactly the behaviour that shipped before this prop existed. Guest
   * mode passes a Preferences-backed store instead, because an anonymous
   * visitor has no tenant and `checklist_progress` is RLS-protected.
   */
  store?: ChecklistProgressStore;
}

export function ChecklistPage({ store = supabaseChecklistStore }: ChecklistPageProps = {}) {
  const { t } = useTranslation('compliance');
  const prefersReduced = useReducedMotion();
  const MotionDiv = prefersReduced ? ('div' as const) : motion.div;
  // `/checklists/:country` (linked from the market entry check) preselects
  // the country; anything unknown falls back to Germany.
  const { country: countryParam } = useParams<{ country?: string }>();
  const initialCountry =
    COUNTRY_CODES.find((c) => c.code === countryParam?.toUpperCase())?.code ?? 'DE';
  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const [selectedCategory, setSelectedCategory] = useState('electronics');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Checklist data from Supabase
  const [checklistData, setChecklistData] = useState<Record<string, ChecklistItem[]>>({});

  const key = `${selectedCountry}-${selectedCategory}`;
  const checklist = useMemo(() => checklistData[key] || [], [checklistData, key]);

  const [itemStates, setItemStates] = useState<Record<string, ChecklistItem['status']>>({});

  // Load data from Supabase
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      try {
        const templates = await getChecklistTemplates(selectedCountry, selectedCategory);

        if (templates && templates.length > 0) {
          const items: ChecklistItem[] = templates.map(tpl => ({
            id: tpl.id,
            title: tpl.title,
            description: tpl.description,
            detailedDescription: tpl.detailedDescription || tpl.description,
            mandatory: tpl.mandatory,
            category: tpl.category,
            subcategory: tpl.subcategory,
            documentRequired: tpl.documentRequired,
            documentTypes: tpl.documentTypes,
            checked: false,
            status: 'pending' as const,
            legalBasis: tpl.legalBasis,
            authority: tpl.authority,
            deadline: tpl.deadline,
            penalties: tpl.penalties,
            tips: tpl.tips,
            links: tpl.links,
            applicableProducts: tpl.applicableProducts,
            priority: tpl.priority,
          }));

          setChecklistData(prev => ({
            ...prev,
            [key]: items,
          }));
        }

        // Load progress
        const statesMap = await store.load(selectedCountry, selectedCategory);
        if (Object.keys(statesMap).length > 0) {
          setItemStates(prev => ({ ...prev, ...statesMap }));
        }
      } catch (error) {
        console.error('Error loading checklist data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedCountry, selectedCategory, key, store]);

  const getItemStatus = (item: ChecklistItem) => itemStates[item.id] || item.status;

  const toggleItemStatus = async (id: string, currentStatus: ChecklistItem['status']) => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    const nextStatus = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];

    // Optimistic update
    setItemStates(prev => ({ ...prev, [id]: nextStatus }));

    setIsSaving(true);
    try {
      await store.set(selectedCountry, selectedCategory, id, nextStatus as ChecklistStatus);
    } catch (error) {
      console.error('Error saving progress:', error);
      // Revert status on error
      setItemStates(prev => ({ ...prev, [id]: currentStatus }));
    } finally {
      setIsSaving(false);
    }
  };

  const query = searchQuery.toLowerCase();
  const filteredChecklist = checklist.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(query) ||
                         item.description.toLowerCase().includes(query);
    const matchesIncomplete = !showOnlyIncomplete || getItemStatus(item) !== 'completed';
    return matchesSearch && matchesIncomplete;
  });

  const categories = [...new Set(checklist.map(i => i.category))];

  const mandatoryItems = checklist.filter(i => i.mandatory);
  const completedMandatory = mandatoryItems.filter(i => getItemStatus(i) === 'completed');
  const completedAll = checklist.filter(i => getItemStatus(i) === 'completed').length;
  const progress = mandatoryItems.length > 0 ? Math.round((completedMandatory.length / mandatoryItems.length) * 100) : 0;

  const criticalItems = checklist.filter(i => i.priority === 'critical' && getItemStatus(i) !== 'completed');

  const countryOptions = COUNTRY_CODES.map(c => ({ code: c.code, flag: c.flag, name: t(c.nameKey) }));
  const categoryOptions = PRODUCT_CATEGORIES.map(c => ({ id: c.id, name: t(c.nameKey) }));
  const country = countryOptions.find(c => c.code === selectedCountry);
  const category = categoryOptions.find(c => c.id === selectedCategory);

  const handlePrint = () => {
    setIsPrinting(true);
    document.body.classList.add('print-checklist');
    // Give the browser a frame to apply the print-only styles before
    // opening the (blocking) print dialog.
    window.requestAnimationFrame(() => {
      try {
        window.print();
      } finally {
        document.body.classList.remove('print-checklist');
        setIsPrinting(false);
      }
    });
  };

  const handleExportPDF = async () => {
    if (checklist.length === 0 || isExporting) return;
    setIsExporting(true);
    try {
      // Lazy import keeps @react-pdf/renderer out of the initial bundle
      const { generateChecklistPDF } = await import('@/components/compliance/ChecklistPDF');

      await generateChecklistPDF({
        countryCode: selectedCountry,
        categoryKey: selectedCategory,
        countryName: country?.name ?? selectedCountry,
        categoryName: category?.name ?? selectedCategory,
        progressPercent: progress,
        items: checklist.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          mandatory: item.mandatory,
          priority: item.priority,
          status: getItemStatus(item),
          legalBasis: item.legalBasis,
          authority: item.authority,
          deadline: item.deadline,
        })),
        labels: {
          title: t('Compliance Checklist'),
          progress: t('Compliance Progress'),
          progressSummary: t('{{completed}} of {{total}} mandatory items completed', {
            completed: completedMandatory.length,
            total: mandatoryItems.length,
          }),
          generated: t('Generated'),
          required: t('Required'),
          legalBasis: t('Legal Basis'),
          authority: t('Responsible Authority'),
          deadline: t('Deadline'),
          priorities: {
            critical: t('Critical'),
            high: t('High'),
            medium: t('Medium'),
            low: t('Low'),
          },
          statuses: {
            pending: t('Pending'),
            in_progress: t('In Progress'),
            completed: t('Completed'),
            not_applicable: t('Not Applicable'),
          },
        },
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error(t('PDF export failed'));
    } finally {
      setIsExporting(false);
    }
  };

  const hasData = !isLoading && checklist.length > 0;
  const visibleGroups = categories
    .map(cat => ({ cat, items: filteredChecklist.filter(i => i.category === cat) }))
    .filter(g => g.items.length > 0);

  return (
    <TooltipProvider>
      <PageContainer size="full" padding={false} className="checklist-print-area">
        <div className="space-y-5 sm:space-y-6">
          <KnowledgeHero
            icon={ClipboardCheck}
            eyebrow={t('Compliance & Knowledge')}
            title={t('Compliance Checklist')}
            description={t('Comprehensive, interactive checklist for country-specific requirements')}
            actions={
              // `checklist-print-hide` keeps the buttons off the printout.
              <>
                {/* window.print() resolves to nothing inside a WebView, so on
                    native this button would silently do nothing at all. Hiding it
                    is honest; the PDF export next to it does the same job. */}
                {canPrint() && (
                  <Button
                    variant="outline"
                    className="checklist-print-hide"
                    onClick={handlePrint}
                    disabled={isPrinting || checklist.length === 0}
                  >
                    {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                    {t('Print', { ns: 'common' })}
                  </Button>
                )}
                <Button
                  className="checklist-print-hide"
                  onClick={handleExportPDF}
                  disabled={isExporting || checklist.length === 0}
                >
                  {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {isExporting ? t('Generating PDF...') : t('PDF Export')}
                </Button>
              </>
            }
          >
            <div className="checklist-print-hide space-y-3">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">{t('Select Country')}</p>
                <ChipRail label={t('Select Country')}>
                  {countryOptions.map(c => (
                    <Chip
                      key={c.code}
                      selected={selectedCountry === c.code}
                      onClick={() => setSelectedCountry(c.code)}
                      icon={<span className="text-base leading-none" aria-hidden="true">{c.flag}</span>}
                    >
                      {c.name}
                    </Chip>
                  ))}
                </ChipRail>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">{t('Product Category')}</p>
                <ChipRail label={t('Product Category')}>
                  {categoryOptions.map(cat => {
                    const CategoryIcon = getCategoryIcon(cat.id);
                    return (
                      <Chip
                        key={cat.id}
                        selected={selectedCategory === cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        icon={<CategoryIcon className="h-4 w-4" aria-hidden="true" />}
                      >
                        {cat.name}
                      </Chip>
                    );
                  })}
                </ChipRail>
              </div>
            </div>
          </KnowledgeHero>

          {isLoading ? (
            <div className="space-y-4" aria-busy="true">
              <div className="grid gap-4 lg:grid-cols-2">
                <ShimmerSkeleton className="h-40 rounded-2xl" />
                <ShimmerSkeleton className="h-40 rounded-2xl" />
              </div>
              <ShimmerSkeleton className="h-11 rounded-xl" />
              {Array.from({ length: 3 }, (_, i) => (
                <ShimmerSkeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : checklist.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card">
              <EmptyState
                icon={SearchX}
                title={t('No checklist available')}
                description={t('No detailed checklist is available yet for this country/category combination.')}
              />
            </div>
          ) : (
            <>
              <ChecklistOverview
                progress={progress}
                completedMandatory={completedMandatory.length}
                totalMandatory={mandatoryItems.length}
                totalItems={checklist.length}
                completedItems={completedAll}
                criticalOpen={criticalItems}
                countryLabel={`${country?.flag ?? ''} ${country?.name ?? selectedCountry}`.trim()}
                categoryLabel={category?.name ?? selectedCategory}
              />

              {/* Filter bar */}
              <div className="checklist-print-hide flex flex-col gap-2 xs:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('Search checklist...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-11 pl-9 pr-10 sm:h-10"
                    aria-label={t('Search checklist...')}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-0.5 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                      aria-label={t('Clear search')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button
                  variant={showOnlyIncomplete ? 'default' : 'outline'}
                  onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
                  aria-pressed={showOnlyIncomplete}
                  className="h-11 sm:h-10"
                >
                  <Filter className="h-4 w-4" />
                  {t('Open items only')}
                </Button>
              </div>

              {visibleGroups.length === 0 ? (
                <div className="rounded-2xl border border-dashed bg-card">
                  <EmptyState
                    icon={Search}
                    illustration={false}
                    title={t('No matching items')}
                    description={t('Try adjusting your filters')}
                    actionLabel={t('Reset filters')}
                    onAction={() => {
                      setSearchQuery('');
                      setShowOnlyIncomplete(false);
                    }}
                  />
                </div>
              ) : (
                <MotionDiv
                  key={key}
                  className="space-y-3 sm:space-y-4"
                  {...(!prefersReduced && { variants: staggerContainer, initial: 'initial', animate: 'animate' })}
                >
                  {visibleGroups.map(({ cat, items }) => (
                    <MotionDiv
                      key={cat}
                      className="checklist-print-group"
                      {...(!prefersReduced && { variants: staggerItem })}
                    >
                      <ChecklistGroup
                        category={cat}
                        items={items}
                        getStatus={getItemStatus}
                        onCycleStatus={(item) => toggleItemStatus(item.id, getItemStatus(item))}
                      />
                    </MotionDiv>
                  ))}
                </MotionDiv>
              )}

              {hasData && (
                <p className="checklist-print-hide text-center text-xs text-muted-foreground">
                  {t('Tap the status icon to cycle: pending → in progress → completed → not applicable')}
                </p>
              )}
            </>
          )}
        </div>
      </PageContainer>
    </TooltipProvider>
  );
}
