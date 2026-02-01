import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { getCannedResponses } from '@/services/supabase';
import type { RhCannedResponse } from '@/types/returns-hub';

interface CannedResponsePickerProps {
  onSelect: (content: string) => void;
}

export function CannedResponsePicker({ onSelect }: CannedResponsePickerProps) {
  const { t } = useTranslation('returns');
  const [responses, setResponses] = useState<RhCannedResponse[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      getCannedResponses().then(setResponses);
    }
  }, [open]);

  const filtered = responses.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.content.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" title={t('Canned Responses')}>
          <MessageSquareText className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="end">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('Search responses...')}
          className="mb-2 h-8 text-sm"
        />
        <div className="max-h-48 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">{t('No canned responses')}</p>
          ) : (
            filtered.map((r) => (
              <button
                key={r.id}
                className="w-full text-left p-2 rounded hover:bg-muted text-sm"
                onClick={() => {
                  onSelect(r.content);
                  setOpen(false);
                  setSearch('');
                }}
              >
                <p className="font-medium text-xs">{r.title}</p>
                <p className="text-xs text-muted-foreground truncate">{r.content}</p>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
