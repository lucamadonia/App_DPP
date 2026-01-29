import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Circle,
  FileText,
  Download,
  AlertTriangle,
  Shield,
  ChevronDown,
  Printer,
  Search,
  Filter,
  Info,
  ExternalLink,
  Clock,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Zap,
  Recycle,
  FlaskConical,
  Tag,
  Package,
  Globe,
  Calendar,
  CheckSquare,
  XCircle,
  Minus,
  Factory,
  Loader2,
} from 'lucide-react';
import {
  getChecklistTemplates,
  getChecklistProgress,
  updateChecklistProgress,
} from '@/services/supabase';
import type { ChecklistProgress } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  detailedDescription: string;
  mandatory: boolean;
  category: string;
  subcategory?: string;
  documentRequired: boolean;
  documentTypes?: string[];
  checked: boolean;
  status: 'pending' | 'in_progress' | 'completed' | 'not_applicable';
  legalBasis?: string;
  authority?: string;
  deadline?: string;
  penalties?: string;
  tips?: string[];
  links?: { title: string; url: string }[];
  applicableProducts?: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}


const categoryIcons: Record<string, React.ElementType> = {
  'Sicherheit & CE-Konformität': Shield,
  'Sicherheit': Shield,
  'Elektrogerätegesetz (ElektroG)': Recycle,
  'RoHS (Stoffbeschränkungen)': FlaskConical,
  'REACH (Chemikalien)': FlaskConical,
  'Batterien (BattG)': Zap,
  'Verpackung (VerpackG)': Package,
  'Energiekennzeichnung': Zap,
  'Dokumentation & Anleitungen': BookOpen,
  'Produktidentifikation': Tag,
  'Produktkennzeichnung': Tag,
  'Chemikalien (REACH)': FlaskConical,
  'Nachhaltigkeit': Recycle,
  'EU-Batterieverordnung': Zap,
  'Registrierung Deutschland': FileText,
  'Kennzeichnung': Tag,
  'Rücknahme & Verwertung': Recycle,
  'Digitaler Produktpass': Globe,
  'Recycling': Recycle,
  'REP (Herstellerverantwortung)': Factory,
};

const priorityColors: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-warning text-warning-foreground',
  medium: 'bg-primary text-primary-foreground',
  low: 'bg-muted text-muted-foreground',
};

const statusIcons: Record<string, React.ElementType> = {
  pending: Circle,
  in_progress: Clock,
  completed: CheckCircle2,
  not_applicable: Minus,
};

const statusColors: Record<string, string> = {
  pending: 'text-muted-foreground',
  in_progress: 'text-warning',
  completed: 'text-success',
  not_applicable: 'text-muted-foreground',
};

export function ChecklistPage() {
  const [selectedCountry, setSelectedCountry] = useState('DE');
  const [selectedCategory, setSelectedCategory] = useState('electronics');
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [, setIsSaving] = useState(false);

  // Checklisten-Daten aus Supabase
  const [checklistData, setChecklistData] = useState<Record<string, ChecklistItem[]>>({});
  const [, setProgressData] = useState<Record<string, ChecklistProgress>>({});

  const key = `${selectedCountry}-${selectedCategory}`;
  const checklist = checklistData[key] || [];

  const [itemStates, setItemStates] = useState<Record<string, ChecklistItem['status']>>({});

  // Daten aus Supabase laden
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      try {
        // Checklisten-Templates laden
        const templates = await getChecklistTemplates(selectedCountry, selectedCategory);

        if (templates && templates.length > 0) {
          // Templates in ChecklistItem-Format umwandeln
          const items: ChecklistItem[] = templates.map(t => ({
            id: t.id,
            title: t.title,
            description: t.description,
            detailedDescription: t.detailedDescription || t.description,
            mandatory: t.mandatory,
            category: t.category,
            subcategory: t.subcategory,
            documentRequired: t.documentRequired,
            documentTypes: t.documentTypes,
            checked: false,
            status: 'pending' as const,
            legalBasis: t.legalBasis,
            authority: t.authority,
            deadline: t.deadline,
            penalties: t.penalties,
            tips: t.tips,
            links: t.links,
            applicableProducts: t.applicableProducts,
            priority: t.priority,
          }));

          setChecklistData(prev => ({
            ...prev,
            [key]: items,
          }));
        }

        // Progress laden
        const progress = await getChecklistProgress();
        if (progress && progress.length > 0) {
          const progressMap: Record<string, ChecklistProgress> = {};
          const statesMap: Record<string, ChecklistItem['status']> = {};

          progress.forEach(p => {
            progressMap[p.checklist_item_id] = p;
            statesMap[p.checklist_item_id] = p.status;
          });

          setProgressData(progressMap);
          setItemStates(prev => ({ ...prev, ...statesMap }));
        }
      } catch (error) {
        console.error('Fehler beim Laden der Checklisten-Daten:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedCountry, selectedCategory, key]);

  const getItemStatus = (item: ChecklistItem) => itemStates[item.id] || item.status;

  const toggleItemStatus = async (id: string, currentStatus: ChecklistItem['status']) => {
    const statusOrder: ChecklistItem['status'][] = ['pending', 'in_progress', 'completed', 'not_applicable'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    // Optimistisches Update
    setItemStates(prev => ({ ...prev, [id]: nextStatus }));

    // In API speichern
    setIsSaving(true);
    try {
      await updateChecklistProgress(id, {
        status: nextStatus,
        checked: nextStatus === 'completed',
      });
    } catch (error) {
      console.error('Fehler beim Speichern des Progress:', error);
      // Bei Fehler Status zurücksetzen
      setItemStates(prev => ({ ...prev, [id]: currentStatus }));
    } finally {
      setIsSaving(false);
    }
  };

  const filteredChecklist = checklist.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesIncomplete = !showOnlyIncomplete || getItemStatus(item) !== 'completed';
    return matchesSearch && matchesIncomplete;
  });

  const categories = [...new Set(checklist.map(i => i.category))];

  const mandatoryItems = checklist.filter(i => i.mandatory);
  const completedMandatory = mandatoryItems.filter(i => getItemStatus(i) === 'completed');
  const progress = mandatoryItems.length > 0 ? Math.round((completedMandatory.length / mandatoryItems.length) * 100) : 0;

  const criticalItems = checklist.filter(i => i.priority === 'critical' && getItemStatus(i) !== 'completed');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Lade Checklisten-Daten...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Compliance Checkliste</h1>
            <p className="text-muted-foreground">
              Umfassende, interaktive Checkliste für länderspezifische Anforderungen
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Drucken
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              PDF Export
            </Button>
          </div>
        </div>

        {/* Auswahl */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Land auswählen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  { code: 'DE', name: 'Deutschland', flag: '🇩🇪' },
                  { code: 'FR', name: 'Frankreich', flag: '🇫🇷' },
                  { code: 'AT', name: 'Österreich', flag: '🇦🇹' },
                  { code: 'IT', name: 'Italien', flag: '🇮🇹' },
                  { code: 'ES', name: 'Spanien', flag: '🇪🇸' },
                  { code: 'NL', name: 'Niederlande', flag: '🇳🇱' },
                ].map((country) => (
                  <Button
                    key={country.code}
                    variant={selectedCountry === country.code ? 'default' : 'outline'}
                    onClick={() => setSelectedCountry(country.code)}
                  >
                    <span className="mr-2">{country.flag}</span>
                    {country.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Produktkategorie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'electronics', name: 'Elektronik', icon: '💻' },
                  { id: 'textiles', name: 'Textilien', icon: '👕' },
                  { id: 'batteries', name: 'Batterien', icon: '🔋' },
                  { id: 'furniture', name: 'Möbel', icon: '🛋️' },
                  { id: 'toys', name: 'Spielzeug', icon: '🧸' },
                ].map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(cat.id)}
                  >
                    <span className="mr-2">{cat.icon}</span>
                    {cat.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Critical Items Warning */}
        {criticalItems.length > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {criticalItems.length} kritische Punkte offen
              </CardTitle>
              <CardDescription>
                Diese Punkte haben höchste Priorität und können zu Vertriebsverboten führen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {criticalItems.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span>{item.title}</span>
                  </div>
                ))}
                {criticalItems.length > 3 && (
                  <p className="text-sm text-muted-foreground">
                    + {criticalItems.length - 3} weitere kritische Punkte
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <span className="font-medium">Compliance-Fortschritt</span>
              </div>
              <span className="font-bold text-lg">{progress}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
              <span>{completedMandatory.length} von {mandatoryItems.length} Pflichtpunkten erledigt</span>
              {progress === 100 ? (
                <Badge className="bg-success text-success-foreground">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Vollständig
                </Badge>
              ) : (
                <Badge variant="outline" className="text-warning border-warning">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Unvollständig
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filter */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Checkliste durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={showOnlyIncomplete ? 'default' : 'outline'}
            onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Nur offene Punkte
          </Button>
        </div>

        {/* Keine Daten Hinweis */}
        {checklist.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Keine Checkliste verfügbar</h3>
              <p className="text-muted-foreground">
                Für diese Land/Kategorie-Kombination ist noch keine detaillierte Checkliste verfügbar.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Checkliste nach Kategorien */}
        <div className="space-y-4">
          {categories.map((category) => {
            const categoryItems = filteredChecklist.filter(i => i.category === category);
            if (categoryItems.length === 0) return null;

            const completedCount = categoryItems.filter(i => getItemStatus(i) === 'completed').length;
            const CategoryIcon = categoryIcons[category] || Shield;

            return (
              <Collapsible key={category} defaultOpen>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CategoryIcon className="h-5 w-5 text-primary" />
                          {category}
                          <Badge variant="secondary">
                            {completedCount}/{categoryItems.length}
                          </Badge>
                        </CardTitle>
                        <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform duration-200" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <Accordion type="multiple" className="w-full">
                        {categoryItems.map((item) => {
                          const status = getItemStatus(item);
                          const StatusIcon = statusIcons[status];
                          const statusColor = statusColors[status];

                          return (
                            <AccordionItem key={item.id} value={item.id}>
                              <div
                                className={`flex items-start gap-4 p-4 rounded-lg border mb-2 transition-colors ${
                                  status === 'completed'
                                    ? 'bg-success/5 border-success/20'
                                    : status === 'in_progress'
                                      ? 'bg-warning/5 border-warning/20'
                                      : 'hover:bg-muted/50'
                                }`}
                              >
                                <div
                                  className="mt-0.5 cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleItemStatus(item.id, status);
                                  }}
                                >
                                  <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                                </div>
                                <div className="flex-1">
                                  <AccordionTrigger className="hover:no-underline p-0 font-normal">
                                    <div className="flex-1 text-left">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className={`font-medium ${status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                          {item.title}
                                        </p>
                                        {item.mandatory && (
                                          <Badge variant="destructive" className="text-xs">
                                            Pflicht
                                          </Badge>
                                        )}
                                        <Badge className={`text-xs ${priorityColors[item.priority]}`}>
                                          {item.priority === 'critical' ? 'Kritisch' :
                                           item.priority === 'high' ? 'Hoch' :
                                           item.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                                        </Badge>
                                        {item.documentRequired && (
                                          <Badge variant="outline" className="text-xs">
                                            <FileText className="mr-1 h-3 w-3" />
                                            Dokument
                                          </Badge>
                                        )}
                                        {item.deadline && (
                                          <Badge variant="outline" className="text-xs">
                                            <Calendar className="mr-1 h-3 w-3" />
                                            {item.deadline}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-sm text-muted-foreground mt-1">
                                        {item.description}
                                      </p>
                                    </div>
                                  </AccordionTrigger>
                                  <AccordionContent>
                                    <div className="mt-4 space-y-4 border-t pt-4">
                                      {/* Detaillierte Beschreibung */}
                                      <div>
                                        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                          <Info className="h-4 w-4" />
                                          Detaillierte Beschreibung
                                        </h4>
                                        <p className="text-sm text-muted-foreground">
                                          {item.detailedDescription}
                                        </p>
                                      </div>

                                      {/* Metadata Grid */}
                                      <div className="grid gap-4 md:grid-cols-2">
                                        {item.legalBasis && (
                                          <div>
                                            <h5 className="text-sm font-medium mb-1">Rechtsgrundlage</h5>
                                            <p className="text-sm text-muted-foreground">{item.legalBasis}</p>
                                          </div>
                                        )}
                                        {item.authority && (
                                          <div>
                                            <h5 className="text-sm font-medium mb-1">Zuständige Behörde</h5>
                                            <p className="text-sm text-muted-foreground">{item.authority}</p>
                                          </div>
                                        )}
                                        {item.penalties && (
                                          <div>
                                            <h5 className="text-sm font-medium mb-1">Sanktionen</h5>
                                            <p className="text-sm text-destructive">{item.penalties}</p>
                                          </div>
                                        )}
                                        {item.documentTypes && item.documentTypes.length > 0 && (
                                          <div>
                                            <h5 className="text-sm font-medium mb-1">Erforderliche Dokumente</h5>
                                            <div className="flex flex-wrap gap-1">
                                              {item.documentTypes.map(doc => (
                                                <Badge key={doc} variant="outline" className="text-xs">
                                                  {doc}
                                                </Badge>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>

                                      {/* Tips */}
                                      {item.tips && item.tips.length > 0 && (
                                        <div>
                                          <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
                                            <HelpCircle className="h-4 w-4" />
                                            Tipps zur Umsetzung
                                          </h5>
                                          <ul className="space-y-1">
                                            {item.tips.map((tip, idx) => (
                                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                                <CheckSquare className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                                                {tip}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}

                                      {/* Applicable Products */}
                                      {item.applicableProducts && item.applicableProducts.length > 0 && (
                                        <div>
                                          <h5 className="text-sm font-medium mb-2">Betroffene Produkte</h5>
                                          <div className="flex flex-wrap gap-1">
                                            {item.applicableProducts.map(product => (
                                              <Badge key={product} variant="secondary" className="text-xs">
                                                {product}
                                              </Badge>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Links */}
                                      {item.links && item.links.length > 0 && (
                                        <div>
                                          <h5 className="text-sm font-medium mb-2">Weiterführende Links</h5>
                                          <div className="flex flex-wrap gap-2">
                                            {item.links.map(link => (
                                              <Button key={link.url} variant="outline" size="sm" asChild>
                                                <a href={link.url} target="_blank" rel="noopener noreferrer">
                                                  {link.title}
                                                  <ExternalLink className="ml-1 h-3 w-3" />
                                                </a>
                                              </Button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </AccordionContent>
                                </div>
                              </div>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
