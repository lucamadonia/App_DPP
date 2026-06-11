/**
 * ContactActionCard — Aktions-Hub card for a single warehouse contact.
 *
 * Identity (gradient initials avatar, name, company, type badge) +
 * compact shipment history (batched count + relative "last shipment") +
 * quick actions: New Shipment, mailto, tel, copy address.
 *
 * Also exports ContactActionCardSkeleton (shimmer placeholder in card shape).
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Copy, Mail, MoreVertical, Package, Pencil, Phone, Send, Trash2, Users,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { gridItem } from '@/lib/motion';
import { relativeTime } from '@/lib/animations';
import { CONTACT_TYPE_CONFIG } from '@/lib/warehouse-constants';
import { cn } from '@/lib/utils';
import { useLocale } from '@/hooks/use-locale';
import type { ContactShipmentSummary } from '@/services/supabase/wh-contacts';
import type { WhContact } from '@/types/warehouse';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** "Maria Curie-Lab" -> "MC"; single word -> first two letters. */
function contactInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function buildAddressText(c: WhContact): string {
  const cityLine = [c.postalCode, c.city].filter(Boolean).join(' ');
  return [
    c.contactName,
    c.companyName,
    c.street,
    cityLine,
    c.country,
  ]
    .filter((line): line is string => Boolean(line && line.trim()))
    .join('\n');
}

function formatCompact(n: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return String(n);
  }
}

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

export interface ContactActionCardProps {
  contact: WhContact;
  summary?: ContactShipmentSummary;
  onEdit: (contact: WhContact) => void;
  onDelete: (contact: WhContact) => void;
}

export function ContactActionCard({ contact, summary, onEdit, onDelete }: ContactActionCardProps) {
  const { t, i18n } = useTranslation('warehouse');
  const locale = useLocale();
  const prefersReduced = useReducedMotion();

  const typeCfg = CONTACT_TYPE_CONFIG[contact.type];
  const typeLabel = typeCfg ? (locale === 'de' ? typeCfg.labelDe : typeCfg.labelEn) : contact.type;
  const hasAddress = Boolean(contact.street || contact.city);
  const initials = useMemo(() => contactInitials(contact.contactName), [contact.contactName]);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(buildAddressText(contact));
      toast.success(t('Address copied'));
    } catch {
      toast.error(t('Something went wrong', { ns: 'common' }));
    }
  };

  return (
    <motion.div
      variants={prefersReduced ? undefined : gridItem}
      whileHover={prefersReduced ? undefined : { y: -3 }}
      whileTap={prefersReduced ? undefined : { scale: 0.97 }}
      className="min-w-0 h-full"
    >
      <Card
        className={cn(
          'h-full gap-0 py-0 overflow-hidden transition-shadow duration-200 hover:shadow-md',
          !contact.isActive && 'opacity-60',
        )}
      >
        <CardContent className="flex h-full flex-col gap-3 p-4">
          {/* Identity row (links to detail page) */}
          <div className="flex items-start gap-3 min-w-0">
            <Link
              to={`/warehouse/contacts/${contact.id}`}
              className="flex flex-1 items-start gap-3 min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={contact.contactName}
            >
              <div
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-sm font-semibold select-none"
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="font-semibold leading-tight truncate">{contact.contactName}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {contact.companyName || contact.email || '—'}
                </p>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-1">
              {typeCfg ? (
                <Badge variant="outline" className={cn('border-0 text-xs', typeCfg.bgColor, typeCfg.color)}>
                  {typeLabel}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">{contact.type}</Badge>
              )}
            </div>
          </div>

          {/* Shipment history (batched, no N+1) + influencer reach */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground min-h-5">
            <span className="inline-flex items-center gap-1.5" title={t('Last shipment')}>
              <Package className="h-3.5 w-3.5 shrink-0" />
              {summary && summary.count > 0 ? (
                <>
                  <span className="text-foreground/80 font-medium tabular-nums">
                    {t('{{count}} shipments', { count: summary.count })}
                  </span>
                  {summary.lastShipmentAt && (
                    <span>· {relativeTime(summary.lastShipmentAt, i18n.language)}</span>
                  )}
                </>
              ) : (
                <span>{t('No shipments yet')}</span>
              )}
            </span>
            {contact.type === 'influencer' && contact.followerCount != null && contact.followerCount > 0 && (
              <span className="inline-flex items-center gap-1" title={t('Followers')}>
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span className="tabular-nums">{formatCompact(contact.followerCount, locale)}</span>
              </span>
            )}
          </div>

          {/* Tags */}
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {contact.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0 font-normal max-w-full">
                  <span className="truncate">{tag}</span>
                </Badge>
              ))}
              {contact.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal">
                  +{contact.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="mt-auto flex items-center gap-1 border-t pt-2.5">
            <Button asChild size="sm" variant="secondary" className="h-11 flex-1 min-w-0">
              <Link to="/warehouse/shipments/new">
                <Send className="h-4 w-4 mr-1.5 shrink-0" />
                <span className="truncate">{t('New Shipment')}</span>
              </Link>
            </Button>
            {contact.email ? (
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="h-11 w-11 text-muted-foreground"
                aria-label={t('Send email')}
                title={t('Send email')}
              >
                <a href={`mailto:${contact.email}`}>
                  <Mail className="h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button size="icon" variant="ghost" className="h-11 w-11 text-muted-foreground" disabled aria-label={t('Send email')} title={t('Send email')}>
                <Mail className="h-4 w-4" />
              </Button>
            )}
            {contact.phone ? (
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="h-11 w-11 text-muted-foreground"
                aria-label={t('Call')}
                title={t('Call')}
              >
                <a href={`tel:${contact.phone}`}>
                  <Phone className="h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button size="icon" variant="ghost" className="h-11 w-11 text-muted-foreground" disabled aria-label={t('Call')} title={t('Call')}>
                <Phone className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 text-muted-foreground"
              disabled={!hasAddress}
              onClick={handleCopyAddress}
              aria-label={t('Copy address')}
              title={t('Copy address')}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-11 w-11 text-muted-foreground"
                  aria-label={t('More actions')}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(contact)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('Edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => onDelete(contact)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('Delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

/** Shimmer placeholder mirroring the card layout (used while loading). */
export function ContactActionCardSkeleton() {
  return (
    <Card className="h-full gap-0 py-0 overflow-hidden">
      <CardContent className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-start gap-3">
          <ShimmerSkeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 pt-1 min-w-0">
            <ShimmerSkeleton className="h-4 w-2/3" />
            <ShimmerSkeleton className="h-3 w-1/2" />
          </div>
          <ShimmerSkeleton className="h-5 w-14 rounded-full shrink-0" />
        </div>
        <ShimmerSkeleton className="h-3 w-3/5" />
        <div className="mt-auto flex items-center gap-2 border-t pt-3">
          <ShimmerSkeleton className="h-10 flex-1 rounded-md" />
          <ShimmerSkeleton className="h-10 w-10 rounded-md" />
          <ShimmerSkeleton className="h-10 w-10 rounded-md" />
          <ShimmerSkeleton className="h-10 w-10 rounded-md" />
        </div>
      </CardContent>
    </Card>
  );
}
