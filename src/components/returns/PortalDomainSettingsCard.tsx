import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Badge } from '@/components/ui/badge';
import { CustomDomainWizard } from '@/components/settings/CustomDomainWizard';
import { updatePortalDomainSettings, removePortalDomain } from '@/services/supabase/rh-settings';
import { addDomainToVercel, removeDomainFromVercel } from '@/services/supabase/vercel-domain';
import { isDomainAvailable } from '@/services/supabase/domain-resolution';
import { verifyDomainCNAME } from '@/services/supabase/domain-verification';
import type { ReturnsHubSettings, PortalDomainSettings } from '@/types/returns-hub';

interface PortalDomainSettingsCardProps {
  settings: ReturnsHubSettings;
  onSettingsChange: (settings: ReturnsHubSettings) => void;
}

export function PortalDomainSettingsCard({
  settings,
  onSettingsChange,
}: PortalDomainSettingsCardProps) {
  const { t } = useTranslation('returns');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [portalType, setPortalType] = useState<'returns' | 'customer' | 'both'>(
    settings.portalDomain?.portalType || 'both'
  );
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isReverifying, setIsReverifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const domain = settings.portalDomain;
  const featureAvailable = settings.features.whitelabelDomain;

  if (!featureAvailable) {
    return (
      <Card className="border-dashed animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('Custom Domain')}
          </CardTitle>
          <CardDescription>
            {t('Connect your own domain so customers see your brand, not ours')}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-6">
          <p className="text-sm text-muted-foreground mb-2">
            {t('Available on Business and Enterprise plans')}
          </p>
          <Button variant="outline" size="sm">
            {t('Upgrade')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleDomainVerified = async (verifiedDomain: string) => {
    setIsRegistering(true);

    // Check domain availability
    const available = await isDomainAvailable(verifiedDomain);
    if (!available) {
      showStatus(t('Domain already in use'), 'error');
      setIsRegistering(false);
      return;
    }

    // Save domain settings
    const domainSettings: PortalDomainSettings = {
      customDomain: verifiedDomain,
      portalType,
      domainStatus: 'verified',
      domainVerifiedAt: new Date().toISOString(),
      vercelDomainAdded: false,
    };

    const saveResult = await updatePortalDomainSettings(domainSettings);
    if (!saveResult.success) {
      showStatus(saveResult.error || 'Failed to save', 'error');
      setIsRegistering(false);
      return;
    }

    // Register with Vercel
    showStatus(t('Adding domain to hosting...'));
    const vercelResult = await addDomainToVercel(verifiedDomain);

    if (vercelResult.success) {
      domainSettings.vercelDomainAdded = true;
      await updatePortalDomainSettings(domainSettings);
    }

    onSettingsChange({
      ...settings,
      portalDomain: domainSettings,
    });

    setIsRegistering(false);
    setWizardOpen(false);

    showStatus(
      vercelResult.success
        ? t('Domain registered successfully')
        : t('Domain saved but hosting registration failed'),
      vercelResult.success ? 'success' : 'error'
    );
  };

  const handleRemoveDomain = async () => {
    if (!domain) return;
    setIsRemoving(true);

    // Remove from Vercel
    if (domain.vercelDomainAdded) {
      await removeDomainFromVercel(domain.customDomain);
    }

    // Remove from settings
    const result = await removePortalDomain();
    if (result.success) {
      onSettingsChange({
        ...settings,
        portalDomain: undefined,
      });
      showStatus(t('Domain removed'));
    }

    setIsRemoving(false);
  };

  const handleReverify = async () => {
    if (!domain) return;
    setIsReverifying(true);

    const result = await verifyDomainCNAME(domain.customDomain);

    const newStatus = result.status === 'verified' ? 'verified' : 'failed';
    const updatedDomain: PortalDomainSettings = {
      ...domain,
      domainStatus: newStatus,
      domainVerifiedAt: newStatus === 'verified' ? new Date().toISOString() : domain.domainVerifiedAt,
    };

    await updatePortalDomainSettings(updatedDomain);
    onSettingsChange({
      ...settings,
      portalDomain: updatedDomain,
    });

    showStatus(
      newStatus === 'verified' ? t('Domain verified') : t('Domain verification failed'),
      newStatus === 'verified' ? 'success' : 'error'
    );

    setIsReverifying(false);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t('Domain verified')}
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {t('Domain pending')}
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t('Domain verification failed')}
          </Badge>
        );
      default:
        return null;
    }
  };

  const portalTypeLabel = (type: string) => {
    switch (type) {
      case 'returns': return t('Returns Portal');
      case 'customer': return t('Customer Portal');
      case 'both': return t('Both Portals');
      default: return type;
    }
  };

  return (
    <>
      <Card className="animate-fade-in-up" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('Custom Domain')}
          </CardTitle>
          <CardDescription>
            {t('Connect your own domain so customers see your brand, not ours')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {domain ? (
            // Domain is configured
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono font-medium">{domain.customDomain}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {portalTypeLabel(domain.portalType)}
                  </p>
                </div>
                {statusBadge(domain.domainStatus)}
              </div>

              {domain.domainStatus === 'verified' && (
                <p className="text-sm text-muted-foreground">
                  {t('Domain is active and serving your portal')}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                {domain.domainStatus === 'verified' && (
                  <a
                    href={`https://${domain.customDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <ExternalLink className="h-3.5 w-3.5" />
                      {t('Open Portal')}
                    </Button>
                  </a>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReverify}
                  disabled={isReverifying}
                  className="gap-1.5"
                >
                  {isReverifying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  {t('Re-verify DNS')}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      disabled={isRemoving}
                    >
                      {isRemoving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      {t('Remove Domain')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('Remove custom domain?')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('This action cannot be undone')}.{' '}
                        {domain.customDomain}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('Cancel')}</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRemoveDomain}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {t('Remove Domain')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            // No domain configured
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('Portal Type')}</Label>
                <Select
                  value={portalType}
                  onValueChange={(v) =>
                    setPortalType(v as 'returns' | 'customer' | 'both')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="returns">{t('Returns Portal')}</SelectItem>
                    <SelectItem value="customer">{t('Customer Portal')}</SelectItem>
                    <SelectItem value="both">{t('Both Portals')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => setWizardOpen(true)}
                disabled={isRegistering}
                className="gap-2"
              >
                {isRegistering ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                {t('Connect Domain')}
              </Button>
            </div>
          )}
          {statusMessage && (
            <p className={`text-sm ${statusMessage.type === 'error' ? 'text-destructive' : 'text-green-600'}`}>
              {statusMessage.text}
            </p>
          )}
        </CardContent>
      </Card>

      <CustomDomainWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        currentDomain={domain?.customDomain}
        onDomainVerified={handleDomainVerified}
        purposeDescription={t('Connect your own domain for the portal')}
        domainPlaceholder="returns.your-company.com"
      />
    </>
  );
}
