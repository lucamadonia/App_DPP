import { useState, useEffect } from 'react';
import {
  Globe,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
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
};

const newsIcons: Record<string, React.ElementType> = {
  regulation: FileText,
  deadline: Clock,
  update: Bell,
  warning: AlertTriangle,
};

const newsPriorityColors: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  medium: 'bg-warning/10 text-warning border-warning/20',
  low: 'bg-muted text-muted-foreground',
};

export function RegulationsPage() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
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

  const filteredNews = news.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.summary.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = !priorityFilter || item.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

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
          <p className="text-muted-foreground">Loading regulation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Regulations & Compliance</h1>
          <p className="text-muted-foreground">
            Comprehensive overview of EU and national regulations, pictograms, and recent developments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Print
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
                <p className="text-sm text-muted-foreground">Countries covered</p>
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
                <p className="text-sm text-muted-foreground">EU Regulations</p>
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
                <p className="text-sm text-muted-foreground">Pictograms</p>
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
                <p className="text-sm text-muted-foreground">Important Updates</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="countries">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="countries" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Countries
          </TabsTrigger>
          <TabsTrigger value="eu" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            EU Regulations
          </TabsTrigger>
          <TabsTrigger value="pictograms" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Pictograms
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            News
          </TabsTrigger>
        </TabsList>

        {/* Countries Tab */}
        <TabsContent value="countries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Country-Specific Regulations</CardTitle>
              <CardDescription>
                Select a country for detailed compliance requirements and national specifics
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
                  Regulations in {countries.find(c => c.code === selectedCountry)?.name}
                </CardTitle>
                <CardDescription>
                  Detailed overview of national requirements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {countryRegulations[selectedCountry].map((reg) => (
                    <AccordionItem key={reg.id} value={reg.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 text-left">
                          <Badge variant={reg.mandatory ? 'default' : 'secondary'}>
                            {reg.mandatory ? 'Mandatory' : 'Optional'}
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
                              <p className="text-sm font-medium">Responsible Authority</p>
                              <p className="text-sm text-muted-foreground">{reg.authority}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Effective since</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(reg.effectiveDate).toLocaleDateString('en-US')}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Penalties</p>
                              <p className="text-sm text-destructive">{reg.penalties}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Affected Products</p>
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>EU-wide Regulations</CardTitle>
                  <CardDescription>
                    Valid in all EU member states - Click on a regulation for details
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
                {euRegulations.map((reg) => {
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
                                {reg.status === 'active' ? 'Active' : 'Upcoming'}
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
                            <p className="text-sm font-medium mb-2">Full Name</p>
                            <p className="text-sm text-muted-foreground">{reg.fullName}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">Description</p>
                            <p className="text-sm text-muted-foreground">{reg.description}</p>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-sm font-medium mb-2">Entered into Force</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(reg.effectiveDate).toLocaleDateString('en-US')}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-2">Application from</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(reg.applicationDate).toLocaleDateString('en-US')}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">Key Requirements</p>
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
                            <p className="text-sm font-medium mb-2">Affected Product Categories</p>
                            <div className="flex flex-wrap gap-2">
                              {reg.affectedProducts.map((product) => (
                                <Badge key={product} variant="outline">
                                  {product}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          {Object.keys(reg.dppDeadlines).length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">DPP Deadlines</p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Product Category</TableHead>
                                    <TableHead>Deadline</TableHead>
                                    <TableHead>Remaining</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Object.entries(reg.dppDeadlines).map(([product, deadline]) => {
                                    const daysRemaining = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                    return (
                                      <TableRow key={product}>
                                        <TableCell>{product}</TableCell>
                                        <TableCell>{new Date(deadline).toLocaleDateString('en-US')}</TableCell>
                                        <TableCell>
                                          <Badge variant={daysRemaining < 365 ? 'destructive' : 'secondary'}>
                                            {daysRemaining} Days
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
              <CardTitle>DPP Timeline: Important Deadlines</CardTitle>
              <CardDescription>Overview of upcoming Digital Product Passport deadlines</CardDescription>
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
                            {daysRemaining} Days
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.regulation} - {new Date(item.date).toLocaleDateString('en-US')}
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
              All
            </Button>
            {['safety', 'recycling', 'chemicals', 'energy', 'durability'].map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'safety' && 'Safety'}
                {cat === 'recycling' && 'Recycling'}
                {cat === 'chemicals' && 'Chemicals'}
                {cat === 'energy' && 'Energy'}
                {cat === 'durability' && 'Durability'}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pictograms & Symbols</CardTitle>
              <CardDescription>
                Important markings for your products with detailed requirements
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
                            {pictogram.mandatory ? 'Mandatory' : 'Voluntary'}
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
                        <span className="font-medium text-muted-foreground w-20 shrink-0">Dimensions:</span>
                        <span>{pictogram.dimensions}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground w-20 shrink-0">Placement:</span>
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
              <CardTitle>Recycling Codes per ISO 1043 & 14021</CardTitle>
              <CardDescription>Material identification codes for packaging and products</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Abbreviation</TableHead>
                    <TableHead>Material Name</TableHead>
                    <TableHead>Examples</TableHead>
                    <TableHead>Recyclable</TableHead>
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
                          <Badge className="bg-success/10 text-success">Yes</Badge>
                        ) : (
                          <Badge variant="secondary">Limited</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* News Tab */}
        <TabsContent value="news" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Latest Changes & Deadlines</CardTitle>
                  <CardDescription>
                    Important updates on regulations, new requirements, and upcoming deadlines
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Button
                    variant={priorityFilter === 'high' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPriorityFilter(priorityFilter === 'high' ? null : 'high')}
                  >
                    <AlertTriangle className="mr-1 h-4 w-4" />
                    Important
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredNews.map((item) => {
                  const Icon = newsIcons[item.category] || Bell;
                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-lg border ${newsPriorityColors[item.priority]}`}
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                            item.category === 'warning'
                              ? 'bg-destructive/20 text-destructive'
                              : item.category === 'deadline'
                                ? 'bg-warning/20 text-warning'
                                : 'bg-primary/20 text-primary'
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <p className="font-medium">{item.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {item.countries.map((c) => (
                                  <Badge key={c} variant="outline" className="text-xs">
                                    {c}
                                  </Badge>
                                ))}
                                <span className="text-xs text-muted-foreground">
                                  {new Date(item.publishedAt).toLocaleDateString('en-US')}
                                </span>
                              </div>
                            </div>
                            {item.priority === 'high' && (
                              <Badge variant="destructive">Important</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {item.summary}
                          </p>
                          <p className="text-sm mb-3">{item.content}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {item.tags.map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            {item.effectiveDate && (
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Valid from:</span>
                                <span className="font-medium">
                                  {new Date(item.effectiveDate).toLocaleDateString('en-US')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Deadlines Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Upcoming Deadlines (next 12 months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {news
                  .filter(n => n.effectiveDate && new Date(n.effectiveDate) > new Date() && new Date(n.effectiveDate) < new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))
                  .sort((a, b) => new Date(a.effectiveDate!).getTime() - new Date(b.effectiveDate!).getTime())
                  .map((item) => {
                    const daysRemaining = Math.ceil((new Date(item.effectiveDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded bg-background">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.countries.join(', ')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={daysRemaining < 90 ? 'destructive' : daysRemaining < 180 ? 'default' : 'secondary'}>
                            {daysRemaining} Days
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.effectiveDate!).toLocaleDateString('en-US')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
