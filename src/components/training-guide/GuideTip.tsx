import { Lightbulb, AlertTriangle, CheckCircle2, Keyboard } from 'lucide-react';

type TipVariant = 'tip' | 'important' | 'note' | 'shortcut';

const VARIANTS: Record<TipVariant, { icon: typeof Lightbulb; border: string; bg: string; iconColor: string }> = {
  tip: { icon: Lightbulb, border: 'border-l-blue-500', bg: 'bg-blue-50/60', iconColor: 'text-blue-500' },
  important: { icon: AlertTriangle, border: 'border-l-amber-500', bg: 'bg-amber-50/60', iconColor: 'text-amber-500' },
  note: { icon: CheckCircle2, border: 'border-l-emerald-500', bg: 'bg-emerald-50/60', iconColor: 'text-emerald-500' },
  shortcut: { icon: Keyboard, border: 'border-l-violet-500', bg: 'bg-violet-50/60', iconColor: 'text-violet-500' },
};

interface GuideTipProps {
  variant?: TipVariant;
  label: string;
  children: React.ReactNode;
}

export function GuideTip({ variant = 'tip', label, children }: GuideTipProps) {
  const v = VARIANTS[variant];
  const Icon = v.icon;

  return (
    <div className={`mt-3 rounded-lg border-l-4 ${v.border} ${v.bg} p-3.5 animate-guide-tip-glow`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${v.iconColor}`} />
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-wider ${v.iconColor}`}>{label}</p>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">{children}</p>
        </div>
      </div>
    </div>
  );
}
