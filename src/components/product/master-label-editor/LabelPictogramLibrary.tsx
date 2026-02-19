import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Search, Plus, ExternalLink, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BUILTIN_PICTOGRAMS, BUILTIN_PICTOGRAM_CATEGORIES } from '@/lib/master-label-builtin-pictograms';
import { getTenantPictograms } from '@/services/supabase/tenant-pictograms';
import type { BuiltinPictogram, PictogramCategory } from '@/types/master-label-editor';
import type { TenantPictogram } from '@/types/database';

interface LabelPictogramLibraryProps {
  onInsert: (pictogram: BuiltinPictogram) => void;
  onInsertTenant?: (pictogram: TenantPictogram) => void;
}

export function LabelPictogramLibrary({ onInsert, onInsertTenant }: LabelPictogramLibraryProps) {
  const { t } = useTranslation('products');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PictogramCategory | 'all'>('all');
  const [tab, setTab] = useState<'builtin' | 'tenant'>('builtin');

  // Tenant pictograms
  const [tenantPictograms, setTenantPictograms] = useState<TenantPictogram[]>([]);
  const [isLoadingTenant, setIsLoadingTenant] = useState(false);
  const [tenantLoaded, setTenantLoaded] = useState(false);

  // Load tenant pictograms when tab is activated
  useEffect(() => {
    if (tab === 'tenant' && !tenantLoaded) {
      setIsLoadingTenant(true);
      getTenantPictograms()
        .then(pics => {
          setTenantPictograms(pics);
          setTenantLoaded(true);
        })
        .catch(err => console.error('Failed to load tenant pictograms:', err))
        .finally(() => setIsLoadingTenant(false));
    }
  }, [tab, tenantLoaded]);

  // Filtered built-in
  const filteredBuiltin = BUILTIN_PICTOGRAMS.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  // Filtered tenant
  const filteredTenant = tenantPictograms.filter(p => {
    if (!search) return true;
    return p.name.toLowerCase().includes(search.toLowerCase())
      || p.description.toLowerCase().includes(search.toLowerCase())
      || p.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
  });

  return (
    <div className="p-4 space-y-3 animate-panel-slide-in">
      <h3 className="text-sm font-medium">{t('ml.pictogram.library')}</h3>

      {/* Source Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as 'builtin' | 'tenant')}>
        <TabsList className="w-full h-8">
          <TabsTrigger value="builtin" className="text-xs flex-1">
            {t('pictograms.builtIn', 'Built-in')}
          </TabsTrigger>
          <TabsTrigger value="tenant" className="text-xs flex-1">
            {t('pictograms.myPictograms', 'My Pictograms')}
          </TabsTrigger>
        </TabsList>

        {/* Search */}
        <div className="relative mt-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('ml.pictogram.search')}
            className="pl-7 h-8 text-sm"
          />
        </div>

        {/* Built-in tab */}
        <TabsContent value="builtin" className="mt-2 space-y-2">
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={category === 'all' ? 'default' : 'outline'}
              className="cursor-pointer text-[10px]"
              onClick={() => setCategory('all')}
            >
              {t('ml.pictogram.all')}
            </Badge>
            {BUILTIN_PICTOGRAM_CATEGORIES.map(cat => (
              <Badge
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                className="cursor-pointer text-[10px]"
                onClick={() => setCategory(cat)}
              >
                {t(`ml.pictogram.category.${cat}`)}
              </Badge>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-3 gap-2">
            {filteredBuiltin.map(pictogram => (
              <div
                key={pictogram.id}
                className="border rounded-md p-2 flex flex-col items-center gap-1 hover:bg-accent/50 transition-colors group"
              >
                <svg
                  viewBox={pictogram.viewBox}
                  className="w-8 h-8"
                >
                  <path d={pictogram.svgPath} fill="currentColor" />
                </svg>
                <span className="text-[9px] text-center leading-tight text-muted-foreground">
                  {pictogram.name}
                </span>
                {pictogram.mandatory && (
                  <Badge variant="destructive" className="text-[7px] px-1 py-0">
                    {t('ml.pictogram.mandatory')}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onInsert(pictogram)}
                >
                  <Plus className="h-2.5 w-2.5 mr-0.5" />
                  {t('ml.pictogram.add')}
                </Button>
              </div>
            ))}
          </div>

          {filteredBuiltin.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              {t('ml.pictogram.noResults')}
            </p>
          )}
        </TabsContent>

        {/* Tenant pictograms tab */}
        <TabsContent value="tenant" className="mt-2 space-y-2">
          {isLoadingTenant && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoadingTenant && filteredTenant.length === 0 && (
            <div className="text-center py-6 space-y-2">
              <p className="text-xs text-muted-foreground">
                {tenantPictograms.length === 0
                  ? t('pictograms.emptyState.title', 'No pictograms yet')
                  : t('ml.pictogram.noResults')}
              </p>
              <Button variant="outline" size="sm" className="text-xs h-7" asChild>
                <Link to="/pictograms">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {t('pictograms.managePictograms', 'Manage Pictograms')}
                </Link>
              </Button>
            </div>
          )}

          {!isLoadingTenant && filteredTenant.length > 0 && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {filteredTenant.map(pic => (
                  <div
                    key={pic.id}
                    className="border rounded-md p-2 flex flex-col items-center gap-1 hover:bg-accent/50 transition-colors group"
                  >
                    <img
                      src={pic.fileUrl}
                      alt={pic.name}
                      className="w-8 h-8 object-contain"
                      loading="lazy"
                    />
                    <span className="text-[9px] text-center leading-tight text-muted-foreground truncate w-full">
                      {pic.name}
                    </span>
                    {pic.regulationYear && (
                      <Badge variant="secondary" className="text-[7px] px-1 py-0">
                        {pic.regulationYear}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 px-1.5 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => onInsertTenant?.(pic)}
                    >
                      <Plus className="h-2.5 w-2.5 mr-0.5" />
                      {t('ml.pictogram.add')}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Link to management page */}
              <div className="text-center pt-1">
                <Button variant="link" size="sm" className="text-[10px] h-5 text-muted-foreground" asChild>
                  <Link to="/pictograms">
                    <ExternalLink className="h-2.5 w-2.5 mr-1" />
                    {t('pictograms.managePictograms', 'Manage Pictograms')}
                  </Link>
                </Button>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
