import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Shield, User, Search, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { MasterLabelTemplate, MasterLabelTemplateCategory } from '@/types/master-label-editor';
import { DEFAULT_MASTER_LABEL_TEMPLATES } from '@/lib/master-label-defaults';

interface LabelTemplateGalleryProps {
  customTemplates: MasterLabelTemplate[];
  onSelect: (template: MasterLabelTemplate) => void;
  onNewBlank: () => void;
  onDelete: (templateId: string) => void;
}

const CATEGORY_TABS: Array<{ value: MasterLabelTemplateCategory | 'all'; labelKey: string }> = [
  { value: 'all', labelKey: 'ml.template.all' },
  { value: 'electronics', labelKey: 'ml.group.electronics' },
  { value: 'textiles', labelKey: 'ml.group.textiles' },
  { value: 'toys', labelKey: 'ml.group.toys' },
  { value: 'household', labelKey: 'ml.group.household' },
  { value: 'custom', labelKey: 'ml.template.custom' },
];

export function LabelTemplateGallery({ customTemplates, onSelect, onNewBlank, onDelete }: LabelTemplateGalleryProps) {
  const { t } = useTranslation('products');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<MasterLabelTemplateCategory | 'all'>('all');

  const allTemplates = [...DEFAULT_MASTER_LABEL_TEMPLATES, ...customTemplates];

  const filtered = allTemplates.filter(tpl => {
    const matchesSearch = !search || tpl.name.toLowerCase().includes(search.toLowerCase()) || tpl.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || tpl.category === category || (category === 'custom' && !tpl.isDefault);
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t('ml.template.gallery')}</h2>
          <p className="text-sm text-muted-foreground">{t('ml.template.galleryDescription')}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('ml.template.search')}
            className="pl-8"
          />
        </div>
        <div className="flex gap-1">
          {CATEGORY_TABS.map(tab => (
            <Badge
              key={tab.value}
              variant={category === tab.value ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setCategory(tab.value)}
            >
              {t(tab.labelKey)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* New Blank card */}
        <button
          onClick={onNewBlank}
          className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:border-primary/40 hover:bg-accent/30 transition-all min-h-[200px]"
        >
          <Plus className="h-8 w-8 text-muted-foreground/50" />
          <span className="text-sm font-medium text-muted-foreground">{t('ml.template.newBlank')}</span>
        </button>

        {/* Template cards */}
        {filtered.map(template => (
          <div
            key={template.id}
            className="border rounded-lg overflow-hidden hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
            onClick={() => onSelect(template)}
          >
            {/* Mini preview */}
            <div className="h-[140px] bg-gray-50 flex items-center justify-center p-3 relative">
              <div className="w-[70px] h-[99px] bg-white border border-gray-200 rounded shadow-sm overflow-hidden flex flex-col p-1.5" style={{ fontSize: '3px', lineHeight: 1.2 }}>
                <div className="text-[3px] font-bold text-gray-400 uppercase mb-0.5">Identity</div>
                <div className="text-[4px] font-bold mb-0.5 truncate">{t('ml.template.productName')}</div>
                <div className="h-px bg-gray-200 my-0.5" />
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-[14px] h-[14px] border border-gray-300 bg-gray-100" />
                </div>
                <div className="h-px bg-gray-200 my-0.5" />
                <div className="flex gap-0.5">
                  {template.design.elements.filter(e => e.type === 'compliance-badge').slice(0, 3).map((_, i) => (
                    <div key={i} className="px-0.5 border border-gray-300 text-[2px] font-bold">CE</div>
                  ))}
                </div>
              </div>

              {/* Badges */}
              <div className="absolute top-2 right-2 flex gap-1">
                {template.isDefault ? (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-0.5">
                    <Shield className="h-2.5 w-2.5" />
                    {t('ml.template.builtin')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-0.5">
                    <User className="h-2.5 w-2.5" />
                    {t('ml.template.custom')}
                  </Badge>
                )}
              </div>

              {/* Delete button for custom templates */}
              {!template.isDefault && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute bottom-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(template.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              )}
            </div>

            {/* Info */}
            <div className="p-3">
              <h3 className="text-sm font-medium">{template.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
              <div className="flex items-center gap-1.5 mt-2">
                <Badge variant="outline" className="text-[9px]">{t(`ml.group.${template.category}`)}</Badge>
                <Badge variant="outline" className="text-[9px]">{template.variant}</Badge>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          {t('ml.template.noResults')}
        </p>
      )}
    </div>
  );
}
