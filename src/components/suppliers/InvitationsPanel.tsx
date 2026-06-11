import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Mail, Copy, Check, Loader2, Ban, ChevronDown, ChevronUp, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getSupplierInvitations, createSupplierInvitation, cancelSupplierInvitation,
} from '@/services/supabase';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { useReducedMotion } from '@/lib/motion';
import { buildInvitationUrl } from './supplier-helpers';
import type { SupplierInvitation, SupplierInvitationStatus } from '@/types/supplier-portal';

const VISIBLE_LIMIT = 5;

function InvitationStatusBadge({ status }: { status: SupplierInvitationStatus }) {
  const { t } = useTranslation('settings');
  switch (status) {
    case 'pending':
      return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{t('Pending')}</Badge>;
    case 'completed':
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">{t('Completed')}</Badge>;
    case 'expired':
      return <Badge variant="secondary">{t('Expired')}</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="text-red-600 border-red-200">{t('Cancelled')}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

interface InvitationsPanelProps {
  /** Controls the "create invitation" dialog (lifted so the page header button can open it) */
  inviteDialogOpen: boolean;
  onInviteDialogChange: (open: boolean) => void;
  /** Called after a supplier list refresh is useful (e.g. invitation completed elsewhere) */
  refreshKey?: number;
}

/** Supplier portal invitations: create, copy link, cancel — with status tracking */
export function InvitationsPanel({ inviteDialogOpen, onInviteDialogChange, refreshKey = 0 }: InvitationsPanelProps) {
  const { t } = useTranslation('settings');
  const locale = useLocale();
  const prefersReduced = useReducedMotion();

  const [invitations, setInvitations] = useState<SupplierInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  // Create dialog state
  const [email, setEmail] = useState('');
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Copy feedback (id of the row whose link was just copied, or 'dialog')
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cancel confirmation
  const [invitationToCancel, setInvitationToCancel] = useState<SupplierInvitation | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadInvitations = useCallback(async () => {
    try {
      const data = await getSupplierInvitations();
      setInvitations(data);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations, refreshKey]);

  const copyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success(t('Invitation link copied to clipboard'));
      window.setTimeout(() => setCopiedId(prev => (prev === id ? null : prev)), 2000);
    } catch (error) {
      console.error('Clipboard write failed:', error);
      toast.error(t('Could not copy link to clipboard'));
    }
  };

  const handleGenerate = async () => {
    if (!email.trim()) {
      toast.error(t('Email is required'));
      return;
    }
    setIsGenerating(true);
    try {
      const result = await createSupplierInvitation({
        email: email.trim(),
        contactName: contactName.trim() || undefined,
        companyName: companyName.trim() || undefined,
      });
      setGeneratedLink(result.invitationUrl);
      toast.success(t('Invitation created successfully'));
      await copyLink(result.invitationUrl, 'dialog');
      await loadInvitations();
    } catch (error) {
      console.error('Error generating invitation:', error);
      toast.error(t('Error generating invitation'), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
    setIsGenerating(false);
  };

  const closeCreateDialog = () => {
    onInviteDialogChange(false);
    setEmail('');
    setContactName('');
    setCompanyName('');
    setGeneratedLink('');
  };

  const handleCancelInvitation = async () => {
    if (!invitationToCancel) return;
    setIsCancelling(true);
    try {
      await cancelSupplierInvitation(invitationToCancel.id);
      toast.success(t('Invitation cancelled successfully'));
      await loadInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      toast.error(t('Failed to cancel invitation'));
    }
    setIsCancelling(false);
    setInvitationToCancel(null);
  };

  const visibleInvitations = showAll ? invitations : invitations.slice(0, VISIBLE_LIMIT);
  const pendingCount = invitations.filter(i => i.status === 'pending').length;

  return (
    <>
      {invitations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Send className="h-4 w-4 text-muted-foreground" />
                  {t('Supplier Invitations')}
                  {pendingCount > 0 && (
                    <Badge variant="secondary" className="tabular-nums">{pendingCount} {t('Pending')}</Badge>
                  )}
                </CardTitle>
                <CardDescription className="mt-1">
                  {t('Manage supplier registration invitations and track their status')}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-9" onClick={() => onInviteDialogChange(true)}>
                <Mail className="mr-2 h-4 w-4" />
                {t('Invite Supplier')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && invitations.length === 0 ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {visibleInvitations.map(inv => {
                  const url = buildInvitationUrl(inv.invitationCode);
                  return (
                    <motion.div
                      key={inv.id}
                      layout={!prefersReduced}
                      initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={prefersReduced ? undefined : { opacity: 0, transition: { duration: 0.15 } }}
                      className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">{inv.email}</span>
                          <InvitationStatusBadge status={inv.status} />
                        </div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {inv.companyName && <span className="truncate">{inv.companyName}</span>}
                          <span>{t('Invited')}: {formatDate(inv.createdAt, locale)}</span>
                          {inv.status === 'pending' && (
                            <span>{t('Expires')}: {formatDate(inv.expiresAt, locale)}</span>
                          )}
                        </div>
                      </div>
                      {inv.status === 'pending' && (
                        <div className="flex shrink-0 gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-[44px] sm:min-h-9"
                            onClick={() => copyLink(url, inv.id)}
                            title={t('Copy Link')}
                          >
                            {copiedId === inv.id ? (
                              <Check className="mr-1.5 h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="mr-1.5 h-4 w-4" />
                            )}
                            {copiedId === inv.id ? t('Copied') : t('Copy Link')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-[44px] text-red-600 hover:text-red-700 sm:min-h-9"
                            onClick={() => setInvitationToCancel(inv)}
                            title={t('Cancel Invitation')}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
            {invitations.length > VISIBLE_LIMIT && (
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(!showAll)}>
                {showAll ? (
                  <><ChevronUp className="mr-1 h-4 w-4" />{t('Show less')}</>
                ) : (
                  <><ChevronDown className="mr-1 h-4 w-4" />{t('Show all ({{count}})', { count: invitations.length })}</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create invitation dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={(open) => { if (!open) closeCreateDialog(); else onInviteDialogChange(true); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Invite Supplier')}</DialogTitle>
            <DialogDescription>
              {t('Generate an invitation link for a supplier to register via the supplier portal')}
            </DialogDescription>
          </DialogHeader>

          {!generatedLink ? (
            <div className="space-y-4">
              <div>
                <Label>{t('Email')} *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="supplier@example.com"
                />
              </div>
              <div>
                <Label>{t('Contact Name')}</Label>
                <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="John Doe" />
              </div>
              <div>
                <Label>{t('Company Name')}</Label>
                <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Supplier GmbH" />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label>{t('Invitation Link')}</Label>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly className="font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copyLink(generatedLink, 'dialog')}>
                    {copiedId === 'dialog' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t('Note: Please send this link manually to the supplier via email or other communication channel.')}
              </p>
            </div>
          )}

          <DialogFooter>
            {!generatedLink ? (
              <>
                <Button variant="outline" onClick={closeCreateDialog}>
                  {t('Cancel', { ns: 'common' })}
                </Button>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  {t('Generate Link & Copy')}
                </Button>
              </>
            ) : (
              <Button onClick={closeCreateDialog}>{t('Close', { ns: 'common' })}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel invitation confirmation */}
      <AlertDialog open={!!invitationToCancel} onOpenChange={(open) => { if (!open) setInvitationToCancel(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Cancel Invitation')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('Are you sure you want to cancel this invitation?')}
              {invitationToCancel && (
                <span className="mt-1 block font-medium text-foreground">{invitationToCancel.email}</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleCancelInvitation(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}
              {t('Cancel Invitation')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
