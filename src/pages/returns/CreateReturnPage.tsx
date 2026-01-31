import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/returns/list')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t('Create Return')}</h1>
          <p className="text-muted-foreground">{t('Register a new return')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Order Information')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('Order ID')}</Label>
              <Input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ORD-..." />
            </div>
            <div className="space-y-2">
              <Label>{t('Priority')}</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">{t('Low')}</SelectItem>
                  <SelectItem value="normal">{t('Normal')}</SelectItem>
                  <SelectItem value="high">{t('High')}</SelectItem>
                  <SelectItem value="urgent">{t('Urgent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('Customer')}</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Return Reason')}</CardTitle>
        </CardHeader>
        <CardContent>
          <ReturnReasonSelect
            reasons={reasons}
            selectedCategory={reasonCategory}
            selectedSubcategory={reasonSubcategory}
            reasonText={reasonText}
            onCategoryChange={setReasonCategory}
            onSubcategoryChange={setReasonSubcategory}
            onReasonTextChange={setReasonText}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('Items')}</CardTitle>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              {t('Add Item')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="p-3 rounded-lg border space-y-3">
              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">{t('Product')}</Label>
                  <Select
                    value={item.productId || 'manual'}
                    onValueChange={(v) => handleProductSelect(index, v)}
                  >
                    <SelectTrigger>
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
                  {!item.productId && (
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      placeholder={t('Product name')}
                      className="mt-1"
                    />
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('SKU')}</Label>
                  <Input
                    value={item.sku}
                    onChange={(e) => updateItem(index, 'sku', e.target.value)}
                    disabled={!!item.productId}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('Quantity')}</Label>
                  <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t('Unit Price')}</Label>
                  <Input value={item.unitPrice} onChange={(e) => updateItem(index, 'unitPrice', e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-1 flex items-end">
                  {items.length > 1 && (
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removeItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Photo upload */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">{t('Photos')}</Label>
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
                    className="h-7 text-xs"
                    onClick={() => fileInputRefs.current[index]?.click()}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    {t('Upload Photos')}
                  </Button>
                  {item.photoFiles.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {t('{{count}} photos selected', { count: item.photoFiles.length })}
                    </Badge>
                  )}
                </div>
                {item.photoFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.photoFiles.map((file, pi) => (
                      <div key={pi} className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs">
                        <span className="max-w-[120px] truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removePhoto(index, pi)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Desired Solution')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={desiredSolution} onValueChange={(v) => setDesiredSolution(v as DesiredSolution)}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="refund">{t('Refund')}</SelectItem>
              <SelectItem value="exchange">{t('Exchange')}</SelectItem>
              <SelectItem value="voucher">{t('Voucher')}</SelectItem>
              <SelectItem value="repair">{t('Repair')}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('Internal Notes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder={t('Notes visible only to your team...')}
            rows={3}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate('/returns/list')}>{t('Cancel')}</Button>
        <Button onClick={handleSubmit} disabled={saving || !items.some(i => i.name.trim())}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {t('Create Return')}
        </Button>
      </div>
    </div>
  );
}
