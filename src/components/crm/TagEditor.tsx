/**
 * Inline tag editor — chips with remove-X + typeahead-input to add.
 * Autocomplete comes from tenant-wide tag vocabulary.
 */
import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { updateCustomerTags, getTenantTagVocabulary } from '@/services/supabase/crm-analytics';
import { toast } from 'sonner';

interface TagEditorProps {
  customerId: string;
  initialTags: string[];
  onChange?: (tags: string[]) => void;
}

export function TagEditor({ customerId, initialTags, onChange }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState('');
  const [adding, setAdding] = useState(false);
  const [vocab, setVocab] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getTenantTagVocabulary().then(setVocab); }, []);
  useEffect(() => setTags(initialTags), [initialTags]);

  const suggestions = draft.trim()
    ? vocab.filter(v => v.toLowerCase().includes(draft.toLowerCase()) && !tags.includes(v)).slice(0, 5)
    : [];

  async function commit(newTags: string[]) {
    setTags(newTags);
    onChange?.(newTags);
    try {
      await updateCustomerTags(customerId, newTags);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
      setTags(initialTags); // rollback
    }
  }

  async function addTag(value?: string) {
    const v = (value ?? draft).trim();
    if (!v) return;
    if (tags.includes(v)) { setDraft(''); return; }
    await commit([...tags, v]);
    setDraft('');
    setAdding(false);
  }

  async function removeTag(t: string) {
    await commit(tags.filter(x => x !== t));
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    if (e.key === 'Escape') { setDraft(''); setAdding(false); }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap min-h-7">
      <TagIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      {tags.length === 0 && !adding && (
        <span className="text-xs text-muted-foreground italic">Keine Tags</span>
      )}
      {tags.map(t => (
        <Badge key={t} variant="secondary" className="gap-1 pr-1 h-6">
          <span>{t}</span>
          <button
            type="button"
            onClick={() => removeTag(t)}
            className="hover:bg-destructive/20 rounded-full p-0.5 cursor-pointer transition-colors"
            aria-label={`Tag ${t} entfernen`}
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {adding ? (
        <div className="relative">
          <Input
            ref={inputRef}
            autoFocus
            className="h-6 px-2 text-xs w-32"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            onBlur={() => {
              setTimeout(() => { if (!draft) setAdding(false); }, 150);
            }}
            placeholder="Tag..."
          />
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-popover border rounded-md shadow-md min-w-[140px] py-1">
              {suggestions.map(s => (
                <button
                  key={s}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); addTag(s); }}
                  className="block w-full text-left px-2 py-1 text-xs hover:bg-muted cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => { setAdding(true); setTimeout(() => inputRef.current?.focus(), 10); }}
        >
          <Plus className="h-3 w-3 mr-0.5" />
          Hinzufügen
        </Button>
      )}
    </div>
  );
}
