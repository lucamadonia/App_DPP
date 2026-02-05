/**
 * Visibility Switch Component
 *
 * Styled switch for consumer or customs visibility toggle.
 */

import { Users, ShieldCheck } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface VisibilitySwitchProps {
  level: 'consumer' | 'customs';
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}

export function VisibilitySwitch({ level, checked, onChange, label }: VisibilitySwitchProps) {
  const Icon = level === 'consumer' ? Users : ShieldCheck;
  const accentClass =
    level === 'consumer'
      ? 'data-[state=checked]:bg-green-600'
      : 'data-[state=checked]:bg-amber-500';

  return (
    <div className="flex items-center gap-2">
      <Icon
        className={cn(
          'h-4 w-4',
          level === 'consumer' ? 'text-green-600' : 'text-amber-600'
        )}
      />
      <Label htmlFor={`${level}-switch`} className="text-sm cursor-pointer flex-1">
        {label}
      </Label>
      <Switch id={`${level}-switch`} checked={checked} onCheckedChange={onChange} className={accentClass} />
    </div>
  );
}
