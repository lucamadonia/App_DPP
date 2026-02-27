import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plug, Unplug, CheckCircle2, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  saveShopifyAccessToken,
  testShopifyConnection,
  disconnectShopify,
} from '@/services/supabase/shopify-integration';
import type { ShopifyIntegrationSettings } from '@/types/shopify';
import { useToast } from '@/hooks/use-toast';

interface Props {
  settings: ShopifyIntegrationSettings | null;
  onRefresh: () => void;
}

export function ShopifyConnectionCard({ settings, onRefresh }: Props) {
  const { t } = useTranslation('warehouse');
  const { toast } = useToast();

  const [shopDomain, setShopDomain] = useState(settings?.shopDomain || '');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [testResult, setTestResult] = useState<{
    shopName: string; domain: string; email: string; plan: string;
  } | null>(null);

  const isConnected = settings?.enabled && settings?.shopDomain;

  async function handleConnect() {
    if (!shopDomain || !accessToken) return;
    setConnecting(true);
    try {
      await saveShopifyAccessToken(shopDomain.trim(), accessToken.trim());
      toast({ title: t('Connection successful') });
      setAccessToken('');
      onRefresh();
    } catch (err) {
      toast({ title: t('Connection failed'), description: String(err), variant: 'destructive' });
    } finally {
      setConnecting(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testShopifyConnection();
      setTestResult(result);
      toast({ title: t('Connection successful') });
      onRefresh();
    } catch (err) {
      toast({ title: t('Connection failed'), description: String(err), variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    try {
      await disconnectShopify();
      setTestResult(null);
      setShopDomain('');
      toast({ title: t('Disconnect') });
      onRefresh();
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5" />
              {t('Connection')}
            </CardTitle>
            <CardDescription>
              {t('Connect your Shopify store')}
            </CardDescription>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-green-500/10 text-green-600 border-green-200' : ''}>
            {isConnected ? (
              <><CheckCircle2 className="mr-1 h-3 w-3" />{t('Connected')}</>
            ) : (
              <><XCircle className="mr-1 h-3 w-3" />{t('Not Connected')}</>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <>
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('Shop Domain')}</span>
                <span className="text-sm font-medium">{settings?.shopDomain}</span>
              </div>
              {(settings?.shopName || testResult?.shopName) && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('Shop Name')}</span>
                  <span className="text-sm font-medium">{settings?.shopName || testResult?.shopName}</span>
                </div>
              )}
              {testResult?.plan && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('Shop Plan')}</span>
                  <span className="text-sm font-medium">{testResult.plan}</span>
                </div>
              )}
              {settings?.connectedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('Connected')}</span>
                  <span className="text-sm font-medium">
                    {new Date(settings.connectedAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                {testing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('Test Connection')}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={disconnecting}>
                    <Unplug className="mr-2 h-4 w-4" />
                    {t('Disconnect')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('Disconnect Shopify?')}</AlertDialogTitle>
                    <AlertDialogDescription>{t('Disconnect confirmation')}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('Cancel', { ns: 'common' })}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {disconnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t('Disconnect')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="shop-domain">{t('Shop Domain')}</Label>
              <Input
                id="shop-domain"
                placeholder={t('Shop Domain Placeholder')}
                value={shopDomain}
                onChange={e => setShopDomain(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="access-token">{t('Access Token')}</Label>
              <div className="relative">
                <Input
                  id="access-token"
                  type={showToken ? 'text' : 'password'}
                  placeholder="shpat_..."
                  value={accessToken}
                  onChange={e => setAccessToken(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('Access Token Help')}</p>
            </div>
            <Button onClick={handleConnect} disabled={connecting || !shopDomain || !accessToken}>
              {connecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plug className="mr-2 h-4 w-4" />
              {t('Connect')}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
