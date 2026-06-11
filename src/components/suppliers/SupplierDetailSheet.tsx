import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Info, User, Package, Shield, CreditCard, MapPin, Mail, Phone, Smartphone,
  Globe, Linkedin, ExternalLink, FileCheck, Plus,
  Maximize2, Pencil, Link2, CheckCircle2, XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLocale } from '@/hooks/use-locale';
import { formatDate } from '@/lib/format';
import {
  getSupplierProducts, getSupplierSpendForSupplier,
  type SupplierSpendDetail,
} from '@/services/supabase';
import { SupplierAvatar } from './SupplierAvatar';
import { SupplierRiskBadge, SupplierStatusBadge, SupplierComplianceBadge, StarRating } from './SupplierBadges';
import { SupplierDetailFinanceTab } from './SupplierDetailFinanceTab';
import { SUPPLIER_ROLES, getAuditIndicator, countryFlag } from './supplier-helpers';
import type { Supplier, SupplierProduct, Country } from '@/types/database';

type SupplierProductWithName = SupplierProduct & { product_name?: string };

interface SupplierDetailSheetProps {
  supplier: Supplier | null;
  countries: Country[];
  /** Bump to force a reload of assigned products (e.g. after assignment changes) */
  productsVersion: number;
  onOpenChange: (open: boolean) => void;
  onOpenFullPage: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onAssignProducts: (supplier: Supplier) => void;
  onApprove: (supplier: Supplier) => void;
  onReject: (supplier: Supplier) => void;
}

/** Supplier detail as a sheet: overview, contacts, products, compliance, finance */
export function SupplierDetailSheet({
  supplier, countries, productsVersion,
  onOpenChange, onOpenFullPage, onEdit, onAssignProducts, onApprove, onReject,
}: SupplierDetailSheetProps) {
  const isMobile = useIsMobile();

  return (
    <Sheet open={!!supplier} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={isMobile ? 'h-[88vh] overflow-y-auto' : 'w-full overflow-y-auto sm:max-w-lg'}
      >
        {supplier && (
          <SupplierDetailBody
            key={supplier.id}
            supplier={supplier}
            countries={countries}
            productsVersion={productsVersion}
            onOpenFullPage={onOpenFullPage}
            onEdit={onEdit}
            onAssignProducts={onAssignProducts}
            onApprove={onApprove}
            onReject={onReject}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

interface SupplierDetailBodyProps {
  supplier: Supplier;
  countries: Country[];
  productsVersion: number;
  onOpenFullPage: (supplier: Supplier) => void;
  onEdit: (supplier: Supplier) => void;
  onAssignProducts: (supplier: Supplier) => void;
  onApprove: (supplier: Supplier) => void;
  onReject: (supplier: Supplier) => void;
}

/** Inner body - keyed by supplier.id so all local state resets per supplier */
function SupplierDetailBody({
  supplier, countries, productsVersion,
  onOpenFullPage, onEdit, onAssignProducts, onApprove, onReject,
}: SupplierDetailBodyProps) {
  const { t } = useTranslation('settings');
  const locale = useLocale();

  const [activeTab, setActiveTab] = useState('overview');
  const [products, setProducts] = useState<SupplierProductWithName[]>([]);
  const [spend, setSpend] = useState<SupplierSpendDetail | null>(null);

  const supplierId = supplier.id;

  useEffect(() => {
    getSupplierProducts(supplierId)
      .then(setProducts)
      .catch(error => console.error('Error loading supplier products:', error));
  }, [supplierId, productsVersion]);

  // Load spend detail lazily when the finance tab opens
  useEffect(() => {
    if (activeTab === 'finance') {
      getSupplierSpendForSupplier(supplierId)
        .then(setSpend)
        .catch(error => console.error('Error loading supplier spend:', error));
    }
  }, [activeTab, supplierId, productsVersion]);

  const getCountryName = (code: string) => countries.find(c => c.code === code)?.name || code;
  const getProductName = (sp: SupplierProductWithName) => sp.product_name || '-';

  const isPending = supplier.status === 'pending_approval';

  return (
    <>
        <SheetHeader className="text-left">
          <div className="flex items-start justify-between gap-2 pr-8">
            <div className="flex min-w-0 items-center gap-3">
              <SupplierAvatar name={supplier.name} size="lg" />
              <div className="min-w-0">
                <SheetTitle className="truncate">{supplier.name}</SheetTitle>
                <SheetDescription>
                  {supplier.legal_form || '-'} | {supplier.code || t('No code')}
                </SheetDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => onOpenFullPage(supplier)}
            >
              <Maximize2 className="mr-1 h-4 w-4" />
              {t('Open')}
            </Button>
          </div>
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {isPending ? (
              <>
                <Button size="sm" className="min-h-[44px] flex-1 bg-green-600 hover:bg-green-700 sm:min-h-9 sm:flex-none" onClick={() => onApprove(supplier)}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />{t('Approve')}
                </Button>
                <Button size="sm" variant="outline" className="min-h-[44px] flex-1 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 sm:min-h-9 sm:flex-none dark:border-red-900 dark:hover:bg-red-950" onClick={() => onReject(supplier)}>
                  <XCircle className="mr-1.5 h-4 w-4" />{t('Reject')}
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" className="min-h-[44px] sm:min-h-9" onClick={() => onEdit(supplier)}>
                  <Pencil className="mr-1.5 h-4 w-4" />{t('Edit', { ns: 'common' })}
                </Button>
                <Button size="sm" variant="outline" className="min-h-[44px] sm:min-h-9" onClick={() => onAssignProducts(supplier)}>
                  <Link2 className="mr-1.5 h-4 w-4" />{t('Assign Products')}
                </Button>
              </>
            )}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="gap-1">
              <Info className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('Overview')}</span>
            </TabsTrigger>
            <TabsTrigger value="contacts" className="gap-1">
              <User className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('Contacts')}</span>
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-1">
              <Package className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('Products')}</span>
            </TabsTrigger>
            <TabsTrigger value="compliance" className="gap-1">
              <Shield className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('Compliance')}</span>
            </TabsTrigger>
            <TabsTrigger value="finance" className="gap-1">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('Finance')}</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              <SupplierStatusBadge status={supplier.status} />
              <SupplierRiskBadge level={supplier.risk_level} />
              {supplier.verified && (
                <Badge className="bg-blue-100 text-blue-800">
                  <Shield className="mr-1 h-3 w-3" />{t('Verified')}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">{t('Quality')}:</span>
                <div><StarRating rating={supplier.quality_rating} /></div>
              </div>
              <div>
                <span className="text-muted-foreground">{t('Delivery')}:</span>
                <div><StarRating rating={supplier.delivery_rating} /></div>
              </div>
            </div>
            <Separator />
            <div className="space-y-1">
              <h4 className="flex items-center gap-1 text-sm font-medium">
                <MapPin className="h-4 w-4" /> {t('Address')}
              </h4>
              <div className="text-sm text-muted-foreground">
                {supplier.address && <div>{supplier.address}</div>}
                {supplier.address_line2 && <div>{supplier.address_line2}</div>}
                <div>{supplier.postal_code} {supplier.city}</div>
                {supplier.state && <div>{supplier.state}</div>}
                <div>{countryFlag(supplier.country)} {getCountryName(supplier.country)}</div>
              </div>
            </div>
            {supplier.notes && (
              <>
                <Separator />
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">{t('Notes')}</h4>
                  <p className="text-sm text-muted-foreground">{supplier.notes}</p>
                </div>
              </>
            )}
          </TabsContent>

          {/* Contacts */}
          <TabsContent value="contacts" className="mt-4 space-y-4">
            {supplier.contact_person && (
              <div className="rounded-lg border bg-card p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge>{t('Primary Contact')}</Badge>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="font-medium">{supplier.contact_person}</div>
                  {supplier.contact_position && (
                    <div className="text-muted-foreground">{supplier.contact_position}</div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <a href={`mailto:${supplier.email}`} className="text-primary hover:underline">{supplier.email}</a>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <a href={`tel:${supplier.phone}`} className="hover:underline">{supplier.phone}</a>
                    </div>
                  )}
                  {supplier.mobile && (
                    <div className="flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      <a href={`tel:${supplier.mobile}`} className="hover:underline">{supplier.mobile}</a>
                    </div>
                  )}
                </div>
              </div>
            )}
            {supplier.additional_contacts && supplier.additional_contacts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t('Additional Contacts')}</h4>
                {supplier.additional_contacts.map((contact, i) => (
                  <div key={i} className="rounded border p-2 text-sm">
                    <div className="font-medium">{contact.name}</div>
                    {contact.position && <div className="text-muted-foreground">{contact.position}</div>}
                    {contact.department && <div className="text-muted-foreground">{contact.department}</div>}
                    {contact.email && (
                      <div className="mt-1 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${contact.email}`} className="text-xs text-primary hover:underline">{contact.email}</a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        <span className="text-xs">{contact.phone}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {(supplier.website || supplier.linkedin) && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">{t('Online')}</h4>
                {supplier.website && (
                  <div className="flex items-center gap-1 text-sm">
                    <Globe className="h-3 w-3" />
                    <a href={supplier.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      {t('Website')} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {supplier.linkedin && (
                  <div className="flex items-center gap-1 text-sm">
                    <Linkedin className="h-3 w-3" />
                    <a href={supplier.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      {t('LinkedIn')} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Products */}
          <TabsContent value="products" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm tabular-nums text-muted-foreground">{products.length} {t('Products')}</span>
              <Button variant="outline" size="sm" onClick={() => onAssignProducts(supplier)}>
                <Plus className="mr-1 h-3 w-3" />{t('Assign')}
              </Button>
            </div>
            {products.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{t('No products assigned')}</p>
            ) : (
              <div className="space-y-2">
                {products.map(sp => (
                  <div key={sp.id} className="flex items-center justify-between rounded border bg-card p-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{getProductName(sp)}</div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                          <span>{t(SUPPLIER_ROLES.find(r => r.value === sp.role)?.labelKey || sp.role)}</span>
                          {sp.price_per_unit != null && <span className="tabular-nums">{sp.price_per_unit.toFixed(2)} {sp.currency || 'EUR'}</span>}
                          {sp.min_order_quantity != null && <span className="tabular-nums">{t('Min')}: {sp.min_order_quantity}</span>}
                          {sp.is_primary && <Badge variant="secondary" className="text-xs">{t('Primary Supplier')}</Badge>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Compliance */}
          <TabsContent value="compliance" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">{t('Compliance Status')}</h4>
              <SupplierComplianceBadge status={supplier.compliance_status} />
            </div>

            <Separator />

            {supplier.certifications && supplier.certifications.length > 0 && (
              <>
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1 text-sm font-medium">
                    <FileCheck className="h-4 w-4" /> {t('Certifications')}
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {supplier.certifications.map(cert => (
                      <Badge key={cert} variant="outline" className="text-xs">{cert}</Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('Audit Information')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Last Audit')}:</span>
                  <div className="flex items-center gap-2">
                    <span>{supplier.audit_date ? formatDate(supplier.audit_date, locale) : '-'}</span>
                    {supplier.audit_date && (
                      <span className={`h-2.5 w-2.5 rounded-full ${getAuditIndicator(supplier.audit_date, false)}`} />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Next Audit')}:</span>
                  <div className="flex items-center gap-2">
                    <span>{supplier.next_audit_date ? formatDate(supplier.next_audit_date, locale) : '-'}</span>
                    {supplier.next_audit_date && (
                      <span className={`h-2.5 w-2.5 rounded-full ${getAuditIndicator(supplier.next_audit_date, true)}`} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('Ratings')}</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Quality')}:</span>
                  <div className="flex items-center gap-2">
                    <StarRating rating={supplier.quality_rating} />
                    {supplier.quality_rating && <span className="text-xs tabular-nums text-muted-foreground">({supplier.quality_rating}/5)</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Delivery')}:</span>
                  <div className="flex items-center gap-2">
                    <StarRating rating={supplier.delivery_rating} />
                    {supplier.delivery_rating && <span className="text-xs tabular-nums text-muted-foreground">({supplier.delivery_rating}/5)</span>}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('Legal Information')}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Tax ID')}:</span>
                  <span>{supplier.tax_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('VAT ID')}:</span>
                  <span>{supplier.vat_id || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('D-U-N-S Number')}:</span>
                  <span>{supplier.duns_number || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Registration No.')}:</span>
                  <span>{supplier.registration_number || '-'}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Finance */}
          <TabsContent value="finance" className="mt-4">
            <SupplierDetailFinanceTab
              supplier={supplier}
              spend={spend}
              products={products}
              getProductName={getProductName}
            />
          </TabsContent>
        </Tabs>
    </>
  );
}
