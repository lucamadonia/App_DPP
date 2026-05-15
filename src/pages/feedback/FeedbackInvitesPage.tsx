import { useEffect, useState } from 'react';
import { Mail, Copy, Check, Send, X, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getIdeaInvites,
  createIdeaInvite,
  cancelIdeaInvite,
} from '@/services/supabase/feedback-ideas';
import type { FeedbackIdeaInvite } from '@/types/feedback';
import { toast } from 'sonner';

export function FeedbackInvitesPage() {
  const [invites, setInvites] = useState<FeedbackIdeaInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function reload() {
    setLoading(true);
    setInvites(await getIdeaInvites());
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, []);

  async function handleCancel(id: string) {
    await cancelIdeaInvite(id);
    toast.success('Einladung widerrufen');
    reload();
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Partner-Einladungen
          </h1>
          <p className="text-sm text-muted-foreground">
            Versende personalisierte Links an Influencer und Beta-Tester. Jeder Link erlaubt
            Einreichung von Ideen und Voten auf dem Ideen-Board.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Send className="h-4 w-4" />
          Neuen Partner einladen
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <>
            <ShimmerSkeleton className="h-16 w-full" />
            <ShimmerSkeleton className="h-16 w-full" />
          </>
        ) : invites.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Noch keine Einladungen versendet. Klicke oben rechts, um den ersten Partner einzuladen.
            </CardContent>
          </Card>
        ) : (
          invites.map(inv => <InviteRow key={inv.id} invite={inv} onCancel={() => handleCancel(inv.id)} />)
        )}
      </div>

      <NewInviteDialog open={open} onOpenChange={setOpen} onCreated={reload} />
    </div>
  );
}

function InviteRow({ invite, onCancel }: { invite: FeedbackIdeaInvite; onCancel: () => void }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = `${origin}/ideas/submit/${invite.token}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardContent className="p-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{invite.partnerName}</span>
            <span className="text-xs text-muted-foreground">{invite.partnerEmail}</span>
            <StatusBadge status={invite.status} />
          </div>
          <div className="text-xs text-muted-foreground">
            Eingeladen {new Date(invite.createdAt).toLocaleDateString()}
            {invite.lastUsedAt ? ` · zuletzt genutzt ${new Date(invite.lastUsedAt).toLocaleDateString()}` : ''}
            {' · '}läuft ab {new Date(invite.expiresAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button size="sm" variant="outline" onClick={copy} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Kopiert!' : 'Link'}
          </Button>
          {invite.status !== 'cancelled' && (
            <Button size="sm" variant="ghost" onClick={onCancel} className="gap-1.5 text-muted-foreground">
              <X className="h-3.5 w-3.5" />
              Widerrufen
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Versendet', cls: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-200' },
    opened: { label: 'Geöffnet', cls: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200' },
    active: { label: 'Aktiv', cls: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-200' },
    expired: { label: 'Abgelaufen', cls: 'bg-slate-50 text-slate-800 border-slate-300' },
    cancelled: { label: 'Widerrufen', cls: 'bg-red-50 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-200' },
  };
  const v = map[status] || map.pending;
  return <Badge variant="outline" className={`text-[10px] ${v.cls}`}>{v.label}</Badge>;
}

function NewInviteDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setEmail('');
      setCreatedUrl(null);
      setCopied(false);
    }
  }, [open]);

  const valid = name.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  async function handleCreate() {
    if (!valid) return;
    setBusy(true);
    try {
      const res = await createIdeaInvite({ partnerName: name.trim(), partnerEmail: email.trim() });
      setCreatedUrl(res.inviteUrl);
      toast.success('Einladung erstellt');
      onCreated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function copyUrl() {
    if (!createdUrl) return;
    await navigator.clipboard.writeText(createdUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Partner einladen
          </DialogTitle>
          <DialogDescription>
            Der Partner erhält einen persönlichen Link, mit dem Ideen eingereicht und für andere
            voten möglich ist.
          </DialogDescription>
        </DialogHeader>

        {createdUrl ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 p-4 text-center">
              <Check className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-medium">Einladung erstellt. Email wurde versendet.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Persönlicher Link (Backup — Email ist bereits unterwegs):
              </label>
              <div className="flex gap-2">
                <Input value={createdUrl} readOnly className="text-xs font-mono" />
                <Button onClick={copyUrl} variant="outline" className="gap-1.5">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="z. B. Stefan Gebhardt" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="partner@example.com"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          {createdUrl ? (
            <Button onClick={() => onOpenChange(false)}>Schließen</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
                Abbrechen
              </Button>
              <Button onClick={handleCreate} disabled={!valid || busy}>
                {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                Einladung senden
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
