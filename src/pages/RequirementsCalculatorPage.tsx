import { useState, useMemo, useCallback } from 'react';
import {
  Calculator,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Package,
  Zap,
  Tag,
  Clock,
  Building2,
  ExternalLink,
  X,
  Target,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { requirementsDatabase, type Requirement } from '@/data/requirements-database';
import { productCategories } from '@/data/product-categories';
import { countries, packagingMaterials, wirelessTypes } from '@/data/calculator-options';
import { isAIAvailable } from '@/services/openrouter';
import type { ProductContext, RequirementSummary } from '@/services/openrouter/types';
import { buildDeepAnalysisMessages } from '@/services/openrouter/prompts';
import { AIAnalysisButton } from '@/components/ai/AIAnalysisButton';
import { AIAnalysisCard } from '@/components/ai/AIAnalysisCard';
import { AIOverallAssessment } from '@/components/ai/AIOverallAssessment';
import { AIActionPlan } from '@/components/ai/AIActionPlan';
import { AIAdditionalReqs } from '@/components/ai/AIAdditionalReqs';
import { AIChatPanel } from '@/components/ai/AIChatPanel';

// Hook to manage per-requirement AI deep analysis state
function useRequirementAnalysis() {
  const [analyses, setAnalyses] = useState<Record<string, { text: string; isStreaming: boolean; error: string | null }>>({});

  const startAnalysis = useCallback(async (
    requirementId: string,
    productContext: ProductContext,
    requirement: RequirementSummary
  ) => {
    setAnalyses(prev => ({
      ...prev,
      [requirementId]: { text: '', isStreaming: true, error: null }
    }));

    const messages = buildDeepAnalysisMessages(productContext, requirement);
    let fullText = '';

    try {
      const { streamCompletion } = await import('@/services/openrouter/client');
      for await (const chunk of streamCompletion(messages, { maxTokens: 2000, temperature: 0.3 })) {
        fullText += chunk;
        setAnalyses(prev => ({
          ...prev,
          [requirementId]: { text: fullText, isStreaming: true, error: null }
        }));
      }
      setAnalyses(prev => ({
        ...prev,
        [requirementId]: { text: fullText, isStreaming: false, error: null }
      }));
    } catch (err) {
      setAnalyses(prev => ({
        ...prev,
        [requirementId]: {
          text: fullText,
          isStreaming: false,
          error: err instanceof Error ? err.message : 'Unbekannter Fehler'
        }
      }));
    }
  }, []);

  const clearAnalysis = useCallback((requirementId: string) => {
    setAnalyses(prev => {
      const next = { ...prev };
      delete next[requirementId];
      return next;
    });
  }, []);

  return { analyses, startAnalysis, clearAnalysis };
}

export function RequirementsCalculatorPage() {
  const [productName, setProductName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [hasElectronics, setHasElectronics] = useState(false);
  const [hasBattery, setHasBattery] = useState(false);
  const [batteryType, setBatteryType] = useState<'integrated' | 'removable' | 'external'>('removable');
  const [hasWireless, setHasWireless] = useState(false);
  const [selectedWirelessTypes, setSelectedWirelessTypes] = useState<string[]>([]);
  const [voltage, setVoltage] = useState<'low' | 'high' | 'none'>('none');
  const [hasPackaging, setHasPackaging] = useState(true);
  const [selectedPackagingMaterials, setSelectedPackagingMaterials] = useState<string[]>([]);
  const [containsChemicals, setContainsChemicals] = useState(false);
  const [targetAudience, setTargetAudience] = useState<'b2c' | 'b2b' | 'both'>('b2c');
  const [isConnected, setIsConnected] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const aiAvailable = isAIAvailable();
  const { analyses, startAnalysis, clearAnalysis } = useRequirementAnalysis();

  const categoryInfo = productCategories.find(c => c.id === selectedCategory);

  const toggleCountry = (code: string) => {
    setSelectedCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const togglePackagingMaterial = (id: string) => {
    setSelectedPackagingMaterials(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const toggleWirelessType = (id: string) => {
    setSelectedWirelessTypes(prev =>
      prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]
    );
  };

  // Berechne anwendbare Anforderungen
  const calculateRequirements = (): Requirement[] => {
    const requirements: Requirement[] = [];

    // Basis: CE-Kennzeichnung für alle Produkte mit Elektronik
    if (hasElectronics || selectedCategory === 'electronics' || selectedCategory === 'lighting' || selectedCategory === 'toys') {
      requirements.push(requirementsDatabase.find(r => r.id === 'ce-marking')!);

      // LVD wenn Netzspannung
      if (voltage === 'high') {
        requirements.push(requirementsDatabase.find(r => r.id === 'lvd')!);
      }

      // EMV für alle Elektronik
      requirements.push(requirementsDatabase.find(r => r.id === 'emv')!);

      // RoHS für Elektronik
      requirements.push(requirementsDatabase.find(r => r.id === 'rohs')!);
    }

    // RED für Funkprodukte
    if (hasWireless) {
      requirements.push(requirementsDatabase.find(r => r.id === 'red')!);
    }

    // WEEE je nach Land
    if (hasElectronics || selectedCategory === 'electronics' || selectedCategory === 'lighting') {
      if (selectedCountries.includes('DE')) {
        requirements.push(requirementsDatabase.find(r => r.id === 'weee-de')!);
      }
      if (selectedCountries.includes('FR')) {
        requirements.push(requirementsDatabase.find(r => r.id === 'weee-fr')!);
        requirements.push(requirementsDatabase.find(r => r.id === 'repairability-fr')!);
        requirements.push(requirementsDatabase.find(r => r.id === 'spare-parts-fr')!);
      }
    }

    // Batterien
    if (hasBattery) {
      if (selectedCountries.includes('DE')) {
        requirements.push(requirementsDatabase.find(r => r.id === 'battery-de')!);
      }
      requirements.push(requirementsDatabase.find(r => r.id === 'battery-dpp')!);
    }

    // Verpackung
    if (hasPackaging && targetAudience !== 'b2b') {
      if (selectedCountries.includes('DE')) {
        requirements.push(requirementsDatabase.find(r => r.id === 'packaging-de')!);
      }
      if (selectedCountries.includes('FR')) {
        requirements.push(requirementsDatabase.find(r => r.id === 'packaging-fr')!);
      }
    }

    // REACH SVHC für alle Produkte
    requirements.push(requirementsDatabase.find(r => r.id === 'reach-svhc')!);

    // Textilien
    if (selectedCategory === 'textiles') {
      requirements.push(requirementsDatabase.find(r => r.id === 'textile-label')!);
      requirements.push(requirementsDatabase.find(r => r.id === 'textile-azodyes')!);
    }

    // Energielabel für bestimmte Produktgruppen
    if (['Haushaltsgerät', 'TV/Monitor', 'LED-Lampe', 'Leuchte'].includes(selectedSubcategory)) {
      requirements.push(requirementsDatabase.find(r => r.id === 'energy-label')!);
    }

    // Filter undefined und duplikate
    return requirements.filter((r, index, self) =>
      r && self.findIndex(req => req?.id === r.id) === index
    );
  };

  const requirements = showResults ? calculateRequirements() : [];

  const criticalRequirements = requirements.filter(r => r.priority === 'critical');
  const highRequirements = requirements.filter(r => r.priority === 'high');
  const otherRequirements = requirements.filter(r => r.priority !== 'critical' && r.priority !== 'high');

  // Product context for AI features
  const productContext = useMemo((): ProductContext => ({
    productName: productName || categoryInfo?.name || '',
    category: categoryInfo?.name || selectedCategory,
    subcategory: selectedSubcategory,
    countries: selectedCountries,
    hasElectronics,
    hasBattery,
    batteryType,
    hasWireless,
    wirelessTypes: selectedWirelessTypes,
    voltage,
    hasPackaging,
    packagingMaterials: selectedPackagingMaterials,
    containsChemicals,
    targetAudience,
    isConnected,
  }), [productName, categoryInfo, selectedCategory, selectedSubcategory, selectedCountries, hasElectronics, hasBattery, batteryType, hasWireless, selectedWirelessTypes, voltage, hasPackaging, selectedPackagingMaterials, containsChemicals, targetAudience, isConnected]);

  const requirementSummaries = useMemo((): RequirementSummary[] =>
    requirements.map(r => ({
      id: r.id,
      name: r.name,
      priority: r.priority,
      category: r.category,
      description: r.description,
    })),
  [requirements]);

  // Renders the AI analysis section inside an accordion item
  const renderAIAnalysis = (req: Requirement) => {
    if (!aiAvailable) return null;
    const analysis = analyses[req.id];
    const reqSummary: RequirementSummary = {
      id: req.id,
      name: req.name,
      priority: req.priority,
      category: req.category,
      description: req.description,
    };

    return (
      <>
        <AIAnalysisButton
          onClick={() => startAnalysis(req.id, productContext, reqSummary)}
          isStreaming={analysis?.isStreaming ?? false}
          hasResult={!!analysis?.text}
        />
        <AIAnalysisCard
          text={analysis?.text ?? ''}
          isStreaming={analysis?.isStreaming ?? false}
          error={analysis?.error ?? null}
          onClose={() => clearAnalysis(req.id)}
        />
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Anforderungs-Kalkulator</h1>
          <p className="text-muted-foreground">
            Ermitteln Sie alle Compliance-Anforderungen basierend auf Ihrem Produkt und Zielmarkt
          </p>
        </div>
        {showResults && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowResults(false)}>
              <X className="mr-2 h-4 w-4" />
              Neu berechnen
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              PDF Export
            </Button>
          </div>
        )}
      </div>

      {!showResults ? (
        <div className="space-y-6">
          {/* Produkt-Konfiguration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Produkt-Konfiguration
              </CardTitle>
              <CardDescription>
                Beantworten Sie die folgenden Fragen, um alle relevanten Anforderungen zu ermitteln
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Produktname */}
              <div className="space-y-2">
                <Label htmlFor="product-name">Produktname (optional)</Label>
                <Input
                  id="product-name"
                  placeholder="z.B. Smart Home Hub XL-500"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
              </div>

              {/* Kategorie */}
              <div className="space-y-2">
                <Label>Produktkategorie *</Label>
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {productCategories.map(cat => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? 'default' : 'outline'}
                      className="h-auto py-3 flex-col min-h-[80px]"
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        setSelectedSubcategory('');
                      }}
                    >
                      <span className="text-2xl mb-1">{cat.icon}</span>
                      <span className="text-xs text-center leading-tight">{cat.name}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Unterkategorie */}
              {categoryInfo && (
                <div className="space-y-2">
                  <Label>Unterkategorie *</Label>
                  <Select value={selectedSubcategory} onValueChange={setSelectedSubcategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Unterkategorie wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryInfo.subcategories.map(sub => (
                        <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Zielmärkte */}
              <div className="space-y-2">
                <Label>Zielmärkte (Länder) *</Label>
                <div className="flex flex-wrap gap-2">
                  {countries.map(country => (
                    <Button
                      key={country.code}
                      variant={selectedCountries.includes(country.code) ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => toggleCountry(country.code)}
                    >
                      <span className="mr-1">{country.flag}</span>
                      {country.code}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Zielgruppe */}
              <div className="space-y-2">
                <Label>Zielgruppe *</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'b2c', label: 'Endverbraucher (B2C)' },
                    { value: 'b2b', label: 'Gewerblich (B2B)' },
                    { value: 'both', label: 'Beide' },
                  ].map(option => (
                    <Button
                      key={option.value}
                      variant={targetAudience === option.value ? 'default' : 'outline'}
                      onClick={() => setTargetAudience(option.value as 'b2c' | 'b2b' | 'both')}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technische Eigenschaften */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Technische Eigenschaften
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Elektronik */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-electronics"
                  checked={hasElectronics}
                  onCheckedChange={(checked: boolean) => setHasElectronics(checked)}
                />
                <Label htmlFor="has-electronics">Enthält elektronische Komponenten</Label>
              </div>

              {/* Spannung */}
              {hasElectronics && (
                <div className="space-y-2 pl-6">
                  <Label>Betriebsspannung</Label>
                  <div className="flex gap-2">
                    {[
                      { value: 'none', label: 'Keine / Batterie' },
                      { value: 'low', label: 'Niederspannung (<50V AC)' },
                      { value: 'high', label: 'Netzspannung (50-1000V AC)' },
                    ].map(option => (
                      <Button
                        key={option.value}
                        variant={voltage === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setVoltage(option.value as 'low' | 'high' | 'none')}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Batterie */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-battery"
                  checked={hasBattery}
                  onCheckedChange={(checked: boolean) => setHasBattery(checked)}
                />
                <Label htmlFor="has-battery">Enthält Batterie/Akku</Label>
              </div>

              {hasBattery && (
                <div className="space-y-2 pl-6">
                  <Label>Batterietyp</Label>
                  <div className="flex gap-2">
                    {[
                      { value: 'removable', label: 'Wechselbar' },
                      { value: 'integrated', label: 'Fest eingebaut' },
                      { value: 'external', label: 'Extern (Netzteil mit Akku)' },
                    ].map(option => (
                      <Button
                        key={option.value}
                        variant={batteryType === option.value ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBatteryType(option.value as 'integrated' | 'removable' | 'external')}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Funk */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-wireless"
                  checked={hasWireless}
                  onCheckedChange={(checked: boolean) => setHasWireless(checked)}
                />
                <Label htmlFor="has-wireless">Enthält Funkfunktionen</Label>
              </div>

              {hasWireless && (
                <div className="space-y-2 pl-6">
                  <Label>Funkstandards</Label>
                  <div className="flex flex-wrap gap-2">
                    {wirelessTypes.map(wt => (
                      <Button
                        key={wt.id}
                        variant={selectedWirelessTypes.includes(wt.id) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleWirelessType(wt.id)}
                      >
                        {wt.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Vernetzt */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is-connected"
                  checked={isConnected}
                  onCheckedChange={(checked: boolean) => setIsConnected(checked)}
                />
                <Label htmlFor="is-connected">Vernetztes Gerät (IoT, Smart Home)</Label>
              </div>

              {/* Chemikalien */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="contains-chemicals"
                  checked={containsChemicals}
                  onCheckedChange={(checked: boolean) => setContainsChemicals(checked)}
                />
                <Label htmlFor="contains-chemicals">Enthält chemische Stoffe/Gemische</Label>
              </div>
            </CardContent>
          </Card>

          {/* Verpackung */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Verpackung
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-packaging"
                  checked={hasPackaging}
                  onCheckedChange={(checked: boolean) => setHasPackaging(checked)}
                />
                <Label htmlFor="has-packaging">Produkt wird verpackt verkauft</Label>
              </div>

              {hasPackaging && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Verpackungsmaterialien auswählen</Label>
                    <p className="text-sm text-muted-foreground">
                      Wählen Sie alle in Ihrer Verpackung verwendeten Materialien. Die Codes entsprechen der Entscheidung 97/129/EG.
                    </p>
                  </div>

                  {/* Gruppierung nach Kategorie */}
                  {['Kunststoff', 'Papier/Pappe', 'Metall', 'Glas', 'Holz', 'Textil', 'Verbund', 'Biokunststoff', 'Sonstige'].map(category => {
                    const categoryMaterials = packagingMaterials.filter(pm => pm.category === category);
                    if (categoryMaterials.length === 0) return null;
                    return (
                      <div key={category} className="space-y-2">
                        <Label className="text-sm font-medium text-muted-foreground">{category}</Label>
                        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                          {categoryMaterials.map(pm => (
                            <div
                              key={pm.id}
                              onClick={() => togglePackagingMaterial(pm.id)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                selectedPackagingMaterials.includes(pm.id)
                                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                                  : 'hover:bg-muted/50 hover:border-muted-foreground/30'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <span className="text-sm font-medium">{pm.name}</span>
                                <Badge variant={pm.recyclable ? 'default' : 'secondary'} className="text-xs shrink-0">
                                  {pm.code}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{pm.description}</p>
                              {pm.recyclable !== undefined && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Badge variant={pm.recyclable ? 'outline' : 'secondary'} className="text-xs">
                                    {pm.recyclable ? '♻️ Recycelbar' : '❌ Schwer recycelbar'}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Ausgewählte Materialien Zusammenfassung */}
                  {selectedPackagingMaterials.length > 0 && (
                    <div className="mt-4 p-4 rounded-lg bg-muted/50 border">
                      <Label className="text-sm font-medium">Ausgewählte Materialien ({selectedPackagingMaterials.length})</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedPackagingMaterials.map(id => {
                          const pm = packagingMaterials.find(m => m.id === id);
                          return pm ? (
                            <Badge key={id} variant="default" className="flex items-center gap-1">
                              {pm.code}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePackagingMaterial(id);
                                }}
                                className="ml-1 hover:bg-primary-foreground/20 rounded"
                              >
                                ×
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Berechnen Button */}
          <Button
            size="lg"
            className="w-full"
            disabled={!selectedCategory || !selectedSubcategory || selectedCountries.length === 0}
            onClick={() => setShowResults(true)}
          >
            <Calculator className="mr-2 h-5 w-5" />
            Anforderungen berechnen
          </Button>

          {(!selectedCategory || !selectedSubcategory || selectedCountries.length === 0) && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Bitte füllen Sie alle Pflichtfelder aus:{' '}
                {[
                  !selectedCategory && 'Kategorie',
                  !selectedSubcategory && 'Unterkategorie',
                  selectedCountries.length === 0 && 'mindestens ein Land',
                ]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Zusammenfassung */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Produktzusammenfassung
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Produkt</p>
                  <p className="font-medium">{productName || categoryInfo?.name} - {selectedSubcategory}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Zielmärkte</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedCountries.map(code => {
                      const country = countries.find(c => c.code === code);
                      return (
                        <Badge key={code} variant="outline">
                          {country?.flag} {country?.name}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Eigenschaften</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {hasElectronics && <Badge variant="secondary">Elektronik</Badge>}
                    {hasBattery && <Badge variant="secondary">Batterie</Badge>}
                    {hasWireless && <Badge variant="secondary">Funk</Badge>}
                    {hasPackaging && <Badge variant="secondary">Verpackung</Badge>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistik */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{criticalRequirements.length}</p>
                    <p className="text-sm text-muted-foreground">Kritische Anforderungen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
                    <Clock className="h-6 w-6 text-warning" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{highRequirements.length}</p>
                    <p className="text-sm text-muted-foreground">Hohe Priorität</p>
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
                    <p className="text-2xl font-bold">
                      {requirements.reduce((acc, r) => acc + r.documents.length, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Dokumente benötigt</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                    <Building2 className="h-6 w-6 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">
                      {requirements.reduce((acc, r) => acc + r.registrations.length, 0)}
                    </p>
                    <p className="text-sm text-muted-foreground">Registrierungen</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* KI-Gesamtbewertung */}
          {aiAvailable && (
            <AIOverallAssessment
              productContext={productContext}
              requirements={requirementSummaries}
            />
          )}

          {/* Kritische Anforderungen */}
          {criticalRequirements.length > 0 && (
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Kritische Anforderungen (Pflicht vor Inverkehrbringen)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {criticalRequirements.map(req => (
                    <AccordionItem key={req.id} value={req.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 text-left">
                          <Badge variant="destructive">Kritisch</Badge>
                          <div>
                            <p className="font-medium">{req.name}</p>
                            <p className="text-sm text-muted-foreground">{req.description}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          <p className="text-sm">{req.detailedDescription}</p>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <h5 className="text-sm font-medium mb-2">Erforderliche Dokumente</h5>
                              <ul className="space-y-1">
                                {req.documents.map(doc => (
                                  <li key={doc} className="text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" />
                                    {doc}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {req.registrations.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-2">Registrierungen</h5>
                                <ul className="space-y-1">
                                  {req.registrations.map(reg => (
                                    <li key={reg} className="text-sm flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-primary" />
                                      {reg}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {req.symbols.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-2">Erforderliche Symbole</h5>
                                <div className="flex flex-wrap gap-2">
                                  {req.symbols.map(sym => (
                                    <Badge key={sym} variant="outline">{sym}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            <div>
                              <h5 className="text-sm font-medium mb-2">Zuständige Behörde</h5>
                              <p className="text-sm text-muted-foreground">{req.authority}</p>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium mb-2">Sanktionen bei Nichteinhaltung</h5>
                              <p className="text-sm text-destructive">{req.penalties}</p>
                            </div>
                          </div>

                          {req.tips.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Lightbulb className="h-4 w-4" />
                                Tipps
                              </h5>
                              <ul className="space-y-1">
                                {req.tips.map((tip, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-success" />
                                    {tip}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {req.links && req.links.length > 0 && (
                            <div className="flex gap-2">
                              {req.links.map(link => (
                                <Button key={link.url} variant="outline" size="sm" asChild>
                                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                                    {link.title}
                                    <ExternalLink className="ml-1 h-3 w-3" />
                                  </a>
                                </Button>
                              ))}
                            </div>
                          )}

                          {/* KI-Tiefenanalyse */}
                          {renderAIAnalysis(req)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* Weitere Anforderungen */}
          {(highRequirements.length > 0 || otherRequirements.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5" />
                  Weitere Anforderungen
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {[...highRequirements, ...otherRequirements].map(req => (
                    <AccordionItem key={req.id} value={req.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 text-left">
                          <Badge variant={req.priority === 'high' ? 'default' : 'secondary'}>
                            {req.priority === 'high' ? 'Hoch' : req.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                          </Badge>
                          <div>
                            <p className="font-medium">{req.name}</p>
                            <p className="text-sm text-muted-foreground">{req.description}</p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          <p className="text-sm">{req.detailedDescription}</p>

                          <div className="grid gap-4 md:grid-cols-2">
                            {req.documents.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-2">Erforderliche Dokumente</h5>
                                <ul className="space-y-1">
                                  {req.documents.map(doc => (
                                    <li key={doc} className="text-sm flex items-center gap-2">
                                      <FileText className="h-4 w-4 text-primary" />
                                      {doc}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {req.registrations.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-2">Registrierungen</h5>
                                <ul className="space-y-1">
                                  {req.registrations.map(reg => (
                                    <li key={reg} className="text-sm flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-primary" />
                                      {reg}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {req.symbols.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium mb-2">Erforderliche Symbole</h5>
                                <div className="flex flex-wrap gap-2">
                                  {req.symbols.map(sym => (
                                    <Badge key={sym} variant="outline">{sym}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {req.tips.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Tipps</h5>
                              <ul className="space-y-1">
                                {req.tips.map((tip, idx) => (
                                  <li key={idx} className="text-sm text-muted-foreground">• {tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* KI-Tiefenanalyse */}
                          {renderAIAnalysis(req)}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}

          {/* KI-Erweiterte Anforderungen */}
          {aiAvailable && (
            <AIAdditionalReqs
              productContext={productContext}
              requirements={requirementSummaries}
            />
          )}

          {/* KI-Handlungsplan */}
          {aiAvailable && (
            <AIActionPlan
              productContext={productContext}
              requirements={requirementSummaries}
            />
          )}

          {/* Dokumenten-Checkliste */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Zusammenfassung: Alle benötigten Dokumente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dokument</TableHead>
                    <TableHead>Anforderung</TableHead>
                    <TableHead>Priorität</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requirements.flatMap(req =>
                    req.documents.map(doc => ({
                      doc,
                      requirement: req.name,
                      priority: req.priority,
                    }))
                  ).map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{item.doc}</TableCell>
                      <TableCell>{item.requirement}</TableCell>
                      <TableCell>
                        <Badge variant={
                          item.priority === 'critical' ? 'destructive' :
                          item.priority === 'high' ? 'default' : 'secondary'
                        }>
                          {item.priority === 'critical' ? 'Kritisch' :
                           item.priority === 'high' ? 'Hoch' : 'Mittel'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Symbole Übersicht */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5" />
                Erforderliche Symbole und Kennzeichnungen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[...new Set(requirements.flatMap(r => r.symbols))].map(symbol => (
                  <div key={symbol} className="p-4 rounded-lg border flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-lg font-bold">
                      {symbol.includes('CE') ? 'CE' :
                       symbol.includes('WEEE') ? '🗑️❌' :
                       symbol.includes('Triman') ? '🔄' :
                       symbol.includes('Batterie') ? '🔋' : '📋'}
                    </div>
                    <div>
                      <p className="font-medium">{symbol}</p>
                      <p className="text-sm text-muted-foreground">Auf Produkt/Verpackung</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* KI-Compliance-Chat */}
          {aiAvailable && (
            <AIChatPanel
              productContext={productContext}
              requirements={requirementSummaries}
            />
          )}
        </div>
      )}
    </div>
  );
}
