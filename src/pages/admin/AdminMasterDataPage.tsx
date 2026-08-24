import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe, Tag, Recycle, Bell, Plus, Pencil, Trash2, Save, X,
  Loader2, Package, Shield, Search, RefreshCw, Database,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/adaptive-dialog';
import {
  ResponsiveTable, type ResponsiveTableColumn,
} from '@/components/ui/responsive-table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getCountries, getCategories, getPictograms, getRecyclingCodes,
  getNews, getEURegulations,
  createCountry, updateCountry, deleteCountry,
  createCategory, updateCategory, deleteCategory,
  createPictogram, updatePictogram, deletePictogram,
  createRecyclingCode, updateRecyclingCode, deleteRecyclingCode,
  createNewsItem, updateNewsItem, deleteNewsItem,
  createEURegulation, updateEURegulation, deleteEURegulation,
} from '@/services/supabase';
import type {
  Country, Category, Pictogram, RecyclingCode, NewsItem, EURegulation,
} from '@/types/database';

// Helper: safely parse JSON string
function safeParseJSON(value: unknown): unknown {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

function toJSONString(value: unknown): string {
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return JSON.stringify(value);
  }
  return String(value ?? '');
}

type TabId = 'countries' | 'categories' | 'regulations_eu' | 'pictograms' | 'recycling_codes' | 'news';

export function AdminMasterDataPage() {
  const { t } = useTranslation('admin');
  const [activeTab, setActiveTab] = useState<TabId>('countries');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pictograms, setPictograms] = useState<Pictogram[]>([]);
  const [recyclingCodes, setRecyclingCodes] = useState<RecyclingCode[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [regulations, setRegulations] = useState<EURegulation[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editingItem, setEditingItem] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [formData, setFormData] = useState<any>({});

  const loadData = async (table: TabId) => {
    setIsLoading(true);
    try {
      switch (table) {
        case 'countries': setCountries(await getCountries()); break;
        case 'categories': setCategories(await getCategories()); break;
        case 'pictograms': setPictograms(await getPictograms()); break;
        case 'recycling_codes': setRecyclingCodes(await getRecyclingCodes()); break;
        case 'news': setNews(await getNews()); break;
        case 'regulations_eu': setRegulations(await getEURegulations()); break;
      }
    } catch (error) {
      console.error('Error loading:', error);
    }
    setIsLoading(false);
  };

  useEffect(() => { loadData(activeTab); }, [activeTab]);

  const getEmptyForm = (table: TabId) => {
    switch (table) {
      case 'countries': return { code: '', name: '', flag: '', regulations: 0, checklists: 0, authorities: '[]', description: '' };
      case 'categories': return { name: '', description: '', icon: '', regulations: '[]', sort_order: 0 };
      case 'pictograms': return { symbol: '', name: '', description: '', mandatory: false, countries: '["EU"]', category: 'safety', dimensions: '', placement: '' };
      case 'recycling_codes': return { code: '', symbol: '', name: '', fullName: '', examples: '', recyclable: true };
      case 'news': return { title: '', summary: '', content: '', category: 'update', countries: '["EU"]', publishedAt: new Date().toISOString().split('T')[0], effectiveDate: '', priority: 'medium', tags: '[]' };
      case 'regulations_eu': return { name: '', fullName: '', description: '', category: 'environment', status: 'active', effectiveDate: '', applicationDate: '', keyRequirements: '[]', affectedProducts: '[]', dppDeadlines: '{}' };
      default: return {};
    }
  };

  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingItem(null);
    setFormData(getEmptyForm(activeTab));
    setDialogOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEditDialog = (item: any) => {
    setDialogMode('edit');
    setEditingItem(item);
    const formItem = { ...item };
    for (const [key, value] of Object.entries(formItem)) {
      if (Array.isArray(value) || (typeof value === 'object' && value !== null && key !== 'id')) {
        formItem[key] = toJSONString(value);
      }
    }
    setFormData(formItem);
    setDialogOpen(true);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateForm = (field: string, value: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const isCreate = dialogMode === 'create';
      let result: { success: boolean; error?: string };
      switch (activeTab) {
        case 'countries': {
          const data = { ...formData, authorities: safeParseJSON(formData.authorities) as string[] };
          result = isCreate ? await createCountry(data) : await updateCountry(editingItem.id, data);
          break;
        }
        case 'categories': {
          const data = { ...formData, regulations: safeParseJSON(formData.regulations) as string[] | undefined };
          result = isCreate ? await createCategory(data) : await updateCategory(editingItem.id, data);
          break;
        }
        case 'pictograms': {
          const data = { ...formData, countries: safeParseJSON(formData.countries) as string[] };
          result = isCreate ? await createPictogram(data) : await updatePictogram(editingItem.id, data);
          break;
        }
        case 'recycling_codes':
          result = isCreate ? await createRecyclingCode(formData) : await updateRecyclingCode(editingItem.id, formData);
          break;
        case 'news': {
          const data = { ...formData, countries: safeParseJSON(formData.countries) as string[], tags: safeParseJSON(formData.tags) as string[] };
          result = isCreate ? await createNewsItem(data) : await updateNewsItem(editingItem.id, data);
          break;
        }
        case 'regulations_eu': {
          const data = {
            ...formData,
            keyRequirements: safeParseJSON(formData.keyRequirements) as string[],
            affectedProducts: safeParseJSON(formData.affectedProducts) as string[],
            dppDeadlines: safeParseJSON(formData.dppDeadlines) as Record<string, string>,
          };
          result = isCreate ? await createEURegulation(data) : await updateEURegulation(editingItem.id, data);
          break;
        }
        default:
          result = { success: false, error: 'Unknown tab' };
      }
      if (!result.success) console.error('Error saving:', result.error);
      await loadData(activeTab);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving:', error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('Are you sure?'))) return;
    setIsLoading(true);
    try {
      let result: { success: boolean; error?: string };
      switch (activeTab) {
        case 'countries': result = await deleteCountry(id); break;
        case 'categories': result = await deleteCategory(id); break;
        case 'pictograms': result = await deletePictogram(id); break;
        case 'recycling_codes': result = await deleteRecyclingCode(id); break;
        case 'news': result = await deleteNewsItem(id); break;
        case 'regulations_eu': result = await deleteEURegulation(id); break;
        default: result = { success: false, error: 'Unknown tab' };
      }
      if (!result.success) console.error('Error deleting:', result.error);
      await loadData(activeTab);
    } catch (error) {
      console.error('Error deleting:', error);
    }
    setIsLoading(false);
  };

  const tabConfig = [
    { id: 'countries' as const, label: t('Countries'), icon: Globe, count: countries.length },
    { id: 'categories' as const, label: t('Categories'), icon: Package, count: categories.length },
    { id: 'regulations_eu' as const, label: t('EU Regulations'), icon: Shield, count: regulations.length },
    { id: 'pictograms' as const, label: t('Pictograms'), icon: Tag, count: pictograms.length },
    { id: 'recycling_codes' as const, label: t('Recycling Codes'), icon: Recycle, count: recyclingCodes.length },
    { id: 'news' as const, label: t('News'), icon: Bell, count: news.length },
  ];

  // ── Table columns (shared shape: ResponsiveTable renders cards below md) ──
  const rowActions = (item: { id: string }) => (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" aria-label={t('Edit', { ns: 'common' })} onClick={() => openEditDialog(item)}><Pencil className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" aria-label={t('Delete', { ns: 'common' })} onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  );

  const actionsColumn = <T extends { id: string }>(): ResponsiveTableColumn<T> => ({
    id: 'actions',
    header: '',
    className: 'w-[80px]',
    mobilePriority: 'meta',
    cell: rowActions,
  });

  const matches = (value: string | undefined | null) =>
    !searchQuery || (value ?? '').toLowerCase().includes(searchQuery.toLowerCase());

  const countryColumns: ResponsiveTableColumn<Country>[] = [
    { id: 'flag', header: t('Countries'), cell: (c) => <span className="text-2xl">{c.flag}</span> },
    { id: 'code', header: t('Code'), mobilePriority: 'badge', cell: (c) => <Badge variant="outline">{c.code}</Badge> },
    { id: 'name', header: t('Name'), mobilePriority: 'title', cell: (c) => <span className="font-medium">{c.name}</span> },
    actionsColumn<Country>(),
  ];

  const categoryColumns: ResponsiveTableColumn<Category>[] = [
    { id: 'icon', header: t('Icon'), cell: (c) => <span className="text-2xl">{c.icon}</span> },
    { id: 'name', header: t('Name'), mobilePriority: 'title', cell: (c) => <span className="font-medium">{c.name}</span> },
    { id: 'sort', header: t('Sort Order'), hideBelow: 'md', mobilePriority: 'meta', mobileLabel: t('Sort Order'), cell: (c) => c.sort_order },
    actionsColumn<Category>(),
  ];

  const regulationColumns: ResponsiveTableColumn<EURegulation>[] = [
    { id: 'name', header: t('Name'), mobilePriority: 'title', cell: (r) => <span className="font-medium">{r.name}</span> },
    { id: 'category', header: t('Category', { ns: 'common' }), hideBelow: 'md', mobilePriority: 'subtitle', cell: (r) => <Badge variant="outline">{r.category}</Badge> },
    {
      id: 'status',
      header: t('Status'),
      mobilePriority: 'badge',
      cell: (r) => <Badge className={r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{r.status}</Badge>,
    },
    actionsColumn<EURegulation>(),
  ];

  const pictogramColumns: ResponsiveTableColumn<Pictogram>[] = [
    { id: 'symbol', header: t('Symbol'), cell: (p) => <span className="text-2xl">{p.symbol}</span> },
    { id: 'name', header: t('Name'), mobilePriority: 'title', cell: (p) => <span className="font-medium">{p.name}</span> },
    { id: 'category', header: t('Category', { ns: 'common' }), hideBelow: 'md', mobilePriority: 'subtitle', cell: (p) => <Badge variant="outline">{p.category}</Badge> },
    {
      id: 'mandatory',
      header: t('Mandatory'),
      mobilePriority: 'badge',
      cell: (p) => (p.mandatory ? <Badge>{t('Yes', { ns: 'common' })}</Badge> : <Badge variant="secondary">{t('No', { ns: 'common' })}</Badge>),
    },
    actionsColumn<Pictogram>(),
  ];

  const recyclingColumns: ResponsiveTableColumn<RecyclingCode>[] = [
    { id: 'code', header: t('Code'), cell: (r) => <Badge variant="outline">{r.code}</Badge> },
    { id: 'symbol', header: t('Symbol'), hideBelow: 'md', cell: (r) => <span className="text-2xl">{r.symbol}</span> },
    { id: 'name', header: t('Name'), mobilePriority: 'title', cell: (r) => <span className="font-medium">{r.name}</span> },
    {
      id: 'recyclable',
      header: t('Recyclable'),
      mobilePriority: 'badge',
      cell: (r) => (r.recyclable
        ? <Badge className="bg-emerald-100 text-emerald-700">{t('Yes', { ns: 'common' })}</Badge>
        : <Badge variant="secondary">{t('No', { ns: 'common' })}</Badge>),
    },
    actionsColumn<RecyclingCode>(),
  ];

  const newsColumns: ResponsiveTableColumn<NewsItem>[] = [
    { id: 'title', header: t('Title'), mobilePriority: 'title', className: 'max-w-[300px]', cell: (n) => <span className="font-medium block truncate">{n.title}</span> },
    { id: 'category', header: t('Category', { ns: 'common' }), hideBelow: 'md', mobilePriority: 'subtitle', cell: (n) => <Badge variant="outline">{n.category}</Badge> },
    {
      id: 'priority',
      header: t('Priority', { ns: 'common' }),
      mobilePriority: 'badge',
      cell: (n) => <Badge className={n.priority === 'high' ? 'bg-red-100 text-red-700' : n.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-muted'}>{n.priority}</Badge>,
    },
    { id: 'published', header: t('Published', { ns: 'common' }), hideBelow: 'md', mobilePriority: 'meta', mobileLabel: t('Published', { ns: 'common' }), cell: (n) => n.publishedAt },
    actionsColumn<NewsItem>(),
  ];

  const emptyState = <p className="text-sm text-muted-foreground">{t('No entries found')}</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" /> {t('Master Data')}
        </h1>
        <p className="text-muted-foreground">{t('Manage platform master data')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as TabId); setSearchQuery(''); }}>
        <TabsList className="flex flex-wrap h-auto">
          {tabConfig.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-1">
              <tab.icon className="h-3 w-3" />
              {tab.label}
              <Badge variant="secondary" className="ml-1 h-5 text-xs">{tab.count}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Shared controls */}
        <Card className="mt-4">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base">{tabConfig.find((t) => t.id === activeTab)?.label}</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative flex-1 sm:w-56 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('Search tenants...').replace('tenants', '...')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" size="icon" onClick={() => loadData(activeTab)}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" /> {t('Create', { ns: 'common' })}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {activeTab === 'countries' && (
                  <ResponsiveTable
                    data={countries.filter((c) => matches(c.name))}
                    columns={countryColumns}
                    rowKey={(c) => c.id}
                    emptyState={emptyState}
                  />
                )}

                {activeTab === 'categories' && (
                  <ResponsiveTable
                    data={categories.filter((c) => matches(c.name))}
                    columns={categoryColumns}
                    rowKey={(c) => c.id}
                    mobileCardTitle={(c) => <span>{c.icon} {c.name}</span>}
                    emptyState={emptyState}
                  />
                )}

                {activeTab === 'regulations_eu' && (
                  <ResponsiveTable
                    data={regulations.filter((r) => matches(r.name))}
                    columns={regulationColumns}
                    rowKey={(r) => r.id}
                    emptyState={emptyState}
                  />
                )}

                {activeTab === 'pictograms' && (
                  <ResponsiveTable
                    data={pictograms.filter((p) => matches(p.name))}
                    columns={pictogramColumns}
                    rowKey={(p) => p.id}
                    mobileCardTitle={(p) => <span>{p.symbol} {p.name}</span>}
                    emptyState={emptyState}
                  />
                )}

                {activeTab === 'recycling_codes' && (
                  <ResponsiveTable
                    data={recyclingCodes.filter((r) => matches(r.name))}
                    columns={recyclingColumns}
                    rowKey={(r) => r.id}
                    mobileCardTitle={(r) => <span>{r.symbol} {r.name}</span>}
                    emptyState={emptyState}
                  />
                )}

                {activeTab === 'news' && (
                  <ResponsiveTable
                    data={news.filter((n) => matches(n.title))}
                    columns={newsColumns}
                    rowKey={(n) => n.id}
                    emptyState={emptyState}
                  />
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogMode === 'create' ? 'Create' : 'Edit'}: {tabConfig.find((t) => t.id === activeTab)?.label}</DialogTitle>
          </DialogHeader>

          {/* Country Form */}
          {activeTab === 'countries' && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Code</Label><Input value={formData.code || ''} onChange={(e) => updateForm('code', e.target.value)} placeholder="DE" /></div>
                <div><Label>Flag</Label><Input value={formData.flag || ''} onChange={(e) => updateForm('flag', e.target.value)} placeholder="🇩🇪" /></div>
              </div>
              <div><Label>{t('Name')}</Label><Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} /></div>
              <div><Label>Description</Label><Input value={formData.description || ''} onChange={(e) => updateForm('description', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Regulations</Label><Input type="number" value={formData.regulations || 0} onChange={(e) => updateForm('regulations', parseInt(e.target.value))} /></div>
                <div><Label>Checklists</Label><Input type="number" value={formData.checklists || 0} onChange={(e) => updateForm('checklists', parseInt(e.target.value))} /></div>
              </div>
              <div><Label>Authorities (JSON)</Label><Input value={formData.authorities || '[]'} onChange={(e) => updateForm('authorities', e.target.value)} /></div>
            </div>
          )}

          {/* Category Form */}
          {activeTab === 'categories' && (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div><Label>Icon</Label><Input value={formData.icon || ''} onChange={(e) => updateForm('icon', e.target.value)} /></div>
                <div className="sm:col-span-3"><Label>{t('Name')}</Label><Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} /></div>
              </div>
              <div><Label>Description</Label><Input value={formData.description || ''} onChange={(e) => updateForm('description', e.target.value)} /></div>
              <div><Label>Sort Order</Label><Input type="number" value={formData.sort_order || 0} onChange={(e) => updateForm('sort_order', parseInt(e.target.value))} /></div>
              <div><Label>Regulations (JSON)</Label><Input value={formData.regulations || '[]'} onChange={(e) => updateForm('regulations', e.target.value)} /></div>
            </div>
          )}

          {/* Pictogram Form */}
          {activeTab === 'pictograms' && (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div><Label>Symbol</Label><Input value={formData.symbol || ''} onChange={(e) => updateForm('symbol', e.target.value)} /></div>
                <div className="sm:col-span-3"><Label>{t('Name')}</Label><Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} /></div>
              </div>
              <div><Label>Description</Label><Input value={formData.description || ''} onChange={(e) => updateForm('description', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category || 'safety'} onValueChange={(v) => updateForm('category', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="safety">Safety</SelectItem>
                      <SelectItem value="recycling">Recycling</SelectItem>
                      <SelectItem value="chemicals">Chemicals</SelectItem>
                      <SelectItem value="energy">Energy</SelectItem>
                      <SelectItem value="durability">Durability</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox checked={formData.mandatory || false} onCheckedChange={(v) => updateForm('mandatory', v)} />
                  <Label>Mandatory</Label>
                </div>
              </div>
              <div><Label>Countries (JSON)</Label><Input value={formData.countries || '["EU"]'} onChange={(e) => updateForm('countries', e.target.value)} /></div>
            </div>
          )}

          {/* Recycling Code Form */}
          {activeTab === 'recycling_codes' && (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div><Label>Code</Label><Input value={formData.code || ''} onChange={(e) => updateForm('code', e.target.value)} /></div>
                <div><Label>Symbol</Label><Input value={formData.symbol || ''} onChange={(e) => updateForm('symbol', e.target.value)} /></div>
                <div><Label>{t('Name')}</Label><Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} /></div>
              </div>
              <div><Label>Full Name</Label><Input value={formData.fullName || ''} onChange={(e) => updateForm('fullName', e.target.value)} /></div>
              <div><Label>Examples</Label><Input value={formData.examples || ''} onChange={(e) => updateForm('examples', e.target.value)} /></div>
              <div className="flex items-center gap-2">
                <Checkbox checked={formData.recyclable || false} onCheckedChange={(v) => updateForm('recyclable', v)} />
                <Label>Recyclable</Label>
              </div>
            </div>
          )}

          {/* News Form */}
          {activeTab === 'news' && (
            <div className="grid gap-4">
              <div><Label>Title</Label><Input value={formData.title || ''} onChange={(e) => updateForm('title', e.target.value)} /></div>
              <div><Label>Summary</Label><Input value={formData.summary || ''} onChange={(e) => updateForm('summary', e.target.value)} /></div>
              <div><Label>Content</Label><Input value={formData.content || ''} onChange={(e) => updateForm('content', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category || 'update'} onValueChange={(v) => updateForm('category', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regulation">Regulation</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formData.priority || 'medium'} onValueChange={(v) => updateForm('priority', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Published</Label><Input type="date" value={formData.publishedAt || ''} onChange={(e) => updateForm('publishedAt', e.target.value)} /></div>
                <div><Label>Effective Date</Label><Input type="date" value={formData.effectiveDate || ''} onChange={(e) => updateForm('effectiveDate', e.target.value)} /></div>
              </div>
              <div><Label>Countries (JSON)</Label><Input value={formData.countries || '["EU"]'} onChange={(e) => updateForm('countries', e.target.value)} /></div>
              <div><Label>Tags (JSON)</Label><Input value={formData.tags || '[]'} onChange={(e) => updateForm('tags', e.target.value)} /></div>
            </div>
          )}

          {/* Regulation Form */}
          {activeTab === 'regulations_eu' && (
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Short Name</Label><Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} /></div>
                <div>
                  <Label>{t('Status')}</Label>
                  <Select value={formData.status || 'active'} onValueChange={(v) => updateForm('status', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('Active')}</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Full Name</Label><Input value={formData.fullName || ''} onChange={(e) => updateForm('fullName', e.target.value)} /></div>
              <div><Label>Description</Label><Input value={formData.description || ''} onChange={(e) => updateForm('description', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category</Label>
                  <Select value={formData.category || 'environment'} onValueChange={(v) => updateForm('category', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="environment">Environment</SelectItem>
                      <SelectItem value="chemicals">Chemicals</SelectItem>
                      <SelectItem value="recycling">Recycling</SelectItem>
                      <SelectItem value="safety">Safety</SelectItem>
                      <SelectItem value="energy">Energy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Effective Date</Label><Input type="date" value={formData.effectiveDate || ''} onChange={(e) => updateForm('effectiveDate', e.target.value)} /></div>
              </div>
              <div><Label>Requirements (JSON)</Label><Input value={formData.keyRequirements || '[]'} onChange={(e) => updateForm('keyRequirements', e.target.value)} /></div>
              <div><Label>Affected Products (JSON)</Label><Input value={formData.affectedProducts || '[]'} onChange={(e) => updateForm('affectedProducts', e.target.value)} /></div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" /> {t('Cancel')}
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {t('Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
