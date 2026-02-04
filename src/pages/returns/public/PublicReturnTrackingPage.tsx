import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Search, SearchX, Download, MessageSquare, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { StatusPipeline } from '@/components/returns/public/StatusPipeline';
import { AnimatedTimeline } from '@/components/returns/public/AnimatedTimeline';
import { ContactSupportForm } from '@/components/returns/public/ContactSupportForm';
import { publicTrackReturn, publicGetReturnItems, getCustomerPortalBranding } from '@/services/supabase';
import { supabase } from '@/lib/supabase';
import { applyPrimaryColor } from '@/lib/dynamic-theme';
import type { RhReturn, RhReturnTimeline as TimelineType } from '@/types/returns-hub';
import type { CustomerPortalBrandingOverrides } from '@/types/customer-portal';

interface ReturnItem {
  id: string;
  name: string;
  quantity: number;
  condition?: string;
  photos: string[];
}

export function PublicReturnTrackingPage() {
  const { t } = useTranslation('returns');
  const { returnNumber: paramReturnNumber } = useParams();
  const [returnNumberInput, setReturnNumberInput] = useState(paramReturnNumber || '');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [returnData, setReturnData] = useState<RhReturn | null>(null);
  const [timeline, setTimeline] = useState<TimelineType[]>([]);
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [supportOpen, setSupportOpen] = useState(false);
  const [tenantSlug, setTenantSlug] = useState<string>('');
  const [tenantName, setTenantName] = useState<string>('');
  const [branding, setBranding] = useState<CustomerPortalBrandingOverrides | null>(null);

  // Auto-search if returnNumber is in URL
  useEffect(() => {
    if (paramReturnNumber) {
      handleSearch(paramReturnNumber);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramReturnNumber]);

  const handleSearch = async (searchNumber?: string) => {
    const number = searchNumber || returnNumberInput.trim();
    if (!number) return;
    setLoading(true);
    setError('');

    const result = await publicTrackReturn(number, email || undefined);

    if (!result.returnData) {
      setReturnData(null);
      setTimeline([]);
      setItems([]);
      setError(t('Return not found. Please check your return number and try again.'));
      setLoading(false);
      return;
    }

    setReturnData(result.returnData);
    setTimeline(result.timeline as TimelineType[]);

    // Fetch tenant slug and branding from tenant ID
    if (result.returnData.tenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', result.returnData.tenantId)
        .single();
      if (tenant?.slug) {
        setTenantSlug(tenant.slug);

        // Load branding
        const brandingData = await getCustomerPortalBranding(tenant.slug);
        if (brandingData) {
          setTenantName(brandingData.name);
          setBranding(brandingData.branding);
          // Apply primary color to the page
          if (brandingData.branding.primaryColor) {
            applyPrimaryColor(brandingData.branding.primaryColor);
          }
          // Update document title
          if (brandingData.name) {
            document.title = `${brandingData.name} - ${t('Track Return')}`;
          }
        }
      }
    }

    // Load items
    const returnItems = await publicGetReturnItems(number);
    setItems(returnItems);

    setLoading(false);
  };

  const solutionLabels: Record<string, string> = {
    refund: 'Refund',
    exchange: 'Exchange',
    voucher: 'Voucher',
    repair: 'Repair',
  };

  // Simple branded header
  const renderHeader = () => (
    <header className="bg-white border-b sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {branding?.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={tenantName}
              className="h-9 w-9 rounded-lg object-contain"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: branding?.primaryColor || '#3B82F6' }}
            >
              <Package className="h-5 w-5" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground">
              {tenantName || t('Returns Portal')}
            </span>
            <span className="text-xs text-muted-foreground">
              {t('Track Return')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );

  // Search form view
  if (!returnData && !loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {renderHeader()}
        <div className="max-w-lg mx-auto px-4 py-12 animate-fade-in-up">
        <Card>
          <CardHeader className="text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-3">
              <Search className="h-7 w-7" />
            </div>
            <CardTitle>{t('Track Return')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {t('Enter your return number and email to track your return')}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t('Return Number')}</Label>
              <Input
                value={returnNumberInput}
                onChange={(e) => setReturnNumberInput(e.target.value)}
                placeholder="RET-20260131-XXXX0"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>{t('Email Address')}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {error && (
              <div className="text-center py-4 animate-scale-in">
                <SearchX className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-destructive font-medium mb-2">{error}</p>
                <ul className="text-xs text-muted-foreground space-y-1 text-left list-disc list-inside">
                  <li>{t('Make sure you entered the correct return number')}</li>
                  <li>{t('Check your confirmation email for the correct number')}</li>
                </ul>
              </div>
            )}

            <Button
              onClick={() => handleSearch()}
              disabled={loading || !returnNumberInput.trim()}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              {t('Check Status')}
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Tracking view
  if (!returnData) return null;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {renderHeader()}
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-4 animate-fade-in-up">
      {/* Status Pipeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('Return Progress')}</CardTitle>
        </CardHeader>
        <CardContent>
          <StatusPipeline status={returnData.status} />
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-mono">{returnData.returnNumber}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {t('Return Date')}: {new Date(returnData.createdAt).toLocaleDateString()}
              </p>
            </div>
            <ReturnStatusBadge status={returnData.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">{t('Current Status')}</span>
              <div className="mt-1"><ReturnStatusBadge status={returnData.status} /></div>
            </div>
            <div>
              <span className="text-muted-foreground">{t('Desired Solution')}</span>
              <p className="font-medium mt-1">
                {returnData.desiredSolution ? t(solutionLabels[returnData.desiredSolution] || returnData.desiredSolution) : '—'}
              </p>
            </div>
            {returnData.trackingNumber && (
              <div>
                <span className="text-muted-foreground">{t('Tracking Number')}</span>
                <p className="font-medium mt-1">{returnData.trackingNumber}</p>
              </div>
            )}
            {returnData.refundAmount != null && (
              <div>
                <span className="text-muted-foreground">{t('Refund Amount')}</span>
                <p className="font-medium mt-1">&euro;{returnData.refundAmount.toFixed(2)}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('Returned Items')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('Quantity')}: {item.quantity}
                      {item.condition && ` · ${t(item.condition.charAt(0).toUpperCase() + item.condition.slice(1))}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Return Timeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatedTimeline entries={timeline} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Quick Actions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            {returnData.labelUrl && (
              <Button asChild variant="outline" className="flex-1">
                <a href={returnData.labelUrl} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  {t('Download Label')}
                </a>
              </Button>
            )}
            <Button variant="outline" className="flex-1" onClick={() => setSupportOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              {t('Contact Support')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Back button */}
      <Button
        variant="outline"
        className="w-full"
        onClick={() => { setReturnData(null); setTimeline([]); setItems([]); }}
      >
        {t('Track another return')}
      </Button>

      {/* Support Dialog */}
      <ContactSupportForm
        open={supportOpen}
        onOpenChange={setSupportOpen}
        returnNumber={returnData.returnNumber}
        tenantSlug={tenantSlug}
      />
        </div>
      </main>
    </div>
  );
}
