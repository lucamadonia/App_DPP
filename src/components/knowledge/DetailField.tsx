import type { ReactNode } from 'react';
import { ExternalLink, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetailFieldProps {
  icon?: LucideIcon;
  label: string;
  children: ReactNode;
  tone?: 'default' | 'danger';
  className?: string;
}

/** Labelled fact inside an expanded requirement / checklist item. */
export function DetailField({ icon: Icon, label, children, tone = 'default', className }: DetailFieldProps) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-lg border p-3',
        tone === 'danger' ? 'border-destructive/25 bg-destructive/[0.05]' : 'bg-muted/30',
        className
      )}
    >
      <p
        className={cn(
          'mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide',
          tone === 'danger' ? 'text-destructive' : 'text-muted-foreground'
        )}
      >
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
        {label}
      </p>
      <div className="text-sm leading-relaxed break-words text-foreground">{children}</div>
    </div>
  );
}

/** Responsive two-column grid for DetailFields; single column on phones. */
export function DetailGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-2.5 sm:grid-cols-2', className)}>{children}</div>;
}

interface LinkPillsProps {
  links: { label: string; url: string }[];
  className?: string;
}

/** External source links as 44px-tall pills (wrap, never overflow). */
export function LinkPills({ links, className }: LinkPillsProps) {
  if (links.length === 0) return null;
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border bg-card px-3 text-xs font-medium text-primary transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-9"
        >
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{link.label}</span>
        </a>
      ))}
    </div>
  );
}
