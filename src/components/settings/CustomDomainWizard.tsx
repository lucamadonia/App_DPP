import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Server,
  ListChecks,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField, OptionalDisclosure } from '@/components/ui/form-layout';
import { FormWizard } from '@/components/ui/form-wizard';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { validateDomain } from '@/lib/domain-utils';
import { DNS_PROVIDERS, CNAME_TARGET, RECOMMENDED_TTL, getSubdomainFromDomain, type DNSProvider } from '@/lib/dns-providers';
import { MonogramTile } from '@/components/ui/icon-tile';
import { verifyDomainCNAME, type DNSVerificationResult } from '@/services/supabase/domain-verification';

interface CustomDomainWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDomain?: string;
  onDomainVerified: (domain: string) => void;
  purposeDescription?: string;
  domainPlaceholder?: string;
}

type WizardStep = 'enter-domain' | 'select-provider' | 'add-cname' | 'verify';

export function CustomDomainWizard({
  open,
  onOpenChange,
  currentDomain,
  onDomainVerified,
  purposeDescription,
  domainPlaceholder,
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

  const copyButton = (text: string, field: string, label: string) => (
    <Button
      variant="outline"
      size="icon"
      className="shrink-0"
      aria-label={`${t('Copy', { ns: 'common' })}: ${label}`}
      onClick={() => copyToClipboard(text, field)}
    >
      {copiedField === field ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={(o) => { stopPolling(); onOpenChange(o); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('Connect Custom Domain')}
          </SheetTitle>
          <SheetDescription>
            {purposeDescription || t('Connect your own domain for public DPP pages')}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-[max(1rem,var(--safe-bottom))]">
          <FormWizard
            variant="embedded"
            step={step}
            onStepChange={(id) => setStep(id as WizardStep)}
            onNext={(id) => { if (id === 'add-cname') void startVerification(); }}
            onCancel={() => onOpenChange(false)}
            steps={[
              {
                id: 'enter-domain',
                title: t('Enter your domain'),
                shortTitle: t('Domain'),
                description: t('Enter the subdomain you want to use for your DPP pages.'),
                icon: Globe,
                canNext: canProceedFromDomain,
                content: (
                  <>
                    <FormField
                      label={t('Your Domain')}
                      htmlFor="cdw-domain"
                      required
                      error={domainError || undefined}
                      hint={domain.trim() && !domainError ? (
                        <span className="inline-flex items-center gap-1 text-success">
                          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                          {t('Valid domain format')}
                        </span>
                      ) : t('Example: dpp.your-company.com')}
                    >
                      <Input
                        id="cdw-domain"
                        placeholder={domainPlaceholder || 'dpp.your-company.com'}
                        value={domain}
                        onChange={(e) => handleDomainInput(e.target.value)}
                        inputMode="url"
                        autoCapitalize="none"
                        spellCheck={false}
                      />
                    </FormField>
                    {currentDomain && (
                      <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                        {t('Currently configured')}: <span className="font-mono font-medium">{currentDomain}</span>
                      </div>
                    )}
                  </>
                ),
              },
              {
                id: 'select-provider',
                title: t('Select your DNS provider'),
                shortTitle: t('Provider'),
                description: t('Choose your DNS provider for step-by-step instructions.'),
                icon: Server,
                footer: (
                  <Button type="button" variant="ghost" onClick={() => setStep('enter-domain')}>
                    <ArrowLeft className="h-4 w-4" />
                    {t('Back', { ns: 'common' })}
                  </Button>
                ),
                content: (
                  <>
                    <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-2">
                      {DNS_PROVIDERS.map((provider) => (
                        <button
                          key={provider.id}
                          type="button"
                          onClick={() => { setSelectedProvider(provider); setStep('add-cname'); }}
                          aria-pressed={selectedProvider?.id === provider.id}
                          className={`flex min-h-11 items-center gap-3 rounded-lg border p-3 text-left transition-[background-color,border-color] duration-150 ease-out hover:bg-muted/50 ${
                            selectedProvider?.id === provider.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border'
                          }`}
                        >
                          <MonogramTile text={provider.name.charAt(0)} size="md" />
                          <span className="font-medium text-sm">{provider.name}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setSelectedProvider(null); setStep('add-cname'); }}
                      className="min-h-11 w-full rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors duration-150 ease-out hover:bg-muted/50"
                    >
                      {t('Other provider / I know how to add a CNAME record')}
                    </button>
                  </>
                ),
              },
              {
                id: 'add-cname',
                title: t('Add CNAME record'),
                shortTitle: t('CNAME'),
                description: selectedProvider
                  ? t('Follow these instructions for {{provider}}:', { provider: selectedProvider.name })
                  : t('Add the following CNAME record in your DNS management:'),
                icon: ListChecks,
                nextLabel: t('Verify DNS'),
                content: (
                  <>
                    <dl className="divide-y rounded-lg border bg-muted/30">
                      <div className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <dt className="text-xs text-muted-foreground">{selectedProvider?.hostFieldName || t('Host / Name')}</dt>
                          <dd className="mt-0.5 truncate font-mono text-sm">{subdomain}</dd>
                        </div>
                        {copyButton(subdomain, 'host', selectedProvider?.hostFieldName || t('Host / Name'))}
                      </div>
                      <div className="grid grid-cols-2 gap-3 p-3">
                        <div>
                          <dt className="text-xs text-muted-foreground">{t('Type')}</dt>
                          <dd className="mt-0.5 font-mono text-sm">CNAME</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">TTL</dt>
                          <dd className="mt-0.5 font-mono text-sm">{RECOMMENDED_TTL} ({t('1 hour')})</dd>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <dt className="text-xs text-muted-foreground">{selectedProvider?.targetFieldName || t('Target / Value')}</dt>
                          <dd className="mt-0.5 truncate font-mono text-sm">{CNAME_TARGET}</dd>
                        </div>
                        {copyButton(CNAME_TARGET, 'target', selectedProvider?.targetFieldName || t('Target / Value'))}
                      </div>
                    </dl>

                    {selectedProvider && (
                      <OptionalDisclosure
                        label={t('Instructions for {{provider}}', { provider: selectedProvider.name })}
                        defaultOpen={false}
                      >
                        <ol className="space-y-2">
                          {selectedProvider.steps.map((instruction, i) => (
                            <li key={i} className="flex gap-3 text-sm">
                              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                                {i + 1}
                              </span>
                              <span className="pt-0.5 text-muted-foreground">{t(instruction)}</span>
                            </li>
                          ))}
                        </ol>
                      </OptionalDisclosure>
                    )}

                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {t('DNS changes can take up to 48 hours to propagate, but usually complete within a few minutes.')}
                    </p>
                  </>
                ),
              },
              {
                id: 'verify',
                title: t('Verify DNS'),
                shortTitle: t('Verify'),
                description: t('Checking if your CNAME record has been configured correctly.'),
                icon: ShieldCheck,
                footer: (
                  <>
                    <Button type="button" variant="ghost" onClick={() => { stopPolling(); setStep('add-cname'); }}>
                      <ArrowLeft className="h-4 w-4" />
                      {t('Back', { ns: 'common' })}
                    </Button>
                    <div className="flex gap-2">
                      {verificationResult?.status !== 'verified' && (
                        <Button variant="outline" onClick={() => startVerification()} disabled={isVerifying}>
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
                  </>
                ),
                content: (
                  <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-center" aria-live="polite">
                    <p className="font-mono text-sm break-all">{domain}</p>

                    {isVerifying && !verificationResult && (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">{t('Checking DNS records...')}</p>
                      </div>
                    )}

                    {verificationResult?.status === 'verified' && (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-success/10">
                          <CheckCircle2 className="h-6 w-6 text-success" />
                        </div>
                        <p className="font-medium text-success">{t('Domain verified!')}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('CNAME points to')}: <code className="font-mono">{verificationResult.cnameValue}</code>
                        </p>
                      </div>
                    )}

                    {verificationResult?.status === 'pending' && (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-warning/10">
                          <Clock className="h-6 w-6 text-warning" />
                        </div>
                        <p className="font-medium text-warning">{t('Waiting for DNS propagation')}</p>
                        <p className="text-sm text-muted-foreground">{verificationResult.error}</p>
                        {pollCount > 0 && (
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {t('Auto-checking every 10 seconds')} ({pollCount}/{MAX_POLL_COUNT})
                          </p>
                        )}
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}

                    {verificationResult?.status === 'failed' && (
                      <div className="flex flex-col items-center gap-2 py-4">
                        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
                          <XCircle className="h-6 w-6 text-destructive" />
                        </div>
                        <p className="font-medium text-destructive">{t('Verification failed')}</p>
                        <p className="text-sm text-muted-foreground">{verificationResult.error}</p>
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
