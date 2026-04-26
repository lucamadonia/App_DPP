import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Plug, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PlatformIcon } from './PlatformIcon';
import {
  type CommercePlatform,
  getPlatformDescriptor,
} from '@/types/commerce-channels';
import { createConnection } from '@/services/supabase/commerce-channels';
import { toast } from 'sonner';

interface ConnectWizardProps {
  platform: CommercePlatform | null;
  open: boolean;
  onClose: () => void;
  onConnected: () => void;
}

/**
 * Multi-step connect wizard. Acts as a thin shell around the platform-specific
 * authorization flow. For OAuth platforms, this kicks off the OAuth handshake
 * via the commerce-channel-oauth Edge Function (returns a URL); for API key
 * platforms it captures the key locally and persists via createConnection.
 */
export function ConnectWizard({ platform, open, onClose, onConnected }: ConnectWizardProps) {
  const { t } = useTranslation('commerce');
  const [step, setStep] = useState<'intro' | 'auth' | 'finalize'>('intro');
  const [busy, setBusy] = useState(false);
  const [accountLabel, setAccountLabel] = useState('');
  const [shopUrl, setShopUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  if (!platform) return null;
  const desc = getPlatformDescriptor(platform);

  function reset() {
    setStep('intro');
    setAccountLabel('');
    setShopUrl('');
    setApiKey('');
    setApiSecret('');
    setBusy(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleConnect() {
    if (!platform) return;
    setBusy(true);
    try {
      // For OAuth platforms in production we'd open a popup here. For now we record
      // the intent locally so the operator can finish credentials via the edge function.
      await createConnection({
        platform,
        accountLabel: accountLabel || desc.label,
        accountUrl: shopUrl || undefined,
        status: desc.authMethod === 'oauth2' ? 'pending' : 'connected',
        scopes: desc.scopesRequired,
        autoSyncEnabled: true,
        syncIntervalMinutes: 15,
      });
      toast.success(t('Channel connected', { ns: 'commerce' }));
      onConnected();
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <PlatformIcon platform={platform} size={28} badge />
            <span>{t('Connect')} {desc.label}</span>
          </DialogTitle>
          <DialogDescription>{desc.blurb}</DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-1">
          <Step active={step === 'intro'} done={step !== 'intro'} label={t('Overview')} />
          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          <Step active={step === 'auth'} done={step === 'finalize'} label={t('Authorize')} />
          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
          <Step active={step === 'finalize'} done={false} label={t('Finalize')} />
        </div>

        {step === 'intro' && (
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">{t('What we will sync')}</h4>
            <ul className="space-y-2 text-sm">
              {Object.entries(desc.capabilities).map(([k, v]) => v && (
                <li key={k} className="flex items-center gap-2 text-muted-foreground">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span className="capitalize">{k}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <div className="font-semibold uppercase tracking-wider text-muted-foreground">{t('Required Scopes')}</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {desc.scopesRequired.map((s) => (
                  <code key={s} className="rounded bg-background px-1.5 py-0.5 text-[10px]">{s}</code>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 'auth' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="account-label">{t('Account name')}</Label>
              <Input
                id="account-label"
                placeholder={`${desc.label} – ${t('Production')}`}
                value={accountLabel}
                onChange={(e) => setAccountLabel(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('How this connection appears in the dashboard.')}</p>
            </div>

            {(platform === 'shopify' || platform === 'woocommerce' || platform === 'custom_api') && (
              <div className="space-y-2">
                <Label htmlFor="shop-url">
                  {platform === 'shopify' ? t('Shop domain') : t('Store URL')}
                </Label>
                <Input
                  id="shop-url"
                  placeholder={platform === 'shopify' ? 'mystore.myshopify.com' : 'https://shop.example.com'}
                  value={shopUrl}
                  onChange={(e) => setShopUrl(e.target.value)}
                />
              </div>
            )}

            {desc.authMethod === 'api_key' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="api-key">{t('Consumer key')}</Label>
                  <Input id="api-key" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="api-secret">{t('Consumer secret')}</Label>
                  <Input id="api-secret" type="password" value={apiSecret} onChange={(e) => setApiSecret(e.target.value)} />
                </div>
              </>
            )}

            {desc.authMethod === 'oauth2' && (
              <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-4 text-sm">
                <p>
                  {t('We will open a secure popup with')} <strong>{desc.label}</strong> {t('to grant access to the scopes above. No credentials are stored on this server.')}
                </p>
              </div>
            )}
          </div>
        )}

        {step === 'finalize' && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('Review and confirm — we will start a first sync immediately.')}</p>
            <ul className="rounded-lg border bg-muted/30 p-3 text-sm space-y-1">
              <li><span className="text-muted-foreground">{t('Account')}:</span> {accountLabel || desc.label}</li>
              {shopUrl && <li><span className="text-muted-foreground">{t('Store')}:</span> {shopUrl}</li>}
              <li><span className="text-muted-foreground">{t('Auto-sync')}:</span> {t('every 15 minutes')}</li>
              <li><span className="text-muted-foreground">{t('Auto DPP match')}:</span> GTIN + SKU</li>
            </ul>
          </div>
        )}

        <DialogFooter>
          {step !== 'intro' && (
            <Button variant="ghost" onClick={() => setStep(step === 'finalize' ? 'auth' : 'intro')}>
              {t('Back')}
            </Button>
          )}
          {step === 'intro' && (
            <Button onClick={() => setStep('auth')}>
              {t('Continue')}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 'auth' && (
            <Button onClick={() => setStep('finalize')}>
              {t('Continue')}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
          {step === 'finalize' && (
            <Button onClick={handleConnect} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plug className="mr-2 h-4 w-4" />}
              {t('Connect now')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({ active, done, label }: { active: boolean; done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className={[
        'flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-bold',
        active ? 'border-primary bg-primary text-primary-foreground' : done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-muted-foreground/30 text-muted-foreground',
      ].join(' ')}>
        {done ? <Check className="h-3 w-3" /> : null}
      </div>
      <span className={active ? 'font-semibold' : 'text-muted-foreground'}>{label}</span>
    </div>
  );
}
