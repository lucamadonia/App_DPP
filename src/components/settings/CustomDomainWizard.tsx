import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { validateDomain } from '@/lib/domain-utils';
import { DNS_PROVIDERS, CNAME_TARGET, RECOMMENDED_TTL, getSubdomainFromDomain, type DNSProvider } from '@/lib/dns-providers';
import { verifyDomainCNAME, type DNSVerificationResult } from '@/services/supabase/domain-verification';

interface CustomDomainWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDomain?: string;
  onDomainVerified: (domain: string) => void;
}

type WizardStep = 'enter-domain' | 'select-provider' | 'add-cname' | 'verify';

export function CustomDomainWizard({
  open,
  onOpenChange,
  currentDomain,
  onDomainVerified,
}: CustomDomainWizardProps) {
  const { t } = useTranslation('settings');
  const [step, setStep] = useState<WizardStep>('enter-domain');
  const [domain, setDomain] = useState(currentDomain || '');
  const [domainError, setDomainError] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<DNSProvider | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<DNSVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pollCount, setPollCount] = useState(0);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_POLL_COUNT = 30; // 30 * 10s = 5 minutes

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setStep('enter-domain');
      setDomain(currentDomain || '');
      setDomainError('');
      setSelectedProvider(null);
      setVerificationResult(null);
      setIsVerifying(false);
      setPollCount(0);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [open, currentDomain]);

  const handleDomainInput = (value: string) => {
    setDomain(value);
    if (value.trim()) {
      const result = validateDomain(value);
      setDomainError(result.isValid ? '' : (result.errorMessage || ''));
    } else {
      setDomainError('');
    }
  };

  const canProceedFromDomain = domain.trim() !== '' && !domainError;

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const startVerification = useCallback(async () => {
    setIsVerifying(true);
    setPollCount(0);
    setVerificationResult(null);

    const result = await verifyDomainCNAME(domain);
    setVerificationResult(result);
    setIsVerifying(false);

    if (result.status === 'verified') {
      onDomainVerified(domain);
      return;
    }

    // Start polling if pending
    if (result.status === 'pending') {
      let count = 1;
      pollTimerRef.current = setInterval(async () => {
        if (count >= MAX_POLL_COUNT) {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          return;
        }
        count++;
        setPollCount(count);
        const pollResult = await verifyDomainCNAME(domain);
        setVerificationResult(pollResult);
        if (pollResult.status === 'verified') {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          onDomainVerified(domain);
        }
      }, 10000);
    }
  }, [domain, onDomainVerified]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const subdomain = getSubdomainFromDomain(domain);

  const steps: WizardStep[] = ['enter-domain', 'select-provider', 'add-cname', 'verify'];
  const stepIndex = steps.indexOf(step);

  return (
    <Sheet open={open} onOpenChange={(o) => { stopPolling(); onOpenChange(o); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('Connect Custom Domain')}
          </SheetTitle>
          <SheetDescription>
            {t('Connect your own domain for public DPP pages')}
          </SheetDescription>
        </SheetHeader>

        {/* Progress indicators */}
        <div className="flex items-center gap-1 my-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`h-2 rounded-full flex-1 transition-colors ${
                  i <= stepIndex ? 'bg-primary' : 'bg-muted'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Step 1: Enter Domain */}
        {step === 'enter-domain' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">{t('Step {{n}}: Enter your domain', { n: 1 })}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('Enter the subdomain you want to use for your DPP pages.')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('Your Domain')}</Label>
              <Input
                placeholder="dpp.your-company.com"
                value={domain}
                onChange={(e) => handleDomainInput(e.target.value)}
                className={domainError ? 'border-destructive' : ''}
              />
              {domainError ? (
                <p className="text-xs text-destructive">{domainError}</p>
              ) : domain.trim() && !domainError ? (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {t('Valid domain format')}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('Example: dpp.your-company.com')}
                </p>
              )}
            </div>

            {currentDomain && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {t('Currently configured')}: <span className="font-mono font-medium">{currentDomain}</span>
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setStep('select-provider')} disabled={!canProceedFromDomain}>
                {t('Next', { ns: 'common' })}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select DNS Provider */}
        {step === 'select-provider' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">{t('Step {{n}}: Select your DNS provider', { n: 2 })}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('Choose your DNS provider for step-by-step instructions.')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {DNS_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => { setSelectedProvider(provider); setStep('add-cname'); }}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left hover:bg-muted/50 ${
                    selectedProvider?.id === provider.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  }`}
                >
                  <span className="text-2xl">{provider.logo}</span>
                  <span className="font-medium text-sm">{provider.name}</span>
                </button>
              ))}
            </div>

            <button
              onClick={() => { setSelectedProvider(null); setStep('add-cname'); }}
              className="w-full p-3 rounded-lg border border-dashed text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              {t('Other provider / I know how to add a CNAME record')}
            </button>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('enter-domain')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('Back', { ns: 'common' })}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Add CNAME Record */}
        {step === 'add-cname' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">{t('Step {{n}}: Add CNAME record', { n: 3 })}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedProvider
                  ? t('Follow these instructions for {{provider}}:', { provider: selectedProvider.name })
                  : t('Add the following CNAME record in your DNS management:')}
              </p>
            </div>

            {/* CNAME Record Values */}
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground tracking-wider">
                  {selectedProvider?.hostFieldName || t('Host / Name')}
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded border font-mono text-sm">
                    {subdomain}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => copyToClipboard(subdomain, 'host')}
                  >
                    {copiedField === 'host' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground tracking-wider">
                  {t('Type')}
                </Label>
                <div className="p-2 bg-background rounded border font-mono text-sm">
                  CNAME
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground tracking-wider">
                  {selectedProvider?.targetFieldName || t('Target / Value')}
                </Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded border font-mono text-sm">
                    {CNAME_TARGET}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => copyToClipboard(CNAME_TARGET, 'target')}
                  >
                    {copiedField === 'target' ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase text-muted-foreground tracking-wider">
                  TTL
                </Label>
                <div className="p-2 bg-background rounded border font-mono text-sm">
                  {RECOMMENDED_TTL} ({t('1 hour')})
                </div>
              </div>
            </div>

            {/* Provider-specific instructions */}
            {selectedProvider && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium">{t('Instructions for {{provider}}', { provider: selectedProvider.name })}</h4>
                <ol className="space-y-2">
                  {selectedProvider.steps.map((instruction, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground pt-0.5">{t(instruction)}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {t('DNS changes can take up to 48 hours to propagate, but usually complete within a few minutes.')}
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('select-provider')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('Back', { ns: 'common' })}
              </Button>
              <Button onClick={() => { setStep('verify'); startVerification(); }}>
                {t('Verify DNS')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Verify DNS */}
        {step === 'verify' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold">{t('Step {{n}}: Verify DNS', { n: 4 })}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('Checking if your CNAME record has been configured correctly.')}
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg border text-center space-y-3">
              <p className="font-mono text-sm">{domain}</p>

              {isVerifying && !verificationResult && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">{t('Checking DNS records...')}</p>
                </div>
              )}

              {verificationResult?.status === 'verified' && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                  </div>
                  <p className="font-medium text-green-700 dark:text-green-400">{t('Domain verified!')}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('CNAME points to')}: <code className="font-mono">{verificationResult.cnameValue}</code>
                  </p>
                </div>
              )}

              {verificationResult?.status === 'pending' && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <Clock className="h-6 w-6 text-amber-600" />
                  </div>
                  <p className="font-medium text-amber-700 dark:text-amber-400">{t('Waiting for DNS propagation')}</p>
                  <p className="text-sm text-muted-foreground">{verificationResult.error}</p>
                  {pollCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t('Auto-checking every 10 seconds')} ({pollCount}/{MAX_POLL_COUNT})
                    </p>
                  )}
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}

              {verificationResult?.status === 'failed' && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <XCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <p className="font-medium text-red-700 dark:text-red-400">{t('Verification failed')}</p>
                  <p className="text-sm text-muted-foreground">{verificationResult.error}</p>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => { stopPolling(); setStep('add-cname'); }}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('Back', { ns: 'common' })}
              </Button>
              <div className="flex gap-2">
                {verificationResult?.status !== 'verified' && (
                  <Button
                    variant="outline"
                    onClick={() => startVerification()}
                    disabled={isVerifying}
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isVerifying ? 'animate-spin' : ''}`} />
                    {t('Retry')}
                  </Button>
                )}
                {verificationResult?.status === 'verified' && (
                  <Button onClick={() => onOpenChange(false)}>
                    <Check className="mr-2 h-4 w-4" />
                    {t('Done')}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
