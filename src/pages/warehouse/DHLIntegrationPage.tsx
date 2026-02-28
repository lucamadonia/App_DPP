import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Truck, Lock, CheckCircle2, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBillingOptional } from '@/contexts/BillingContext';
import { getDHLSettings, saveDHLCredentials, testDHLConnection } from '@/services/supabase/dhl-carrier';
import { DHL_PRODUCT_LABELS, DHL_PRODUCTS } from '@/types/dhl';
import type { DHLSettingsPublic, DHLParcelProduct, DHLLabelFormat } from '@/types/dhl';

export function DHLIntegrationPage() {
  const { t } = useTranslation('warehouse');
  const billing = useBillingOptional();
  const hasModule = billing
    ? (billing.hasModule('warehouse_professional') || billing.hasModule('warehouse_business'))
    : true;

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<DHLSettingsPublic | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(true);
  const [sandbox, setSandbox] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [billingNumber, setBillingNumber] = useState('');
  const [defaultProduct, setDefaultProduct] = useState<DHLParcelProduct>('V01PAK');
  const [labelFormat, setLabelFormat] = useState<DHLLabelFormat>('PDF_A4');

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
        setDefaultProduct(s.defaultProduct);
        setLabelFormat(s.labelFormat);
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
    if (!billingNumber || billingNumber.length < 10) {
      toast.error(t('Billing number must be at least 10 characters'));
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
        defaultProduct,
        labelFormat,
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setSaving(false);
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
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Lock className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="text-xl font-semibold">{t('DHL Integration')}</h2>
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
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  const isConnected = settings?.hasCredentials;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
          <Truck className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('DHL Integration')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('Connect your DHL business account to create shipping labels directly')}
          </p>
        </div>
        {isConnected && (
          <Badge variant="secondary" className="ml-auto gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3" /> {t('Connected')}
          </Badge>
        )}
      </div>

      {/* Card 1: Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Connection')}</CardTitle>
          <CardDescription>
            DHL Parcel DE Shipping API v2
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Label className="min-w-[100px]">{t('Enabled')}</Label>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
          <div className="flex items-center gap-3">
            <Label className="min-w-[100px]">{t('Sandbox Mode')}</Label>
            <Switch checked={sandbox} onCheckedChange={setSandbox} />
            {sandbox && <Badge variant="outline" className="text-xs">Sandbox</Badge>}
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Label className="text-sm font-medium">API Credentials</Label>
              <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => setShowPasswords(!showPasswords)}>
                {showPasswords ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>

            <div className="grid gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">DHL API Key</Label>
                <Input
                  type={showPasswords ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings?.hasCredentials ? '••••••••' : 'Enter API key'}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">{t('Username')}</Label>
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={settings?.hasCredentials ? '••••••••' : 'Username'}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t('Password')}</Label>
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={settings?.hasCredentials ? '••••••••' : 'Password'}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {isConnected && (
              <Button variant="outline" onClick={handleTestConnection} disabled={testing}>
                {testing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                {t('Test Connection')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Default Settings')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground">{t('Billing Number')}</Label>
            <Input
              value={billingNumber}
              onChange={(e) => setBillingNumber(e.target.value)}
              placeholder="33333333330102"
              maxLength={14}
            />
            <p className="text-xs text-muted-foreground mt-1">14-{t('digit DHL billing number (Abrechnungsnummer)')}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t('Default Product')}</Label>
              <Select value={defaultProduct} onValueChange={(v) => setDefaultProduct(v as DHLParcelProduct)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DHL_PRODUCTS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p} — {t(DHL_PRODUCT_LABELS[p])}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('Label Format')}</Label>
              <Select value={labelFormat} onValueChange={(v) => setLabelFormat(v as DHLLabelFormat)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PDF_A4">{t('A4 Standard')}</SelectItem>
                  <SelectItem value="PDF_910-300-700">{t('A6 Thermal')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Shipper Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Default Shipper')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t('Name')} 1 *</Label>
              <Input value={shipperName} onChange={(e) => setShipperName(e.target.value)} placeholder="Firma GmbH" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('Name')} 2</Label>
              <Input value={shipperName2} onChange={(e) => setShipperName2(e.target.value)} placeholder="Abt. Versand" />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">{t('Street')} *</Label>
            <Input value={shipperStreet} onChange={(e) => setShipperStreet(e.target.value)} placeholder="Musterstr. 1" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t('Postal Code')} *</Label>
              <Input value={shipperPostal} onChange={(e) => setShipperPostal(e.target.value)} placeholder="12345" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('City')} *</Label>
              <Input value={shipperCity} onChange={(e) => setShipperCity(e.target.value)} placeholder="Berlin" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('Country')}</Label>
              <Select value={shipperCountry} onValueChange={setShipperCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEU">Deutschland (DEU)</SelectItem>
                  <SelectItem value="AUT">&Ouml;sterreich (AUT)</SelectItem>
                  <SelectItem value="CHE">Schweiz (CHE)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">{t('Email')}</Label>
              <Input value={shipperEmail} onChange={(e) => setShipperEmail(e.target.value)} placeholder="versand@firma.de" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t('Phone')}</Label>
              <Input value={shipperPhone} onChange={(e) => setShipperPhone(e.target.value)} placeholder="+49 30 12345678" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-2 pb-8">
        <Button onClick={handleSave} disabled={saving} className="min-w-[140px]">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {t('Save', { ns: 'common' })}
        </Button>
      </div>
    </div>
  );
}
