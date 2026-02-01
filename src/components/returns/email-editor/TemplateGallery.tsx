import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { RhEmailTemplate, EmailTemplateCategory } from '@/types/returns-hub';
import { TemplateGalleryCard } from './TemplateGalleryCard';

interface TemplateGalleryProps {
  templates: RhEmailTemplate[];
  onEdit: (template: RhEmailTemplate) => void;
  onToggleEnabled: (template: RhEmailTemplate, enabled: boolean) => void;
}

type FilterCategory = 'all' | EmailTemplateCategory;

export function TemplateGallery({ templates, onEdit, onToggleEnabled }: TemplateGalleryProps) {
  const { t } = useTranslation('returns');
  const [filter, setFilter] = useState<FilterCategory>('all');
  const [search, setSearch] = useState('');

  const filtered = templates
    .filter((tmpl) => filter === 'all' || tmpl.category === filter)
    .filter((tmpl) => {
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        (tmpl.name || '').toLowerCase().includes(s) ||
        (tmpl.eventType || '').toLowerCase().includes(s) ||
        (tmpl.description || '').toLowerCase().includes(s)
      );
    });

  const counts = {
    all: templates.length,
    returns: templates.filter((t) => t.category === 'returns').length,
    tickets: templates.filter((t) => t.category === 'tickets').length,
    general: templates.filter((t) => t.category === 'general').length,
  };

  return (
    <div className="space-y-6">
      {/* Search + Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search') + '...'}
            className="pl-9 h-9"
          />
        </div>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterCategory)}>
          <TabsList>
            <TabsTrigger value="all">{t('All')} ({counts.all})</TabsTrigger>
            <TabsTrigger value="returns">{t('Returns')} ({counts.returns})</TabsTrigger>
            <TabsTrigger value="tickets">{t('Tickets')} ({counts.tickets})</TabsTrigger>
            <TabsTrigger value="general">{t('General')} ({counts.general})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? t('No results found') : t('No email templates configured')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tmpl, i) => (
            <div key={tmpl.id || tmpl.eventType} className="animate-[stagger-fade-up_0.3s_ease-out_both]" style={{ animationDelay: `${i * 50}ms` }}>
              <TemplateGalleryCard
                template={tmpl}
                index={i}
                onEdit={onEdit}
                onToggleEnabled={onToggleEnabled}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
