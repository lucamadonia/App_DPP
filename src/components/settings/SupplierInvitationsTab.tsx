import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Copy, XCircle, Loader2, Search, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import {
  getSupplierInvitations,
  createSupplierInvitation,
  cancelSupplierInvitation,
} from '@/services/supabase/supplier-portal';
import type { SupplierInvitation, SupplierInvitationStatus } from '@/types/supplier-portal';

// Status badge configuration
const STATUS_CONFIG: Record<SupplierInvitationStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline', color: string }> = {
  pending: { variant: 'default', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  completed: { variant: 'outline', color: 'text-green-600 bg-green-50 border-green-200' },
  expired: { variant: 'secondary', color: 'text-gray-600 bg-gray-50 border-gray-200' },
  cancelled: { variant: 'destructive', color: 'text-red-600 bg-red-50 border-red-200' },
};

export function SupplierInvitationsTab() {
  const { t } = useTranslation('settings');
  const locale = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Create invitation form state
  const [newInvitation, setNewInvitation] = useState({
    email: '',
    contactName: '',
    companyName: '',
  });
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // Fetch invitations
  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['supplier-invitations'],
    queryFn: getSupplierInvitations,
  });

  // Create invitation mutation
  const createMutation = useMutation({
    mutationFn: createSupplierInvitation,
    onSuccess: (result) => {
      setGeneratedLink(result.invitationUrl);
      // Copy to clipboard
      navigator.clipboard.writeText(result.invitationUrl);
      toast({
        title: t('Invitation Created'),
        description: t('Link copied to clipboard!'),
      });
      queryClient.invalidateQueries({ queryKey: ['supplier-invitations'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('Error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Cancel invitation mutation
  const cancelMutation = useMutation({
    mutationFn: cancelSupplierInvitation,
    onSuccess: () => {
      toast({
        title: t('Invitation Cancelled'),
        description: t('The invitation has been cancelled successfully'),
      });
      queryClient.invalidateQueries({ queryKey: ['supplier-invitations'] });
    },
    onError: (error: Error) => {
      toast({
        title: t('Error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Filter invitations
  const filteredInvitations = invitations.filter((inv) => {
    const matchesSearch = !search ||
      inv.email.toLowerCase().includes(search.toLowerCase()) ||
      inv.contactName?.toLowerCase().includes(search.toLowerCase()) ||
      inv.companyName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination
  const pageSize = 10;
  const totalPages = Math.ceil(filteredInvitations.length / pageSize);
  const paginatedInvitations = filteredInvitations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const handleCreateInvitation = () => {
    if (!newInvitation.email) {
      toast({
        title: t('Validation Error'),
        description: t('Email is required'),
        variant: 'destructive',
      });
      return;
    }

    createMutation.mutate({
      email: newInvitation.email,
      contactName: newInvitation.contactName || undefined,
      companyName: newInvitation.companyName || undefined,
    });
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setGeneratedLink(null);
    setNewInvitation({ email: '', contactName: '', companyName: '' });
  };

  const handleCopyLink = (invitationCode: string) => {
    const url = `${window.location.origin}/suppliers/register/${invitationCode}`;
    navigator.clipboard.writeText(url);
    toast({
      title: t('Link Copied'),
      description: t('Invitation link copied to clipboard'),
    });
  };

  const handleCancelInvitation = (invitationId: string) => {
    if (confirm(t('Are you sure you want to cancel this invitation?'))) {
      cancelMutation.mutate(invitationId);
    }
  };

  // Count by status
  const statusCounts = {
    all: invitations.length,
    pending: invitations.filter(i => i.status === 'pending').length,
    completed: invitations.filter(i => i.status === 'completed').length,
    expired: invitations.filter(i => i.status === 'expired').length,
    cancelled: invitations.filter(i => i.status === 'cancelled').length,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                {t('Supplier Invitations')}
              </CardTitle>
              <CardDescription>
                {t('Manage supplier registration invitations and track their status')}
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('New Invitation')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Tabs */}
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
            <TabsList>
              <TabsTrigger value="all">
                {t('All')} ({statusCounts.all})
              </TabsTrigger>
              <TabsTrigger value="pending">
                {t('Pending')} ({statusCounts.pending})
              </TabsTrigger>
              <TabsTrigger value="completed">
                {t('Completed')} ({statusCounts.completed})
              </TabsTrigger>
              <TabsTrigger value="expired">
                {t('Expired')} ({statusCounts.expired})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                {t('Cancelled')} ({statusCounts.cancelled})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder={t('Search by email or company name...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Table */}
          {filteredInvitations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="mx-auto h-12 w-12 opacity-30 mb-2" />
              <p>{t('No invitations found')}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Email')}</TableHead>
                      <TableHead>{t('Contact')}</TableHead>
                      <TableHead>{t('Company')}</TableHead>
                      <TableHead>{t('Status')}</TableHead>
                      <TableHead>{t('Invited At')}</TableHead>
                      <TableHead>{t('Expires At')}</TableHead>
                      <TableHead className="text-right">{t('Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedInvitations.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">{inv.email}</TableCell>
                        <TableCell>{inv.contactName || '-'}</TableCell>
                        <TableCell>{inv.companyName || '-'}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_CONFIG[inv.status].color}>
                            {t(inv.status.charAt(0).toUpperCase() + inv.status.slice(1))}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(inv.createdAt, locale)}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(inv.expiresAt, locale)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              title={t('Copy Link')}
                              onClick={() => handleCopyLink(inv.invitationCode)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {inv.status === 'pending' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                title={t('Cancel')}
                                onClick={() => handleCancelInvitation(inv.id)}
                                disabled={cancelMutation.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {t('Showing {{from}} to {{to}} of {{total}} invitations', {
                      from: Math.min((currentPage - 1) * pageSize + 1, filteredInvitations.length),
                      to: Math.min(currentPage * pageSize, filteredInvitations.length),
                      total: filteredInvitations.length,
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      {t('Previous')}
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {t('Page {{page}} of {{total}}', { page: currentPage, total: totalPages })}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      {t('Next')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Invitation Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => !open && handleCloseDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Create Supplier Invitation')}</DialogTitle>
            <DialogDescription>
              {t('Generate an invitation link for a new supplier. Please send the link manually via email.')}
            </DialogDescription>
          </DialogHeader>

          {generatedLink ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('Invitation Link')}</Label>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      toast({
                        title: t('Copied'),
                        description: t('Link copied to clipboard!'),
                      });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('Note: Please send this link manually to the supplier via email or other communication channel.')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('Email')} *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="supplier@example.com"
                  value={newInvitation.email}
                  onChange={(e) => setNewInvitation({ ...newInvitation, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">{t('Contact Name')}</Label>
                <Input
                  id="contactName"
                  placeholder="John Doe"
                  value={newInvitation.contactName}
                  onChange={(e) => setNewInvitation({ ...newInvitation, contactName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">{t('Company Name')}</Label>
                <Input
                  id="companyName"
                  placeholder="ABC Supplies GmbH"
                  value={newInvitation.companyName}
                  onChange={(e) => setNewInvitation({ ...newInvitation, companyName: e.target.value })}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              {generatedLink ? t('Close') : t('Cancel', { ns: 'common' })}
            </Button>
            {!generatedLink && (
              <Button
                onClick={handleCreateInvitation}
                disabled={!newInvitation.email || createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('Creating...')}
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    {t('Generate Link & Copy')}
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
