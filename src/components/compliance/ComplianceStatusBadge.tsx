import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2, Clock, XCircle, Archive } from 'lucide-react';
import type { ComplianceReportStatus } from '@/types/compliance';
import { cn } from '@/lib/utils';

const STATUS: Record<ComplianceReportStatus, { label: string; cls: string; icon: typeof FileText }> = {
  draft:     { label: 'Entwurf',     cls: 'bg-slate-50 text-slate-800 border-slate-300 dark:bg-slate-900/30 dark:text-slate-200', icon: FileText },
  submitted: { label: 'Eingereicht', cls: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200',     icon: Clock },
  confirmed: { label: 'Bestätigt',   cls: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200', icon: CheckCircle2 },
  rejected:  { label: 'Abgelehnt',   cls: 'bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200',          icon: XCircle },
  obsolete:  { label: 'Verworfen',   cls: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200', icon: Archive },
};

export function ComplianceStatusBadge({ status, className }: { status: ComplianceReportStatus; className?: string }) {
  const m = STATUS[status];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={cn('gap-1', m.cls, className)}>
      <Icon className="h-3 w-3" />
      {m.label}
    </Badge>
  );
}
