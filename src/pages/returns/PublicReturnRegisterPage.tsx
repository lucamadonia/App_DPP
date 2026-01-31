import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Check, Loader2, Package, Upload, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getPublicReturnReasons, publicCreateReturn, publicGetTenantName } from '@/services/supabase';
import type { RhReturnReason, DesiredSolution } from '@/types/returns-hub';

const STEPS = ['Identification', 'Select Items', 'Return Reason', 'Upload Photos', 'Preferred Solution', 'Shipping', 'Confirmation'];

interface WizardItem {
  name: string;
  quantity: number;
  selected: boolean;
}

export function PublicReturnRegisterPage() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>();
  const { t } = useTranslation('returns');
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [returnNumber, setReturnNumber] = useState('');
  const [reasons, setReasons] = useState<RhReturnReason[]>([]);
  const [tenantName, setTenantName] = useState('');

  // Form data
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [items, setItems] = useState<WizardItem[]>([
    { name: '', quantity: 1, selected: true },
  ]);
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [solution, setSolution] = useState<DesiredSolution>('refund');
  const [shippingMethod, setShippingMethod] = useState('print_label');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      if (tenantSlug) {
        const [r, name] = await Promise.all([
          getPublicReturnReasons(tenantSlug),
          publicGetTenantName(tenantSlug),
        ]);
        setReasons(r);
        setTenantName(name);
      }
      setLoading(false);
    }
    load();
  }, [tenantSlug]);

  const handleSubmit = async () => {
    if (!tenantSlug) return;
    setSubmitting(true);

    const result = await publicCreateReturn(tenantSlug, {
      orderNumber: orderNumber || undefined,
      email,
      reasonCategory: reasonCategory || undefined,
      reasonText: reasonText || undefined,
      desiredSolution: solution,
      shippingMethod,
      items: items.filter(i => i.selected && i.name.trim()),
    });

    if (result.success && result.returnNumber) {
      setReturnNumber(result.returnNumber);
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  const canProceed = () => {
    switch (step) {
      case 0: return orderNumber.trim() && email.trim();
      case 1: return items.some(i => i.selected && i.name.trim());
      case 2: return true;
      case 3: return true;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto pt-16 px-4">
          <Card>
            <CardContent className="pt-8 pb-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">{t('Your return has been registered')}</h2>
              <p className="text-muted-foreground mb-4">{t('Your return number is')}</p>
              <p className="text-2xl font-mono font-bold text-primary mb-6">{returnNumber}</p>
              <div className="text-sm text-muted-foreground space-y-1 text-left bg-muted rounded-lg p-4">
                <p className="font-medium mb-2">{t('Next steps')}:</p>
                <p>1. {t('You will receive a confirmation email')}</p>
                <p>2. {t('Print the return label or use the QR code')}</p>
                <p>3. {t('Ship the items back to us')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" />
            <div>
              <h1 className="font-semibold">{tenantName || t('Returns Hub')}</h1>
              <p className="text-xs text-muted-foreground">{t('Register Return')}</p>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">
            {t('Step {{current}} of {{total}}', { current: step + 1, total: STEPS.length })}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div className="flex gap-1 mb-6">
          {STEPS.map((_, i) => (
            <div key={i} className={`flex-1 h-1.5 rounded-full ${i <= step ? 'bg-primary' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>{t(STEPS[step])}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Step 0: Identification */}
            {step === 0 && (
              <>
                <p className="text-sm text-muted-foreground">{t('Enter your order number and email')}</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t('Order Number')}</Label>
                    <Input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="ORD-..." />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Email Address')}</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                  </div>
                </div>
              </>
            )}

            {/* Step 1: Select Items */}
            {step === 1 && (
              <>
                <p className="text-sm text-muted-foreground">{t('Select the items you want to return')}</p>
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <input type="checkbox" checked={item.selected} onChange={(e) => {
                      const upd = [...items]; upd[i].selected = e.target.checked; setItems(upd);
                    }} className="h-4 w-4 rounded" />
                    <Input value={item.name} onChange={(e) => {
                      const upd = [...items]; upd[i].name = e.target.value; setItems(upd);
                    }} placeholder={t('Item name')} className="flex-1" />
                    <Input type="number" min={1} value={item.quantity} onChange={(e) => {
                      const upd = [...items]; upd[i].quantity = parseInt(e.target.value) || 1; setItems(upd);
                    }} className="w-20" />
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setItems([...items, { name: '', quantity: 1, selected: true }])}>
                  + {t('Add Item')}
                </Button>
              </>
            )}

            {/* Step 2: Reason */}
            {step === 2 && (
              <>
                <p className="text-sm text-muted-foreground">{t('Tell us why you want to return')}</p>
                <div className="space-y-4">
                  <Select value={reasonCategory} onValueChange={setReasonCategory}>
                    <SelectTrigger><SelectValue placeholder={t('Select a reason')} /></SelectTrigger>
                    <SelectContent>
                      {reasons.map(r => (
                        <SelectItem key={r.id} value={r.category}>{r.category}</SelectItem>
                      ))}
                      <SelectItem value="other">{t('Other')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)}
                    placeholder={t('Please provide additional details about the return reason...')} rows={3} />
                </div>
              </>
            )}

            {/* Step 3: Photos */}
            {step === 3 && (
              <>
                <p className="text-sm text-muted-foreground">{t('Please upload photos of the item(s)')}</p>
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Camera className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{t('Drag & drop or click to upload')}</p>
                  <p className="text-xs text-muted-foreground mt-1">JPEG, PNG, WebP · max 10MB</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files) {
                        setPhotoFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
                      }
                    }}
                  />
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" /> {t('Upload Photos')}
                  </Button>
                </div>
                {photoFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {t('{{count}} photos selected', { count: photoFiles.length })}
                      {' — '}
                      {t('Photos will be uploaded after submission')}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {photoFiles.map((file, i) => (
                        <div key={i} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs">
                          <span className="max-w-[120px] truncate">{file.name}</span>
                          <button
                            type="button"
                            onClick={() => setPhotoFiles((prev) => prev.filter((_, idx) => idx !== i))}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 4: Solution */}
            {step === 4 && (
              <>
                <p className="text-sm text-muted-foreground">{t('How would you like us to resolve this?')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['refund', 'exchange', 'voucher', 'repair'] as DesiredSolution[]).map((s) => (
                    <button key={s} onClick={() => setSolution(s)}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${solution === s ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className="font-medium capitalize">{t(s.charAt(0).toUpperCase() + s.slice(1))}</span>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Step 5: Shipping */}
            {step === 5 && (
              <>
                <p className="text-sm text-muted-foreground">{t('Choose your preferred return shipping method')}</p>
                <div className="space-y-3">
                  {[
                    { value: 'print_label', label: 'Print Label' },
                    { value: 'qr_code', label: 'QR Code' },
                    { value: 'pickup', label: 'Pickup' },
                  ].map((opt) => (
                    <button key={opt.value} onClick={() => setShippingMethod(opt.value)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-colors ${shippingMethod === opt.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'}`}>
                      <span className="font-medium">{t(opt.label)}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
            <ChevronLeft className="h-4 w-4 mr-1" /> {t('Previous')}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()}>
              {t('Next')} <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('Submit Return')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
