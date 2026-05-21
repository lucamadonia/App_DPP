import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Building2, User, Loader2, Mail, MapPin, X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { listRecipients, type RecipientSearchResult } from '@/services/supabase/wh-contacts';

type TypeFilter = 'all' | 'b2b' | 'customer';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (recipient: RecipientSearchResult) => void;
}

/**
 * Full-screen-ish picker for shipment recipients.
 * - Opens via the search icon next to the recipient input.
 * - Empty query → recent contacts and customers (browse mode).
 * - As-you-type filter with 200 ms debounce.
 * - Tab filter: All / B2B / Customers.
 */
export function RecipientPickerDialog({ open, onOpenChange, onSelect }: Props) {
  const { t } = useTranslation('warehouse');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TypeFilter>('all');
  const [results, setResults] = useState<RecipientSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens/closes.
  useEffect(() => {
    if (!open) return;
    setQuery('');
    setFilter('all');
    // Focus on next tick so the dialog has mounted.
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  // Debounced fetch.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    const t = window.setTimeout(async () => {
      const data = await listRecipients({
        query,
        typeFilter: filter,
        limit: 50,
      });
      if (!cancelled) {
        setResults(data);
        setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [open, query, filter]);

  const counts = useMemo(() => {
    let b2b = 0;
    let customer = 0;
    for (const r of results) {
      if (r.type === 'b2b') b2b++;
      else customer++;
    }
    return { all: results.length, b2b, customer };
  }, [results]);

  const handlePick = (r: RecipientSearchResult) => {
    onSelect(r);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-3xl w-full p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header with search input */}
        <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <DialogTitle className="text-lg font-bold">{t('Select Recipient')}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {t('Browse or search by name, company, or email')}
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1 -mr-1 rounded-full"
              onClick={() => onOpenChange(false)}
              aria-label={t('Close', { ns: 'common' })}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search recipients...')}
              className="pl-10 h-11 rounded-xl border-slate-200 dark:border-slate-700"
            />
            {loading && (
              <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 animate-spin" />
            )}
          </div>

          {/* Type filter pills */}
          <div className="mt-3 flex items-center gap-1.5">
            <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
              {t('All')} <span className="ml-1 opacity-60">({counts.all})</span>
            </FilterPill>
            <FilterPill active={filter === 'b2b'} onClick={() => setFilter('b2b')}>
              <Building2 className="h-3 w-3 mr-1" /> B2B{' '}
              <span className="ml-1 opacity-60">({counts.b2b})</span>
            </FilterPill>
            <FilterPill active={filter === 'customer'} onClick={() => setFilter('customer')}>
              <User className="h-3 w-3 mr-1" /> {t('Customers')}{' '}
              <span className="ml-1 opacity-60">({counts.customer})</span>
            </FilterPill>
          </div>
        </div>

        {/* Result list */}
        <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-3">
          {!loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {query ? t('No recipients found') : t('No recipients yet')}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                {query
                  ? t('Try a different name, company, or email.')
                  : t('Add a contact or import customers to get started.')}
              </p>
            </div>
          )}

          <ul className="space-y-1">
            {results.map((r) => (
              <li key={`${r.type}-${r.id}`}>
                <button
                  type="button"
                  onClick={() => handlePick(r)}
                  className="w-full text-left rounded-xl px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-start gap-3 group"
                >
                  <span
                    className={`flex-shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-bold text-white shadow-sm ${
                      r.type === 'customer'
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                        : 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
                    }`}
                  >
                    {r.type === 'customer' ? 'B2C' : 'B2B'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {r.name}
                      </span>
                      {r.company && r.company !== r.name && (
                        <span className="text-xs text-slate-500 truncate">· {r.company}</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {r.email && (
                        <span className="inline-flex items-center gap-1 truncate">
                          <Mail className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{r.email}</span>
                        </span>
                      )}
                      {(r.city || r.country) && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          {[r.postalCode, r.city, r.country].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
        active
          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );
}
