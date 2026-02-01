import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, Loader2,
  LayoutList, LayoutGrid, Download, ArrowUpDown, ArrowUp, ArrowDown, X, MessageSquareText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  getRhTickets, createRhTicket, addRhTicketMessage, getRhCustomers,
  getTicketStats, bulkUpdateTickets, updateRhTicket,
} from '@/services/supabase';
import { TicketKPICards } from '@/components/returns/TicketKPICards';
import { TicketPriorityBadge } from '@/components/returns/TicketPriorityBadge';
import { TicketSLABadge } from '@/components/returns/TicketSLABadge';
import { TicketAssigneeSelect } from '@/components/returns/TicketAssigneeSelect';
import { TicketTagsEditor } from '@/components/returns/TicketTagsEditor';
import { TicketFilterPanel } from '@/components/returns/TicketFilterPanel';
import { TicketKanbanBoard } from '@/components/returns/TicketKanbanBoard';
import { SkeletonTable } from '@/components/returns/SkeletonTable';
import { SkeletonKPICards } from '@/components/returns/SkeletonKPICards';
import { EmptyState } from '@/components/returns/EmptyState';
import { PaginationBar } from '@/components/returns/PaginationBar';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { relativeTime } from '@/lib/animations';
import type {
  RhTicket, RhCustomer, TicketStatus, TicketStats, TicketsFilter, TicketSortField,
  PaginatedResult,
} from '@/types/returns-hub';

const statusLabels: Record<TicketStatus, string> = {
  open: 'Open', in_progress: 'In Progress', waiting: 'Waiting', resolved: 'Resolved', closed: 'Closed',
};

export function TicketsListPage() {
  const { t, i18n } = useTranslation('returns');
  const navigate = useNavigate();

  // Data
  const [result, setResult] = useState<PaginatedResult<RhTicket>>({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
  const [stats, setStats] = useState<TicketStats>({ open: 0, inProgress: 0, waiting: 0, resolved: 0, closed: 0, overdue: 0, avgFirstResponseMinutes: 0, avgResolutionMinutes: 0 });
  const [loading, setLoading] = useState(true);

  // View & Filters
  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TicketsFilter>({});
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [sortBy, setSortBy] = useState<TicketSortField>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Create ticket dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [customers, setCustomers] = useState<RhCustomer[]>([]);
  const [subject, setSubject] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [ticketPriority, setTicketPriority] = useState('normal');
  const [category, setCategory] = useState('');
  const [initialMessage, setInitialMessage] = useState('');

  // Debounced search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    const queryFilter: TicketsFilter = {
      ...filter,
      sortBy,
      sortOrder,
    };
    if (debouncedSearch) queryFilter.search = debouncedSearch;

    const [data, statsData] = await Promise.all([
      getRhTickets(queryFilter, page, viewMode === 'kanban' ? 200 : 20),
      getTicketStats(),
    ]);
    setResult(data);
    setStats(statsData);
    setLoading(false);
  }, [page, filter, sortBy, sortOrder, debouncedSearch, viewMode]);

  useEffect(() => { load(); }, [load]);

  // Count active filters (excluding search)
  const activeFilterCount = [
    filter.status?.length ? 1 : 0,
    filter.priority?.length ? 1 : 0,
    filter.assignedTo ? 1 : 0,
    filter.category ? 1 : 0,
    filter.dateFrom || filter.dateTo ? 1 : 0,
    filter.slaStatus?.length ? 1 : 0,
    filter.tags?.length ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const toggleSort = (field: TicketSortField) => {
    if (sortBy === field) {
      setSortOrder((prev) => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: TicketSortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 ml-1" /> : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Bulk actions
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === result.data.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(result.data.map((t) => t.id)));
    }
  };

  const handleBulkStatus = async (status: TicketStatus) => {
    if (selectedIds.size === 0) return;
    await bulkUpdateTickets(Array.from(selectedIds), { status });
    setSelectedIds(new Set());
    load();
  };

  const handleBulkAssign = async (assignedTo: string | undefined) => {
    if (selectedIds.size === 0) return;
    await bulkUpdateTickets(Array.from(selectedIds), { assignedTo: assignedTo || undefined });
    setSelectedIds(new Set());
    load();
  };

  // Quick status change (kanban)
  const handleKanbanStatusChange = async (ticketId: string, status: TicketStatus) => {
    await updateRhTicket(ticketId, { status });
    load();
  };

  // CSV Export
  const handleExportCsv = async () => {
    const allData = await getRhTickets({ ...filter, search: debouncedSearch || undefined }, 1, 1000);
    const headers = ['Ticket Number', 'Subject', 'Status', 'Priority', 'Category', 'Tags', 'Created At', 'Updated At'];
    const rows = allData.data.map((tk) => [
      tk.ticketNumber,
      `"${tk.subject.replace(/"/g, '""')}"`,
      tk.status,
      tk.priority,
      tk.category || '',
      tk.tags.join('; '),
      tk.createdAt,
      tk.updatedAt,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tickets-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Create dialog
  const openDialog = async () => {
    setSubject('');
    setCustomerId('');
    setTicketPriority('normal');
    setCategory('');
    setInitialMessage('');
    const custResult = await getRhCustomers(undefined, 1, 100);
    setCustomers(custResult.data);
    setDialogOpen(true);
  };

  const handleCreateTicket = async () => {
    if (!subject.trim()) return;
    setCreating(true);

    const result = await createRhTicket({
      subject: subject.trim(),
      customerId: customerId || undefined,
      priority: ticketPriority as RhTicket['priority'],
      category: category || undefined,
    });

    if (result.success && result.id) {
      if (initialMessage.trim()) {
        await addRhTicketMessage({
          ticketId: result.id,
          senderType: 'agent',
          content: initialMessage.trim(),
          attachments: [],
          isInternal: false,
        });
      }
      setDialogOpen(false);
      navigate(`/returns/tickets/${result.id}`);
    }
    setCreating(false);
  };

  const rowVisibility = useStaggeredList(result.data.length, { interval: 40 });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('Ticket List')}</h1>
          <p className="text-muted-foreground">{result.total} {t('Tickets')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-1" />
            {t('Export Tickets CSV')}
          </Button>
          <Button onClick={openDialog}>
            <Plus className="h-4 w-4 mr-2" />
            {t('New Ticket')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? <SkeletonKPICards count={4} /> : <TicketKPICards stats={stats} />}

      {/* Toolbar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('Search by ticket number, subject...')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterPanelOpen(true)}
              >
                <Filter className="h-4 w-4 mr-1" />
                {t('Advanced Filters')}
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setFilter({})}>
                  <X className="h-4 w-4 mr-1" />
                  {t('Reset Filters')}
                </Button>
              )}
              <div className="flex border rounded-md">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-r-none"
                  onClick={() => setViewMode('table')}
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-l-none"
                  onClick={() => setViewMode('kanban')}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bulk Actions Bar */}
          {selectedIds.size > 0 && viewMode === 'table' && (
            <div className="flex items-center gap-3 mb-4 p-2 bg-muted rounded-md">
              <span className="text-sm font-medium">{t('{{count}} selected', { count: selectedIds.size })}</span>
              <Select onValueChange={(v) => handleBulkStatus(v as TicketStatus)}>
                <SelectTrigger className="w-36 h-8"><SelectValue placeholder={t('Change Status')} /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(statusLabels) as TicketStatus[]).map(s => (
                    <SelectItem key={s} value={s}>{t(statusLabels[s])}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-40">
                <TicketAssigneeSelect
                  onValueChange={handleBulkAssign}
                  compact={false}
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => handleBulkStatus('closed')}>
                {t('Close Selected')}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {loading ? (
            viewMode === 'kanban' ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-8 bg-muted rounded animate-pulse" />
                    {Array.from({ length: 3 }, (_, j) => (
                      <Card key={j}>
                        <CardContent className="p-3 animate-pulse space-y-2">
                          <div className="h-3 bg-muted rounded w-16" />
                          <div className="h-4 bg-muted rounded w-full" />
                          <div className="h-3 bg-muted rounded w-20" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <SkeletonTable rows={8} columns={10} />
            )
          ) : viewMode === 'kanban' ? (
            <TicketKanbanBoard tickets={result.data} onStatusChange={handleKanbanStatusChange} />
          ) : result.data.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title={t('No tickets found')}
              description={t('No results match your filters')}
              actionLabel={t('New Ticket')}
              onAction={openDialog}
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 pr-2">
                        <Checkbox
                          checked={selectedIds.size === result.data.length && result.data.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="pb-2 font-medium cursor-pointer" onClick={() => toggleSort('created_at')}>
                        <span className="inline-flex items-center">{t('Ticket Number')}<SortIcon field="created_at" /></span>
                      </th>
                      <th className="pb-2 font-medium">{t('Subject')}</th>
                      <th className="pb-2 font-medium cursor-pointer" onClick={() => toggleSort('status')}>
                        <span className="inline-flex items-center">{t('Status')}<SortIcon field="status" /></span>
                      </th>
                      <th className="pb-2 font-medium cursor-pointer" onClick={() => toggleSort('priority')}>
                        <span className="inline-flex items-center">{t('Priority')}<SortIcon field="priority" /></span>
                      </th>
                      <th className="pb-2 font-medium">{t('Assignee')}</th>
                      <th className="pb-2 font-medium">{t('Category')}</th>
                      <th className="pb-2 font-medium">{t('Tags')}</th>
                      <th className="pb-2 font-medium">{t('Date')}</th>
                      <th className="pb-2 font-medium cursor-pointer" onClick={() => toggleSort('sla_resolution_at')}>
                        <span className="inline-flex items-center">{t('SLA')}<SortIcon field="sla_resolution_at" /></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((ticket, i) => (
                      <tr
                        key={ticket.id}
                        className={`border-b last:border-0 cursor-pointer group hover:bg-muted/50 transition-all duration-200 ${
                          rowVisibility[i] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
                        }`}
                        style={{ transition: 'opacity 0.3s ease-out, transform 0.3s ease-out, background-color 0.15s ease' }}
                        onClick={() => navigate(`/returns/tickets/${ticket.id}`)}
                      >
                        <td className="py-3 pr-2" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedIds.has(ticket.id)}
                            onCheckedChange={() => toggleSelect(ticket.id)}
                          />
                        </td>
                        <td className="py-3 relative">
                          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                          <span className="text-primary font-medium pl-2">{ticket.ticketNumber}</span>
                        </td>
                        <td className="py-3 max-w-xs truncate">{ticket.subject}</td>
                        <td className="py-3">
                          <Badge variant="outline" className={`${
                            ticket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                            ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            ticket.status === 'waiting' ? 'bg-purple-100 text-purple-800' :
                            ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {t(statusLabels[ticket.status])}
                          </Badge>
                        </td>
                        <td className="py-3"><TicketPriorityBadge priority={ticket.priority} /></td>
                        <td className="py-3" onClick={(e) => e.stopPropagation()}>
                          <TicketAssigneeSelect
                            value={ticket.assignedTo}
                            onValueChange={async (v) => {
                              await updateRhTicket(ticket.id, { assignedTo: v || undefined });
                              load();
                            }}
                            compact
                          />
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">{ticket.category || '—'}</td>
                        <td className="py-3">
                          <TicketTagsEditor tags={ticket.tags} readOnly />
                        </td>
                        <td className="py-3 text-muted-foreground text-xs">
                          {relativeTime(ticket.createdAt, i18n.language)}
                        </td>
                        <td className="py-3">
                          <TicketSLABadge ticket={ticket} className="text-[10px]" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationBar page={page} totalPages={result.totalPages} onPageChange={setPage} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Filter Panel */}
      <TicketFilterPanel
        open={filterPanelOpen}
        onOpenChange={setFilterPanelOpen}
        filter={filter}
        onFilterChange={(f) => { setFilter(f); setPage(1); }}
      />

      {/* Create Ticket Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('New Ticket')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Subject')} *</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('Ticket subject...')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Customer')}</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('No customer')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('No customer')}</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Priority')}</Label>
                <Select value={ticketPriority} onValueChange={setTicketPriority}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('Low')}</SelectItem>
                    <SelectItem value="normal">{t('Normal')}</SelectItem>
                    <SelectItem value="high">{t('High')}</SelectItem>
                    <SelectItem value="urgent">{t('Urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('Category')}</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder={t('Category')}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Initial Message')}</Label>
              <Textarea
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                placeholder={t('Initial Message')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('Cancel')}</Button>
            <Button onClick={handleCreateTicket} disabled={creating || !subject.trim()}>
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('Create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
