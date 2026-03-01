import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Save, Loader2, X, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/warehouse/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          {isEdit ? t('Edit Campaign') : t('Create Campaign')}
        </h1>
      </div>

      {/* Form */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
        {/* Main fields */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-base">{t('Campaign Details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label>{t('Campaign Name')} *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('Campaign Name')}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>{t('Campaign Description')}</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('Campaign Description')}
                  rows={3}
                />
              </div>

              {/* Status + Dates */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>{t('Campaign Status')}</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{t('draft')}</SelectItem>
                      <SelectItem value="active">{t('active')}</SelectItem>
                      <SelectItem value="completed">{t('completed')}</SelectItem>
                      <SelectItem value="cancelled">{t('cancelled')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('Start Date')}</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('End Date')}</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Budget + Currency */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('Budget')}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Currency')}</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CHF">CHF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Goals */}
              <div className="space-y-2">
                <Label>{t('Goals')}</Label>
                <Textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder={t('Goals')}
                  rows={3}
                />
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label>{t('Tags')}</Label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder={t('Tags (comma-separated)')}
                />
                {tagsInput && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {tagsInput
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Product Picker */}
        <div className="space-y-6">
          <Card className="hover:shadow-md transition-all duration-200">
            <CardHeader>
              <CardTitle className="text-base">
                {t('Campaign Products')}
                {selectedProductIds.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedProductIds.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Product search */}
              <Input
                placeholder={t('Search products...')}
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />

              {/* Selected products */}
              {selectedProductIds.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    {t('Selected')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedProductIds.map((pid) => {
                      const product = products.find((p) => p.id === pid);
                      return (
                        <Badge
                          key={pid}
                          variant="default"
                          className="text-xs cursor-pointer pr-1"
                          onClick={() => toggleProduct(pid)}
                        >
                          {product?.name || pid.slice(0, 8)}
                          <X className="ml-1 h-3 w-3" />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product list */}
              <div className="max-h-64 overflow-y-auto border rounded-md">
                {filteredProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('No results found')}
                  </p>
                ) : (
                  filteredProducts.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id);
                    return (
                      <button
                        key={product.id}
                        type="button"
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors flex items-center justify-between border-b last:border-b-0 ${
                          isSelected ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => toggleProduct(product.id)}
                      >
                        <span className="truncate">{product.name}</span>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="w-full"
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saving
              ? t('Saving...', { ns: 'common' })
              : t('Save', { ns: 'common' })}
          </Button>
        </div>
      </div>
    </div>
  );
}
