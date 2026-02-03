import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BUILTIN_PICTOGRAMS, BUILTIN_PICTOGRAM_CATEGORIES } from '@/lib/master-label-builtin-pictograms';
import type { BuiltinPictogram, PictogramCategory } from '@/types/master-label-editor';

interface LabelPictogramLibraryProps {
  onInsert: (pictogram: BuiltinPictogram) => void;
}

export function LabelPictogramLibrary({ onInsert }: LabelPictogramLibraryProps) {
  const { t } = useTranslation('products');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<PictogramCategory | 'all'>('all');

  const filtered = BUILTIN_PICTOGRAMS.filter(p => {
    const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || p.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 space-y-3 animate-panel-slide-in">
      <h3 className="text-sm font-medium">{t('ml.pictogram.library')}</h3>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('ml.pictogram.search')}
          className="pl-7 h-8 text-sm"
        />
      </div>

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
        {filtered.map(pictogram => (
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

      {filtered.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          {t('ml.pictogram.noResults')}
        </p>
      )}
    </div>
  );
}
