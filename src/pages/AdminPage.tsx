import { useState, useEffect } from 'react';
import {
  Globe,
  Tag,
  Recycle,
  Bell,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Loader2,
  Building2,
  Users,
  Package,
  Shield,
  Search,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  getCountries,
  getCategories,
  getPictograms,
  getRecyclingCodes,
  getNews,
  getEURegulations,
  createCountry,
  updateCountry,
  deleteCountry,
  createCategory,
  updateCategory,
  deleteCategory,
  createPictogram,
  updatePictogram,
  deletePictogram,
  createRecyclingCode,
  updateRecyclingCode,
  deleteRecyclingCode,
  createNewsItem,
  updateNewsItem,
  deleteNewsItem,
  createEURegulation,
  updateEURegulation,
  deleteEURegulation,
} from '@/services/supabase';
import type {
  Country,
  Category,
  Pictogram,
  RecyclingCode,
  NewsItem,
  EURegulation,
} from '@/types/database';

// NoCode API - only for Tenants & Users (system-wide access across all tenants)
const API_CONFIG = {
  instance: '48395_mfg_ddp',
  baseUrl: 'https://api.nocodebackend.com',
  secretKey: import.meta.env.VITE_NCB_SECRET_KEY || '',
};

async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const separator = endpoint.includes('?') ? '&' : '?';
  const url = `${API_CONFIG.baseUrl}/${endpoint}${separator}Instance=${API_CONFIG.instance}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${API_CONFIG.secretKey}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

async function ncbGetAll<T>(table: string): Promise<T[]> {
  const result = await apiFetch<{ data: T[] } | T[]>(`read/${table}`);
  return Array.isArray(result) ? result : result.data || [];
}

async function ncbCreate<T>(table: string, data: Partial<T>): Promise<{ success: boolean; id?: string }> {
  try {
    const result = await apiFetch<{ id?: string; _id?: string }>(`create/${table}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return { success: true, id: result.id || result._id };
  } catch (error) {
    console.error('Error creating:', error);
    return { success: false };
  }
}

async function ncbUpdate<T>(table: string, id: string, data: Partial<T>): Promise<{ success: boolean }> {
  try {
    await apiFetch(`update/${table}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating:', error);
    return { success: false };
  }
}

async function ncbRemove(table: string, id: string): Promise<{ success: boolean }> {
  try {
    await apiFetch(`delete/${table}/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    console.error('Error deleting:', error);
    return { success: false };
  }
}

// Types only for NoCode API tabs (Tenants & Users)
interface Tenant {
  id: string;
  name: string;
  slug: string;
  address: string;
  country: string;
  eori: string;
  vat: string;
  plan: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  tenant_id: string;
  status: string;
  createdAt: string;
  lastLogin: string;
}

// Helper: safely parse JSON string (for form fields that represent arrays as strings)
function safeParseJSON(value: unknown): unknown {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return value; }
  }
  return value;
}

// Helper: Array/Object as JSON string for form display
function toJSONString(value: unknown): string {
  if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
    return JSON.stringify(value);
  }
  return String(value ?? '');
}

// Admin page component
export function AdminPage() {
  const [activeTab, setActiveTab] = useState('countries');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [countries, setCountries] = useState<Country[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pictograms, setPictograms] = useState<Pictogram[]>([]);
  const [recyclingCodes, setRecyclingCodes] = useState<RecyclingCode[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [regulations, setRegulations] = useState<EURegulation[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<any>({});

  // Load data
  const loadData = async (table: string) => {
    setIsLoading(true);
    try {
      switch (table) {
        case 'countries':
          setCountries(await getCountries());
          break;
        case 'categories':
          setCategories(await getCategories());
          break;
        case 'pictograms':
          setPictograms(await getPictograms());
          break;
        case 'recycling_codes':
          setRecyclingCodes(await getRecyclingCodes());
          break;
        case 'news':
          setNews(await getNews());
          break;
        case 'regulations_eu':
          setRegulations(await getEURegulations());
          break;
        // Tenants & Users: NoCode API (system-wide access)
        case 'tenants':
          setTenants(await ncbGetAll<Tenant>('tenants'));
          break;
        case 'users':
          setUsers(await ncbGetAll<User>('users'));
          break;
      }
    } catch (error) {
      console.error('Error loading:', error);
    }
    setIsLoading(false);
  };

  // Initial load
  useEffect(() => {
    loadData(activeTab);
  }, [activeTab]);

  // Open dialog
  const openCreateDialog = () => {
    setDialogMode('create');
    setEditingItem(null);
    setFormData(getEmptyForm(activeTab));
    setDialogOpen(true);
  };

  const openEditDialog = (item: any) => {
    setDialogMode('edit');
    setEditingItem(item);
    // For master-data tabs: convert arrays/objects to JSON strings for form display
    const isMasterData = ['countries', 'categories', 'pictograms', 'recycling_codes', 'news', 'regulations_eu'].includes(activeTab);
    if (isMasterData) {
      const formItem = { ...item };
      for (const [key, value] of Object.entries(formItem)) {
        if (Array.isArray(value) || (typeof value === 'object' && value !== null && key !== 'id')) {
          formItem[key] = toJSONString(value);
        }
      }
      setFormData(formItem);
    } else {
      setFormData({ ...item });
    }
    setDialogOpen(true);
  };

  // Empty forms
  const getEmptyForm = (table: string) => {
    switch (table) {
      case 'countries':
        return { code: '', name: '', flag: '', regulations: 0, checklists: 0, authorities: '[]', description: '' };
      case 'categories':
        return { name: '', description: '', icon: '', regulations: '[]', sort_order: 0 };
      case 'pictograms':
        return { symbol: '', name: '', description: '', mandatory: false, countries: '["EU"]', category: 'safety', dimensions: '', placement: '' };
      case 'recycling_codes':
        return { code: '', symbol: '', name: '', fullName: '', examples: '', recyclable: true };
      case 'news':
        return { title: '', summary: '', content: '', category: 'update', countries: '["EU"]', publishedAt: new Date().toISOString().split('T')[0], effectiveDate: '', priority: 'medium', tags: '[]' };
      case 'regulations_eu':
        return { name: '', fullName: '', description: '', category: 'environment', status: 'active', effectiveDate: '', applicationDate: '', keyRequirements: '[]', affectedProducts: '[]', dppDeadlines: '{}' };
      case 'tenants':
        return { name: '', slug: '', address: '', country: 'DE', eori: '', vat: '', plan: 'free' };
      case 'users':
        return { email: '', name: '', role: 'user', tenant_id: '', status: 'active', createdAt: new Date().toISOString(), lastLogin: '' };
      default:
        return {};
    }
  };

  // Save
  const handleSave = async () => {
    setIsLoading(true);
    try {
      const isCreate = dialogMode === 'create';
      let result: { success: boolean; error?: string };

      switch (activeTab) {
        case 'countries': {
          const data = {
            ...formData,
            authorities: safeParseJSON(formData.authorities) as string[],
          };
          result = isCreate
            ? await createCountry(data)
            : await updateCountry(editingItem.id, data);
          break;
        }
        case 'categories': {
          const data = {
            ...formData,
            regulations: safeParseJSON(formData.regulations) as string[] | undefined,
          };
          result = isCreate
            ? await createCategory(data)
            : await updateCategory(editingItem.id, data);
          break;
        }
        case 'pictograms': {
          const data = {
            ...formData,
            countries: safeParseJSON(formData.countries) as string[],
          };
          result = isCreate
            ? await createPictogram(data)
            : await updatePictogram(editingItem.id, data);
          break;
        }
        case 'recycling_codes':
          result = isCreate
            ? await createRecyclingCode(formData)
            : await updateRecyclingCode(editingItem.id, formData);
          break;
        case 'news': {
          const data = {
            ...formData,
            countries: safeParseJSON(formData.countries) as string[],
            tags: safeParseJSON(formData.tags) as string[],
          };
          result = isCreate
            ? await createNewsItem(data)
            : await updateNewsItem(editingItem.id, data);
          break;
        }
        case 'regulations_eu': {
          const data = {
            ...formData,
            keyRequirements: safeParseJSON(formData.keyRequirements) as string[],
            affectedProducts: safeParseJSON(formData.affectedProducts) as string[],
            dppDeadlines: safeParseJSON(formData.dppDeadlines) as Record<string, string>,
          };
          result = isCreate
            ? await createEURegulation(data)
            : await updateEURegulation(editingItem.id, data);
          break;
        }
        // Tenants & Users: NoCode API
        case 'tenants':
        case 'users':
          result = isCreate
            ? await ncbCreate(activeTab, formData)
            : await ncbUpdate(activeTab, editingItem.id, formData);
          break;
        default:
          result = { success: false, error: 'Unknown tab' };
      }

      if (!result.success) {
        console.error('Error saving:', result.error);
      }
      await loadData(activeTab);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving:', error);
    }
    setIsLoading(false);
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this?')) return;
    setIsLoading(true);
    try {
      let result: { success: boolean; error?: string };

      switch (activeTab) {
        case 'countries':
          result = await deleteCountry(id);
          break;
        case 'categories':
          result = await deleteCategory(id);
          break;
        case 'pictograms':
          result = await deletePictogram(id);
          break;
        case 'recycling_codes':
          result = await deleteRecyclingCode(id);
          break;
        case 'news':
          result = await deleteNewsItem(id);
          break;
        case 'regulations_eu':
          result = await deleteEURegulation(id);
          break;
        // Tenants & Users: NoCode API
        case 'tenants':
        case 'users':
          result = await ncbRemove(activeTab, id);
          break;
        default:
          result = { success: false, error: 'Unknown tab' };
      }

      if (!result.success) {
        console.error('Error deleting:', result.error);
      }
      await loadData(activeTab);
    } catch (error) {
      console.error('Error deleting:', error);
    }
    setIsLoading(false);
  };

  // Update form fields
  const updateForm = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Tab configuration
  const tabs = [
    { id: 'countries', label: 'Countries', icon: Globe, count: countries.length },
    { id: 'categories', label: 'Categories', icon: Package, count: categories.length },
    { id: 'regulations_eu', label: 'EU Regulations', icon: Shield, count: regulations.length },
    { id: 'pictograms', label: 'Pictograms', icon: Tag, count: pictograms.length },
    { id: 'recycling_codes', label: 'Recycling Codes', icon: Recycle, count: recyclingCodes.length },
    { id: 'news', label: 'News', icon: Bell, count: news.length },
    { id: 'tenants', label: 'Tenants', icon: Building2, count: tenants.length },
    { id: 'users', label: 'Users', icon: Users, count: users.length },
  ];

  // Render functions for tables
  const renderTable = () => {
    switch (activeTab) {
      case 'countries':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Regulations</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countries.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((country) => (
                <TableRow key={country.id}>
                  <TableCell className="text-2xl">{country.flag}</TableCell>
                  <TableCell><Badge variant="outline">{country.code}</Badge></TableCell>
                  <TableCell className="font-medium">{country.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{country.description}</TableCell>
                  <TableCell>{country.regulations}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(country)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(country.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'categories':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Icon</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Sort Order</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="text-2xl">{cat.icon}</TableCell>
                  <TableCell className="font-medium">{cat.name}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{cat.description}</TableCell>
                  <TableCell>{cat.sort_order}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(cat)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(cat.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'pictograms':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Mandatory</TableHead>
                <TableHead>Countries</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pictograms.filter(p => p.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((pic) => (
                <TableRow key={pic.id}>
                  <TableCell className="text-2xl">{pic.symbol}</TableCell>
                  <TableCell className="font-medium">{pic.name}</TableCell>
                  <TableCell><Badge variant="outline">{pic.category}</Badge></TableCell>
                  <TableCell>{pic.mandatory ? <Badge>Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{Array.isArray(pic.countries) ? pic.countries.join(', ') : pic.countries}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(pic)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(pic.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'recycling_codes':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Recyclable</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recyclingCodes.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((rc) => (
                <TableRow key={rc.id}>
                  <TableCell><Badge variant="outline">{rc.code}</Badge></TableCell>
                  <TableCell className="text-2xl">{rc.symbol}</TableCell>
                  <TableCell className="font-medium">{rc.name}</TableCell>
                  <TableCell>{rc.fullName}</TableCell>
                  <TableCell>{rc.recyclable ? <Badge className="bg-success">Yes</Badge> : <Badge variant="secondary">No</Badge>}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(rc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(rc.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'news':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {news.filter(n => n.title?.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-[300px] truncate">{item.title}</TableCell>
                  <TableCell><Badge variant="outline">{item.category}</Badge></TableCell>
                  <TableCell>
                    <Badge className={item.priority === 'high' ? 'bg-destructive' : item.priority === 'medium' ? 'bg-warning' : 'bg-muted'}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.publishedAt}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'regulations_eu':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regulations.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((reg) => (
                <TableRow key={reg.id}>
                  <TableCell className="font-medium">{reg.name}</TableCell>
                  <TableCell><Badge variant="outline">{reg.category}</Badge></TableCell>
                  <TableCell>
                    <Badge className={reg.status === 'active' ? 'bg-success' : 'bg-warning'}>
                      {reg.status === 'active' ? 'Active' : 'Upcoming'}
                    </Badge>
                  </TableCell>
                  <TableCell>{reg.effectiveDate}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(reg)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(reg.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'tenants':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.filter(t => t.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell><Badge variant="outline">{tenant.slug}</Badge></TableCell>
                  <TableCell>{tenant.country}</TableCell>
                  <TableCell>
                    <Badge className={tenant.plan === 'enterprise' ? 'bg-primary' : tenant.plan === 'pro' ? 'bg-success' : 'bg-muted'}>
                      {tenant.plan}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(tenant)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(tenant.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      case 'users':
        return (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.filter(u => u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={user.role === 'admin' ? 'bg-primary' : user.role === 'manager' ? 'bg-success' : 'bg-muted'}>
                      {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : 'User'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={user.status === 'active' ? 'bg-success' : user.status === 'pending' ? 'bg-warning' : 'bg-destructive'}>
                      {user.status === 'active' ? 'Active' : user.status === 'pending' ? 'Pending' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {tenants.find(t => t.id === user.tenant_id)?.name || '-'}
                  </TableCell>
                  <TableCell>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('en-US') : '-'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        );

      default:
        return null;
    }
  };

  // Render function for dialog forms
  const renderForm = () => {
    switch (activeTab) {
      case 'countries':
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country Code</Label>
                <Input value={formData.code || ''} onChange={(e) => updateForm('code', e.target.value)} placeholder="DE" />
              </div>
              <div>
                <Label>Flag (Emoji)</Label>
                <Input value={formData.flag || ''} onChange={(e) => updateForm('flag', e.target.value)} placeholder="🇩🇪" />
              </div>
            </div>
            <div>
              <Label>Name</Label>
              <Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} placeholder="Germany" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={formData.description || ''} onChange={(e) => updateForm('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Number of Regulations</Label>
                <Input type="number" value={formData.regulations || 0} onChange={(e) => updateForm('regulations', parseInt(e.target.value))} />
              </div>
              <div>
                <Label>Number of Checklists</Label>
                <Input type="number" value={formData.checklists || 0} onChange={(e) => updateForm('checklists', parseInt(e.target.value))} />
              </div>
            </div>
            <div>
              <Label>Authorities (JSON Array)</Label>
              <Input value={formData.authorities || '[]'} onChange={(e) => updateForm('authorities', e.target.value)} placeholder='["BAuA", "UBA"]' />
            </div>
          </div>
        );

      case 'categories':
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Icon (Emoji)</Label>
                <Input value={formData.icon || ''} onChange={(e) => updateForm('icon', e.target.value)} placeholder="💻" />
              </div>
              <div className="col-span-3">
                <Label>Name</Label>
                <Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} placeholder="Electronics" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={formData.description || ''} onChange={(e) => updateForm('description', e.target.value)} />
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input type="number" value={formData.sort_order || 0} onChange={(e) => updateForm('sort_order', parseInt(e.target.value))} />
            </div>
            <div>
              <Label>Regulations (JSON Array)</Label>
              <Input value={formData.regulations || '[]'} onChange={(e) => updateForm('regulations', e.target.value)} placeholder='["WEEE", "RoHS"]' />
            </div>
          </div>
        );

      case 'pictograms':
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label>Symbol</Label>
                <Input value={formData.symbol || ''} onChange={(e) => updateForm('symbol', e.target.value)} placeholder="CE" />
              </div>
              <div className="col-span-3">
                <Label>Name</Label>
                <Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={formData.description || ''} onChange={(e) => updateForm('description', e.target.value)} />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Dimensions</Label>
                <Input value={formData.dimensions || ''} onChange={(e) => updateForm('dimensions', e.target.value)} placeholder="Min. 5mm" />
              </div>
              <div>
                <Label>Placement</Label>
                <Input value={formData.placement || ''} onChange={(e) => updateForm('placement', e.target.value)} placeholder="On product" />
              </div>
            </div>
            <div>
              <Label>Countries (JSON Array)</Label>
              <Input value={formData.countries || '["EU"]'} onChange={(e) => updateForm('countries', e.target.value)} />
            </div>
          </div>
        );

      case 'recycling_codes':
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Code</Label>
                <Input value={formData.code || ''} onChange={(e) => updateForm('code', e.target.value)} placeholder="1" />
              </div>
              <div>
                <Label>Symbol</Label>
                <Input value={formData.symbol || ''} onChange={(e) => updateForm('symbol', e.target.value)} placeholder="♳" />
              </div>
              <div>
                <Label>Short Name</Label>
                <Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} placeholder="PET" />
              </div>
            </div>
            <div>
              <Label>Full Name</Label>
              <Input value={formData.fullName || ''} onChange={(e) => updateForm('fullName', e.target.value)} placeholder="Polyethylene terephthalate" />
            </div>
            <div>
              <Label>Examples</Label>
              <Input value={formData.examples || ''} onChange={(e) => updateForm('examples', e.target.value)} placeholder="Beverage bottles" />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={formData.recyclable || false} onCheckedChange={(v) => updateForm('recyclable', v)} />
              <Label>Recyclable</Label>
            </div>
          </div>
        );

      case 'news':
        return (
          <div className="grid gap-4">
            <div>
              <Label>Title</Label>
              <Input value={formData.title || ''} onChange={(e) => updateForm('title', e.target.value)} />
            </div>
            <div>
              <Label>Summary</Label>
              <Input value={formData.summary || ''} onChange={(e) => updateForm('summary', e.target.value)} />
            </div>
            <div>
              <Label>Content</Label>
              <Input value={formData.content || ''} onChange={(e) => updateForm('content', e.target.value)} />
            </div>
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
              <div>
                <Label>Published On</Label>
                <Input type="date" value={formData.publishedAt || ''} onChange={(e) => updateForm('publishedAt', e.target.value)} />
              </div>
              <div>
                <Label>Effective Date</Label>
                <Input type="date" value={formData.effectiveDate || ''} onChange={(e) => updateForm('effectiveDate', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Countries (JSON Array)</Label>
              <Input value={formData.countries || '["EU"]'} onChange={(e) => updateForm('countries', e.target.value)} />
            </div>
            <div>
              <Label>Tags (JSON Array)</Label>
              <Input value={formData.tags || '[]'} onChange={(e) => updateForm('tags', e.target.value)} placeholder='["ESPR", "DPP"]' />
            </div>
          </div>
        );

      case 'regulations_eu':
        return (
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Short Name</Label>
                <Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} placeholder="ESPR" />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status || 'active'} onValueChange={(v) => updateForm('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Full Name</Label>
              <Input value={formData.fullName || ''} onChange={(e) => updateForm('fullName', e.target.value)} />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={formData.description || ''} onChange={(e) => updateForm('description', e.target.value)} />
            </div>
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
              <div>
                <Label>Effective Date</Label>
                <Input type="date" value={formData.effectiveDate || ''} onChange={(e) => updateForm('effectiveDate', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Application Date</Label>
              <Input type="date" value={formData.applicationDate || ''} onChange={(e) => updateForm('applicationDate', e.target.value)} />
            </div>
            <div>
              <Label>Requirements (JSON Array)</Label>
              <Input value={formData.keyRequirements || '[]'} onChange={(e) => updateForm('keyRequirements', e.target.value)} />
            </div>
            <div>
              <Label>Affected Products (JSON Array)</Label>
              <Input value={formData.affectedProducts || '[]'} onChange={(e) => updateForm('affectedProducts', e.target.value)} />
            </div>
          </div>
        );

      case 'tenants':
        return (
          <div className="grid gap-4">
            <div>
              <Label>Company Name</Label>
              <Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} />
            </div>
            <div>
              <Label>Slug (URL-friendly)</Label>
              <Input value={formData.slug || ''} onChange={(e) => updateForm('slug', e.target.value)} placeholder="my-company" />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={formData.address || ''} onChange={(e) => updateForm('address', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Country</Label>
                <Input value={formData.country || 'DE'} onChange={(e) => updateForm('country', e.target.value)} />
              </div>
              <div>
                <Label>Plan</Label>
                <Select value={formData.plan || 'free'} onValueChange={(v) => updateForm('plan', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>EORI Number</Label>
                <Input value={formData.eori || ''} onChange={(e) => updateForm('eori', e.target.value)} />
              </div>
              <div>
                <Label>VAT ID</Label>
                <Input value={formData.vat || ''} onChange={(e) => updateForm('vat', e.target.value)} />
              </div>
            </div>
          </div>
        );

      case 'users':
        return (
          <div className="grid gap-4">
            <div>
              <Label>Name</Label>
              <Input value={formData.name || ''} onChange={(e) => updateForm('name', e.target.value)} placeholder="John Doe" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={formData.email || ''} onChange={(e) => updateForm('email', e.target.value)} placeholder="john@example.com" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role</Label>
                <Select value={formData.role || 'user'} onValueChange={(v) => updateForm('role', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status || 'active'} onValueChange={(v) => updateForm('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Tenant</Label>
              <Select value={formData.tenant_id || ''} onValueChange={(v) => updateForm('tenant_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select tenant" /></SelectTrigger>
                <SelectContent>
                  {tenants.map((tenant) => (
                    <SelectItem key={tenant.id} value={tenant.id}>{tenant.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dialogMode === 'create' && (
              <div className="rounded-lg border border-dashed p-4 bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  The user will receive an email with instructions to set up their password.
                </p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const currentTab = tabs.find(t => t.id === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Backend management for all master data
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Card
              key={tab.id}
              className={`cursor-pointer transition-all ${activeTab === tab.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </div>
                <p className="text-2xl font-bold mt-1">{tab.count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentTab && <currentTab.icon className="h-5 w-5" />}
              <CardTitle>{currentTab?.label}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline" size="icon" onClick={() => loadData(activeTab)}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                New
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
            renderTable()
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'create' ? 'Create New' : 'Edit'}: {currentTab?.label}
            </DialogTitle>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
