import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, Plus, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useCustomerPortal } from '@/hooks/useCustomerPortal';
import { updateCustomerProfile } from '@/services/supabase/customer-portal';
import { supabase } from '@/lib/supabase';
import type { RhCustomerAddress } from '@/types/returns-hub';
import { MIN_PASSWORD_LENGTH } from '@/lib/security';

export function CustomerProfilePage() {
  const { t } = useTranslation('customer-portal');
  const { customerProfile, refreshProfile } = useCustomerPortal();

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

  useEffect(() => {
    if (customerProfile) {
      setFirstName(customerProfile.firstName || '');
      setLastName(customerProfile.lastName || '');
      setPhone(customerProfile.phone || '');
      setCompany(customerProfile.company || '');
      setAddresses(customerProfile.addresses || []);
      setCommPrefs(customerProfile.communicationPreferences || { email: true, sms: false, marketing: false });
    }
  }, [customerProfile]);

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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{t('My Profile')}</h1>
        <p className="text-muted-foreground">{t('Manage your account information')}</p>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Personal Information')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('First Name')}</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Last Name')}</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('Email')}</Label>
            <Input value={customerProfile.email} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">{t('Contact support to change your email')}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Phone')}</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Company')}</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Addresses */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('Addresses')}</CardTitle>
            <Button variant="outline" size="sm" onClick={openAddAddress} className="gap-1">
              <Plus className="h-3 w-3" />
              {t('Add Address')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {addresses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('No addresses saved')}</p>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr, i) => (
                <div key={i} className="flex items-start justify-between p-3 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">
                      <span className="text-xs font-medium uppercase text-muted-foreground">{addr.type}</span>
                      <p>{addr.street}</p>
                      <p>{addr.postalCode} {addr.city}</p>
                      <p>{addr.country}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditAddress(i)}>
                      {t('Edit', { ns: 'common' })}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeAddress(i)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Communication Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Communication Preferences')}</CardTitle>
          <CardDescription>{t('Choose how you want to be notified')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t('Email Notifications')}</Label>
            <Switch checked={commPrefs.email} onCheckedChange={(v) => setCommPrefs({ ...commPrefs, email: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('SMS Notifications')}</Label>
            <Switch checked={commPrefs.sms} onCheckedChange={(v) => setCommPrefs({ ...commPrefs, sms: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('Marketing Emails')}</Label>
            <Switch checked={commPrefs.marketing} onCheckedChange={(v) => setCommPrefs({ ...commPrefs, marketing: v })} />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Security')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => setPwDialogOpen(true)}>
            {t('Change Password')}
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? t('Saved!') : t('Save Changes')}
        </Button>
      </div>

      {/* Password Dialog */}
      <Dialog open={pwDialogOpen} onOpenChange={setPwDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('Change Password')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {pwError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{pwError}</div>
            )}
            <div className="space-y-2">
              <Label>{t('New Password')}</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Confirm Password')}</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
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
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('Type')}</Label>
              <Select value={addrType} onValueChange={(v) => setAddrType(v as 'billing' | 'shipping')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shipping">{t('Shipping')}</SelectItem>
                  <SelectItem value="billing">{t('Billing')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('Street')}</Label>
              <Input value={addrStreet} onChange={(e) => setAddrStreet(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('Postal Code')}</Label>
                <Input value={addrPostalCode} onChange={(e) => setAddrPostalCode(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('City')}</Label>
                <Input value={addrCity} onChange={(e) => setAddrCity(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('Country')}</Label>
              <Input value={addrCountry} onChange={(e) => setAddrCountry(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddrDialogOpen(false)}>{t('Cancel', { ns: 'common' })}</Button>
            <Button onClick={saveAddress} disabled={!addrStreet.trim() || !addrCity.trim()}>
              {t('Save', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
