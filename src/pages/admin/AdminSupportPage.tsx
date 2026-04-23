/**
 * Admin Support Page — Cross-Tenant-Ticket-Inbox
 */
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  LifeBuoy, Search, RefreshCw, AlertTriangle, Clock, User as UserIcon,
  Mail, ExternalLink, CheckCircle2, Inbox,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { listAllTickets, type AdminTicketSummary } from '@/services/supabase/admin';
import { toast } from 'sonner';

const PRIORITY_TONE: Record<string, string> = {
  urgent: 'bg-red-50 text-red-700 border-red-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  normal: 'bg-sky-50 text-sky-700 border-sky-200',
  low: 'bg-slate-50 text-slate-600 border-slate-200',
};

const STATUS_TONE: Record<string, string> = {
  open: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  resolved: 'bg-slate-100 text-slate-600 border-slate-200',
  closed: 'bg-slate-100 text-slate-400 border-slate-200',
};

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 60) return `vor ${min} Min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `vor ${hr} Std`;
  return `vor ${Math.floor(hr / 24)} Tagen`;
}

export function AdminSupportPage() {
  const [tickets, setTickets] = useState<AdminTicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  async function load(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await listAllTickets({
        status: statusFilter === 'all' ? undefined : [statusFilter],
        priority: priorityFilter === 'all' ? undefined : [priorityFilter],
        limit: 200,
      });
      setTickets(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter, priorityFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return tickets;
    const q = search.toLowerCase();
    return tickets.filter(t =>
      t.subject.toLowerCase().includes(q) ||
      t.tenantName.toLowerCase().includes(q) ||
      (t.customerEmail || '').toLowerCase().includes(q),
    );
  }, [tickets, search]);

  const counts = {
    open: tickets.filter(t => t.status === 'open').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    urgent: tickets.filter(t => t.priority === 'urgent').length,
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1400px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <LifeBuoy className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Support-Inbox</h1>
            <p className="text-xs text-muted-foreground">
              Alle Tickets aus allen Tenants. {counts.open} offen · {counts.urgent} dringend.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
          Neu laden
        </Button>
      </div>

      {/* Counts */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Inbox className="h-4 w-4 text-emerald-600" />} label="Offen" value={counts.open} />
        <StatCard icon={<Clock className="h-4 w-4 text-amber-600" />} label="Wartend" value={counts.pending} />
        <StatCard icon={<AlertTriangle className="h-4 w-4 text-red-600" />} label="Dringend" value={counts.urgent} />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Suche: Betreff, Tenant, Kunde"
                className="pl-8 h-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="open">Offen</SelectItem>
                <SelectItem value="pending">Wartend</SelectItem>
                <SelectItem value="resolved">Gelöst</SelectItem>
                <SelectItem value="closed">Geschlossen</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Priorität" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Prioritäten</SelectItem>
                <SelectItem value="urgent">Dringend</SelectItem>
                <SelectItem value="high">Hoch</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Niedrig</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <ShimmerSkeleton key={i} className="h-16" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-sm font-medium">Keine Tickets im aktuellen Filter</p>
              <p className="text-xs text-muted-foreground">Alles ruhig!</p>
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map(t => (
                <li key={t.id}>
                  <div className="flex items-start gap-3 p-3 hover:bg-muted/30 transition-colors">
                    <div className="flex flex-col gap-1 shrink-0">
                      <Badge variant="outline" className={`${PRIORITY_TONE[t.priority] || ''} text-[10px] h-5 px-2 gap-1`}>
                        {t.priority === 'urgent' && <AlertTriangle className="h-2.5 w-2.5" />}
                        {t.priority}
                      </Badge>
                      <Badge variant="outline" className={`${STATUS_TONE[t.status] || ''} text-[10px] h-5 px-2`}>
                        {t.status}
                      </Badge>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{t.subject}</div>
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                        <Link to={`/admin/tenants/${t.tenantId}`} className="flex items-center gap-1 hover:text-primary transition-colors">
                          <ExternalLink className="h-3 w-3" />
                          {t.tenantName}
                        </Link>
                        {t.customerEmail && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {t.customerEmail}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {relativeTime(t.createdAt)}
                        </span>
                        {t.assignedTo && (
                          <span className="flex items-center gap-1">
                            <UserIcon className="h-3 w-3" />
                            {t.assignedTo.slice(0, 8)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          {icon}{label}
        </div>
        <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}
