import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReturnReasonSelect } from '@/components/returns/ReturnReasonSelect';
import { createReturn, addReturnItem, getReturnReasons, addTimelineEntry } from '@/services/supabase';
import type { RhReturnReason, DesiredSolution } from '@/types/returns-hub';

interface ItemForm {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  condition: string;
  notes: string;
}

export function CreateReturnPage() {
  const { t } = useTranslation('returns');
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [reasons, setReasons] = useState<RhReturnReason[]>([]);

  // Form state
  const [orderId, setOrderId] = useState('');
  const [reasonCategory, setReasonCategory] = useState('');
  const [reasonSubcategory, setReasonSubcategory] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [desiredSolution, setDesiredSolution] = useState<DesiredSolution>('refund');
  const [priority, setPriority] = useState('normal');
  const [internalNotes, setInternalNotes] = useState('');
  const [items, setItems] = useState<ItemForm[]>([
    { name: '', sku: '', quantity: 1, unitPrice: '', condition: '', notes: '' },
  ]);

  useEffect(() => {
    getReturnReasons().then(setReasons);
  }, []);

  const addItem = () => {
    setItems([...items, { name: '', sku: '', quantity: 1, unitPrice: '', condition: '', notes: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ItemForm, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async () => {
    if (!items.some(i => i.name.trim())) return;

    setSaving(true);
    const result = await createReturn({
      orderId: orderId || undefined,
      reasonCategory: reasonCategory || undefined,
      reasonSubcategory: reasonSubcategory || undefined,
      reasonText: reasonText || undefined,
      desiredSolution,
      priority: priority as any,
      internalNotes: internalNotes || undefined,
    });

    if (result.success && result.id) {
      // Add items
      for (const item of items) {
        if (!item.name.trim()) continue;
        await addReturnItem({
          returnId: result.id,
          name: item.name,
          sku: item.sku || undefined,
          quantity: item.quantity,
          unitPrice: item.unitPrice ? Number(item.unitPrice) : undefined,
          condition: item.condition as any || undefined,
          approved: true,
          photos: [],
        });
      }

      // Add timeline entry
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
            <div key={index} className="grid grid-cols-6 gap-3 p-3 rounded-lg border">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">{t('Product')}</Label>
                <Input value={item.name} onChange={(e) => updateItem(index, 'name', e.target.value)} placeholder={t('Product name')} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t('SKU')}</Label>
                <Input value={item.sku} onChange={(e) => updateItem(index, 'sku', e.target.value)} />
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
