import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, Package, MessageSquare, Plus, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomerKPICards } from '@/components/customer/CustomerKPICards';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { getCustomerDashboardStats } from '@/services/supabase/customer-portal';
import type { CustomerDashboardStats } from '@/types/customer-portal';

export function CustomerDashboardPage() {
  const { t } = useTranslation('customer-portal');
  const navigate = useNavigate();
  const { tenantSlug, customerProfile, branding } = useCustomerPortal();
  const [stats, setStats] = useState<CustomerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      const data = await getCustomerDashboardStats();
      setStats(data);
      setLoading(false);
    }
    loadStats();
  }, []);

  const firstName = customerProfile?.firstName || customerProfile?.displayName?.split(' ')[0] || '';
  const primaryColor = branding.primaryColor;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Gradient Welcome Banner */}
      <div
        className="rounded-xl p-6 text-white relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}, ${branding.secondaryColor || primaryColor}cc)`,
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 opacity-80" />
            <h1 className="text-2xl font-bold">
              {firstName ? t('Welcome back, {{name}}', { name: firstName }) : t('Welcome back')}
            </h1>
          </div>
          <p className="opacity-90 text-sm">
            {branding.welcomeMessage || t('Here is an overview of your returns and tickets.')}
          </p>
        </div>
        {/* Decorative circles */}
        <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -right-2 -bottom-8 w-24 h-24 rounded-full bg-white/5" />
      </div>

      {/* KPI Cards */}
      {stats && <CustomerKPICards stats={stats} />}

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={() => navigate(`/customer/${tenantSlug}/returns/new`)}
          className="gap-2 shadow-sm"
          style={{ backgroundColor: primaryColor }}
        >
          <Plus className="h-4 w-4" />
          {t('New Return')}
        </Button>
        <Button variant="outline" onClick={() => navigate(`/customer/${tenantSlug}/tickets`)} className="gap-2">
          <MessageSquare className="h-4 w-4" />
          {t('Contact Support')}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Returns */}
        <Card className="border-0 shadow-sm" style={{ backgroundColor: branding.cardBackground }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                {t('Recent Returns')}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/customer/${tenantSlug}/returns`)}
                className="gap-1 text-xs"
              >
                {t('View All')}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recentReturns.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('No returns yet')}</p>
            ) : (
              <div className="space-y-1">
                {stats?.recentReturns.map((ret) => (
                  <div
                    key={ret.id}
                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/customer/${tenantSlug}/returns/${ret.id}`)}
                  >
                    <div>
                      <p className="text-sm font-medium">{ret.returnNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ret.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <ReturnStatusBadge status={ret.status as import('@/types/returns-hub').ReturnStatus} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Messages */}
        <Card className="border-0 shadow-sm" style={{ backgroundColor: branding.cardBackground }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                {t('Recent Messages')}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/customer/${tenantSlug}/tickets`)}
                className="gap-1 text-xs"
              >
                {t('View All')}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recentMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">{t('No messages yet')}</p>
            ) : (
              <div className="space-y-1">
                {stats?.recentMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/customer/${tenantSlug}/tickets/${msg.ticketId}`)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium truncate flex-1">{msg.ticketSubject}</p>
                      <Badge variant={msg.senderType === 'agent' ? 'default' : 'secondary'} className="text-[10px]">
                        {msg.senderType === 'agent' ? t('Support') : t('You')}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
