import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Search, RefreshCw, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { listAdminUsers, listAdminTenants, updateUserRole } from '@/services/supabase/admin';
import type { AdminUser, AdminTenant } from '@/types/admin';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-700',
  manager: 'bg-blue-100 text-blue-700',
  user: 'bg-muted text-muted-foreground',
};

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
    setSheetOpen(true);
  };

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
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{t('User Detail')}</SheetTitle>
          </SheetHeader>
          {selectedUser && (
            <div className="mt-6 space-y-4">
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">{t('Name')}</dt>
                  <dd className="text-sm">{selectedUser.fullName || '-'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">{t('Email')}</dt>
                  <dd className="text-sm">{selectedUser.email}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">{t('Tenant')}</dt>
                  <dd className="text-sm">
                    <Link to={`/admin/tenants/${selectedUser.tenantId}`} className="text-primary hover:underline">
                      {selectedUser.tenantName}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">{t('Role')}</dt>
                  <dd><Badge className={ROLE_COLORS[selectedUser.role] || ''} variant="secondary">{selectedUser.role}</Badge></dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">{t('Super Admin')}</dt>
                  <dd className="text-sm">{selectedUser.isSuperAdmin ? 'Yes' : 'No'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">{t('Created')}</dt>
                  <dd className="text-sm">{formatDate(selectedUser.createdAt, locale)}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">{t('Last Login')}</dt>
                  <dd className="text-sm">{selectedUser.lastSignInAt ? formatDate(selectedUser.lastSignInAt, locale) : t('Never')}</dd>
                </div>
              </dl>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
