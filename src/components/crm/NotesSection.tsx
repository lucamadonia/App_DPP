/**
 * Customer notes — add/edit/delete chronological free-text notes with author.
 */
import { useState, useEffect } from 'react';
import { StickyNote, Trash2, Pencil, Check, X, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import {
  getCustomerNotes,
  addCustomerNote,
  updateCustomerNote,
  deleteCustomerNote,
  type CustomerNote,
} from '@/services/supabase/crm-analytics';
import { toast } from 'sonner';

interface NotesSectionProps {
  customerId: string;
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `vor ${hr} Std`;
  const d = Math.floor(hr / 24);
  if (d < 30) return `vor ${d} Tagen`;
  return new Date(iso).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function NotesSection({ customerId }: NotesSectionProps) {
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');

  const load = async () => {
    setLoading(true);
    const n = await getCustomerNotes(customerId);
    setNotes(n);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerId]);

  async function handleAdd() {
    if (!draft.trim()) return;
    setSaving(true);
    const n = await addCustomerNote(customerId, draft);
    if (n) {
      setNotes(prev => [n, ...prev]);
      setDraft('');
    } else {
      toast.error('Notiz konnte nicht gespeichert werden');
    }
    setSaving(false);
  }

  function startEdit(n: CustomerNote) {
    setEditingId(n.id);
    setEditDraft(n.content);
  }

  async function saveEdit() {
    if (!editingId || !editDraft.trim()) return;
    await updateCustomerNote(editingId, editDraft);
    setNotes(prev => prev.map(n => n.id === editingId ? { ...n, content: editDraft.trim(), updatedAt: new Date().toISOString() } : n));
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm('Notiz wirklich löschen?')) return;
    await deleteCustomerNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
    toast.success('Notiz gelöscht');
  }

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="h-4 w-4" />
          Notizen
          {notes.length > 0 && <span className="text-xs font-normal text-muted-foreground">({notes.length})</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <Textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="Interne Notiz hinzufügen, z.B. Telefonat, Sonderwunsch, Bobachtung ..."
            rows={2}
            className="resize-none"
            onKeyDown={e => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button
            onClick={handleAdd}
            disabled={!draft.trim() || saving}
            size="icon"
            className="shrink-0 self-end"
            aria-label="Notiz speichern"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground">Cmd/Strg + Enter zum Senden</p>

        {loading ? (
          <div className="space-y-2 pt-2">
            <ShimmerSkeleton className="h-12" />
            <ShimmerSkeleton className="h-12" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground border-t">
            Noch keine Notizen.
          </div>
        ) : (
          <ul className="space-y-2 pt-2 border-t">
            {notes.map(n => (
              <li key={n.id} className="group rounded-md bg-muted/40 p-3 hover:bg-muted/60 transition-colors">
                {editingId === n.id ? (
                  <div className="space-y-2">
                    <Textarea
                      autoFocus
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value)}
                      rows={2}
                      className="resize-none text-sm"
                    />
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5 mr-1" />Abbrechen
                      </Button>
                      <Button size="sm" onClick={saveEdit}>
                        <Check className="h-3.5 w-3.5 mr-1" />Speichern
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm whitespace-pre-wrap break-words">{n.content}</p>
                    <div className="flex items-center justify-between mt-1.5 text-[11px] text-muted-foreground">
                      <span>
                        {n.authorName || 'System'} · {relativeTime(n.createdAt)}
                        {n.updatedAt !== n.createdAt && ' · bearbeitet'}
                      </span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => startEdit(n)} aria-label="Notiz bearbeiten">
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(n.id)} aria-label="Notiz löschen">
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
