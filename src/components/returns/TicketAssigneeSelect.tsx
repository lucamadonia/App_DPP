import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getProfiles } from '@/services/supabase';
import type { Profile } from '@/services/supabase';

interface TicketAssigneeSelectProps {
  value?: string;
  onValueChange: (value: string | undefined) => void;
  compact?: boolean;
}

export function TicketAssigneeSelect({ value, onValueChange, compact }: TicketAssigneeSelectProps) {
  const { t } = useTranslation('returns');
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    getProfiles().then(setProfiles);
  }, []);

  const getInitials = (p: Profile) => {
    const name = p.name || p.email || '';
    const parts = name.split(/[\s@]/);
    return parts.slice(0, 2).map((s: string) => s.charAt(0).toUpperCase()).join('');
  };

  const getName = (p: Profile) => p.name || p.email || 'Unknown';

  if (compact) {
    const assigned = profiles.find(p => p.id === value);
    return (
      <button
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center"
      >
        <Select value={value || 'unassigned'} onValueChange={(v) => onValueChange(v === 'unassigned' ? undefined : v)}>
          <SelectTrigger className="h-8 w-8 p-0 border-0 rounded-full">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
              {assigned ? getInitials(assigned) : '?'}
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">{t('Unassigned')}</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {getName(p)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </button>
    );
  }

  return (
    <Select value={value || 'unassigned'} onValueChange={(v) => onValueChange(v === 'unassigned' ? undefined : v)}>
      <SelectTrigger>
        <SelectValue placeholder={t('Unassigned')} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">{t('Unassigned')}</SelectItem>
        {profiles.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                {getInitials(p)}
              </div>
              {getName(p)}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
