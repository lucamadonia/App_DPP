import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Package, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReturnStatusBadge } from '@/components/returns/ReturnStatusBadge';
import { ReturnTimeline } from '@/components/returns/ReturnTimeline';
import { publicTrackReturn } from '@/services/supabase';
import type { RhReturn, RhReturnTimeline as TimelineType } from '@/types/returns-hub';

export function PublicReturnTrackingPage() {
  const { t } = useTranslation('returns');
  const [returnNumber, setReturnNumber] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [returnData, setReturnData] = useState<RhReturn | null>(null);
  const [timeline, setTimeline] = useState<TimelineType[]>([]);

  const handleSearch = async () => {
    if (!returnNumber.trim()) return;
    setLoading(true);
    setError('');

    const result = await publicTrackReturn(returnNumber.trim(), email || undefined);

    if (!result.returnData) {
      setReturnData(null);
      setTimeline([]);
      setError(t('Return not found'));
      setLoading(false);
      return;
    }

    setReturnData(result.returnData);
    setTimeline(result.timeline as TimelineType[]);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Package className="h-6 w-6 text-primary" />
          <div>
            <h1 className="font-semibold">{t('Track Return')}</h1>
            <p className="text-xs text-muted-foreground">{t('Check the status of your return')}</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-8 pb-8">
        {!returnData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('Track Return')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{t('Enter your return number and email to track your return')}</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>{t('Return Number')}</Label>
                  <Input value={returnNumber} onChange={(e) => setReturnNumber(e.target.value)}
                    placeholder="RET-20260131-XXXX0"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
                </div>
                <div className="space-y-2">
                  <Label>{t('Email Address')}</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button onClick={handleSearch} disabled={loading || !returnNumber.trim()} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                {t('Check Status')}
              </Button>
            </CardContent>
          </Card>
        )}

        {returnData && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{returnData.returnNumber}</CardTitle>
                    <p className="text-sm text-muted-foreground">{t('Created')} {new Date(returnData.createdAt).toLocaleDateString()}</p>
                  </div>
                  <ReturnStatusBadge status={returnData.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground">{t('Current Status')}</span>
                    <p className="font-medium"><ReturnStatusBadge status={returnData.status} /></p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('Desired Solution')}</span>
                    <p className="font-medium capitalize">{returnData.desiredSolution ? t(returnData.desiredSolution.charAt(0).toUpperCase() + returnData.desiredSolution.slice(1)) : '—'}</p>
                  </div>
                </div>
                {returnData.trackingNumber && (
                  <div>
                    <span className="text-muted-foreground">{t('Tracking Number')}</span>
                    <p className="font-medium">{returnData.trackingNumber}</p>
                  </div>
                )}
                {returnData.refundAmount != null && (
                  <div>
                    <span className="text-muted-foreground">{t('Refund Amount')}</span>
                    <p className="font-medium">{returnData.refundAmount.toFixed(2)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('Return Timeline')}</CardTitle>
              </CardHeader>
              <CardContent>
                <ReturnTimeline entries={timeline} />
              </CardContent>
            </Card>

            {returnData.labelUrl && (
              <Card>
                <CardContent className="pt-4">
                  <Button asChild className="w-full">
                    <a href={returnData.labelUrl} target="_blank" rel="noopener noreferrer">
                      {t('Download Label')}
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Button variant="outline" className="w-full" onClick={() => { setReturnData(null); setTimeline([]); }}>
              {t('Track another return')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
