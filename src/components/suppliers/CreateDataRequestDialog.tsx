import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Loader2, Copy, Check, Search, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
} from '@/components/ui/dialog';
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
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [allowedProductFields, setAllowedProductFields] = useState<string[]>(ALL_PRODUCT_FIELD_KEYS);
  const [allowedBatchFields, setAllowedBatchFields] = useState<string[]>(ALL_BATCH_FIELD_KEYS);
  const [allowBatchCreate, setAllowBatchCreate] = useState(true);
  const [allowBatchEdit, setAllowBatchEdit] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const canSubmit = password.length >= 4 && selectedProducts.length > 0 && (allowedProductFields.length > 0 || allowedBatchFields.length > 0);

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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('Create Data Request')}</DialogTitle>
          <DialogDescription>
            {t('Suppliers can fill in product and batch data via a secure link')}
          </DialogDescription>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4 py-4">
            <div className="rounded-lg border p-4 bg-muted/50">
              <Label className="text-sm font-medium">{t('Supplier Data Request')}</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input value={generatedLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={handleCopyLink}>
                  {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>{t('Close', { ns: 'common' })}</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-6 py-2">
            {/* Product Selection */}
            <div className="space-y-2">
              <Label>{t('Products')}</Label>

              {/* Selected products badges */}
              {selectedProducts.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedProducts.map(p => (
                    <Badge key={p.id} variant="secondary" className="gap-1 pr-1">
                      {p.name}
                      <button
                        type="button"
                        onClick={() => toggleProduct(p)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Product search + list */}
              {allProducts.length > 1 && (
                <div className="border rounded-lg overflow-hidden">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={productSearch}
                      onChange={e => setProductSearch(e.target.value)}
                      placeholder={t('Search products...')}
                      className="border-0 border-b rounded-none pl-8 focus-visible:ring-0"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {filteredProducts.length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground text-center">{t('No products found')}</p>
                    ) : (
                      filteredProducts.map(p => (
                        <label
                          key={p.id}
                          className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 cursor-pointer text-sm"
                        >
                          <Checkbox
                            checked={isProductSelected(p.id)}
                            onCheckedChange={() => toggleProduct(p)}
                          />
                          <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate">{p.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {selectedProducts.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {t('{{count}} products selected', { count: selectedProducts.length })}
                </p>
              )}
            </div>

            {/* Supplier (optional) */}
            {suppliers.length > 0 && (
              <div className="space-y-2">
                <Label>{t('Supplier')}</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Select a supplier (optional)')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('No specific supplier')}</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Password */}
            <div className="space-y-2">
              <Label>{t('Password')}</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('Set a password for the supplier portal access')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Expiry */}
            <div className="space-y-2">
              <Label>{t('Expiry Date')}</Label>
              <Select value={String(expiresInDays)} onValueChange={v => setExpiresInDays(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 {t('days', { ns: 'common' })}</SelectItem>
                  <SelectItem value="14">14 {t('days', { ns: 'common' })}</SelectItem>
                  <SelectItem value="30">30 {t('days', { ns: 'common' })}</SelectItem>
                  <SelectItem value="60">60 {t('days', { ns: 'common' })}</SelectItem>
                  <SelectItem value="90">90 {t('days', { ns: 'common' })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label>{t('Message to Supplier')}</Label>
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder={t('Optional message shown to the supplier')}
                rows={3}
              />
            </div>

            {/* Field Selection */}
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

            {/* Batch permissions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allow-batch-create"
                  checked={allowBatchCreate}
                  onCheckedChange={(c) => setAllowBatchCreate(!!c)}
                />
                <div>
                  <Label htmlFor="allow-batch-create" className="cursor-pointer">
                    {t('Allow Batch Creation')}
                  </Label>
                  <p className="text-xs text-muted-foreground">{t('Supplier can create new batches')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="allow-batch-edit"
                  checked={allowBatchEdit}
                  onCheckedChange={(c) => setAllowBatchEdit(!!c)}
                />
                <div>
                  <Label htmlFor="allow-batch-edit" className="cursor-pointer">
                    {t('Allow Batch Editing')}
                  </Label>
                  <p className="text-xs text-muted-foreground">{t('Supplier can edit existing batches')}</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {t('Cancel', { ns: 'common' })}
              </Button>
              <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? t('Creating...') : t('Create & Copy Link')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
