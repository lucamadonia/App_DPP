import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, X, Camera, Banknote, Repeat, Ticket, Wrench, ReceiptText, HelpCircle, Package, Lightbulb, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FormGrid, FormField, InputAffix, ChoiceCards, OptionalDisclosure } from '@/components/ui/form-layout';
import { FormWizard, WizardReview, ReviewSection, ReviewRow, type WizardStep } from '@/components/ui/form-wizard';
import { ReturnReasonSelect } from '@/components/returns/ReturnReasonSelect';
import {
  createReturn,
  addReturnItem,
  getReturnReasons,
  addTimelineEntry,
  getRhCustomers,
  getProducts,
  uploadReturnPhoto,
} from '@/services/supabase';
import type { RhReturnReason, RhCustomer, DesiredSolution } from '@/types/returns-hub';
import type { ProductListItem } from '@/services/supabase';

interface ItemForm {
  productId: string;
  name: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  condition: string;
  notes: string;
  photoFiles: File[];
}

function emptyItem(): ItemForm {
  return { productId: '', name: '', sku: '', quantity: 1, unitPrice: '', condition: '', notes: '', photoFiles: [] };
}

export function CreateReturnPage() {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [reasons, setReasons] = useState<RhReturnReason[]>([]);
  const [customers, setCustomers] = useState<RhCustomer[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  // Form state
  const [orderId, setOrderId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonSubcategory, setReasonSubcategory] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [desiredSolution, setDesiredSolution] = useState<DesiredSolution>('refund');
  const [priority, setPriority] = useState('normal');
  const [internalNotes, setInternalNotes] = useState('');
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);

  useEffect(() => {
    getReturnReasons().then(setReasons);
    getRhCustomers(undefined, 1, 100).then((r) => setCustomers(r.data));
    getProducts().then(setProducts);
  }, []);

  const addItem = () => {
    setItems([...items, emptyItem()]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ItemForm, value: string | number | File[]) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleProductSelect = (index: number, productId: string) => {
    const updated = [...items];
    if (productId === 'manual') {
      updated[index] = { ...updated[index], productId: '', name: '', sku: '' };
    } else {
      const product = products.find((p) => p.id === productId);
      if (product) {
        updated[index] = {
          ...updated[index],
          productId: product.id,
          name: product.name,
          sku: product.gtin || '',
        };
      }
    }
    setItems(updated);
  };

  const handleFileSelect = (index: number, files: FileList | null) => {
    if (!files) return;
    const updated = [...items];
    const existing = updated[index].photoFiles;
    updated[index] = { ...updated[index], photoFiles: [...existing, ...Array.from(files)] };
    setItems(updated);
  };

  const removePhoto = (itemIndex: number, photoIndex: number) => {
    const updated = [...items];
    updated[itemIndex] = {
      ...updated[itemIndex],
      photoFiles: updated[itemIndex].photoFiles.filter((_, i) => i !== photoIndex),
    };
    setItems(updated);
  };

  const handleSubmit = async () => {
    if (!items.some(i => i.name.trim())) return;

    setSaving(true);
    const result = await createReturn({
      orderId: orderId || undefined,
      customerId: customerId || undefined,
      reasonCategory: reasonCategory || undefined,
      reasonSubcategory: reasonSubcategory || undefined,
      reasonText: reasonText || undefined,
      desiredSolution,
      priority: priority as any,
      internalNotes: internalNotes || undefined,
    });

    if (result.success && result.id) {
      for (const item of items) {
        if (!item.name.trim()) continue;

        // Upload photos
        const photoPaths: string[] = [];
        for (const file of item.photoFiles) {
          const upload = await uploadReturnPhoto(file, result.id);
          if (upload.success && upload.path) {
            photoPaths.push(upload.path);
          }
        }

        await addReturnItem({
          returnId: result.id,
          productId: item.productId || undefined,
          name: item.name,
          sku: item.sku || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
          condition: item.condition as any || undefined,
          approved: true,
          photos: photoPaths,
        });
      }

      await addTimelineEntry({
        returnId: result.id,
        status: 'CREATED',
        comment: t('Return created'),
        actorType: 'agent',
        metadata: {},
      });

      navigate(`/returns/${result.id}`);
    }
    setSaving(false);
  };

  const hasItem = items.some(i => i.name.trim());
  const selectedCustomer = customers.find((c) => c.id === customerId);
  const customerLabel = selectedCustomer
    ? [selectedCustomer.firstName, selectedCustomer.lastName].filter(Boolean).join(' ') || selectedCustomer.email
    : t('No customer');
  const priorityLabels: Record<string, string> = { low: t('Low'), normal: t('Normal'), high: t('High'), urgent: t('Urgent') };
  const solutionOptions = [
    { value: 'refund' as DesiredSolution, label: t('Refund'), description: t('Money back to the original payment method'), icon: Banknote },
    { value: 'exchange' as DesiredSolution, label: t('Exchange'), description: t('Send a replacement item'), icon: Repeat },
    { value: 'voucher' as DesiredSolution, label: t('Voucher'), description: t('Store credit for a future order'), icon: Ticket },
    { value: 'repair' as DesiredSolution, label: t('Repair'), description: t('Fix the item and send it back'), icon: Wrench },
  ];

  const steps: WizardStep[] = [
    {
      id: 'order',
      title: t('Order Information'),
      shortTitle: t('Order'),
      description: t('Who is returning, and how urgent is it?'),
      icon: ReceiptText,
      content: (
        <FormGrid cols={2}>
          <FormField label={t('Order ID')} optional>
            <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ORD-..." autoFocus />
          </FormField>
          <FormField label={t('Customer')} htmlFor="cr-customer" optional>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger id="cr-customer" className="w-full">
                <SelectValue placeholder={t('No customer')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('No customer')}</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {[c.firstName, c.lastName].filter(Boolean).join(' ') || c.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label={t('Priority')} span="full">
            <ChoiceCards
              columns={4}
              className="pointer-coarse:*:min-h-11!"
              value={priority}
              onValueChange={setPriority}
              options={['low', 'normal', 'high', 'urgent'].map((p) => ({ value: p, label: priorityLabels[p] }))}
            />
          </FormField>
        </FormGrid>
      ),
    },
    {
      id: 'reason',
      title: t('Return Reason'),
      shortTitle: t('Reason'),
      description: t('Why is the item coming back?'),
      icon: HelpCircle,
      content: (
        <ReturnReasonSelect
          reasons={reasons}
          selectedCategory={reasonCategory}
          selectedSubcategory={reasonSubcategory}
          reasonText={reasonText}
          onCategoryChange={setReasonCategory}
          onSubcategoryChange={setReasonSubcategory}
          onReasonTextChange={setReasonText}
        />
      ),
    },
    {
      id: 'items',
      title: t('Items'),
      description: t('Which items are being returned?'),
      icon: Package,
      canNext: hasItem,
      content: (
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="space-y-4 rounded-xl border bg-card p-3 sm:p-4">
              <div className="flex min-h-9 items-center justify-between gap-2">
                <span className="text-sm font-medium">{t('Item')} {index + 1}</span>
                {items.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 text-destructive sm:size-9"
                    onClick={() => removeItem(index)}
                    aria-label={t('Delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <FormGrid cols={6}>
                <FormField label={t('Product')} htmlFor={`cr-product-${index}`} span="full">
                  <Select value={item.productId || 'manual'} onValueChange={(v) => handleProductSelect(index, v)}>
                    <SelectTrigger id={`cr-product-${index}`} className="w-full">
                      <SelectValue placeholder={t('Select product...')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">{t('Manual entry')}</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.gtin ? `(${p.gtin})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                {!item.productId && (
                  <FormField label={t('Product name')} required span="full">
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      placeholder={t('Product name')}
                    />
                  </FormField>
                )}
                <div className="col-span-full grid grid-cols-2 gap-x-3 gap-y-5 @md:col-span-4">
                  <FormField label={t('Quantity')}>
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </FormField>
                  <FormField label={t('Unit Price')} optional>
                    <InputAffix suffix="€">
                      <Input
                        inputMode="decimal"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                        placeholder="0.00"
                      />
                    </InputAffix>
                  </FormField>
                </div>
                <FormField label={t('SKU')} optional span={2}>
                  <Input
                    value={item.sku}
                    onChange={(e) => updateItem(index, 'sku', e.target.value)}
                    disabled={!!item.productId}
                  />
                </FormField>
              </FormGrid>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  ref={(el) => { fileInputRefs.current[index] = el; }}
                  onChange={(e) => handleFileSelect(index, e.target.files)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="pointer-coarse:h-11"
                  onClick={() => fileInputRefs.current[index]?.click()}
                >
                  <Camera className="h-4 w-4 mr-1.5" />
                  {t('Upload Photos')}
                </Button>
                {item.photoFiles.map((file, pi) => (
                  <span key={pi} className="inline-flex items-center gap-1 rounded-md bg-muted py-1 pl-2 pr-1 text-xs">
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removePhoto(index, pi)}
                      className="inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:text-destructive"
                      aria-label={t('Delete')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
          <Button variant="outline" className="w-full border-dashed pointer-coarse:h-11" onClick={addItem}>
            <Plus className="h-4 w-4 mr-1.5" />
            {t('Add Item')}
          </Button>
        </div>
      ),
    },
    {
      id: 'solution',
      title: t('Desired Solution'),
      shortTitle: t('Solution'),
      description: t('What does the customer want?'),
      icon: Lightbulb,
      content: (
        <>
          <ChoiceCards
            value={desiredSolution}
            onValueChange={setDesiredSolution}
            options={solutionOptions}
          />
          <OptionalDisclosure label={t('Internal Notes')} filledCount={internalNotes.trim() ? 1 : 0}>
            <FormField label={t('Internal Notes')} optional>
              <Textarea
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder={t('Notes visible only to your team...')}
                rows={3}
              />
            </FormField>
          </OptionalDisclosure>
        </>
      ),
    },
    {
      id: 'review',
      title: t('Review', { ns: 'common' }),
      description: t('Check everything before creating the return.'),
      icon: ClipboardCheck,
      canNext: hasItem,
      content: (
        <WizardReview>
          <ReviewSection title={t('Order Information')} step="order">
            <ReviewRow label={t('Order ID')}>{orderId || '—'}</ReviewRow>
            <ReviewRow label={t('Customer')}>{customerLabel}</ReviewRow>
            <ReviewRow label={t('Priority')}>{priorityLabels[priority]}</ReviewRow>
          </ReviewSection>
          <ReviewSection title={t('Return Reason')} step="reason">
            <ReviewRow label={t('Return Reason')}>
              {[reasonCategory, reasonSubcategory].filter(Boolean).join(' › ') || '—'}
            </ReviewRow>
          </ReviewSection>
          <ReviewSection title={t('Items')} step="items">
            {items.filter(i => i.name.trim()).map((i, idx) => (
              <ReviewRow key={idx} label={`${i.quantity} ×`}>
                {i.name}{i.photoFiles.length > 0 ? ` · ${t('{{count}} photos selected', { count: i.photoFiles.length })}` : ''}
              </ReviewRow>
            ))}
          </ReviewSection>
          <ReviewSection title={t('Desired Solution')} step="solution">
            <ReviewRow label={t('Desired Solution')}>
              {solutionOptions.find(o => o.value === desiredSolution)?.label}
            </ReviewRow>
            {internalNotes.trim() && <ReviewRow label={t('Internal Notes')}>{internalNotes}</ReviewRow>}
          </ReviewSection>
        </WizardReview>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 sm:px-0">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="size-11 sm:size-9" onClick={() => navigate('/returns/list')} aria-label={t('Cancel')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t('Create Return')}</h1>
          <p className="text-sm text-muted-foreground">{t('Register a new return')}</p>
        </div>
      </div>

      <FormWizard
        variant="page"
        steps={steps}
        onCancel={() => navigate('/returns/list')}
        cancelLabel={t('Cancel')}
        onFinish={handleSubmit}
        finishing={saving}
        finishLabel={t('Create Return')}
      />
    </div>
  );
}
