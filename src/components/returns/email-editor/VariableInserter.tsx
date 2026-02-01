import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Variable, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { RhNotificationEventType } from '@/types/returns-hub';
import { TEMPLATE_VARIABLES } from './emailEditorTypes';

interface VariableInserterProps {
  eventType: RhNotificationEventType;
  onInsert: (variable: string) => void;
}

export function VariableInserter({ eventType, onInsert }: VariableInserterProps) {
  const { t } = useTranslation('returns');
  const [search, setSearch] = useState('');
  const variables = TEMPLATE_VARIABLES[eventType] || [];

  if (variables.length === 0) return null;

  const filtered = search
    ? variables.filter((v) =>
        v.key.toLowerCase().includes(search.toLowerCase()) ||
        v.label.toLowerCase().includes(search.toLowerCase()) ||
        v.example.toLowerCase().includes(search.toLowerCase())
      )
    : variables;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs">
          <Variable className="h-3.5 w-3.5" />
          {t('Variables')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('Search') + '...'}
            className="h-7 pl-7 text-xs"
          />
        </div>

        <p className="text-[10px] font-medium text-muted-foreground px-2 mb-1">
          {t('Click to insert')}
        </p>
        <div className="space-y-0.5 max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">{t('No results found')}</p>
          ) : (
            filtered.map((v) => (
              <button
                key={v.key}
                type="button"
                className="w-full text-left px-2 py-1.5 rounded-md hover:bg-accent text-sm transition-colors"
                onClick={() => onInsert(`{{${v.key}}}`)}
              >
                <span className="font-mono text-xs text-primary">{`{{${v.key}}}`}</span>
                <span className="text-muted-foreground text-xs ml-2">{v.example}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
