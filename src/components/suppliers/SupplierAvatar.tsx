import { cn } from '@/lib/utils';
import { getAvatarGradient, getInitials } from './supplier-helpers';

interface SupplierAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES = {
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
} as const;

/** Initials avatar with a deterministic gradient derived from the supplier name */
export function SupplierAvatar({ name, size = 'md', className }: SupplierAvatarProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl font-semibold text-white shadow-sm select-none',
        SIZE_CLASSES[size],
        getAvatarGradient(name || '?'),
        className,
      )}
    >
      {getInitials(name || '?')}
    </div>
  );
}
