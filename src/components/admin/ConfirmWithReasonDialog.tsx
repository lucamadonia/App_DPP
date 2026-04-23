/**
 * Bestätigungs-Dialog für Admin-Aktionen mit pflichtigem Begründungsfeld.
 * Wird für destruktive oder sensible Operationen verwendet,
 * damit das Audit-Log immer eine Begründung hat.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmWithReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: 'default' | 'destructive';
  reasonPlaceholder?: string;
  reasonRequired?: boolean;
  onConfirm: (reason: string) => Promise<void> | void;
  danger?: boolean;
}

export function ConfirmWithReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Bestätigen',
  confirmVariant = 'default',
  reasonPlaceholder = 'Begründung (wird im Audit-Log gespeichert)',
  reasonRequired = true,
  onConfirm,
  danger,
}: ConfirmWithReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    if (reasonRequired && !reason.trim()) return;
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      setReason('');
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) setReason(''); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {danger && <AlertTriangle className="h-5 w-5 text-destructive" />}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="confirm-reason">
            Begründung {reasonRequired && <span className="text-destructive">*</span>}
          </Label>
          <Textarea
            id="confirm-reason"
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={reasonPlaceholder}
            rows={3}
            className="resize-none"
          />
          <p className="text-[11px] text-muted-foreground">
            Die Begründung wird mit deinem Namen, IP und Zeitstempel im Audit-Log gespeichert.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            <X className="h-4 w-4 mr-1" /> Abbrechen
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={busy || (reasonRequired && !reason.trim())}
          >
            {busy ? '…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
