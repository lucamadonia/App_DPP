import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface TicketTagsEditorProps {
  tags: string[];
  onChange?: (tags: string[]) => void;
  readOnly?: boolean;
}

export function TicketTagsEditor({ tags, onChange, readOnly }: TicketTagsEditorProps) {
  const { t } = useTranslation('returns');
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim() && onChange) {
      e.preventDefault();
      const newTag = input.trim().toLowerCase();
      if (!tags.includes(newTag)) {
        onChange([...tags, newTag]);
      }
      setInput('');
    }
  };

  const handleRemove = (tag: string) => {
    if (onChange) {
      onChange(tags.filter(t => t !== tag));
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs gap-1">
            {tag}
            {!readOnly && onChange && (
              <button
                onClick={() => handleRemove(tag)}
                className="ml-0.5 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
        {tags.length === 0 && readOnly && (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>
      {!readOnly && onChange && (
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('Type tag and press Enter')}
          className="h-8 text-sm"
        />
      )}
    </div>
  );
}
