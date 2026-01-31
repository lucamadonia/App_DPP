import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Newspaper,
  ExternalLink,
  Calendar,
  Clock,
  Loader2,
  Search,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getNews } from '@/services/supabase';
import type { NewsItem } from '@/types/database';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'regulation', label: 'Regulation' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'update', label: 'Update' },
  { value: 'warning', label: 'Warning' },
  { value: 'recall', label: 'Recall' },
  { value: 'standard', label: 'Standard' },
  { value: 'guidance', label: 'Guidance' },
  { value: 'consultation', label: 'Consultation' },
];

const CATEGORY_COLORS: Record<string, string> = {
  regulation: 'bg-blue-100 text-blue-800',
  deadline: 'bg-red-100 text-red-800',
  update: 'bg-green-100 text-green-800',
  warning: 'bg-yellow-100 text-yellow-800',
  recall: 'bg-red-100 text-red-800',
  standard: 'bg-purple-100 text-purple-800',
  guidance: 'bg-cyan-100 text-cyan-800',
  consultation: 'bg-orange-100 text-orange-800',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-destructive text-destructive-foreground',
  medium: 'bg-warning text-warning-foreground',
  low: 'bg-muted text-muted-foreground',
};

export function NewsPage() {
  const { t } = useTranslation('compliance');
  const locale = useLocale();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    getNews().then(data => {
      setNews(data);
      setIsLoading(false);
    });
  }, []);

  const filteredNews = news.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter;
    const matchesSearch = !searchQuery ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesPriority && matchesSearch;
  });

  // Upcoming deadlines
  const now = new Date();
  const upcomingDeadlines = news
    .filter(item => item.effectiveDate && new Date(item.effectiveDate) > now)
    .sort((a, b) => new Date(a.effectiveDate!).getTime() - new Date(b.effectiveDate!).getTime())
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Newspaper className="h-6 w-6" />
          {t('Regulatory News')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('Latest updates on EU regulations, standards, and deadlines')}
        </p>
      </div>

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Card className="border-warning">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-warning" />
              {t('Upcoming Deadlines')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {upcomingDeadlines.map(item => (
                <div key={item.id} className="flex items-center gap-2 text-sm p-2 rounded-lg bg-warning/5 border border-warning/20">
                  <Calendar className="h-3 w-3 text-warning" />
                  <span className="font-medium">{formatDate(item.effectiveDate!, locale)}</span>
                  <span className="text-muted-foreground">-</span>
                  <span>{item.title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('Search news...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder={t('Category')} />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(cat => (
              <SelectItem key={cat.value} value={cat.value}>
                {t(cat.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="sm:w-[150px]">
            <SelectValue placeholder={t('Priority')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All Priorities')}</SelectItem>
            <SelectItem value="high">{t('High')}</SelectItem>
            <SelectItem value="medium">{t('Medium')}</SelectItem>
            <SelectItem value="low">{t('Low')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => (
          <Badge
            key={cat.value}
            variant={categoryFilter === cat.value ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setCategoryFilter(cat.value)}
          >
            {t(cat.label)}
          </Badge>
        ))}
      </div>

      {/* News cards */}
      <div className="space-y-4">
        {filteredNews.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Newspaper className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">{t('No news found')}</h3>
              <p className="text-muted-foreground mt-1">
                {t('Try adjusting your filters')}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNews.map(item => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  {item.imageUrl && (
                    <div className="sm:w-48 flex-shrink-0">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={CATEGORY_COLORS[item.category] || ''}>
                          {t(item.category.charAt(0).toUpperCase() + item.category.slice(1))}
                        </Badge>
                        <Badge className={PRIORITY_COLORS[item.priority]}>
                          {t(item.priority.charAt(0).toUpperCase() + item.priority.slice(1))}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDate(item.publishedAt, locale)}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold mb-1">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{item.summary}</p>

                    <div className="flex flex-wrap items-center gap-3">
                      {item.effectiveDate && (
                        <span className="text-xs flex items-center gap-1 text-warning">
                          <Calendar className="h-3 w-3" />
                          {t('Effective')}: {formatDate(item.effectiveDate, locale)}
                        </span>
                      )}
                      {item.countries.length > 0 && (
                        <span className="text-xs flex items-center gap-1 text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          {item.countries.join(', ')}
                        </span>
                      )}
                      {item.source && (
                        <span className="text-xs text-muted-foreground">
                          {t('Source')}: {item.source}
                        </span>
                      )}
                    </div>

                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {item.link && (
                      <Button variant="link" className="p-0 h-auto mt-2" asChild>
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          {t('Read more')}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center">
        {t('Showing {{count}} of {{total}} news items', {
          count: filteredNews.length,
          total: news.length,
        })}
      </p>
    </div>
  );
}
