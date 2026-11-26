import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'framer-motion';
import { Loader2, Save, Plus, Trash2, MapPin, UserRound, Bell, KeyRound } from 'lucide-react';
import { ShimmerSkeleton } from '@/components/ui/shimmer-skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { FormSections, FormSection, FormGrid, FormField, ChoiceCards, FormToggleRow, FormActions } from '@/components/ui/form-layout';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/adaptive-dialog';
import { DeleteAccountCard } from '@/components/account/DeleteAccountCard';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { updateCustomerProfile } from '@/services/supabase/customer-portal';
import { supabase } from '@/lib/supabase';
import { staggerContainer, staggerItem } from '@/lib/motion';
import type { RhCustomerAddress } from '@/types/returns-hub';
import { MIN_PASSWORD_LENGTH } from '@/lib/security';

export function CustomerProfilePage() {
  const { t } = useTranslation('customer-portal');
  const { customerProfile, refreshProfile, tenantSlug } = useCustomerPortal();
  const prefersReduced = useReducedMotion();

  // Custom-domain portals are slug-free (`/portal/...`); slug portals are
  // `/customer/:tenantSlug/...`. Derive the login path from the live URL so
  // account deletion lands on the right one.
  const portalLoginPath = window.location.pathname.startsWith('/portal')
    ? '/portal/login'
    : `/customer/${tenantSlug}/login`;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [addresses, setAddresses] = useState<RhCustomerAddress[]>([]);
  const [commPrefs, setCommPrefs] = useState({ email: true, sms: false, marketing: false });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Password change
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');

  // Address dialog
  const [addrDialogOpen, setAddrDialogOpen] = useState(false);
  const [editAddrIndex, setEditAddrIndex] = useState<number | null>(null);
  const [addrType, setAddrType] = useState<'billing' | 'shipping'>('shipping');
  const [addrStreet, setAddrStreet] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrPostalCode, setAddrPostalCode] = useState('');
  const [addrCountry, setAddrCountry] = useState('');

  // Seed form state from the profile during render (see React docs:
  // "Storing information from previous renders") — re-seeds when the
  // profile object reference changes (e.g. after refreshProfile()).
  const [seededProfile, setSeededProfile] = useState<typeof customerProfile>(null);
  if (customerProfile && customerProfile !== seededProfile) {
    setSeededProfile(customerProfile);
    setFirstName(customerProfile.firstName || '');
    setLastName(customerProfile.lastName || '');
    setPhone(customerProfile.phone || '');
    setCompany(customerProfile.company || '');
    setAddresses(customerProfile.addresses || []);
    setCommPrefs(customerProfile.communicationPreferences || { email: true, sms: false, marketing: false });
  }

  const handleSaveProfile = async () => {
    setSaving(true);
    const result = await updateCustomerProfile({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      company: company.trim(),
      displayName: [firstName.trim(), lastName.trim()].filter(Boolean).join(' '),
      addresses,
      communicationPreferences: commPrefs,
    });

    if (result.success) {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setPwError(t('Password must be at least {{count}} characters', { count: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError(t('Passwords do not match'));
      return;
    }

    setPwSaving(true);
    setPwError('');

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError(error.message);
    } else {
      setPwDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    }
    setPwSaving(false);
  };

  const openAddAddress = () => {
    setEditAddrIndex(null);
    setAddrType('shipping');
    setAddrStreet('');
    setAddrCity('');
    setAddrPostalCode('');
    setAddrCountry('');
    setAddrDialogOpen(true);
  };

  const openEditAddress = (index: number) => {
    const addr = addresses[index];
    setEditAddrIndex(index);
    setAddrType(addr.type);
    setAddrStreet(addr.street);
    setAddrCity(addr.city);
    setAddrPostalCode(addr.postalCode);
    setAddrCountry(addr.country);
    setAddrDialogOpen(true);
  };

  const saveAddress = () => {
    const addr: RhCustomerAddress = {
      type: addrType,
      street: addrStreet.trim(),
      city: addrCity.trim(),
      postalCode: addrPostalCode.trim(),
      country: addrCountry.trim(),
    };

    if (editAddrIndex !== null) {
      setAddresses((prev) => prev.map((a, i) => i === editAddrIndex ? addr : a));
    } else {
      setAddresses((prev) => [...prev, addr]);
    }
    setAddrDialogOpen(false);
  };

  const removeAddress = (index: number) => {
    setAddresses((prev) => prev.filter((_, i) => i !== index));
  };

  if (!customerProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <ShimmerSkeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <ShimmerSkeleton className="h-6 w-40" />
            <ShimmerSkeleton className="h-4 w-56" />
          </div>
        </div>
        <Card><CardContent className="pt-6 space-y-4">
          {Array.from({ length: 4 }, (_, i) => <ShimmerSkeleton key={i} className="h-10 rounded" />)}
        </CardContent></Card>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-4 sm:space-y-6 max-w-2xl px-4 sm:px-0"
      variants={prefersReduced ? undefined : staggerContainer}
      initial={prefersReduced ? undefined : 'initial'}
      animate={prefersReduced ? undefined : 'animate'}
    >
      <motion.div variants={prefersReduced ? undefined : staggerItem}>
        <h1 className="text-xl sm:text-2xl font-bold">{t('My Profile')}</h1>
        <p className="text-muted-foreground">{t('Manage your account information')}</p>
      </motion.div>

      <motion.div variants={prefersReduced ? undefined : staggerItem}>
        <FormSections>
          <FormSection title={t('Personal Information')} icon={UserRound}>
            <FormGrid cols={2}>
              <FormField label={t('First Name')}>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
              </FormField>
              <FormField label={t('Last Name')}>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
              </FormField>
              <FormField label={t('Email')} hint={t('Contact support to change your email')} span="full">
                <Input value={customerProfile.email} disabled className="bg-muted" />
              </FormField>
              <FormField label={t('Phone')} optional>
                <Input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              </FormField>
              <FormField label={t('Company')} optional>
                <Input value={company} onChange={(e) => setCompany(e.target.value)} autoComplete="organization" />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection
            title={t('Addresses')}
            icon={MapPin}
            aside={
              <Button variant="outline" size="sm" onClick={openAddAddress} className="gap-1 pointer-coarse:h-11">
                <Plus className="h-3.5 w-3.5" />
                {t('Add Address')}
              </Button>
            }
          >
            {addresses.length === 0 ? (
              <p className="py-2 text-center text-sm text-muted-foreground">{t('No addresses saved')}</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {addresses.map((addr, i) => (
                  <li key={i} className="flex items-start gap-3 px-3 py-3 sm:px-4">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1 text-sm">
                      <span className="text-xs font-medium uppercase text-muted-foreground">{addr.type}</span>
                      <p>{addr.street}</p>
                      <p>{addr.postalCode} {addr.city}</p>
                      <p>{addr.country}</p>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0 pointer-coarse:h-11" onClick={() => openEditAddress(i)}>
                      {t('Edit', { ns: 'common' })}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11 shrink-0 text-destructive sm:size-9"
                      onClick={() => removeAddress(i)}
                      aria-label={t('Delete', { ns: 'common' })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </FormSection>

          <FormSection
            title={t('Communication Preferences')}
            description={t('Choose how you want to be notified')}
            icon={Bell}
          >
            <div className="space-y-2">
              <FormToggleRow htmlFor="pref-email" label={t('Email Notifications')}>
                <Switch id="pref-email" checked={commPrefs.email} onCheckedChange={(v) => setCommPrefs({ ...commPrefs, email: v })} />
              </FormToggleRow>
              <FormToggleRow htmlFor="pref-sms" label={t('SMS Notifications')}>
                <Switch id="pref-sms" checked={commPrefs.sms} onCheckedChange={(v) => setCommPrefs({ ...commPrefs, sms: v })} />
              </FormToggleRow>
              <FormToggleRow htmlFor="pref-marketing" label={t('Marketing Emails')}>
                <Switch id="pref-marketing" checked={commPrefs.marketing} onCheckedChange={(v) => setCommPrefs({ ...commPrefs, marketing: v })} />
              </FormToggleRow>
            </div>
          </FormSection>

          <FormSection title={t('Security')} icon={KeyRound}>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setPwDialogOpen(true)}>
              {t('Change Password')}
            </Button>
          </FormSection>

          <FormActions sticky="page">
            <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saved ? t('Saved!') : t('Save Changes')}
            </Button>
          </FormActions>
        </FormSections>
      </motion.div>

      {/*
        Danger Zone — in-app account deletion (App Store guideline 5.1.1(v)).
        Separated from the Save button above: on mobile both are `w-full`, so
        without this the destructive control sits directly under the primary
        action.
      */}
      <motion.div variants={prefersReduced ? undefined : staggerItem} className="pt-4">
        <Separator className="mb-8" />
        <DeleteAccountCard redirectTo={portalLoginPath} />
      </motion.div>

      {/* Password Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Change Password')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {pwError && (
              <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{pwError}</div>
            )}
            <FormField label={t('New Password')} hint={t('Password must be at least {{count}} characters', { count: MIN_PASSWORD_LENGTH })}>
              <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </FormField>
            <FormField label={t('Confirm Password')}>
              <Input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button onClick={handleChangePassword} disabled={pwSaving || !newPassword}>
              {pwSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('Change Password')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Address Dialog */}
      <Dialog open={addrDialogOpen} onOpenChange={setAddrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAddrIndex !== null ? t('Edit Address') : t('Add Address')}</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <FormGrid cols={6}>
              <FormField label={t('Type')} span="full">
                <ChoiceCards
                  value={addrType}
                  onValueChange={(v) => setAddrType(v)}
                  options={[
                    { value: 'shipping' as const, label: t('Shipping') },
                    { value: 'billing' as const, label: t('Billing') },
                  ]}
                />
              </FormField>
              <FormField label={t('Street')} span="full">
                <Input value={addrStreet} onChange={(e) => setAddrStreet(e.target.value)} autoComplete="street-address" />
              </FormField>
              <FormField label={t('Postal Code')} span={2}>
                <Input value={addrPostalCode} onChange={(e) => setAddrPostalCode(e.target.value)} autoComplete="postal-code" />
              </FormField>
              <FormField label={t('City')} span={4}>
                <Input value={addrCity} onChange={(e) => setAddrCity(e.target.value)} autoComplete="address-level2" />
              </FormField>
              <FormField label={t('Country')} span="full">
                <Input value={addrCountry} onChange={(e) => setAddrCountry(e.target.value)} autoComplete="country-name" />
              </FormField>
            </FormGrid>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddrDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button onClick={saveAddress} disabled={!addrStreet.trim() || !addrCity.trim()}>
              {t('Save', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
