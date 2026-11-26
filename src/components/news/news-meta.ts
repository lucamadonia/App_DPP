import {
  AlertOctagon,
  AlertTriangle,
  BookOpen,
  CalendarClock,
  MessagesSquare,
  RefreshCw,
  Ruler,
  Scale,
  type LucideIcon,
} from 'lucide-react';
import type { NewsItem } from '@/types/database';

export type NewsCategory = NewsItem['category'];

export const NEWS_CATEGORIES: { value: 'all' | NewsCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'regulation', label: 'Regulation' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'update', label: 'Update' },
  { value: 'warning', label: 'Warning' },
  { value: 'recall', label: 'Recall' },
  { value: 'standard', label: 'Standard' },
  { value: 'guidance', label: 'Guidance' },
  { value: 'consultation', label: 'Consultation' },
];

/** Icon + token-based tint per category (readable in every theme/app style). */
export const NEWS_CATEGORY_META: Record<NewsCategory, { icon: LucideIcon; className: string }> = {
  regulation: { icon: Scale, className: 'border-primary/25 bg-primary/10 text-primary' },
  deadline: { icon: CalendarClock, className: 'border-destructive/25 bg-destructive/10 text-destructive' },
  update: { icon: RefreshCw, className: 'border-success/25 bg-success/10 text-success' },
  warning: { icon: AlertTriangle, className: 'border-warning/30 bg-warning/10 text-warning' },
  recall: { icon: AlertOctagon, className: 'border-destructive/25 bg-destructive/10 text-destructive' },
  standard: { icon: Ruler, className: 'border-border bg-muted text-foreground' },
  guidance: { icon: BookOpen, className: 'border-primary/20 bg-primary/[0.07] text-primary' },
  consultation: { icon: MessagesSquare, className: 'border-border bg-muted text-foreground' },
};

export function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
