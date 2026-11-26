import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft, Save, Loader2, X, Check, Search, Megaphone, CalendarDays, Wallet, Package, ClipboardCheck,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ChoiceCards, FormActions, FormField, FormGrid, FormSectionNav, InputAffix, OptionalDisclosure, type ChoiceOption,
} from '@/components/ui/form-layout';
import { FormWizard, ReviewRow, ReviewSection, WizardReview } from '@/components/ui/form-wizard';
import { cn } from '@/lib/utils';
import { getCampaign, createCampaign, updateCampaign } from '@/services/supabase/wh-campaigns';
import { getProducts } from '@/services/supabase/products';
import type { WhCampaignInput, CampaignStatus } from '@/types/warehouse';

interface ProductOption {
  id: string;
  name: string;
}

export function CampaignFormPage() {
  const { t } = useTranslation('warehouse');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id) && id !== 'new';

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productSearch, setProductSearch] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CampaignStatus>('draft');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [goals, setGoals] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [editSection, setEditSection] = useState('basics');

  // Load products for the picker
  useEffect(() => {
    getProducts().then((data) => {
      setProducts(data.map((p) => ({ id: p.id, name: p.name })));
    });
  }, []);

  // Load campaign data if editing
  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const campaign = await getCampaign(id!);
        if (cancelled || !campaign) {
          if (!cancelled && !campaign) {
            toast.error(t('Campaign not found', { ns: 'common' }));
            navigate('/warehouse/campaigns');
          }
          return;
        }
        setName(campaign.name);
        setDescription(campaign.description || '');
        setStatus(campaign.status);
        setStartDate(campaign.startDate || '');
        setEndDate(campaign.endDate || '');
        setBudget(campaign.budget != null ? String(campaign.budget) : '');
        setCurrency(campaign.currency || 'EUR');
        setGoals(campaign.goals || '');
        setTagsInput(campaign.tags.join(', '));
        setSelectedProductIds(campaign.productIds || []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, isEdit]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('Campaign Name') + ' ' + t('is required', { ns: 'common' }));
      return;
    }

    setSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const input: WhCampaignInput = {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        budget: budget ? Number(budget) : undefined,
        currency,
        goals: goals.trim() || undefined,
        productIds: selectedProductIds,
        tags,
      };

      if (isEdit && id) {
        await updateCampaign(id, input);
        toast.success(t('Campaign updated successfully'));
      } else {
        await createCampaign(input);
        toast.success(t('Campaign created successfully'));
      }
      navigate('/warehouse/campaigns');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((pid) => pid !== productId)
        : [...prev, productId]
    );
  };

  const filteredProducts = productSearch
    ? products.filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ShimmerSkeleton className="h-9 w-9 rounded-md" />
          <ShimmerSkeleton className="h-8 w-48" />
        </div>
        <Card><CardContent className="pt-6 space-y-4">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="space-y-2">
              <ShimmerSkeleton className="h-4 w-24" />
              <ShimmerSkeleton className="h-10 rounded" />
            </div>
          ))}
        </CardContent></Card>
      </div>
    );
  }

  const parsedTags = tagsInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const statusOptions: ChoiceOption<CampaignStatus>[] = [
    { value: 'draft', label: t('draft') },
    { value: 'active', label: t('active') },
    { value: 'completed', label: t('completed') },
    { value: 'cancelled', label: t('cancelled') },
  ];

  const basicsFields = (
    <FormGrid cols={1}>
      <FormField label={t('Campaign Name')} htmlFor="campaign-name" required>
        <Input
          id="campaign-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('Campaign Name')}
        />
      </FormField>
      <FormField label={t('Campaign Description')} htmlFor="campaign-description" optional>
        <Textarea
          id="campaign-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('Campaign Description')}
          rows={3}
        />
      </FormField>
    </FormGrid>
  );

  const timingFields = (
    <FormGrid cols={2}>
      <FormField label={t('Campaign Status')} span="full">
        <ChoiceCards value={status} onValueChange={setStatus} options={statusOptions} columns={4} />
      </FormField>
      <FormField label={t('Start Date')} htmlFor="campaign-start" optional>
        <Input
          id="campaign-start"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </FormField>
      <FormField label={t('End Date')} htmlFor="campaign-end" optional>
        <Input
          id="campaign-end"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </FormField>
    </FormGrid>
  );

  const budgetFields = (
    <div className="space-y-5">
      <FormGrid cols={2}>
        <FormField label={t('Budget')} htmlFor="campaign-budget" optional>
          <InputAffix suffix={currency}>
            <Input
              id="campaign-budget"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              className="tabular-nums"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0.00"
            />
          </InputAffix>
        </FormField>
        <FormField label={t('Currency')}>
          <ChoiceCards
            value={currency}
            onValueChange={setCurrency}
            columns={4}
            options={['EUR', 'USD', 'GBP', 'CHF'].map((c) => ({ value: c, label: c }))}
          />
        </FormField>
      </FormGrid>
      <OptionalDisclosure
        description={[t('Goals'), t('Tags')].join(', ')}
        filledCount={(goals.trim() ? 1 : 0) + (parsedTags.length > 0 ? 1 : 0)}
        defaultOpen={isEdit && Boolean(goals.trim() || parsedTags.length)}
      >
        <FormField label={t('Goals')} htmlFor="campaign-goals" optional>
          <Textarea
            id="campaign-goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder={t('Goals')}
            rows={3}
          />
        </FormField>
        <FormField label={t('Tags')} htmlFor="campaign-tags" optional hint={t('Tags (comma-separated)')}>
          <Input
            id="campaign-tags"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder={t('Tags (comma-separated)')}
          />
        </FormField>
        {parsedTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {parsedTags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </OptionalDisclosure>
    </div>
  );

  const productPicker = (
    <div className="space-y-3">
      <InputAffix prefix={<Search className="h-4 w-4" />}>
        <Input
          type="search"
          enterKeyHint="search"
          aria-label={t('Search products...')}
          placeholder={t('Search products...')}
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
        />
      </InputAffix>

      {selectedProductIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label={t('Selected')}>
          {selectedProductIds.map((pid) => {
            const product = products.find((p) => p.id === pid);
            return (
              <button
                key={pid}
                type="button"
                onClick={() => toggleProduct(pid)}
                className="inline-flex min-h-8 items-center gap-1 rounded-full bg-primary/10 py-1 pr-1.5 pl-3 text-xs font-medium text-primary transition-colors duration-150 ease-out hover:bg-primary/15 pointer-coarse:min-h-9"
              >
                <span className="max-w-[12rem] truncate">{product?.name || pid.slice(0, 8)}</span>
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="sr-only">{t('Remove', { ns: 'common' })}</span>
              </button>
            );
          })}
        </div>
      )}

      <div role="listbox" aria-multiselectable="true" aria-label={t('Campaign Products')} className="max-h-64 overflow-y-auto rounded-lg border divide-y">
        {filteredProducts.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            {t('No results found')}
          </p>
        ) : (
          filteredProducts.map((product) => {
            const isSelected = selectedProductIds.includes(product.id);
            return (
              <button
                key={product.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'flex min-h-11 w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors duration-150 ease-out hover:bg-muted/50',
                  isSelected && 'bg-primary/5'
                )}
                onClick={() => toggleProduct(product.id)}
              >
                <span className={cn('truncate', isSelected && 'font-medium text-primary')}>{product.name}</span>
                {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const header = (
    <div className="flex items-center gap-3 sm:gap-4">
      <Button variant="ghost" size="icon" asChild>
        <Link to="/warehouse/campaigns" aria-label={t('Back', { ns: 'common' })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
        {isEdit ? t('Edit Campaign') : t('Create Campaign')}
      </h1>
    </div>
  );

  // ── Create: wizard ────────────────────────────────────────────────
  if (!isEdit) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
        {header}
        <FormWizard
          variant="page"
          onCancel={() => navigate('/warehouse/campaigns')}
          onFinish={handleSave}
          finishing={saving}
          finishLabel={t('Create Campaign')}
          steps={[
            {
              id: 'basics',
              title: t('Campaign Details'),
              shortTitle: t('Details'),
              icon: Megaphone,
              canNext: Boolean(name.trim()),
              content: basicsFields,
            },
            {
              id: 'timing',
              title: t('Timing'),
              shortTitle: t('Timing'),
              icon: CalendarDays,
              content: timingFields,
            },
            {
              id: 'budget',
              title: t('Budget'),
              shortTitle: t('Budget'),
              icon: Wallet,
              content: budgetFields,
            },
            {
              id: 'products',
              title: t('Campaign Products'),
              shortTitle: t('Products'),
              description: t('Pick the products this campaign promotes.'),
              icon: Package,
              content: productPicker,
            },
            {
              id: 'review',
              title: t('Review', { ns: 'common' }),
              shortTitle: t('Review', { ns: 'common' }),
              icon: ClipboardCheck,
              content: (
                <WizardReview>
                  <ReviewSection title={t('Campaign Details')} step="basics">
                    <ReviewRow label={t('Campaign Name')}>{name}</ReviewRow>
                    <ReviewRow label={t('Campaign Description')}>{description}</ReviewRow>
                  </ReviewSection>
                  <ReviewSection title={t('Timing')} step="timing">
                    <ReviewRow label={t('Campaign Status')}>{t(status)}</ReviewRow>
                    <ReviewRow label={t('Start Date')}>{startDate}</ReviewRow>
                    <ReviewRow label={t('End Date')}>{endDate}</ReviewRow>
                  </ReviewSection>
                  <ReviewSection title={t('Budget')} step="budget">
                    <ReviewRow label={t('Budget')}>{budget ? `${budget} ${currency}` : ''}</ReviewRow>
                    <ReviewRow label={t('Tags')}>{parsedTags.join(', ')}</ReviewRow>
                  </ReviewSection>
                  <ReviewSection title={t('Campaign Products')} step="products">
                    <ReviewRow label={t('Selected')}>
                      {selectedProductIds.length > 0 ? selectedProductIds.length : ''}
                    </ReviewRow>
                  </ReviewSection>
                </WizardReview>
              ),
            },
          ]}
        />
      </div>
    );
  }

  // ── Edit: one section at a time ───────────────────────────────────
  return (
    <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
      {header}
      <FormSectionNav
        sections={[
          { id: 'basics', label: t('Campaign Details'), icon: Megaphone },
          { id: 'timing', label: t('Timing'), icon: CalendarDays },
          { id: 'budget', label: t('Budget'), icon: Wallet },
          {
            id: 'products',
            label: t('Campaign Products'),
            icon: Package,
          },
        ]}
        value={editSection}
        onValueChange={setEditSection}
      >
        <div className="rounded-xl border bg-card p-4 shadow-xs sm:p-6">
          {editSection === 'basics' && basicsFields}
          {editSection === 'timing' && timingFields}
          {editSection === 'budget' && budgetFields}
          {editSection === 'products' && productPicker}
        </div>
      </FormSectionNav>
      <FormActions sticky="page">
        <Button variant="ghost" onClick={() => navigate('/warehouse/campaigns')}>
          {t('Cancel', { ns: 'common' })}
        </Button>
        <Button onClick={handleSave} disabled={!name.trim() || saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          {saving
            ? t('Saving...', { ns: 'common' })
            : t('Save', { ns: 'common' })}
        </Button>
      </FormActions>
    </div>
  );
}
