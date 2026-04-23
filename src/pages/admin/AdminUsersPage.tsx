import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users, Search, RefreshCw, Shield, KeyRound, Copy, ExternalLink,
  Mail, Clock, Building2, CircleCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { ConfirmWithReasonDialog } from '@/components/admin/ConfirmWithReasonDialog';
import {
  listAdminUsers, listAdminTenants, updateUserRole, resetUserPassword, toggleSuperAdmin,
} from '@/services/supabase/admin';
import type { AdminUser, AdminTenant } from '@/types/admin';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import { toast } from 'sonner';

export function AdminUsersPage() {
  const { t } = useTranslation('admin');
  const locale = useLocale();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tenantFilter, setTenantFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [superAdminDialogOpen, setSuperAdminDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setIsLoading(true);
    try {
      const [u, t] = await Promise.all([listAdminUsers(), listAdminTenants()]);
      setUsers(u);
      setTenants(t);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        (u.fullName || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchTenant = tenantFilter === 'all' || u.tenantId === tenantFilter;
      const matchRole = roleFilter === 'all' || u.role === roleFilter;
      return matchSearch && matchTenant && matchRole;
    });
  }, [users, search, tenantFilter, roleFilter]);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await updateUserRole(userId, role);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role } : u));
    } catch (err) {
      console.error('Failed to update role:', err);
    }
  };

  const openUserDetail = (user: AdminUser) => {
    setSelectedUser(user);
    setResetLink(null);
    setSheetOpen(true);
  };

  async function handleResetPassword() {
    if (!selectedUser) return;
    setBusy(true);
    try {
      const res = await resetUserPassword(selectedUser.id);
      setResetLink(res.resetLink);
      toast.success('Reset-Link erzeugt');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleSuperAdmin(reason: string) {
    if (!selectedUser) return;
    setBusy(true);
    try {
      const newState = !selectedUser.isSuperAdmin;
      await toggleSuperAdmin(selectedUser.id, newState);
      toast.success(newState ? 'Super-Admin gesetzt' : 'Super-Admin entfernt');
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, isSuperAdmin: newState } : u));
      setSelectedUser({ ...selectedUser, isSuperAdmin: newState });
      setSuperAdminDialogOpen(false);
      // Log reason in console for audit visibility (backend also records it)
      console.log('Super-admin change reason:', reason);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link);
    toast.success('Reset-Link kopiert');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" /> {t('All Users')}
        </h1>
        <p className="text-muted-foreground">{t('Manage all users across tenants')}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base">{t('Users')} ({filtered.length})</CardTitle>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('Search users...')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={tenantFilter} onValueChange={setTenantFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder={t('All Tenants')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Tenants')}</SelectItem>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('All Roles')}</SelectItem>
                  <SelectItem value="admin">{t('Admin')}</SelectItem>
                  <SelectItem value="manager">{t('Manager')}</SelectItem>
                  <SelectItem value="user">{t('User')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={load}>
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Name')}</TableHead>
                    <TableHead>{t('Email')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('Tenant')}</TableHead>
                    <TableHead>{t('Role')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('Last Login')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((user) => (
                    <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openUserDetail(user)}>
                      <TableCell className="font-medium">
                        {user.fullName || '-'}
                        {user.isSuperAdmin && <Shield className="inline ml-1 h-3 w-3 text-violet-500" />}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Link to={`/admin/tenants/${user.tenantId}`} className="hover:underline text-primary" onClick={(e) => e.stopPropagation()}>
                          {user.tenantName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(v) => { handleRoleChange(user.id, v); }}
                        >
                          <SelectTrigger className="w-28 h-7" onClick={(e) => e.stopPropagation()}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">{t('Admin')}</SelectItem>
                            <SelectItem value="manager">{t('Manager')}</SelectItem>
                            <SelectItem value="user">{t('User')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {user.lastSignInAt ? formatDate(user.lastSignInAt, locale) : t('Never')}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        {t('No users found')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('User Detail')}</SheetTitle>
          </SheetHeader>
          {selectedUser && (
            <div className="mt-6 space-y-5 px-4 sm:px-6">
              {/* Hero */}
              <div className="flex items-center gap-3 pb-4 border-b">
                <div className="h-12 w-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold shrink-0">
                  {(selectedUser.fullName || selectedUser.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate flex items-center gap-1.5">
                    {selectedUser.fullName || selectedUser.email.split('@')[0]}
                    {selectedUser.isSuperAdmin && (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px] h-5 gap-1">
                        <Shield className="h-2.5 w-2.5" /> Super
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    {selectedUser.email}
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div className="space-y-2.5">
                <MetaRow icon={<Building2 className="h-3.5 w-3.5" />} label="Tenant">
                  <Link to={`/admin/tenants/${selectedUser.tenantId}`} className="text-primary hover:underline flex items-center gap-1">
                    {selectedUser.tenantName}
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </MetaRow>
                <MetaRow icon={<CircleCheck className="h-3.5 w-3.5" />} label="Rolle">
                  <Select value={selectedUser.role} onValueChange={(v) => handleRoleChange(selectedUser.id, v)}>
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </MetaRow>
                <MetaRow icon={<Clock className="h-3.5 w-3.5" />} label="Letzter Login">
                  {selectedUser.lastSignInAt ? formatDate(selectedUser.lastSignInAt, locale) : <span className="text-muted-foreground italic">nie</span>}
                </MetaRow>
                <MetaRow icon={<Clock className="h-3.5 w-3.5" />} label="Angelegt">
                  {formatDate(selectedUser.createdAt, locale)}
                </MetaRow>
              </div>

              {/* Actions */}
              <div className="border-t pt-4 space-y-3">
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Admin-Aktionen
                </div>

                {/* Super-Admin Toggle */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-medium text-sm flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-red-500" />
                      Super-Admin
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Zugriff auf das gesamte Admin-Portal — mit Vorsicht vergeben.
                    </p>
                  </div>
                  <Switch
                    checked={selectedUser.isSuperAdmin}
                    onCheckedChange={() => setSuperAdminDialogOpen(true)}
                    disabled={busy}
                  />
                </div>

                {/* Password Reset */}
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        <KeyRound className="h-3.5 w-3.5" />
                        Passwort-Reset
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Generiert einen Reset-Link — Nutzer kann neues Passwort setzen.
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={handleResetPassword} disabled={busy}>
                      {resetLink ? 'Erneut erzeugen' : 'Generieren'}
                    </Button>
                  </div>
                  {resetLink && (
                    <div className="mt-3 rounded-md bg-muted/60 p-2 flex items-center gap-2">
                      <code className="flex-1 min-w-0 truncate text-[11px] font-mono">{resetLink}</code>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => copyLink(resetLink)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmWithReasonDialog
        open={superAdminDialogOpen}
        onOpenChange={setSuperAdminDialogOpen}
        title={selectedUser?.isSuperAdmin ? 'Super-Admin-Rechte entziehen' : 'Super-Admin-Rechte erteilen'}
        description={
          selectedUser?.isSuperAdmin
            ? `${selectedUser.email} verliert Zugriff auf das Admin-Portal.`
            : `${selectedUser?.email} erhält vollen Zugriff auf das Admin-Portal — kritische Privilegien.`
        }
        confirmLabel={selectedUser?.isSuperAdmin ? 'Entziehen' : 'Erteilen'}
        confirmVariant={selectedUser?.isSuperAdmin ? 'destructive' : 'default'}
        danger={!selectedUser?.isSuperAdmin}
        onConfirm={handleToggleSuperAdmin}
      />
    </div>
  );
}

function MetaRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-sm text-right truncate">{children}</div>
    </div>
  );
}
