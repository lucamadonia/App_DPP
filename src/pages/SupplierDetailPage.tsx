import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/hooks/use-locale';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useStaggeredList } from '@/hooks/useStaggeredList';
import { formatDate, formatCurrency } from '@/lib/format';
import {
  ArrowLeft,
  Package,
  DollarSign,
  FileText,
  Star,
  CalendarDays,
  Pencil,
  MoreHorizontal,
  Globe,
  Linkedin,
  Mail,
  Phone,
  Smartphone,
  MapPin,
  Building2,
  Shield,
  BadgeCheck,
  ExternalLink,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getSupplier,
  getSupplierProducts,
  getSupplierDocuments,
  getSupplierSpendForSupplier,
  getCountries,
  type SupplierSpendDetail,
} from '@/services/supabase';
import type { Supplier, SupplierProduct, Country, PriceTier } from '@/types/database';
import type { Document } from '@/services/supabase';

type SupplierProductWithName = SupplierProduct & { product_name?: string };
import {
  SupplierRiskBadge,
  SupplierStatusBadge,
  SupplierComplianceBadge,
  StarRating,
} from '@/components/suppliers/SupplierBadges';
import { SupplierDocumentsTab } from '@/components/suppliers/SupplierDocumentsTab';

export function SupplierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('settings');
  const locale = useLocale();

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<SupplierProductWithName[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [spend, setSpend] = useState<SupplierSpendDetail | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showIban, setShowIban] = useState(false);
  const [expandedPriceTiers, setExpandedPriceTiers] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    Promise.all([
      getSupplier(id),
      getSupplierProducts(id),
      getSupplierDocuments(id),
      getSupplierSpendForSupplier(id),
      getCountries(),
    ]).then(([s, p, d, sp, c]) => {
      if (cancelled) return;
      if (!s) {
        setNotFound(true);
      } else {
        setSupplier(s);
        setProducts(p);
        setDocuments(d);
        setSpend(sp);
        setCountries(c);
      }
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [id]);

  const countryName = useMemo(() => {
    if (!supplier) return '';
    const c = countries.find(c => c.code === supplier.country);
    return c ? `${c.flag} ${c.name}` : supplier.country;
  }, [supplier, countries]);

  // Contract status
  const contractInfo = useMemo(() => {
    if (!supplier?.contract_end) return null;
    const end = new Date(supplier.contract_end);
    const now = new Date();
    const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const start = supplier.contract_start ? new Date(supplier.contract_start) : null;
    const totalDays = start ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const elapsed = start ? Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const progress = totalDays > 0 ? Math.min(Math.max((elapsed / totalDays) * 100, 0), 100) : 0;
    return { diffDays, progress, expired: diffDays < 0 };
  }, [supplier]);

  // KPI values
  const productCount = products.length;
  const totalSpend = spend?.totalSpend ?? 0;
  const docCount = documents.length;
  const avgRating = supplier ? ((supplier.quality_rating ?? 0) + (supplier.delivery_rating ?? 0)) / 2 : 0;
  const contractDays = contractInfo ? Math.abs(contractInfo.diffDays) : 0;

  // Animated KPIs
  const animProductCount = useAnimatedNumber(productCount, { delay: 100 });
  const animTotalSpend = useAnimatedNumber(totalSpend, { delay: 200, decimals: 0 });
  const animDocCount = useAnimatedNumber(docCount, { delay: 300 });
  const animRating = useAnimatedNumber(avgRating, { delay: 400, decimals: 1 });
  const animContractDays = useAnimatedNumber(contractDays, { delay: 500 });
  const kpiVisible = useStaggeredList(5, { interval: 80, initialDelay: 150 });

  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        {/* Skeleton */}
        <div className="flex items-center gap-4">
          <div className="h-8 w-8 rounded bg-muted animate-pulse" />
          <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
        <div className="h-96 rounded-lg bg-muted animate-pulse" />
      </div>
    );
  }

  if (notFound || !supplier) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Building2 className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-xl font-semibold">{t('Supplier not found')}</h2>
        <p className="text-muted-foreground mt-1">{t('The supplier does not exist or you do not have access.')}</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/suppliers')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('Back to Suppliers')}
        </Button>
      </div>
    );
  }

  const kpiCards = [
    {
      label: t('Products'),
      value: animProductCount.toString(),
      icon: Package,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: t('Total Spend'),
      value: formatCurrency(animTotalSpend, spend?.currency || supplier.currency || 'EUR', locale),
      icon: DollarSign,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: t('Documents', { ns: 'common' }),
      value: animDocCount.toString(),
      icon: FileText,
      color: 'text-purple-600 bg-purple-50',
    },
    {
      label: t('Rating'),
      value: animRating > 0 ? animRating.toFixed(1) : '-',
      icon: Star,
      color: 'text-yellow-600 bg-yellow-50',
    },
    {
      label: t('Contract'),
      value: contractInfo
        ? contractInfo.expired
          ? `-${animContractDays}d`
          : `${animContractDays}d`
        : '-',
      icon: CalendarDays,
      color: contractInfo?.expired ? 'text-red-600 bg-red-50' : 'text-teal-600 bg-teal-50',
    },
  ];

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={() => navigate('/suppliers')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{supplier.name}</h1>
              <SupplierStatusBadge status={supplier.status} />
              <SupplierRiskBadge level={supplier.risk_level} />
              {supplier.verified && (
                <Badge className="bg-blue-100 text-blue-800 gap-1">
                  <BadgeCheck className="h-3 w-3" />
                  {t('Verified')}
                </Badge>
              )}
              <SupplierComplianceBadge status={supplier.compliance_status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {[
                supplier.code,
                supplier.legal_form,
                supplier.supplier_type && t(supplier.supplier_type.charAt(0).toUpperCase() + supplier.supplier_type.slice(1).replace('_', ' ')),
                supplier.city && `${supplier.city}, ${countryName}`,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/suppliers')}>
            <Pencil className="h-4 w-4 mr-1" />
            {t('Edit Supplier')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/suppliers')}>
                {t('Assign Products')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi, idx) => (
          <Card
            key={kpi.label}
            className={`transition-all duration-300 ${kpiVisible[idx] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          >
            <CardContent className="pt-4 pb-3 px-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <div className={`h-7 w-7 rounded-md flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <p className="text-xl font-bold mt-1">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('Overview')}</TabsTrigger>
          <TabsTrigger value="products">{t('Products')}</TabsTrigger>
          <TabsTrigger value="documents">{t('Documents', { ns: 'common' })}</TabsTrigger>
          <TabsTrigger value="finance">{t('Finance')}</TabsTrigger>
          <TabsTrigger value="compliance">{t('Compliance')}</TabsTrigger>
          <TabsTrigger value="contacts">{t('Contacts')}</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Left column */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('Company Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label={t('Type')} value={supplier.supplier_type ? t(supplier.supplier_type.charAt(0).toUpperCase() + supplier.supplier_type.slice(1).replace('_', ' ')) : '-'} />
                  <InfoRow label={t('Industry')} value={supplier.industry || '-'} />
                  <InfoRow label={t('Legal Form')} value={supplier.legal_form || '-'} />
                  {supplier.tags && supplier.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {supplier.tags.map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('Address & Shipping')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium mb-1">{t('Company Address')}</p>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <div>
                        {supplier.address && <p>{supplier.address}</p>}
                        {supplier.address_line2 && <p>{supplier.address_line2}</p>}
                        <p>{[supplier.postal_code, supplier.city].filter(Boolean).join(' ')}</p>
                        {supplier.state && <p>{supplier.state}</p>}
                        <p>{countryName}</p>
                      </div>
                    </div>
                  </div>
                  {(supplier.shipping_address || supplier.shipping_city) && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground font-medium mb-1">{t('Shipping Address (if different)')}</p>
                        <div className="flex items-start gap-2">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          <div>
                            {supplier.shipping_address && <p>{supplier.shipping_address}</p>}
                            <p>{[supplier.shipping_postal_code, supplier.shipping_city].filter(Boolean).join(' ')}</p>
                            {supplier.shipping_country && <p>{supplier.shipping_country}</p>}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {(supplier.notes || supplier.internal_notes) && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('Notes')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {supplier.notes && <p className="whitespace-pre-wrap">{supplier.notes}</p>}
                    {supplier.internal_notes && (
                      <>
                        <Separator />
                        <div>
                          <p className="text-xs text-muted-foreground font-medium mb-1">{t('Internal Notes')}</p>
                          <p className="whitespace-pre-wrap">{supplier.internal_notes}</p>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('Risk & Verification')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('Quality:')}</span>
                    <StarRating rating={supplier.quality_rating} size="md" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('Delivery:')}</span>
                    <StarRating rating={supplier.delivery_rating} size="md" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('Risk Level')}</span>
                    <SupplierRiskBadge level={supplier.risk_level} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('Verified')}</span>
                    {supplier.verified ? (
                      <Badge className="bg-blue-100 text-blue-800 gap-1">
                        <BadgeCheck className="h-3 w-3" />
                        {supplier.verification_date ? formatDate(supplier.verification_date, locale) : t('Verified')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">-</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('Online Presence')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {supplier.website ? (
                    <a href={supplier.website.startsWith('http') ? supplier.website : `https://${supplier.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <Globe className="h-3.5 w-3.5" />
                      {supplier.website}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-muted-foreground flex items-center gap-2"><Globe className="h-3.5 w-3.5" /> -</p>
                  )}
                  {supplier.linkedin ? (
                    <a href={supplier.linkedin.startsWith('http') ? supplier.linkedin : `https://${supplier.linkedin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                      <Linkedin className="h-3.5 w-3.5" />
                      LinkedIn
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <p className="text-muted-foreground flex items-center gap-2"><Linkedin className="h-3.5 w-3.5" /> -</p>
                  )}
                </CardContent>
              </Card>

              {contractInfo && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('Contract Period')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{supplier.contract_start ? formatDate(supplier.contract_start, locale) : '-'}</span>
                      <span>{supplier.contract_end ? formatDate(supplier.contract_end, locale) : '-'}</span>
                    </div>
                    <Progress
                      value={contractInfo.progress}
                      className={`h-2 ${contractInfo.expired ? '[&>div]:bg-red-500' : contractInfo.diffDays < 30 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                    />
                    <p className={`text-xs font-medium ${contractInfo.expired ? 'text-red-600' : contractInfo.diffDays < 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {contractInfo.expired
                        ? t('Contract expired {{days}} days ago', { days: Math.abs(contractInfo.diffDays) })
                        : t('{{days}} days remaining', { days: contractInfo.diffDays })}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Products */}
        <TabsContent value="products" className="mt-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base">{t('Assigned Products ({{count}})', { count: products.length })}</CardTitle>
              <Button size="sm" variant="outline" onClick={() => navigate('/suppliers')}>
                <Package className="h-4 w-4 mr-1" />
                {t('Assign Products')}
              </Button>
            </CardHeader>
            <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>{t('No products assigned')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('Product')}</TableHead>
                      <TableHead>{t('Role')}</TableHead>
                      <TableHead>{t('Price/Unit')}</TableHead>
                      <TableHead>{t('Delivery')}</TableHead>
                      <TableHead>{t('Min. Order')}</TableHead>
                      <TableHead>{t('Volume Pricing')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map(sp => (
                      <>
                        <TableRow key={sp.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/products/${sp.product_id}`)}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{sp.product_name || sp.product_id}</span>
                              {sp.is_primary && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">{t('Primary Supplier')}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="outline">{t(sp.role.charAt(0).toUpperCase() + sp.role.slice(1))}</Badge></TableCell>
                          <TableCell>{sp.price_per_unit ? formatCurrency(sp.price_per_unit, sp.currency || 'EUR', locale) : '-'}</TableCell>
                          <TableCell>{sp.lead_time_days ? `${sp.lead_time_days}d` : '-'}</TableCell>
                          <TableCell>{sp.min_order_quantity || '-'}</TableCell>
                          <TableCell>
                            {sp.price_tiers && sp.price_tiers.length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => { e.stopPropagation(); setExpandedPriceTiers(expandedPriceTiers === sp.id ? null : sp.id); }}
                              >
                                {sp.price_tiers.length} {t('Tiers')}
                                {expandedPriceTiers === sp.id ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                              </Button>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                        {expandedPriceTiers === sp.id && sp.price_tiers && (
                          <TableRow key={`${sp.id}-tiers`}>
                            <TableCell colSpan={6} className="bg-muted/30 px-8">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="text-xs">{t('From Qty')}</TableHead>
                                    <TableHead className="text-xs">{t('To Qty')}</TableHead>
                                    <TableHead className="text-xs">{t('Price/Unit')}</TableHead>
                                    <TableHead className="text-xs">{t('Savings')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {sp.price_tiers.map((tier: PriceTier, ti: number) => (
                                    <TableRow key={ti}>
                                      <TableCell className="text-xs">{tier.minQty}</TableCell>
                                      <TableCell className="text-xs">{tier.maxQty ?? t('unlimited')}</TableCell>
                                      <TableCell className="text-xs">{formatCurrency(tier.pricePerUnit, tier.currency || 'EUR', locale)}</TableCell>
                                      <TableCell className="text-xs text-green-600">
                                        {sp.price_per_unit && tier.pricePerUnit < sp.price_per_unit
                                          ? `-${(((sp.price_per_unit - tier.pricePerUnit) / sp.price_per_unit) * 100).toFixed(0)}%`
                                          : '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Documents */}
        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <SupplierDocumentsTab supplierId={supplier.id} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Finance */}
        <TabsContent value="finance" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('Supplier Spend')}</CardTitle>
              </CardHeader>
              <CardContent>
                {spend ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">{t('Total')}</p>
                        <p className="text-lg font-bold">{formatCurrency(spend.totalSpend, spend.currency, locale)}</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">{t('Batches')}</p>
                        <p className="text-lg font-bold">{spend.totalBatches}</p>
                      </div>
                      <div className="text-center p-3 bg-muted/50 rounded-lg">
                        <p className="text-xs text-muted-foreground">{t('Quantity')}</p>
                        <p className="text-lg font-bold">{spend.totalQuantity.toLocaleString()}</p>
                      </div>
                    </div>
                    {spend.byProduct.length > 0 && (
                      <>
                        <Separator />
                        <h4 className="text-sm font-medium">{t('Spend by Product')}</h4>
                        <div className="space-y-2">
                          {spend.byProduct.map(bp => (
                            <div key={bp.productId} className="flex items-center justify-between text-sm">
                              <span
                                className="text-primary hover:underline cursor-pointer truncate max-w-[60%]"
                                onClick={() => navigate(`/products/${bp.productId}`)}
                              >
                                {bp.productName}
                              </span>
                              <span className="font-medium">{formatCurrency(bp.spend, spend.currency, locale)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-6">{t('No financial data available')}</p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              {contractInfo && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t('Contract Period')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{supplier.contract_start ? formatDate(supplier.contract_start, locale) : '-'}</span>
                      <span>{supplier.contract_end ? formatDate(supplier.contract_end, locale) : '-'}</span>
                    </div>
                    <Progress
                      value={contractInfo.progress}
                      className={`h-2 ${contractInfo.expired ? '[&>div]:bg-red-500' : contractInfo.diffDays < 30 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'}`}
                    />
                    <p className={`text-xs font-medium ${contractInfo.expired ? 'text-red-600' : contractInfo.diffDays < 30 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {contractInfo.expired
                        ? t('Contract expired {{days}} days ago', { days: Math.abs(contractInfo.diffDays) })
                        : t('{{days}} days remaining', { days: contractInfo.diffDays })}
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('Payment & Orders')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label={t('Terms')} value={supplier.payment_terms || '-'} />
                  <InfoRow label={t('Min. Order')} value={supplier.min_order_value ? formatCurrency(supplier.min_order_value, supplier.currency || 'EUR', locale) : '-'} />
                  <InfoRow label={t('Currency')} value={supplier.currency || 'EUR'} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('Bank Details')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label={t('Bank')} value={supplier.bank_name || '-'} />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{t('IBAN')}</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs">
                        {supplier.iban
                          ? showIban
                            ? supplier.iban
                            : supplier.iban.replace(/(.{4})(.*)(.{4})/, '$1 **** **** $3')
                          : '-'}
                      </span>
                      {supplier.iban && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowIban(!showIban)}>
                          {showIban ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                  <InfoRow label={t('BIC')} value={supplier.bic || '-'} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 5: Compliance */}
        <TabsContent value="compliance" className="mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('Compliance Status')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <SupplierComplianceBadge status={supplier.compliance_status} />
                  </div>
                </div>

                {supplier.certifications && supplier.certifications.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium mb-2">{t('Certifications')}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {supplier.certifications.map(cert => (
                          <Badge key={cert} variant="outline">{cert}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('Audit Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label={t('Last Audit')} value={supplier.audit_date ? formatDate(supplier.audit_date, locale) : '-'} />
                  <InfoRow
                    label={t('Next Audit')}
                    value={supplier.next_audit_date ? formatDate(supplier.next_audit_date, locale) : '-'}
                  />
                  {supplier.next_audit_date && <AuditCountdown date={supplier.next_audit_date} />}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{t('Legal Information')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <InfoRow label={t('Tax ID')} value={supplier.tax_id || '-'} />
                  <InfoRow label={t('VAT ID')} value={supplier.vat_id || '-'} />
                  <InfoRow label={t('D-U-N-S Number')} value={supplier.duns_number || '-'} />
                  <InfoRow label={t('Registration No.')} value={supplier.registration_number || '-'} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 6: Contacts */}
        <TabsContent value="contacts" className="mt-4">
          <div className="space-y-4">
            {/* Primary contact */}
            {supplier.contact_person && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{t('Primary Contact')}</CardTitle>
                    <Badge className="bg-blue-100 text-blue-800 text-xs">Primary</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-primary">
                        {supplier.contact_person.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="font-semibold text-base">{supplier.contact_person}</p>
                      {supplier.contact_position && <p className="text-muted-foreground">{supplier.contact_position}</p>}
                      <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 pt-1">
                        {supplier.email && (
                          <a href={`mailto:${supplier.email}`} className="flex items-center gap-1.5 text-primary hover:underline">
                            <Mail className="h-3.5 w-3.5" /> {supplier.email}
                          </a>
                        )}
                        {supplier.phone && (
                          <a href={`tel:${supplier.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                            <Phone className="h-3.5 w-3.5" /> {supplier.phone}
                          </a>
                        )}
                        {supplier.mobile && (
                          <a href={`tel:${supplier.mobile}`} className="flex items-center gap-1.5 text-primary hover:underline">
                            <Smartphone className="h-3.5 w-3.5" /> {supplier.mobile}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Additional contacts */}
            {supplier.additional_contacts && supplier.additional_contacts.length > 0 ? (
              <>
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">{t('Additional Contacts')}</h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {supplier.additional_contacts.map((contact, idx) => (
                    <Card key={contact.id || idx}>
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-muted-foreground">
                              {contact.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="space-y-0.5 text-sm min-w-0">
                            <p className="font-semibold truncate">{contact.name}</p>
                            {contact.position && <p className="text-xs text-muted-foreground">{contact.position}</p>}
                            {contact.department && <p className="text-xs text-muted-foreground">{contact.department}</p>}
                            <div className="pt-1 space-y-0.5">
                              {contact.email && (
                                <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-primary hover:underline truncate">
                                  <Mail className="h-3 w-3 shrink-0" /> {contact.email}
                                </a>
                              )}
                              {contact.phone && (
                                <p className="flex items-center gap-1 text-xs">
                                  <Phone className="h-3 w-3 shrink-0 text-muted-foreground" /> {contact.phone}
                                </p>
                              )}
                              {contact.mobile && (
                                <p className="flex items-center gap-1 text-xs">
                                  <Smartphone className="h-3 w-3 shrink-0 text-muted-foreground" /> {contact.mobile}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : !supplier.contact_person ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>{t('No additional contacts')}</p>
              </div>
            ) : null}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function AuditCountdown({ date }: { date: string }) {
  const now = useMemo(() => new Date(), []);
  const daysUntil = Math.ceil((new Date(date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil >= 30) return null;
  return (
    <p className={`text-xs font-medium ${daysUntil < 0 ? 'text-red-600' : 'text-yellow-600'}`}>
      {daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d remaining`}
    </p>
  );
}
