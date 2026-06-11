import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Clock, CheckCircle2, XCircle, Mail, MapPin, Loader2, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { approveSupplier, rejectSupplier } from '@/services/supabase';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { useReducedMotion } from '@/lib/motion';
import { SupplierAvatar } from './SupplierAvatar';
import { countryFlag } from './supplier-helpers';
import type { Supplier } from '@/types/database';
import type { Country } from '@/types/database';

// ---------------------------------------------------------------------------
// Pending approvals action stream — shown prominently at the top of the page
// ---------------------------------------------------------------------------

interface PendingApprovalsPanelProps {
  pendingSuppliers: Supplier[];
  countries: Country[];
  onApprove: (supplier: Supplier) => void;
  onReject: (supplier: Supplier) => void;
  onOpenDetail: (supplier: Supplier) => void;
}

export function PendingApprovalsPanel({
  pendingSuppliers, countries, onApprove, onReject, onOpenDetail,
}: PendingApprovalsPanelProps) {
  const { t } = useTranslation('settings');
  const locale = useLocale();
  const prefersReduced = useReducedMotion();

  if (pendingSuppliers.length === 0) return null;

  const getCountryName = (code: string) => countries.find(c => c.code === code)?.name || code;

  return (
    <Card className="border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:border-amber-900 dark:from-amber-950/30 dark:to-orange-950/10">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {!prefersReduced && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
            )}
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
          </span>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-600" />
            {t('Pending Approvals')}
          </CardTitle>
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 tabular-nums">
            {pendingSuppliers.length}
          </Badge>
        </div>
        <CardDescription>
          {t('New supplier registrations are waiting for your review')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <AnimatePresence initial={false}>
          {pendingSuppliers.map(supplier => (
            <motion.div
              key={supplier.id}
              layout={!prefersReduced}
              initial={prefersReduced ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReduced ? undefined : { opacity: 0, x: 24, transition: { duration: 0.18 } }}
              className="flex flex-col gap-3 rounded-lg border border-amber-200/70 bg-card p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-amber-900/50"
            >
              <button
                type="button"
                className="flex min-w-0 items-center gap-3 text-left"
                onClick={() => onOpenDetail(supplier)}
              >
                <SupplierAvatar name={supplier.name} size="md" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{supplier.name}</div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    {supplier.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />{supplier.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {countryFlag(supplier.country)} {getCountryName(supplier.country)}
                    </span>
                    <span>{t('Registered {{date}}', { date: formatDate(supplier.createdAt, locale) })}</span>
                  </div>
                </div>
              </button>
              <div className="flex shrink-0 gap-2">
                <motion.div whileTap={prefersReduced ? undefined : { scale: 0.97 }} className="flex-1 sm:flex-none">
                  <Button
                    size="sm"
                    className="min-h-[44px] w-full bg-green-600 hover:bg-green-700 sm:min-h-9 sm:w-auto"
                    onClick={() => onApprove(supplier)}
                  >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    {t('Approve')}
                  </Button>
                </motion.div>
                <motion.div whileTap={prefersReduced ? undefined : { scale: 0.97 }} className="flex-1 sm:flex-none">
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[44px] w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:min-h-9 sm:w-auto dark:border-red-900 dark:hover:bg-red-950"
                    onClick={() => onReject(supplier)}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    {t('Reject')}
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Approve / Reject confirmation dialog (shared by panel, cards and detail)
// ---------------------------------------------------------------------------

export interface ApprovalAction {
  supplier: Supplier;
  mode: 'approve' | 'reject';
}

interface ApprovalDialogProps {
  action: ApprovalAction | null;
  onClose: () => void;
  /** Called after a successful approve/reject so the caller can refresh data */
  onDone: () => Promise<void> | void;
}

export function ApprovalDialog({ action, onClose, onDone }: ApprovalDialogProps) {
  const { t } = useTranslation('settings');
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = async () => {
    if (!action) return;
    setIsProcessing(true);
    try {
      if (action.mode === 'approve') {
        await approveSupplier(action.supplier.id);
        toast.success(t('Supplier approved successfully'));
      } else {
        await rejectSupplier(action.supplier.id, reason.trim() || undefined);
        toast.success(t('Supplier rejected successfully'));
      }
      await onDone();
      handleClose();
    } catch (error) {
      console.error('Error processing approval:', error);
      toast.error(action.mode === 'approve' ? t('Error approving supplier') : t('Error rejecting supplier'));
    }
    setIsProcessing(false);
  };

  const isApprove = action?.mode === 'approve';

  return (
    <Dialog open={!!action} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isApprove ? t('Approve Supplier') : t('Reject Supplier')}</DialogTitle>
          <DialogDescription>
            {isApprove
              ? t('Are you sure you want to approve this supplier?')
              : t('Are you sure you want to reject this supplier? You can optionally provide a reason.')}
          </DialogDescription>
        </DialogHeader>

        {action && (
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="font-medium">{action.supplier.name}</div>
                <div className="text-sm text-muted-foreground">{action.supplier.email}</div>
              </div>
            </div>

            {!isApprove && (
              <div>
                <Label>{t('Rejection Reason')} ({t('Optional')})</Label>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t('Enter reason for rejection...')}
                  rows={4}
                />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
            {t('Cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            variant={isApprove ? 'default' : 'destructive'}
            className={isApprove ? 'bg-green-600 hover:bg-green-700' : undefined}
          >
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isApprove ? (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            ) : (
              <XCircle className="mr-2 h-4 w-4" />
            )}
            {isApprove ? t('Approve') : t('Reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
