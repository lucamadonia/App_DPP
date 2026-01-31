import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Plus,
  Shield,
  Trash2,
  Loader2,
  Mail,
  RefreshCw,
  XCircle,
  CheckCircle2,
  Clock,
  UserX,
  UserCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  getProfiles, updateProfileRole, deactivateUser, reactivateUser,
  removeUserFromTenant, getAdminCount,
  type Profile,
} from '@/services/supabase/profiles';
import {
  getInvitations, cancelInvitation, resendInvitation,
} from '@/services/supabase/invitations';
import type { Invitation } from '@/types/database';
import { InviteUserDialog } from './InviteUserDialog';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { useAuth } from '@/contexts/AuthContext';

export function UsersTab() {
  const { t } = useTranslation('settings');
  const locale = useLocale();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminCount, setAdminCount] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: 'role' | 'deactivate' | 'reactivate' | 'remove';
    userId: string;
    userName: string;
    newRole?: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [profilesData, invitationsData, count] = await Promise.all([
      getProfiles(),
      getInvitations(),
      getAdminCount(),
    ]);
    setUsers(profilesData);
    setInvitations(invitationsData.filter(i => i.status === 'pending'));
    setAdminCount(count);
    setIsLoading(false);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (user.role === 'admin' && newRole !== 'admin' && adminCount <= 1) {
      alert(t('Cannot change the role of the last admin'));
      return;
    }

    setConfirmAction({
      type: 'role',
      userId,
      userName: user.name || user.email,
      newRole,
    });
  };

  const executeAction = async () => {
    if (!confirmAction) return;

    let result;
    switch (confirmAction.type) {
      case 'role':
        result = await updateProfileRole(
          confirmAction.userId,
          confirmAction.newRole as 'admin' | 'editor' | 'viewer'
        );
        break;
      case 'deactivate':
        result = await deactivateUser(confirmAction.userId);
        break;
      case 'reactivate':
        result = await reactivateUser(confirmAction.userId);
        break;
      case 'remove':
        result = await removeUserFromTenant(confirmAction.userId);
        break;
    }

    if (result && !result.success) {
      alert(result.error || t('Action failed'));
    }

    setConfirmAction(null);
    await loadData();
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !search ||
      user.name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const pendingCount = invitations.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Users Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>{t('Users & Roles')}</CardTitle>
              <CardDescription>
                {t('{{count}} users in your organization', { count: users.length })}
              </CardDescription>
            </div>
            <Button onClick={() => setShowInviteDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {t('Invite User')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              placeholder={t('Search by name or email...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('All Roles')}</SelectItem>
                <SelectItem value="admin">{t('Admin')}</SelectItem>
                <SelectItem value="editor">{t('Editor')}</SelectItem>
                <SelectItem value="viewer">{t('Viewer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 opacity-30 mb-2" />
              <p>{t('No users found')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('User')}</TableHead>
                  <TableHead>{t('Role')}</TableHead>
                  <TableHead>{t('Status')}</TableHead>
                  <TableHead>{t('Last Login')}</TableHead>
                  <TableHead className="w-[120px]">{t('Actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id;
                  const initials = (user.name || user.email)
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2);

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {user.name || t('Unknown')}
                              {isCurrentUser && (
                                <span className="text-xs text-muted-foreground ml-1">({t('You')})</span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(v) => handleRoleChange(user.id, v)}
                          disabled={isCurrentUser}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <span className="flex items-center gap-1">
                                <Shield className="h-3 w-3" /> {t('Admin')}
                              </span>
                            </SelectItem>
                            <SelectItem value="editor">{t('Editor')}</SelectItem>
                            <SelectItem value="viewer">{t('Viewer')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.status === 'active' ? 'outline' : 'secondary'}
                          className={user.status === 'active' ? 'text-success border-success' : ''}
                        >
                          {user.status === 'active' && <CheckCircle2 className="mr-1 h-3 w-3" />}
                          {user.status === 'inactive' && <XCircle className="mr-1 h-3 w-3" />}
                          {user.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                          {t(user.status.charAt(0).toUpperCase() + user.status.slice(1))}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {user.lastLogin ? formatDate(user.lastLogin, locale) : '-'}
                      </TableCell>
                      <TableCell>
                        {!isCurrentUser && (
                          <div className="flex items-center gap-1">
                            {user.status === 'active' ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={t('Deactivate User')}
                                onClick={() => setConfirmAction({
                                  type: 'deactivate',
                                  userId: user.id,
                                  userName: user.name || user.email,
                                })}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                title={t('Reactivate User')}
                                onClick={() => setConfirmAction({
                                  type: 'reactivate',
                                  userId: user.id,
                                  userName: user.name || user.email,
                                })}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              title={t('Remove from Organization')}
                              onClick={() => setConfirmAction({
                                type: 'remove',
                                userId: user.id,
                                userName: user.name || user.email,
                              })}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            {t('Pending Invitations')}
            {pendingCount > 0 && (
              <Badge variant="secondary">{pendingCount}</Badge>
            )}
          </CardTitle>
          <CardDescription>{t('Invitations that have not yet been accepted')}</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('No pending invitations')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('Email')}</TableHead>
                  <TableHead>{t('Role')}</TableHead>
                  <TableHead>{t('Invited')}</TableHead>
                  <TableHead>{t('Expires')}</TableHead>
                  <TableHead className="w-[120px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(inv.role.charAt(0).toUpperCase() + inv.role.slice(1))}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(inv.createdAt, locale)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(inv.expiresAt, locale)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={t('Resend')}
                          onClick={async () => {
                            await resendInvitation(inv.id);
                            await loadData();
                          }}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          title={t('Cancel Invitation')}
                          onClick={async () => {
                            await cancelInvitation(inv.id);
                            await loadData();
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Roles Description */}
      <Card>
        <CardHeader>
          <CardTitle>{t('Roles')}</CardTitle>
          <CardDescription>{t('Defined access rights')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium">{t('Admin')}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {t('Full access to all features including settings and user management')}
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium">{t('Editor')}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {t('Can create, edit, and publish products and DPPs')}
              </p>
            </div>
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium">{t('Viewer')}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {t('Read-only access to products and reports')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        onInvited={loadData}
      />

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open: boolean) => !open && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Confirm Action')}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'role' && t('Change the role of {{name}} to {{role}}?', {
                name: confirmAction.userName,
                role: confirmAction.newRole,
              })}
              {confirmAction?.type === 'deactivate' && t('Deactivate {{name}}? They will lose access to the application.', {
                name: confirmAction.userName,
              })}
              {confirmAction?.type === 'reactivate' && t('Reactivate {{name}}?', {
                name: confirmAction.userName,
              })}
              {confirmAction?.type === 'remove' && t('Remove {{name}} from the organization? This action cannot be undone.', {
                name: confirmAction.userName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction}>
              {t('Confirm', { ns: 'common' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
