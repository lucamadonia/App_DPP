import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type PasswordStrength = 'weak' | 'medium' | 'strong';

interface PasswordFieldProps
  extends Omit<React.ComponentProps<'input'>, 'type'> {
  /** Show password strength indicator below the input */
  showStrength?: boolean;
  /** Label for the eye toggle (for screen readers). Defaults to i18n 'Show password' / 'Hide password' */
  toggleLabel?: { show: string; hide: string };
}

/**
 * Password input with eye-toggle and optional strength meter.
 * Uses built-in iOS/Android password-manager autofill hints.
 * Strength is derived from length + character-class variety (no external deps).
 */
export function PasswordField({
  showStrength = false,
  toggleLabel,
  value,
  className,
  autoComplete = 'current-password',
  ...rest
}: PasswordFieldProps) {
  const { t } = useTranslation('auth');
  const [visible, setVisible] = React.useState(false);

  const strength = React.useMemo<PasswordStrength | null>(() => {
    if (!showStrength) return null;
    const v = typeof value === 'string' ? value : '';
    return getPasswordStrength(v);
  }, [showStrength, value]);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <Input
          {...rest}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          className={cn('pr-10', className)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={
            visible
              ? toggleLabel?.hide ?? t('Hide password')
              : toggleLabel?.show ?? t('Show password')
          }
          className="absolute inset-y-0 right-0 flex items-center justify-center px-2 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-r-md touch-target"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && strength && (
        <PasswordStrengthIndicator strength={strength} />
      )}
    </div>
  );
}

function PasswordStrengthIndicator({ strength }: { strength: PasswordStrength }) {
  const { t } = useTranslation('auth');
  const config = {
    weak: { color: 'bg-destructive', filled: 1, label: t('Password strength: weak') },
    medium: { color: 'bg-warning', filled: 2, label: t('Password strength: medium') },
    strong: { color: 'bg-success', filled: 3, label: t('Password strength: strong') },
  }[strength];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1 flex-1" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              i <= config.filled ? config.color : 'bg-muted'
            )}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{config.label}</span>
    </div>
  );
}

function getPasswordStrength(pw: string): PasswordStrength {
  if (pw.length < 8) return 'weak';
  let score = 0;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  if (score >= 3) return 'strong';
  if (score >= 2) return 'medium';
  return 'weak';
}
