import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Globe,
  FileText,
  CheckCircle2,
  Clock,
  Search,
  ChevronRight,
  Bell,
  Shield,
  Recycle,
  Tag,
  FlaskConical,
  Zap,
  Leaf,
  Calendar,
  Download,
  Printer,
  Loader2,
} from 'lucide-react';
import {
  getCountries,
  getEURegulations,
  getNationalRegulations,
  getPictograms,
  getRecyclingCodes,
  getNews,
} from '@/services/supabase';
import type {
  Country,
  EURegulation,
  NationalRegulation,
  Pictogram,
  RecyclingCode,
  NewsItem,
} from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { formatDate } from '@/lib/format';
import { useLocale } from '@/hooks/use-locale';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const categoryIcons: Record<string, React.ElementType> = {
  environment: Leaf,
  safety: Shield,
  chemicals: FlaskConical,
  labeling: Tag,
  recycling: Recycle,
  energy: Zap,
  durability: Clock,
  sustainability: Leaf,
  digital: Globe,
  trade: FileText,
};

export function RegulationsPage() {
  const { t } = useTranslation('compliance');
  const locale = useLocale();
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Data from Supabase
  const [countries, setCountries] = useState<Country[]>([]);
  const [euRegulations, setEURegulations] = useState<EURegulation[]>([]);
  const [countryRegulations, setCountryRegulations] = useState<Record<string, NationalRegulation[]>>({});
  const [pictograms, setPictograms] = useState<Pictogram[]>([]);
  const [recyclingCodes, setRecyclingCodes] = useState<RecyclingCode[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);

  // Load data from API
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load all master data in parallel
        const [
          countriesData,
          euRegsData,
          pictogramsData,
          recyclingCodesData,
          newsData,
        ] = await Promise.all([
          getCountries(),
          getEURegulations(),
          getPictograms(),
          getRecyclingCodes(),
          getNews(),
        ]);

        // Set data
        setCountries(countriesData || []);
        setEURegulations(euRegsData || []);
        setPictograms(pictogramsData || []);
        setRecyclingCodes(recyclingCodesData || []);
        setNews(newsData || []);

        // Load national regulations for all countries
        if (countriesData && countriesData.length > 0) {
          const nationalRegsPromises = countriesData.map(async (country) => {
            try {
              const regs = await getNationalRegulations(country.code);
              return { code: country.code, regulations: regs || [] };
            } catch {
              return { code: country.code, regulations: [] };
            }
          });

          const nationalRegsResults = await Promise.all(nationalRegsPromises);
          const nationalRegsMap: Record<string, NationalRegulation[]> = {};
          nationalRegsResults.forEach(({ code, regulations }) => {
            if (regulations.length > 0) {
              nationalRegsMap[code] = regulations;
            }
          });

          setCountryRegulations(nationalRegsMap);
        }
      } catch (error) {
        console.error('Error loading regulation data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredPictograms = pictograms.filter(p => {
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t('Loading regulation data...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('Regulations & Compliance')}</h1>
          <p className="text-muted-foreground">
            {t('Comprehensive overview of EU and national regulations, pictograms, and recent developments')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            {t('Export', { ns: 'common' })}
          </Button>
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            {t('Print', { ns: 'common' })}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{countries.length}</p>
                <p className="text-sm text-muted-foreground">{t('Countries covered')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{euRegulations.length}</p>
                <p className="text-sm text-muted-foreground">{t('EU Regulations')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Tag className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pictograms.length}</p>
                <p className="text-sm text-muted-foreground">{t('Pictograms')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                <Bell className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{news.filter(n => n.priority === 'high').length}</p>
                <p className="text-sm text-muted-foreground">{t('Important Updates')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="countries">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="countries" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t('Countries')}
          </TabsTrigger>
          <TabsTrigger value="eu" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('EU Regulations')}
          </TabsTrigger>
          <TabsTrigger value="pictograms" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            {t('Pictograms')}
          </TabsTrigger>
        </TabsList>

        {/* Countries Tab */}
        <TabsContent value="countries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('Country-Specific Regulations')}</CardTitle>
              <CardDescription>
                {t('Select a country for detailed compliance requirements and national specifics')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {countries.map((country) => (
                  <div
                    key={country.code}
                    onClick={() => setSelectedCountry(country.code === selectedCountry ? null : country.code)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedCountry === country.code
                        ? 'border-primary bg-primary/5 shadow-md'
                        : 'hover:bg-muted/50 hover:border-muted-foreground/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{country.flag}</span>
                        <div>
                          <p className="font-medium">{country.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {country.regulations} Regulations
                          </p>
                        </div>
                      </div>
                      <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${selectedCountry === country.code ? 'rotate-90' : ''}`} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{country.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {country.authorities.map((auth) => (
                        <Badge key={auth} variant="outline" className="text-xs">
                          {auth}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {selectedCountry && countryRegulations[selectedCountry] && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">
                    {countries.find(c => c.code === selectedCountry)?.flag}
                  </span>
                  {t('Regulations in {{country}}', { country: countries.find(c => c.code === selectedCountry)?.name })}
                </CardTitle>
                <CardDescription>
                  {t('Detailed overview of national requirements')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {countryRegulations[selectedCountry].map((reg) => (
                    <AccordionItem key={reg.id} value={reg.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 text-left">
                          <Badge variant={reg.mandatory ? 'default' : 'secondary'}>
                            {reg.mandatory ? t('Mandatory') : t('Optional')}
                          </Badge>
                          <div>
                            <p className="font-medium">{reg.name}</p>
                            <p className="text-sm text-muted-foreground">{reg.category}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-2">
                          <p className="text-sm">{reg.description}</p>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{t('Responsible Authority')}</p>
                              <p className="text-sm text-muted-foreground">{reg.authority}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{t('Effective since')}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(reg.effectiveDate, locale)}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{t('Penalties')}</p>
                              <p className="text-sm text-destructive">{reg.penalties}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">{t('Affected Products')}</p>
                              <div className="flex flex-wrap gap-1">
                                {reg.products.map((product) => (
                                  <Badge key={product} variant="outline" className="text-xs">
                                    {product}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* EU Regulations Tab */}
        <TabsContent value="eu" className="space-y-6">
          {/* Category Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={categoryFilter === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(null)}
            >
              {t('All')}
            </Button>
            {['environment', 'chemicals', 'recycling', 'safety', 'energy', 'sustainability', 'digital', 'trade', 'labeling'].map((cat) => {
              const CatIcon = categoryIcons[cat] || FileText;
              return (
                <Button
                  key={cat}
                  variant={categoryFilter === cat ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                >
                  <CatIcon className="mr-1 h-3 w-3" />
                  {t(cat.charAt(0).toUpperCase() + cat.slice(1))}
                </Button>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('EU-wide Regulations')}</CardTitle>
                  <CardDescription>
                    {t('Valid in all EU member states - Click on a regulation for details')}
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="w-full">
                {euRegulations.filter(r => !categoryFilter || r.category === categoryFilter).map((reg) => {
                  const Icon = categoryIcons[reg.category] || FileText;
                  return (
                    <AccordionItem key={reg.id} value={reg.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 text-left flex-1">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{reg.name}</p>
                              <Badge
                                className={
                                  reg.status === 'active'
                                    ? 'bg-success/10 text-success'
                                    : 'bg-warning/10 text-warning'
                                }
                              >
                                {reg.status === 'active' ? t('Active') : t('Upcoming')}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {reg.description}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-6 pt-4">
                          <div>
                            <p className="text-sm font-medium mb-2">{t('Full Name')}</p>
                            <p className="text-sm text-muted-foreground">{reg.fullName}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">{t('Description')}</p>
                            <p className="text-sm text-muted-foreground">{reg.description}</p>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-sm font-medium mb-2">{t('Entered into Force')}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(reg.effectiveDate, locale)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-2">{t('Application from')}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(reg.applicationDate, locale)}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">{t('Key Requirements')}</p>
                            <ul className="space-y-1">
                              {reg.keyRequirements.map((req, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                                  {req}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">{t('Affected Product Categories')}</p>
                            <div className="flex flex-wrap gap-2">
                              {reg.affectedProducts.map((product) => (
                                <Badge key={product} variant="outline">
                                  {product}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {/* Penalties, Enforcement Body, Official Reference */}
                          <div className="grid gap-4 md:grid-cols-3">
                            {(reg as any).penalties && (
                              <div>
                                <p className="text-sm font-medium mb-2">{t('Penalties')}</p>
                                <p className="text-sm text-destructive">{(reg as any).penalties}</p>
                              </div>
                            )}
                            {(reg as any).enforcementBody && (
                              <div>
                                <p className="text-sm font-medium mb-2">{t('Enforcement Body')}</p>
                                <p className="text-sm text-muted-foreground">{(reg as any).enforcementBody}</p>
                              </div>
                            )}
                            {(reg as any).officialReference && (
                              <div>
                                <p className="text-sm font-medium mb-2">{t('Official Reference')}</p>
                                <p className="text-sm text-muted-foreground">{(reg as any).officialReference}</p>
                              </div>
                            )}
                          </div>

                          {Object.keys(reg.dppDeadlines).length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">{t('DPP Deadlines')}</p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>{t('Product Category')}</TableHead>
                                    <TableHead>{t('Deadline')}</TableHead>
                                    <TableHead>{t('Remaining')}</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Object.entries(reg.dppDeadlines).map(([product, deadline]) => {
                                    const daysRemaining = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                    return (
                                      <TableRow key={product}>
                                        <TableCell>{product}</TableCell>
                                        <TableCell>{formatDate(deadline, locale)}</TableCell>
                                        <TableCell>
                                          <Badge variant={daysRemaining < 365 ? 'destructive' : 'secondary'}>
                                            {daysRemaining} {t('Days')}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            </CardContent>
          </Card>

          {/* DPP Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>{t('DPP Timeline: Important Deadlines')}</CardTitle>
              <CardDescription>{t('Overview of upcoming Digital Product Passport deadlines')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { date: '2027-02-18', product: 'Batteries (>2kWh)', regulation: 'EU Battery Regulation' },
                  { date: '2027-12-31', product: 'Textiles', regulation: 'ESPR' },
                  { date: '2028-08-18', product: 'All Batteries', regulation: 'EU Battery Regulation' },
                  { date: '2028-12-31', product: 'Electronics', regulation: 'ESPR' },
                  { date: '2029-06-30', product: 'Furniture', regulation: 'ESPR' },
                ].map((item, idx) => {
                  const daysRemaining = Math.ceil((new Date(item.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                  const progress = Math.max(0, 100 - (daysRemaining / 365 * 20));
                  return (
                    <div key={idx} className="flex items-center gap-4 p-4 rounded-lg border">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{item.product}</p>
                          <Badge variant={daysRemaining < 365 ? 'destructive' : daysRemaining < 730 ? 'default' : 'secondary'}>
                            {daysRemaining} {t('Days')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.regulation} - {formatDate(item.date, locale)}
                        </p>
                        <Progress value={progress} className="h-2" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pictograms Tab */}
        <TabsContent value="pictograms" className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={categoryFilter === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(null)}
            >
              {t('All')}
            </Button>
            {['safety', 'recycling', 'chemicals', 'energy', 'durability'].map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'safety' && t('Safety')}
                {cat === 'recycling' && t('Recycling')}
                {cat === 'chemicals' && t('Chemicals')}
                {cat === 'energy' && t('Energy')}
                {cat === 'durability' && t('Durability')}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('Pictograms & Symbols')}</CardTitle>
              <CardDescription>
                {t('Important markings for your products with detailed requirements')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {filteredPictograms.map((pictogram) => (
                  <div key={pictogram.id} className="p-4 rounded-lg border">
                    <div className="flex items-start gap-4 mb-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-2xl font-bold">
                        {pictogram.symbol}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{pictogram.name}</p>
                          <Badge
                            variant={pictogram.mandatory ? 'default' : 'secondary'}
                          >
                            {pictogram.mandatory ? t('Mandatory') : t('Voluntary')}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {pictogram.countries.map((c) => (
                            <Badge key={c} variant="outline" className="text-xs">
                              {c}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {pictogram.description}
                    </p>
                    <div className="grid gap-2 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground w-20 shrink-0">{t('Dimensions')}:</span>
                        <span>{pictogram.dimensions}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground w-20 shrink-0">{t('Placement')}:</span>
                        <span>{pictogram.placement}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('Recycling Codes per ISO 1043 & 14021')}</CardTitle>
              <CardDescription>{t('Material identification codes for packaging and products')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Code')}</TableHead>
                    <TableHead>{t('Symbol')}</TableHead>
                    <TableHead>{t('Abbreviation')}</TableHead>
                    <TableHead>{t('Material Name')}</TableHead>
                    <TableHead>{t('Examples')}</TableHead>
                    <TableHead>{t('Recyclable')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recyclingCodes.map((code) => (
                    <TableRow key={code.code}>
                      <TableCell className="font-mono">{code.code}</TableCell>
                      <TableCell className="text-2xl">{code.symbol}</TableCell>
                      <TableCell className="font-medium">{code.name}</TableCell>
                      <TableCell>{code.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{code.examples}</TableCell>
                      <TableCell>
                        {code.recyclable ? (
                          <Badge className="bg-success/10 text-success">{t('Yes')}</Badge>
                        ) : (
                          <Badge variant="secondary">{t('Limited')}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
