import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, Lock, CheckCircle2, Loader2, Mail, MapPin, Receipt } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ChoiceCards, FormActions, FormField, FormGrid, FormSection, FormSectionNav, FormToggleRow, OptionalDisclosure, SecretInput,
} from '@/components/ui/form-layout';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { useBillingOptional } from '@/contexts/BillingContext';
import { getDHLSettings, saveDHLCredentials, testDHLConnection, testInternetmarkeConnection } from '@/services/supabase/dhl-carrier';
import { DHL_PRODUCT_LABELS, DHL_PRODUCTS } from '@/types/dhl';
import type { DHLSettingsPublic, DHLParcelProduct, DHLLabelFormat } from '@/types/dhl';

export function DHLIntegrationPage() {
  const { t } = useTranslation('warehouse');
  const billing = useBillingOptional();
  const hasModule = billing
    ? (billing.hasModule('warehouse_professional') || billing.hasModule('warehouse_business') || billing.hasAnyReturnsHubModule())
    : true;

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<DHLSettingsPublic | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [section, setSection] = useState('connection');
  const [testingInternetmarke, setTestingInternetmarke] = useState(false);
  const [internetmarkeBalance, setInternetmarkeBalance] = useState<number | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(true);
  const [sandbox, setSandbox] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [billingNumber, setBillingNumber] = useState('');
  const [billingNumberInternational, setBillingNumberInternational] = useState('');
  const [billingNumberKleinpaket, setBillingNumberKleinpaket] = useState('');
  const [defaultProduct, setDefaultProduct] = useState<DHLParcelProduct>('V01PAK');
  const [labelFormat, setLabelFormat] = useState<DHLLabelFormat>('PDF_A4');
  const [internetmarkeEnabled, setInternetmarkeEnabled] = useState(false);
  const [internetmarkeClientId, setInternetmarkeClientId] = useState('');
  const [internetmarkeClientSecret, setInternetmarkeClientSecret] = useState('');
  const [portokasseUsername, setPortokasseUsername] = useState('');
  const [portokassePassword, setPortokassePassword] = useState('');

  // Shipper
  const [shipperName, setShipperName] = useState('');
  const [shipperName2, setShipperName2] = useState('');
  const [shipperStreet, setShipperStreet] = useState('');
  const [shipperPostal, setShipperPostal] = useState('');
  const [shipperCity, setShipperCity] = useState('');
  const [shipperCountry, setShipperCountry] = useState('DEU');
  const [shipperEmail, setShipperEmail] = useState('');
  const [shipperPhone, setShipperPhone] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      const s = await getDHLSettings();
      setSettings(s);
      if (s) {
        setEnabled(s.enabled);
        setSandbox(s.sandbox);
        setBillingNumber(s.billingNumber);
        setBillingNumberInternational(s.billingNumberInternational || '');
        setBillingNumberKleinpaket(s.billingNumberKleinpaket || '');
        setDefaultProduct(s.defaultProduct);
        setLabelFormat(s.labelFormat);
        setInternetmarkeEnabled(s.internetmarke.enabled);
        if (s.shipper) {
          setShipperName(s.shipper.name1 || '');
          setShipperName2(s.shipper.name2 || '');
          setShipperStreet(s.shipper.addressStreet || '');
          setShipperPostal(s.shipper.postalCode || '');
          setShipperCity(s.shipper.city || '');
          setShipperCountry(s.shipper.country || 'DEU');
          setShipperEmail(s.shipper.email || '');
          setShipperPhone(s.shipper.phone || '');
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const handleSave = async () => {
    if (enabled && (!billingNumber || billingNumber.length < 10)) {
      toast.error(t('Billing number must be at least 10 characters'));
      return;
    }
    if (
      internetmarkeEnabled
      && !settings?.internetmarke.hasCredentials
      && (!internetmarkeClientId || !internetmarkeClientSecret || !portokasseUsername || !portokassePassword)
    ) {
      toast.error(t('Complete all INTERNETMARKE and Portokasse credentials'));
      return;
    }
    setSaving(true);
    try {
      await saveDHLCredentials({
        enabled,
        sandbox,
        apiKey,
        username,
        password,
        billingNumber,
        billingNumberInternational: billingNumberInternational || undefined,
        billingNumberKleinpaket: billingNumberKleinpaket || undefined,
        defaultProduct,
        labelFormat,
        internetmarke: {
          enabled: internetmarkeEnabled,
          clientId: internetmarkeClientId || undefined,
          clientSecret: internetmarkeClientSecret || undefined,
          portokasseUsername: portokasseUsername || undefined,
          portokassePassword: portokassePassword || undefined,
          pageFormatId: 2,
        },
        shipper: {
          name1: shipperName,
          name2: shipperName2 || undefined,
          addressStreet: shipperStreet,
          postalCode: shipperPostal,
          city: shipperCity,
          country: shipperCountry,
          email: shipperEmail || undefined,
          phone: shipperPhone || undefined,
        },
      });
      toast.success(t('Configuration saved'));
      await loadSettings();
      // Clear password fields after save
      setApiKey('');
      setUsername('');
      setPassword('');
      setInternetmarkeClientId('');
      setInternetmarkeClientSecret('');
      setPortokasseUsername('');
      setPortokassePassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestInternetmarke = async () => {
    setTestingInternetmarke(true);
    try {
      const result = await testInternetmarkeConnection();
      if (result.success) {
        setInternetmarkeBalance(result.walletBalanceCents ?? null);
        toast.success(t('INTERNETMARKE connection successful'));
      } else {
        toast.error(result.error || t('Connection failed'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Connection failed'));
    } finally {
      setTestingInternetmarke(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const result = await testDHLConnection();
      if (result.success) {
        toast.success(t('Connection successful'));
      } else {
        toast.error(result.error || t('Connection failed'));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('Connection failed'));
    } finally {
      setTesting(false);
    }
  };

  // Billing gate
  if (!hasModule) {
    return (
      <div className="flex flex-col items-center justify-center py-12 sm:py-24 gap-3 sm:gap-4 px-4">
        <Lock className="h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground/50" />
        <h2 className="text-lg sm:text-xl font-semibold">{t('DHL Integration')}</h2>
        <p className="text-muted-foreground text-center max-w-md">
          {t('DHL requires professional')}
        </p>
        <Button asChild variant="default">
          <a href="/settings/billing">{t('Upgrade required')}</a>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <ShimmerSkeleton className="h-8 w-48" />
        <ShimmerSkeleton className="h-64 rounded-lg" />
        <ShimmerSkeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const isConnected = settings?.hasCredentials;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10">
            <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t('DHL Integration')}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('Connect your DHL business account to create shipping labels directly')}
            </p>
          </div>
        </div>
        {isConnected && (
          <Badge variant="secondary" className="sm:ml-auto gap-1">
            <CheckCircle2 className="h-3 w-3 text-primary" /> {t('Connected')}
          </Badge>
        )}
      </div>

      <FormSectionNav
        sections={[
          { id: 'connection', label: t('Connection'), icon: Truck },
          { id: 'letter', label: t('Deutsche Post Brief'), icon: Mail },
          { id: 'defaults', label: t('Default Settings'), icon: Receipt },
          { id: 'shipper', label: t('Default Shipper'), icon: MapPin },
        ]}
        value={section}
        onValueChange={setSection}
      >
        {/* Connection */}
        {section === 'connection' && (
        <FormSection
          icon={Truck}
          title={t('Connection')}
          description="DHL Parcel DE Shipping API v2"
        >
          <div className="space-y-3">
            <FormToggleRow htmlFor="dhl-enabled" label={t('Enabled')}>
              <Switch id="dhl-enabled" checked={enabled} onCheckedChange={setEnabled} />
            </FormToggleRow>
            <FormToggleRow
              htmlFor="dhl-sandbox"
              label={t('Sandbox Mode')}
              description={t('Test labels against the DHL sandbox. Turn off for real shipments.')}
            >
              <Switch id="dhl-sandbox" aria-describedby="dhl-sandbox-description" checked={sandbox} onCheckedChange={setSandbox} />
            </FormToggleRow>
          </div>
          <FormGrid cols={2}>
            <FormField
              label="DHL API Key"
              span="full"
              hint={isConnected ? t('Leave empty to keep the saved value.') : undefined}
            >
              <SecretInput
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings?.hasCredentials ? '••••••••' : 'Enter API key'}
              />
            </FormField>
            <FormField label={t('Username')}>
              <SecretInput
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={settings?.hasCredentials ? '••••••••' : t('Username')}
              />
            </FormField>
            <FormField label={t('Password')}>
              <SecretInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={settings?.hasCredentials ? '••••••••' : t('Password')}
              />
            </FormField>
          </FormGrid>
          {isConnected && (
            <Button variant="outline" onClick={handleTestConnection} disabled={testing} className="w-full sm:w-auto">
              {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
              {t('Test Connection')}
            </Button>
          )}
        </FormSection>
        )}

        {/* Deutsche Post letter postage uses the separate INTERNETMARKE API. */}
        {section === 'letter' && (
        <FormSection
          icon={Mail}
          title={t('Deutsche Post Brief')}
          aside={settings?.internetmarke.hasCredentials ? (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3 text-primary" /> {t('Connected')}
            </Badge>
          ) : undefined}
          description={t('Create Standard, Compact, Large and Maxi letter stamps through Deutsche Post INTERNETMARKE and your Portokasse.')}
        >
          <FormToggleRow
            htmlFor="internetmarke-enabled"
            label={t('Enable letter postage')}
            description={internetmarkeEnabled ? t('Uses the separately activated INTERNETMARKE API. Purchases are charged directly to the connected Portokasse; available products and prices are loaded live from Deutsche Post.') : undefined}
          >
            <Switch id="internetmarke-enabled" aria-describedby={internetmarkeEnabled ? "internetmarke-enabled-description" : undefined} checked={internetmarkeEnabled} onCheckedChange={setInternetmarkeEnabled} />
          </FormToggleRow>
          {internetmarkeEnabled && (
            <>
              <FormGrid cols={2}>
                <FormField label="INTERNETMARKE Client ID">
                  <SecretInput value={internetmarkeClientId} onChange={(e) => setInternetmarkeClientId(e.target.value)} placeholder={settings?.internetmarke.hasCredentials ? '••••••••' : 'Client ID'} />
                </FormField>
                <FormField label="INTERNETMARKE Client Secret">
                  <SecretInput value={internetmarkeClientSecret} onChange={(e) => setInternetmarkeClientSecret(e.target.value)} placeholder={settings?.internetmarke.hasCredentials ? '••••••••' : 'Client Secret'} />
                </FormField>
                <FormField label={t('Portokasse Username')}>
                  <SecretInput value={portokasseUsername} onChange={(e) => setPortokasseUsername(e.target.value)} placeholder={settings?.internetmarke.hasCredentials ? '••••••••' : t('Portokasse Username')} />
                </FormField>
                <FormField label={t('Portokasse Password')}>
                  <SecretInput value={portokassePassword} onChange={(e) => setPortokassePassword(e.target.value)} placeholder={settings?.internetmarke.hasCredentials ? '••••••••' : t('Portokasse Password')} />
                </FormField>
              </FormGrid>
              {settings?.internetmarke.hasCredentials && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="outline" onClick={handleTestInternetmarke} disabled={testingInternetmarke} className="w-full sm:w-auto">
                    {testingInternetmarke ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    {t('Test INTERNETMARKE')}
                  </Button>
                  {internetmarkeBalance != null && (
                    <span className="text-sm text-muted-foreground">
                      {t('Portokasse balance')}: <strong className="text-foreground tabular-nums">{(internetmarkeBalance / 100).toLocaleString(undefined, { style: 'currency', currency: 'EUR' })}</strong>
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </FormSection>
        )}

        {/* Defaults */}
        {section === 'defaults' && (
        <FormSection
          icon={Receipt}
          title={t('Default Settings')}
          description={t('Billing numbers and label defaults for new DHL shipments.')}
        >
          <FormGrid cols={2}>
            <FormField
              label={t('Billing Number')}
              labelAside={`${t('Domestic')} · V01PAK`}
              span="full"
              hint={t('14-digit DHL billing number for domestic (V01PAK). Format: EKP(10) + 01 + Teilnahme(2).')}
            >
              <Input
                inputMode="numeric"
                className="font-mono tabular-nums"
                value={billingNumber}
                onChange={(e) => setBillingNumber(e.target.value)}
                placeholder="33333333330101"
                maxLength={14}
              />
            </FormField>
            <FormField label={t('Default Product')} htmlFor="dhl-default-product" span="full">
              <Select value={defaultProduct} onValueChange={(v) => setDefaultProduct(v as DHLParcelProduct)}>
                <SelectTrigger id="dhl-default-product" className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DHL_PRODUCTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p} — {t(DHL_PRODUCT_LABELS[p])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label={t('Label Format')} span="full">
              <ChoiceCards
                value={labelFormat}
                onValueChange={(v) => setLabelFormat(v as DHLLabelFormat)}
                options={[
                  { value: 'PDF_A4', label: t('A4 Standard') },
                  { value: 'PDF_910-300-700', label: t('A6 Thermal') },
                ]}
              />
            </FormField>
          </FormGrid>
          <OptionalDisclosure
            label={t('Additional billing numbers')}
            description="V53WPAK · V62KP"
            filledCount={[billingNumberInternational, billingNumberKleinpaket].filter(Boolean).length}
          >
            <FormField
              label={t('International Billing Number')}
              labelAside="V53WPAK"
              optional
              hint={t('Required for shipments outside the home country. Format: EKP(10) + 53 + Teilnahme(2). Must be activated in your DHL business contract.')}
            >
              <Input
                inputMode="numeric"
                className="font-mono tabular-nums"
                value={billingNumberInternational}
                onChange={(e) => setBillingNumberInternational(e.target.value)}
                placeholder="33333333335301"
                maxLength={14}
              />
            </FormField>
            <FormField
              label={t('Kleinpaket Billing Number')}
              labelAside="V62KP"
              optional
              hint={t('DHL Kleinpaket billing number (successor to Warenpost national). Format: EKP(10) + 62 + Teilnahme(2). Used automatically when a shipment fits the Kleinpaket envelope (max 35.3 × 25 × 8 cm, 1 kg).')}
            >
              <Input
                inputMode="numeric"
                className="font-mono tabular-nums"
                value={billingNumberKleinpaket}
                onChange={(e) => setBillingNumberKleinpaket(e.target.value)}
                placeholder="33333333336201"
                maxLength={14}
              />
            </FormField>
          </OptionalDisclosure>
        </FormSection>
        )}

        {/* Shipper Address */}
        {section === 'shipper' && (
        <FormSection
          icon={MapPin}
          title={t('Default Shipper')}
          description={t('Printed as sender on every DHL label.')}
        >
          <FormGrid cols={6}>
            <FormField label={`${t('Name')} 1`} required span={3}>
              <Input value={shipperName} autoComplete="organization" onChange={(e) => setShipperName(e.target.value)} placeholder="Firma GmbH" />
            </FormField>
            <FormField label={`${t('Name')} 2`} optional span={3}>
              <Input value={shipperName2} onChange={(e) => setShipperName2(e.target.value)} placeholder="Abt. Versand" />
            </FormField>
            <FormField label={t('Street')} required span="full">
              <Input value={shipperStreet} autoComplete="street-address" onChange={(e) => setShipperStreet(e.target.value)} placeholder="Musterstr. 1" />
            </FormField>
            <FormField label={t('Postal Code')} required span={2}>
              <Input value={shipperPostal} inputMode="numeric" autoComplete="postal-code" onChange={(e) => setShipperPostal(e.target.value)} placeholder="12345" />
            </FormField>
            <FormField label={t('City')} required span={4}>
              <Input value={shipperCity} autoComplete="address-level2" onChange={(e) => setShipperCity(e.target.value)} placeholder="Berlin" />
            </FormField>
            <FormField label={t('Country')} span="full">
              <ChoiceCards
                value={shipperCountry}
                onValueChange={setShipperCountry}
                columns={3}
                options={[
                  { value: 'DEU', label: 'Deutschland' },
                  { value: 'AUT', label: 'Österreich' },
                  { value: 'CHE', label: 'Schweiz' },
                ]}
              />
            </FormField>
            <FormField label={t('Email')} optional span={3}>
              <Input type="email" inputMode="email" autoComplete="email" value={shipperEmail} onChange={(e) => setShipperEmail(e.target.value)} placeholder="versand@firma.de" />
            </FormField>
            <FormField label={t('Phone')} optional span={3}>
              <Input type="tel" inputMode="tel" autoComplete="tel" value={shipperPhone} onChange={(e) => setShipperPhone(e.target.value)} placeholder="+49 30 12345678" />
            </FormField>
          </FormGrid>
        </FormSection>
        )}
      </FormSectionNav>

      <FormActions sticky="page">
        <Button onClick={handleSave} disabled={saving} className="sm:min-w-[140px]">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {t('Save', { ns: 'common' })}
        </Button>
      </FormActions>
    </div>
  );
}
