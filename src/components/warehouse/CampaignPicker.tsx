import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronsUpDown, Megaphone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { getCampaigns } from '@/services/supabase/wh-campaigns';
import type { WhCampaign } from '@/types/warehouse';

interface CampaignPickerProps {
  value?: string;
  onChange: (campaignId: string | null) => void;
}

export function CampaignPicker({ value, onChange }: CampaignPickerProps) {
  const { t } = useTranslation('warehouse');
  const [open, setOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<WhCampaign[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (open && !loaded) {
      getCampaigns({ status: 'active' }).then((data) => {
        setCampaigns(data);
        setLoaded(true);
      });
    }
  }, [open, loaded]);

  const selected = campaigns.find(c => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex items-center gap-2 truncate">
              <Megaphone className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />
              {selected.name}
            </span>
          ) : (
            <span className="text-muted-foreground">{t('No campaign')}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t('Search campaigns...')} />
          <CommandList>
            <CommandEmpty>{t('No campaigns yet')}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
              >
                <Check className={cn('mr-2 h-4 w-4', !value ? 'opacity-100' : 'opacity-0')} />
                <span className="text-muted-foreground">{t('No campaign')}</span>
              </CommandItem>
              {campaigns.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.name}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', value === c.id ? 'opacity-100' : 'opacity-0')} />
                  <Megaphone className="mr-2 h-3.5 w-3.5 text-pink-500" />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
