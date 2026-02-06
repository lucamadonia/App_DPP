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
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{tabConfig.find((t) => t.id === activeTab)?.label}</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative w-56">
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
                {/* Countries Table */}
                {activeTab === 'countries' && (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{t('Countries')}</TableHead><TableHead>Code</TableHead><TableHead>{t('Name')}</TableHead><TableHead className="w-[80px]"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {countries.filter((c) => !searchQuery || c.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-2xl">{c.flag}</TableCell>
                          <TableCell><Badge variant="outline">{c.code}</Badge></TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(c)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Categories Table */}
                {activeTab === 'categories' && (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Icon</TableHead><TableHead>{t('Name')}</TableHead><TableHead>Sort</TableHead><TableHead className="w-[80px]"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {categories.filter((c) => !searchQuery || c.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-2xl">{c.icon}</TableCell>
                          <TableCell className="font-medium">{c.name}</TableCell>
                          <TableCell>{c.sort_order}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(c)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* EU Regulations Table */}
                {activeTab === 'regulations_eu' && (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>{t('Name')}</TableHead><TableHead>Category</TableHead><TableHead>{t('Status')}</TableHead><TableHead className="w-[80px]"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {regulations.filter((r) => !searchQuery || r.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell><Badge variant="outline">{r.category}</Badge></TableCell>
                          <TableCell><Badge className={r.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{r.status}</Badge></TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(r)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Pictograms Table */}
                {activeTab === 'pictograms' && (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Symbol</TableHead><TableHead>{t('Name')}</TableHead><TableHead>Category</TableHead><TableHead>Mandatory</TableHead><TableHead className="w-[80px]"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {pictograms.filter((p) => !searchQuery || p.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-2xl">{p.symbol}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                          <TableCell>{p.mandatory ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(p)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* Recycling Codes Table */}
                {activeTab === 'recycling_codes' && (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Code</TableHead><TableHead>Symbol</TableHead><TableHead>{t('Name')}</TableHead><TableHead>Recyclable</TableHead><TableHead className="w-[80px]"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {recyclingCodes.filter((r) => !searchQuery || r.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell><Badge variant="outline">{r.code}</Badge></TableCell>
                          <TableCell className="text-2xl">{r.symbol}</TableCell>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell>{r.recyclable ? <Badge className="bg-emerald-100 text-emerald-700">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(r)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {/* News Table */}
                {activeTab === 'news' && (
                  <Table>
                    <TableHeader><TableRow>
                      <TableHead>Title</TableHead><TableHead>Category</TableHead><TableHead>Priority</TableHead><TableHead>Published</TableHead><TableHead className="w-[80px]"></TableHead>
                    </TableRow></TableHeader>
                    <TableBody>
                      {news.filter((n) => !searchQuery || n.title?.toLowerCase().includes(searchQuery.toLowerCase())).map((n) => (
                        <TableRow key={n.id}>
                          <TableCell className="font-medium max-w-[300px] truncate">{n.title}</TableCell>
                          <TableCell><Badge variant="outline">{n.category}</Badge></TableCell>
                          <TableCell><Badge className={n.priority === 'high' ? 'bg-red-100 text-red-700' : n.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-muted'}>{n.priority}</Badge></TableCell>
                          <TableCell>{n.publishedAt}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(n)}><Pencil className="h-4 w-4" /></Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(n.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-4 gap-4">
                <div><Label>Icon</Label><Input value={formData.icon || ''} onChange={(e) => updateForm('icon', e.target.value)} /></div>
                <div className="col-span-3"><Label>{t('Name')}</Label><Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} /></div>
              </div>
              <div><Label>Description</Label><Input value={formData.description || ''} onChange={(e) => updateForm('description', e.target.value)} /></div>
              <div><Label>Sort Order</Label><Input type="number" value={formData.sort_order || 0} onChange={(e) => updateForm('sort_order', parseInt(e.target.value))} /></div>
              <div><Label>Regulations (JSON)</Label><Input value={formData.regulations || '[]'} onChange={(e) => updateForm('regulations', e.target.value)} /></div>
            </div>
          )}

          {/* Pictogram Form */}
          {activeTab === 'pictograms' && (
            <div className="grid gap-4">
              <div className="grid grid-cols-4 gap-4">
                <div><Label>Symbol</Label><Input value={formData.symbol || ''} onChange={(e) => updateForm('symbol', e.target.value)} /></div>
                <div className="col-span-3"><Label>{t('Name')}</Label><Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} /></div>
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
              <div className="grid grid-cols-3 gap-4">
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
