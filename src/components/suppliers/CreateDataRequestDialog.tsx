import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check, Search, X, Package, ListChecks, KeyRound } from 'lucide-react';
import { MIN_PASSWORD_LENGTH } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { FormField, ChoiceCards, SecretInput, FormToggleRow, FormActions } from '@/components/ui/form-layout';
import { FormWizard } from '@/components/ui/form-wizard';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/adaptive-dialog';
import { useToast } from '@/hooks/use-toast';
import { FieldGroupPicker } from './FieldGroupPicker';
import { PRODUCT_FIELD_GROUPS, BATCH_FIELD_GROUPS, ALL_PRODUCT_FIELD_KEYS, ALL_BATCH_FIELD_KEYS } from '@/lib/supplier-data-fields';
import { createSupplierDataRequest } from '@/services/supabase/supplier-data-portal';

interface CreateDataRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProducts?: Array<{ id: string; name: string }>;
  allProducts?: Array<{ id: string; name: string }>;
  suppliers?: Array<{ id: string; name: string }>;
  onCreated?: () => void;
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export function CreateDataRequestDialog({
  open,
  onOpenChange,
  initialProducts = [],
  allProducts = [],
  suppliers = [],
  onCreated,
}: CreateDataRequestDialogProps) {
  const { t } = useTranslation('supplier-data-portal');
  const { toast } = useToast();

  const [selectedProducts, setSelectedProducts] = useState<Array<{ id: string; name: string }>>(initialProducts);
  const [productSearch, setProductSearch] = useState('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [allowedProductFields, setAllowedProductFields] = useState<string[]>(ALL_PRODUCT_FIELD_KEYS);
  const [allowedBatchFields, setAllowedBatchFields] = useState<string[]>(ALL_BATCH_FIELD_KEYS);
  const [allowBatchCreate, setAllowBatchCreate] = useState(true);
  const [allowBatchEdit, setAllowBatchEdit] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const canSubmit = password.length >= MIN_PASSWORD_LENGTH && selectedProducts.length > 0 && (allowedProductFields.length > 0 || allowedBatchFields.length > 0);

  // Filter products for the search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return allProducts;
    const q = productSearch.toLowerCase();
    return allProducts.filter(p => p.name.toLowerCase().includes(q));
  }, [allProducts, productSearch]);

  const toggleProduct = (product: { id: string; name: string }) => {
    setSelectedProducts(prev => {
      const exists = prev.some(p => p.id === product.id);
      if (exists) return prev.filter(p => p.id !== product.id);
      return [...prev, product];
    });
  };

  const isProductSelected = (id: string) => selectedProducts.some(p => p.id === id);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);

    try {
      const passwordHash = await hashPassword(password);
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

      const result = await createSupplierDataRequest({
        productIds: selectedProducts.map(p => p.id),
        supplierId: supplierId || null,
        passwordHash,
        allowedProductFields,
        allowedBatchFields,
        allowBatchCreate,
        allowBatchEdit,
        message: message || undefined,
        expiresAt,
      });

      setGeneratedLink(result.url);
      await navigator.clipboard.writeText(result.url);
      setLinkCopied(true);

      toast({
        title: t('Data request created'),
        description: t('Link copied to clipboard'),
      });

      onCreated?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after animation
    setTimeout(() => {
      setSelectedProducts(initialProducts);
      setProductSearch('');
      setSupplierId('');
      setPassword('');
      setMessage('');
      setExpiresInDays(30);
      setAllowedProductFields(ALL_PRODUCT_FIELD_KEYS);
      setAllowedBatchFields(ALL_BATCH_FIELD_KEYS);
      setAllowBatchCreate(true);
      setAllowBatchEdit(true);
      setGeneratedLink(null);
      setLinkCopied(false);
    }, 300);
  };

  const productsStep = (
    <div className="space-y-5">
      <FormField
        label={t('Products')}
        required
        labelAside={selectedProducts.length > 0 ? (
          <span className="tabular-nums">{t('{{count}} products selected', { count: selectedProducts.length })}</span>
        ) : undefined}
      >
        <div className="space-y-2">
          {selectedProducts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedProducts.map(p => (
                <Badge key={p.id} variant="secondary" className="h-8 gap-1 pr-0.5">
                  {p.name}
                  <button
                    type="button"
                    aria-label={t('Remove', { ns: 'common' })}
                    onClick={() => toggleProduct(p)}
                    className="flex size-7 items-center justify-center rounded-full hover:bg-muted-foreground/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {allProducts.length > 1 && (
            <div className="overflow-hidden rounded-lg border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  type="search"
                  value={productSearch}
                  onChange={e => setProductSearch(e.target.value)}
                  placeholder={t('Search products...')}
                  aria-label={t('Search products...')}
                  className="rounded-none border-0 border-b pl-9 shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="max-h-56 overflow-y-auto overscroll-contain">
                {filteredProducts.length === 0 ? (
                  <p className="p-3 text-center text-sm text-muted-foreground">{t('No products found')}</p>
                ) : (
                  filteredProducts.map(p => (
                    <label
                      key={p.id}
                      className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={isProductSelected(p.id)}
                        onCheckedChange={() => toggleProduct(p)}
                      />
                      <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="truncate">{p.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </FormField>

      {suppliers.length > 0 && (
        <FormField label={t('Supplier')} optional htmlFor="dr-supplier">
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger id="dr-supplier" className="w-full">
              <SelectValue placeholder={t('Select a supplier (optional)')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('No specific supplier')}</SelectItem>
              {suppliers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}
    </div>
  );

  const fieldsStep = (
    <div className="space-y-5">
      <Tabs defaultValue="product">
        <TabsList className="w-full">
          <TabsTrigger value="product" className="flex-1">{t('Product Fields')}</TabsTrigger>
          <TabsTrigger value="batch" className="flex-1">{t('Batch Fields')}</TabsTrigger>
        </TabsList>
        <TabsContent value="product" className="mt-4">
          <FieldGroupPicker
            groups={PRODUCT_FIELD_GROUPS}
            selectedFields={allowedProductFields}
            onFieldsChange={setAllowedProductFields}
          />
        </TabsContent>
        <TabsContent value="batch" className="mt-4">
          <FieldGroupPicker
            groups={BATCH_FIELD_GROUPS}
            selectedFields={allowedBatchFields}
            onFieldsChange={setAllowedBatchFields}
          />
        </TabsContent>
      </Tabs>

      <div className="space-y-2">
        <FormToggleRow
          label={t('Allow Batch Creation')}
          description={t('Supplier can create new batches')}
          htmlFor="allow-batch-create"
        >
          <Switch aria-describedby="allow-batch-create-description"
            id="allow-batch-create"
            checked={allowBatchCreate}
            onCheckedChange={(c) => setAllowBatchCreate(!!c)}
          />
        </FormToggleRow>
        <FormToggleRow
          label={t('Allow Batch Editing')}
          description={t('Supplier can edit existing batches')}
          htmlFor="allow-batch-edit"
        >
          <Switch aria-describedby="allow-batch-edit-description"
            id="allow-batch-edit"
            checked={allowBatchEdit}
            onCheckedChange={(c) => setAllowBatchEdit(!!c)}
          />
        </FormToggleRow>
      </div>
    </div>
  );

  const accessStep = (
    <div className="space-y-5">
      <FormField label={t('Password')} htmlFor="dr-password" required>
        <SecretInput
          id="dr-password"
          autoComplete="new-password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder={t('Set a password for the supplier portal access')}
        />
      </FormField>

      <FormField label={t('Expiry Date')}>
        <ChoiceCards
          value={String(expiresInDays)}
          onValueChange={v => setExpiresInDays(Number(v))}
          columns={3}
          options={['7', '14', '30', '60', '90'].map(d => ({
            value: d,
            label: <span className="tabular-nums">{d} {t('days', { ns: 'common' })}</span>,
          }))}
        />
      </FormField>

      <FormField label={t('Message to Supplier')} optional>
        <Textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder={t('Optional message shown to the supplier')}
          rows={3}
        />
      </FormField>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto pb-0">
        <DialogHeader>
          <DialogTitle>{t('Create Data Request')}</DialogTitle>
          <DialogDescription>
            {t('Suppliers can fill in product and batch data via a secure link')}
          </DialogDescription>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4 py-2">
            <FormField label={t('Supplier Data Request')} htmlFor="dr-link">
              <div className="flex items-center gap-2">
                <Input id="dr-link" value={generatedLink} readOnly className="font-mono text-xs" />
                <Button variant="outline" size="icon" className="shrink-0 pointer-coarse:size-11" aria-label={t('Copy', { ns: 'common' })} onClick={handleCopyLink}>
                  {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </FormField>
            <FormActions sticky="dialog">
              <Button onClick={handleClose}>{t('Close', { ns: 'common' })}</Button>
            </FormActions>
          </div>
        ) : (
          <FormWizard
            variant="dialog"
            steps={[
              { id: 'products', title: t('Choose products'), description: t('Which products the supplier may fill in'), icon: Package, canNext: selectedProducts.length > 0, content: productsStep },
              { id: 'fields', title: t('Fields'), description: t('Which data the supplier may edit'), icon: ListChecks, canNext: allowedProductFields.length > 0 || allowedBatchFields.length > 0, content: fieldsStep },
              { id: 'access', title: t('Access'), description: t('Password, validity and a note for the supplier'), icon: KeyRound, canNext: canSubmit, content: accessStep },
            ]}
            onCancel={handleClose}
            onFinish={handleSubmit}
            finishing={isSubmitting}
            finishLabel={isSubmitting ? t('Creating...') : t('Create & Copy Link')}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
