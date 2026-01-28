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
} from '@/services/api';
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

// Fallback Länderdaten
const fallbackCountries: Country[] = [
  {
    id: 'de',
    code: 'DE',
    name: 'Deutschland',
    flag: '🇩🇪',
    regulations: 24,
    checklists: 8,
    authorities: ['BAuA', 'UBA', 'BfR', 'stiftung ear'],
    description: 'Umfangreiche nationale Umsetzungen der EU-Richtlinien mit zusätzlichen Anforderungen',
  },
  {
    id: 'fr',
    code: 'FR',
    name: 'Frankreich',
    flag: '🇫🇷',
    regulations: 18,
    checklists: 7,
    authorities: ['ADEME', 'DGCCRF', 'ANSM'],
    description: 'Vorreiter bei Reparierbarkeit und Anti-Obsoleszenz-Gesetzgebung',
  },
  {
    id: 'at',
    code: 'AT',
    name: 'Österreich',
    flag: '🇦🇹',
    regulations: 14,
    checklists: 5,
    authorities: ['BMK', 'AGES', 'Umweltbundesamt'],
    description: 'Strenge Umweltauflagen und Verpackungsverordnung',
  },
  {
    id: 'it',
    code: 'IT',
    name: 'Italien',
    flag: '🇮🇹',
    regulations: 16,
    checklists: 6,
    authorities: ['ISPRA', 'CONAI', 'Ministero della Salute'],
    description: 'Besondere Anforderungen an Produktkennzeichnung und Verpackung',
  },
  {
    id: 'es',
    code: 'ES',
    name: 'Spanien',
    flag: '🇪🇸',
    regulations: 12,
    checklists: 5,
    authorities: ['MITECO', 'AEMPS', 'CNMC'],
    description: 'Nationale Umsetzung mit Fokus auf Kreislaufwirtschaft',
  },
  {
    id: 'nl',
    code: 'NL',
    name: 'Niederlande',
    flag: '🇳🇱',
    regulations: 15,
    checklists: 6,
    authorities: ['RVO', 'NVWA', 'ILT'],
    description: 'Progressive Umweltpolitik und Kreislaufwirtschaftsstrategie',
  },
  {
    id: 'be',
    code: 'BE',
    name: 'Belgien',
    flag: '🇧🇪',
    regulations: 13,
    checklists: 5,
    authorities: ['FOD', 'OVAM', 'Bruxelles Environnement'],
    description: 'Regionale Unterschiede bei Umweltauflagen (Flandern, Wallonien, Brüssel)',
  },
  {
    id: 'pl',
    code: 'PL',
    name: 'Polen',
    flag: '🇵🇱',
    regulations: 11,
    checklists: 4,
    authorities: ['GIOŚ', 'UOKiK', 'GIS'],
    description: 'Wachsender Fokus auf EU-Konformität und EPR-Systeme',
  },
  {
    id: 'se',
    code: 'SE',
    name: 'Schweden',
    flag: '🇸🇪',
    regulations: 16,
    checklists: 6,
    authorities: ['Naturvårdsverket', 'Kemikalieinspektionen'],
    description: 'Strenge Chemikalienverordnung und Nachhaltigkeitsanforderungen',
  },
  {
    id: 'dk',
    code: 'DK',
    name: 'Dänemark',
    flag: '🇩🇰',
    regulations: 14,
    checklists: 5,
    authorities: ['Miljøstyrelsen', 'Sikkerhedsstyrelsen'],
    description: 'Vorreiter bei Kreislaufwirtschaft und Ressourceneffizienz',
  },
  {
    id: 'cz',
    code: 'CZ',
    name: 'Tschechien',
    flag: '🇨🇿',
    regulations: 10,
    checklists: 4,
    authorities: ['MŽP', 'ČIŽP', 'ČOI'],
    description: 'Nationale EPR-Systeme und Verpackungsanforderungen',
  },
  {
    id: 'pt',
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    regulations: 11,
    checklists: 4,
    authorities: ['APA', 'ASAE', 'Infarmed'],
    description: 'Fokus auf maritime Nachhaltigkeit und Verpackungsrecycling',
  },
];

// Fallback für länderspezifische Regulierungen
const fallbackCountryRegulations: Record<string, NationalRegulation[]> = {
  'DE': [
    {
      id: 'de-elekrog',
      name: 'ElektroG (Elektro- und Elektronikgerätegesetz)',
      description: 'Umsetzung der WEEE-Richtlinie. Registrierungspflicht bei stiftung ear, Rücknahmepflichten, Kennzeichnungspflichten.',
      category: 'Recycling',
      mandatory: true,
      effectiveDate: '2005-03-23',
      authority: 'stiftung ear / UBA',
      penalties: 'Bis zu 100.000 € Bußgeld',
      products: ['Elektronik', 'Elektrogeräte', 'IT-Equipment', 'Beleuchtung'],
    },
    {
      id: 'de-battg',
      name: 'BattG (Batteriegesetz)',
      description: 'Rücknahme und Entsorgung von Batterien. Registrierung bei stiftung ear, Kennzeichnungspflichten, Mengenmeldungen.',
      category: 'Recycling',
      mandatory: true,
      effectiveDate: '2009-06-01',
      authority: 'stiftung ear / UBA',
      penalties: 'Bis zu 100.000 € Bußgeld',
      products: ['Batterien', 'Akkumulatoren', 'Knopfzellen'],
    },
    {
      id: 'de-verpackg',
      name: 'VerpackG (Verpackungsgesetz)',
      description: 'Systembeteiligungspflicht für Verkaufsverpackungen. Registrierung bei LUCID, Mengenmeldungen, Recyclingquoten.',
      category: 'Verpackung',
      mandatory: true,
      effectiveDate: '2019-01-01',
      authority: 'Zentrale Stelle Verpackungsregister',
      penalties: 'Bis zu 200.000 € Bußgeld, Vertriebsverbot',
      products: ['Alle verpackten Produkte'],
    },
    {
      id: 'de-prodsg',
      name: 'ProdSG (Produktsicherheitsgesetz)',
      description: 'Allgemeine Produktsicherheit, GS-Zeichen, Marktüberwachung. CE-Kennzeichnung für bestimmte Produktgruppen.',
      category: 'Sicherheit',
      mandatory: true,
      effectiveDate: '2011-12-01',
      authority: 'BAuA / Marktüberwachungsbehörden',
      penalties: 'Bis zu 100.000 € Bußgeld, Produktrückruf',
      products: ['Verbraucherprodukte', 'Spielzeug', 'Maschinen'],
    },
    {
      id: 'de-chemg',
      name: 'ChemG (Chemikaliengesetz)',
      description: 'Nationale Umsetzung von REACH und CLP. Meldepflichten, Sicherheitsdatenblätter, Kennzeichnung.',
      category: 'Chemie',
      mandatory: true,
      effectiveDate: '2008-06-01',
      authority: 'BAuA / BfR',
      penalties: 'Bis zu 50.000 € Bußgeld',
      products: ['Chemikalien', 'Gemische', 'Produkte mit gefährlichen Stoffen'],
    },
    {
      id: 'de-gpsg',
      name: 'GPSG (Geräte- und Produktsicherheitsgesetz)',
      description: 'Anforderungen an technische Arbeitsmittel und Verbraucherprodukte.',
      category: 'Sicherheit',
      mandatory: true,
      effectiveDate: '2004-05-01',
      authority: 'BAuA',
      penalties: 'Bis zu 30.000 € Bußgeld',
      products: ['Technische Arbeitsmittel', 'Verbraucherprodukte'],
    },
    {
      id: 'de-energievbrkg',
      name: 'EnVKG (Energieverbrauchskennzeichnungsgesetz)',
      description: 'Umsetzung der EU-Energielabel-Verordnung. Pflicht zur Angabe des Energieverbrauchs.',
      category: 'Energie',
      mandatory: true,
      effectiveDate: '2012-05-01',
      authority: 'BAM / Marktüberwachung',
      penalties: 'Bis zu 50.000 € Bußgeld',
      products: ['Haushaltsgeräte', 'Leuchtmittel', 'Elektronik'],
    },
    {
      id: 'de-emvg',
      name: 'EMVG (EMV-Gesetz)',
      description: 'Elektromagnetische Verträglichkeit von Geräten. CE-Kennzeichnung, Konformitätserklärung.',
      category: 'Sicherheit',
      mandatory: true,
      effectiveDate: '2016-12-22',
      authority: 'Bundesnetzagentur',
      penalties: 'Bis zu 100.000 € Bußgeld',
      products: ['Elektrische Geräte', 'Elektronik'],
    },
  ],
  'FR': [
    {
      id: 'fr-agec',
      name: 'Loi AGEC (Anti-Gaspillage pour une Économie Circulaire)',
      description: 'Umfassendes Anti-Verschwendungsgesetz mit Reparierbarkeitsindex, Ersatzteilverfügbarkeit, Verbot der Vernichtung unverkaufter Waren.',
      category: 'Nachhaltigkeit',
      mandatory: true,
      effectiveDate: '2020-02-10',
      authority: 'ADEME / DGCCRF',
      penalties: 'Bis zu 15.000 € pro Verstoß',
      products: ['Elektronik', 'Textilien', 'Möbel', 'Spielzeug'],
    },
    {
      id: 'fr-rep',
      name: 'REP (Responsabilité Élargie du Producteur)',
      description: 'Erweiterte Herstellerverantwortung für 21+ Produktkategorien. Registrierung bei eco-organismes.',
      category: 'Recycling',
      mandatory: true,
      effectiveDate: '2022-01-01',
      authority: 'ADEME',
      penalties: 'Bis zu 200.000 € Bußgeld',
      products: ['Verpackungen', 'Elektronik', 'Textilien', 'Möbel', 'Spielzeug', 'Sportartikel'],
    },
    {
      id: 'fr-indice-reparabilite',
      name: 'Indice de Réparabilité (Reparierbarkeitsindex)',
      description: 'Pflicht zur Anzeige des Reparierbarkeitsindex (0-10) am Point of Sale. Kriterien: Dokumentation, Demontage, Ersatzteile, Preis, Spezifische Kriterien.',
      category: 'Nachhaltigkeit',
      mandatory: true,
      effectiveDate: '2021-01-01',
      authority: 'DGCCRF',
      penalties: 'Bis zu 15.000 € pro Produkt',
      products: ['Smartphones', 'Laptops', 'TVs', 'Waschmaschinen', 'Rasenmäher', 'Staubsauger', 'Geschirrspüler', 'Hochdruckreiniger'],
    },
    {
      id: 'fr-triman',
      name: 'Triman (Recyclage-Symbol)',
      description: 'Pflicht-Symbol für recycelbare Produkte und Verpackungen. Muss auf Produkt oder Verpackung sichtbar sein.',
      category: 'Kennzeichnung',
      mandatory: true,
      effectiveDate: '2015-01-01',
      authority: 'ADEME',
      penalties: 'Bis zu 7.500 € Bußgeld',
      products: ['Alle recycelbaren Produkte und Verpackungen'],
    },
    {
      id: 'fr-info-tri',
      name: 'Info-tri (Sortierhinweise)',
      description: 'Detaillierte Entsorgungshinweise für Verbraucher. Muss ab 2022 auf allen Verpackungen erscheinen.',
      category: 'Kennzeichnung',
      mandatory: true,
      effectiveDate: '2022-01-01',
      authority: 'CITEO',
      penalties: 'Bis zu 7.500 € Bußgeld',
      products: ['Alle verpackten Produkte'],
    },
    {
      id: 'fr-unique-identifier',
      name: 'Identifiant Unique (Unique Identifier)',
      description: 'Eindeutiger Identifikator für Produkte unter REP. Ermöglicht Rückverfolgbarkeit.',
      category: 'Kennzeichnung',
      mandatory: true,
      effectiveDate: '2023-01-01',
      authority: 'ADEME',
      penalties: 'Teil der REP-Sanktionen',
      products: ['Alle REP-pflichtigen Produkte'],
    },
    {
      id: 'fr-indice-durabilite',
      name: 'Indice de Durabilité (Haltbarkeitsindex)',
      description: 'Erweitert den Reparierbarkeitsindex um Zuverlässigkeit und Robustheit. Ersetzt ab 2025 den Reparierbarkeitsindex.',
      category: 'Nachhaltigkeit',
      mandatory: true,
      effectiveDate: '2025-01-01',
      authority: 'DGCCRF',
      penalties: 'Bis zu 15.000 € pro Produkt',
      products: ['Elektronik', 'Haushaltsgeräte'],
    },
  ],
  'AT': [
    {
      id: 'at-eag',
      name: 'EAG-VO (Elektroaltgeräteverordnung)',
      description: 'Sammlung und Verwertung von Elektroaltgeräten. Registrierung bei ERA.',
      category: 'Recycling',
      mandatory: true,
      effectiveDate: '2005-08-13',
      authority: 'BMK / ERA',
      penalties: 'Bis zu 42.000 € Bußgeld',
      products: ['Elektrogeräte', 'Elektronik'],
    },
    {
      id: 'at-verpackvo',
      name: 'VerpackVO (Verpackungsverordnung)',
      description: 'Sammlung und Verwertung von Verpackungen. Lizenzierung bei ARA oder anderen Systemen.',
      category: 'Verpackung',
      mandatory: true,
      effectiveDate: '1996-10-01',
      authority: 'BMK',
      penalties: 'Bis zu 36.000 € Bußgeld',
      products: ['Alle verpackten Produkte'],
    },
    {
      id: 'at-battvo',
      name: 'Batterieverordnung',
      description: 'Sammlung und Verwertung von Batterien. Registrierung und Mengenmeldungen.',
      category: 'Recycling',
      mandatory: true,
      effectiveDate: '2008-12-01',
      authority: 'BMK',
      penalties: 'Bis zu 36.000 € Bußgeld',
      products: ['Batterien', 'Akkumulatoren'],
    },
    {
      id: 'at-chemg',
      name: 'ChemG (Chemikaliengesetz)',
      description: 'Österreichische Umsetzung von REACH und CLP.',
      category: 'Chemie',
      mandatory: true,
      effectiveDate: '2008-06-01',
      authority: 'AGES',
      penalties: 'Bis zu 36.000 € Bußgeld',
      products: ['Chemikalien', 'Gemische'],
    },
  ],
};

// Fallback EU-Regulierungen
const fallbackEURegulations: EURegulation[] = [
  {
    id: 'espr',
    name: 'ESPR (Ecodesign for Sustainable Products Regulation)',
    fullName: 'Verordnung (EU) 2024/1781 über Ökodesign-Anforderungen für nachhaltige Produkte',
    description: 'Rahmenverordnung für nachhaltige Produkte. Führt den Digitalen Produktpass (DPP) ein und erweitert die Ökodesign-Anforderungen auf nahezu alle Produktkategorien.',
    category: 'environment',
    status: 'active',
    effectiveDate: '2024-07-18',
    applicationDate: '2027-01-01',
    keyRequirements: [
      'Digitaler Produktpass (DPP) für alle regulierten Produkte',
      'QR-Code mit Verlinkung zu Produktinformationen',
      'Datenträger mit eindeutiger Produkt-ID',
      'Reparierbarkeit und Langlebigkeit',
      'Recycelte Materialien',
      'Kohlenstoff- und Umweltfußabdruck',
    ],
    affectedProducts: ['Textilien', 'Möbel', 'Reifen', 'Waschmittel', 'Farben', 'Schmierstoffe', 'Chemikalien', 'Elektronik', 'ICT-Produkte', 'Eisen & Stahl'],
    dppDeadlines: {
      'Batterien': '2027-02-18',
      'Textilien': '2027-12-31',
      'Elektronik': '2028-12-31',
      'Möbel': '2029-06-30',
    },
  },
  {
    id: 'battery-regulation',
    name: 'EU-Batterieverordnung',
    fullName: 'Verordnung (EU) 2023/1542 über Batterien und Altbatterien',
    description: 'Umfassende Regelung für den gesamten Lebenszyklus von Batterien. Erster verbindlicher DPP ab Februar 2027.',
    category: 'environment',
    status: 'upcoming',
    effectiveDate: '2023-08-17',
    applicationDate: '2027-02-18',
    keyRequirements: [
      'Digitaler Produktpass mit QR-Code',
      'Mindestgehalt an recyceltem Material (Kobalt, Blei, Lithium, Nickel)',
      'Kohlenstoff-Fußabdruck-Erklärung',
      'Leistungs- und Haltbarkeitsanforderungen',
      'Kennzeichnung und Etikettierung',
      'Due Diligence in der Lieferkette',
      'Sammlung und Recycling',
    ],
    affectedProducts: ['LMT-Batterien', 'Industriebatterien', 'EV-Batterien', 'SLI-Batterien', 'Gerätebatterien'],
    dppDeadlines: {
      'LMT-Batterien >2kWh': '2027-02-18',
      'Industriebatterien >2kWh': '2027-02-18',
      'EV-Batterien': '2027-02-18',
      'Alle anderen': '2028-08-18',
    },
  },
  {
    id: 'reach',
    name: 'REACH-Verordnung',
    fullName: 'Verordnung (EG) Nr. 1907/2006 zur Registrierung, Bewertung, Zulassung und Beschränkung chemischer Stoffe',
    description: 'Zentrales Regelwerk für Chemikalien in der EU. Registrierungspflicht, SVHC-Kandidatenliste, Beschränkungen.',
    category: 'chemicals',
    status: 'active',
    effectiveDate: '2007-06-01',
    applicationDate: '2007-06-01',
    keyRequirements: [
      'Registrierung aller Stoffe >1t/Jahr bei ECHA',
      'Sicherheitsdatenblätter für gefährliche Stoffe',
      'SVHC-Mitteilungspflicht >0,1% w/w',
      'SCIP-Datenbank-Meldung für Erzeugnisse mit SVHCs',
      'Beschränkungen für bestimmte Stoffe (Anhang XVII)',
      'Zulassungspflicht für SVHCs (Anhang XIV)',
    ],
    affectedProducts: ['Alle Produkte mit chemischen Stoffen'],
    dppDeadlines: {},
  },
  {
    id: 'rohs',
    name: 'RoHS-Richtlinie',
    fullName: 'Richtlinie 2011/65/EU zur Beschränkung der Verwendung bestimmter gefährlicher Stoffe in Elektro- und Elektronikgeräten',
    description: 'Beschränkt die Verwendung von 10 gefährlichen Stoffen in Elektrogeräten: Blei, Quecksilber, Cadmium, Chrom VI, PBB, PBDE, DEHP, BBP, DBP, DIBP.',
    category: 'chemicals',
    status: 'active',
    effectiveDate: '2011-07-01',
    applicationDate: '2013-01-03',
    keyRequirements: [
      'Grenzwerte für gefährliche Stoffe einhalten',
      'EU-Konformitätserklärung erstellen',
      'CE-Kennzeichnung anbringen',
      'Technische Dokumentation führen',
      'Ausnahmen prüfen und dokumentieren',
    ],
    affectedProducts: ['Alle Elektro- und Elektronikgeräte (11 Kategorien)'],
    dppDeadlines: {},
  },
  {
    id: 'weee',
    name: 'WEEE-Richtlinie',
    fullName: 'Richtlinie 2012/19/EU über Elektro- und Elektronik-Altgeräte',
    description: 'Regelt die Sammlung, Behandlung und Verwertung von Elektroaltgeräten. Herstellerverantwortung und Sammelziele.',
    category: 'recycling',
    status: 'active',
    effectiveDate: '2012-08-13',
    applicationDate: '2014-02-14',
    keyRequirements: [
      'Registrierung als Hersteller im jeweiligen Mitgliedstaat',
      'Finanzierung der Sammlung und Entsorgung',
      'WEEE-Symbol auf Produkten anbringen',
      'Sammelziele erreichen (65% oder 85% Verwertung)',
      'Mengenmeldungen an Behörden',
    ],
    affectedProducts: ['6 Kategorien von Elektrogeräten'],
    dppDeadlines: {},
  },
  {
    id: 'ce-marking',
    name: 'CE-Kennzeichnung',
    fullName: 'Verordnung (EG) Nr. 765/2008 und Beschluss Nr. 768/2008/EG',
    description: 'Zeigt Konformität mit EU-Harmonisierungsvorschriften an. Voraussetzung für den freien Warenverkehr im Binnenmarkt.',
    category: 'safety',
    status: 'active',
    effectiveDate: '2010-01-01',
    applicationDate: '2010-01-01',
    keyRequirements: [
      'Konformitätsbewertung durchführen',
      'Technische Dokumentation erstellen',
      'EU-Konformitätserklärung ausstellen',
      'CE-Zeichen anbringen (mind. 5mm Höhe)',
      'Hersteller/Importeur/Bevollmächtigten angeben',
    ],
    affectedProducts: ['Spielzeug', 'Maschinen', 'Medizinprodukte', 'Bauprodukte', 'Persönliche Schutzausrüstung', 'Elektrogeräte', 'Druckgeräte', 'u.v.m.'],
    dppDeadlines: {},
  },
  {
    id: 'epr',
    name: 'EPR (Extended Producer Responsibility)',
    fullName: 'Erweiterte Herstellerverantwortung nach der Abfallrahmenrichtlinie',
    description: 'Finanzielle und organisatorische Verantwortung der Hersteller für das End-of-Life ihrer Produkte.',
    category: 'recycling',
    status: 'active',
    effectiveDate: '2008-11-19',
    applicationDate: '2008-12-12',
    keyRequirements: [
      'Registrierung bei nationalen EPR-Systemen',
      'Finanzierung der Sammlung und Verwertung',
      'Mengenmeldungen und Berichterstattung',
      'Öko-Modulation der Gebühren',
      'Verbraucherkommunikation',
    ],
    affectedProducts: ['Verpackungen', 'Elektrogeräte', 'Batterien', 'Fahrzeuge', 'Reifen', 'Textilien (ab 2025)'],
    dppDeadlines: {},
  },
  {
    id: 'energy-label',
    name: 'EU-Energielabel',
    fullName: 'Verordnung (EU) 2017/1369 zur Festlegung eines Rahmens für die Energieverbrauchskennzeichnung',
    description: 'Einheitliche Energieverbrauchskennzeichnung für energieverbrauchsrelevante Produkte. Skala A bis G.',
    category: 'energy',
    status: 'active',
    effectiveDate: '2017-08-01',
    applicationDate: '2021-03-01',
    keyRequirements: [
      'Energielabel am Point of Sale',
      'Produktdatenblatt erstellen',
      'Registrierung in EPREL-Datenbank',
      'QR-Code auf Label (verlinkt zu EPREL)',
      'Werbematerial mit Energieklasse',
    ],
    affectedProducts: ['Kühlschränke', 'Waschmaschinen', 'Geschirrspüler', 'TVs', 'Leuchtmittel', 'Klimageräte', 'Reifen'],
    dppDeadlines: {},
  },
  {
    id: 'packaging-ppwr',
    name: 'PPWR (Packaging and Packaging Waste Regulation)',
    fullName: 'Verordnung über Verpackungen und Verpackungsabfälle',
    description: 'Ersetzt die bestehende Verpackungsrichtlinie. Strenge Recycling- und Wiederverwendungsziele, Mindestgehalt an recyceltem Material.',
    category: 'environment',
    status: 'upcoming',
    effectiveDate: '2024-12-31',
    applicationDate: '2025-01-01',
    keyRequirements: [
      'Alle Verpackungen müssen recycelbar sein (2030)',
      'Mindestgehalt an recyceltem Kunststoff',
      'Beschränkung von Einwegverpackungen',
      'Pfandsysteme für Getränkeflaschen',
      'Wiederverwendungsziele für bestimmte Sektoren',
      'Harmonisierte Kennzeichnung',
    ],
    affectedProducts: ['Alle Verpackungen'],
    dppDeadlines: {},
  },
  {
    id: 'csrd',
    name: 'CSRD (Corporate Sustainability Reporting Directive)',
    fullName: 'Richtlinie (EU) 2022/2464 zur Nachhaltigkeitsberichterstattung von Unternehmen',
    description: 'Erweiterte Nachhaltigkeitsberichtspflichten für große und börsennotierte Unternehmen nach European Sustainability Reporting Standards (ESRS).',
    category: 'environment',
    status: 'active',
    effectiveDate: '2023-01-05',
    applicationDate: '2024-01-01',
    keyRequirements: [
      'Berichterstattung nach ESRS',
      'Doppelte Wesentlichkeit (Double Materiality)',
      'Externe Prüfung des Nachhaltigkeitsberichts',
      'Digitales Tagging (XBRL/ESEF)',
      'Integration in Lagebericht',
    ],
    affectedProducts: ['Nicht produktspezifisch - Unternehmensebene'],
    dppDeadlines: {},
  },
  {
    id: 'csddd',
    name: 'CSDDD (Corporate Sustainability Due Diligence Directive)',
    fullName: 'Richtlinie über Sorgfaltspflichten von Unternehmen im Hinblick auf Nachhaltigkeit',
    description: 'Sorgfaltspflichten bezüglich Menschenrechte und Umwelt in der gesamten Wertschöpfungskette.',
    category: 'environment',
    status: 'upcoming',
    effectiveDate: '2024-07-25',
    applicationDate: '2027-07-26',
    keyRequirements: [
      'Identifizierung negativer Auswirkungen',
      'Prävention und Minderung von Schäden',
      'Beschwerdemechanismus einrichten',
      'Überwachung der Wirksamkeit',
      'Öffentliche Berichterstattung',
      'Klimaübergangsplan',
    ],
    affectedProducts: ['Nicht produktspezifisch - Unternehmensebene'],
    dppDeadlines: {},
  },
  {
    id: 'deforestation',
    name: 'EUDR (EU Deforestation Regulation)',
    fullName: 'Verordnung (EU) 2023/1115 über entwaldungsfreie Produkte',
    description: 'Verbot des Inverkehrbringens von Produkten, die mit Entwaldung oder Waldschädigung verbunden sind.',
    category: 'environment',
    status: 'upcoming',
    effectiveDate: '2023-06-29',
    applicationDate: '2024-12-30',
    keyRequirements: [
      'Due-Diligence-Erklärung vor dem Inverkehrbringen',
      'Geolokalisierung der Produktionsstandorte',
      'Nachweis der Entwaldungsfreiheit',
      'Rückverfolgbarkeit in der Lieferkette',
      'Risikobeurteilung und -minderung',
    ],
    affectedProducts: ['Rinder', 'Kakao', 'Kaffee', 'Palmöl', 'Soja', 'Holz', 'Kautschuk', 'und deren Folgeprodukte'],
    dppDeadlines: {},
  },
];

// Fallback Piktogramme und Symbole
const fallbackPictograms: Pictogram[] = [
  // CE und Sicherheit
  {
    id: 'ce',
    symbol: 'CE',
    name: 'CE-Kennzeichnung',
    description: 'Zeigt EU-Konformität an. Erforderlich für viele Produktkategorien vor dem Inverkehrbringen.',
    mandatory: true,
    countries: ['EU'],
    category: 'safety',
    dimensions: 'Mind. 5mm Höhe, Proportionen gemäß Anhang II Beschluss 768/2008/EG',
    placement: 'Auf Produkt, Verpackung oder Dokumenten',
  },
  {
    id: 'gs',
    symbol: 'GS',
    name: 'GS-Zeichen (Geprüfte Sicherheit)',
    description: 'Freiwilliges deutsches Sicherheitszeichen. Nachweis der Prüfung durch eine zugelassene Stelle.',
    mandatory: false,
    countries: ['DE'],
    category: 'safety',
    dimensions: 'Keine Mindestgröße, aber erkennbar',
    placement: 'Auf Produkt',
  },

  // Recycling und Entsorgung
  {
    id: 'weee',
    symbol: '🗑️❌',
    name: 'WEEE-Symbol (Durchgestrichene Mülltonne)',
    description: 'Elektro- und Elektronikgeräte dürfen nicht im Hausmüll entsorgt werden. Getrennte Sammlung erforderlich.',
    mandatory: true,
    countries: ['EU'],
    category: 'recycling',
    dimensions: 'Mind. 7mm x 10mm, gemäß EN 50419',
    placement: 'Auf Produkt oder Etikett, dauerhaft',
  },
  {
    id: 'triman',
    symbol: '🔄',
    name: 'Triman',
    description: 'Französisches Recycling-Symbol. Zeigt an, dass das Produkt einem Sammelsystem unterliegt.',
    mandatory: true,
    countries: ['FR'],
    category: 'recycling',
    dimensions: 'Mind. 6mm bei bedruckter Fläche',
    placement: 'Auf Produkt oder Verpackung',
  },
  {
    id: 'info-tri',
    symbol: '🗂️',
    name: 'Info-tri',
    description: 'Französische Sortieranleitung. Gibt an, wie jeder Teil der Verpackung entsorgt werden soll.',
    mandatory: true,
    countries: ['FR'],
    category: 'recycling',
    dimensions: 'Lesbar',
    placement: 'Auf Verpackung',
  },
  {
    id: 'green-dot',
    symbol: '♻️',
    name: 'Grüner Punkt',
    description: 'Zeigt die Teilnahme an einem Dualen System für Verpackungsrecycling. In manchen Ländern noch erforderlich.',
    mandatory: false,
    countries: ['DE', 'AT', 'ES', 'PT'],
    category: 'recycling',
    dimensions: 'Keine Mindestgröße',
    placement: 'Auf Verpackung',
  },
  {
    id: 'mobius-loop',
    symbol: '♲',
    name: 'Möbius-Schleife (Recycling-Symbol)',
    description: 'Zeigt an, dass das Material recycelbar ist oder aus recyceltem Material besteht. Mit Prozentangabe: Recyclinganteil.',
    mandatory: false,
    countries: ['EU'],
    category: 'recycling',
    dimensions: 'Keine Mindestgröße',
    placement: 'Auf Produkt oder Verpackung',
  },

  // Reparierbarkeit und Haltbarkeit
  {
    id: 'repairability-fr',
    symbol: '🔧',
    name: 'Indice de Réparabilité',
    description: 'Französischer Reparierbarkeitsindex (0-10). Farbe von Rot (schlecht) bis Grün (gut).',
    mandatory: true,
    countries: ['FR'],
    category: 'durability',
    dimensions: 'Gemäß Décret n° 2020-1757',
    placement: 'Am Point of Sale, auf Verpackung oder Produkt',
  },
  {
    id: 'durability-fr',
    symbol: '⏱️',
    name: 'Indice de Durabilité',
    description: 'Französischer Haltbarkeitsindex (ab 2025). Erweitert den Reparierbarkeitsindex um Zuverlässigkeit.',
    mandatory: true,
    countries: ['FR'],
    category: 'durability',
    dimensions: 'Gemäß kommender Verordnung',
    placement: 'Am Point of Sale, auf Verpackung oder Produkt',
  },

  // Energie
  {
    id: 'energy-label',
    symbol: '⚡',
    name: 'EU-Energielabel',
    description: 'Zeigt Energieeffizienzklasse (A-G) und weitere Produkteigenschaften. QR-Code verlinkt zu EPREL.',
    mandatory: true,
    countries: ['EU'],
    category: 'energy',
    dimensions: 'Standardgröße gemäß produktspezifischer Verordnung',
    placement: 'Am Point of Sale',
  },
  {
    id: 'ecodesign',
    symbol: '🌿',
    name: 'EU-Ökodesign',
    description: 'Zeigt Konformität mit Ökodesign-Anforderungen für energieverbrauchsrelevante Produkte.',
    mandatory: false,
    countries: ['EU'],
    category: 'energy',
    dimensions: 'Keine Mindestgröße',
    placement: 'Optional auf Produkt',
  },

  // Batterien
  {
    id: 'battery-collection',
    symbol: '🔋❌',
    name: 'Batteriesammlung',
    description: 'Durchgestrichene Mülltonne für Batterien. Zeigt getrennte Sammlung an.',
    mandatory: true,
    countries: ['EU'],
    category: 'recycling',
    dimensions: 'Mind. 3% der Oberfläche, max. 5cm x 5cm',
    placement: 'Auf Batterie oder Verpackung',
  },
  {
    id: 'battery-chemistry',
    symbol: 'Pb/Cd/Hg',
    name: 'Batterie-Chemie-Symbol',
    description: 'Chemische Symbole für Blei, Cadmium oder Quecksilber wenn >Grenzwert.',
    mandatory: true,
    countries: ['EU'],
    category: 'chemicals',
    dimensions: 'Unter dem Symbol der durchgestrichenen Mülltonne',
    placement: 'Auf Batterie',
  },

  // Chemie und Gefahrstoffe
  {
    id: 'ghs-explosive',
    symbol: '💥',
    name: 'GHS01 - Explosiv',
    description: 'Explodierende Bombe. Für explosive Stoffe und Gemische.',
    mandatory: true,
    countries: ['EU'],
    category: 'chemicals',
    dimensions: 'Gemäß CLP-Verordnung',
    placement: 'Auf Verpackung',
  },
  {
    id: 'ghs-flammable',
    symbol: '🔥',
    name: 'GHS02 - Entzündbar',
    description: 'Flamme. Für entzündbare Gase, Aerosole, Flüssigkeiten, Feststoffe.',
    mandatory: true,
    countries: ['EU'],
    category: 'chemicals',
    dimensions: 'Gemäß CLP-Verordnung',
    placement: 'Auf Verpackung',
  },
  {
    id: 'ghs-oxidizing',
    symbol: '⭕🔥',
    name: 'GHS03 - Oxidierend',
    description: 'Flamme über Kreis. Für oxidierende Gase, Flüssigkeiten, Feststoffe.',
    mandatory: true,
    countries: ['EU'],
    category: 'chemicals',
    dimensions: 'Gemäß CLP-Verordnung',
    placement: 'Auf Verpackung',
  },
  {
    id: 'ghs-gas',
    symbol: '🧪',
    name: 'GHS04 - Gasflasche',
    description: 'Gasflasche. Für verdichtete, verflüssigte, gelöste Gase.',
    mandatory: true,
    countries: ['EU'],
    category: 'chemicals',
    dimensions: 'Gemäß CLP-Verordnung',
    placement: 'Auf Verpackung',
  },
  {
    id: 'ghs-corrosive',
    symbol: '⚗️',
    name: 'GHS05 - Ätzend',
    description: 'Ätzwirkung. Für hautätzende und augenschädigende Stoffe.',
    mandatory: true,
    countries: ['EU'],
    category: 'chemicals',
    dimensions: 'Gemäß CLP-Verordnung',
    placement: 'Auf Verpackung',
  },
  {
    id: 'ghs-toxic',
    symbol: '☠️',
    name: 'GHS06 - Giftig',
    description: 'Totenkopf mit Knochen. Für akut toxische Stoffe.',
    mandatory: true,
    countries: ['EU'],
    category: 'chemicals',
    dimensions: 'Gemäß CLP-Verordnung',
    placement: 'Auf Verpackung',
  },
  {
    id: 'ghs-harmful',
    symbol: '⚠️',
    name: 'GHS07 - Reizend',
    description: 'Ausrufezeichen. Für reizende, sensibilisierende, narkotische Stoffe.',
    mandatory: true,
    countries: ['EU'],
    category: 'chemicals',
    dimensions: 'Gemäß CLP-Verordnung',
    placement: 'Auf Verpackung',
  },
  {
    id: 'ghs-health',
    symbol: '⚕️',
    name: 'GHS08 - Gesundheitsgefahr',
    description: 'Gesundheitsgefahr. Für CMR-Stoffe, STOT, Aspirationsgefahr.',
    mandatory: true,
    countries: ['EU'],
    category: 'chemicals',
    dimensions: 'Gemäß CLP-Verordnung',
    placement: 'Auf Verpackung',
  },
  {
    id: 'ghs-environment',
    symbol: '🌳',
    name: 'GHS09 - Umweltgefährlich',
    description: 'Umwelt. Für gewässergefährdende Stoffe.',
    mandatory: true,
    countries: ['EU'],
    category: 'chemicals',
    dimensions: 'Gemäß CLP-Verordnung',
    placement: 'Auf Verpackung',
  },
];

// Fallback Recycling-Codes für Kunststoffe
const fallbackRecyclingCodes: RecyclingCode[] = [
  { id: 'rc-1', code: '1', symbol: '♳', name: 'PET', fullName: 'Polyethylenterephthalat', examples: 'Getränkeflaschen, Lebensmittelverpackungen', recyclable: true },
  { id: 'rc-2', code: '2', symbol: '♴', name: 'HDPE', fullName: 'Polyethylen hoher Dichte', examples: 'Milchflaschen, Reinigungsmittel', recyclable: true },
  { id: 'rc-3', code: '3', symbol: '♵', name: 'PVC', fullName: 'Polyvinylchlorid', examples: 'Rohre, Fensterrahmen, Kabel', recyclable: false },
  { id: 'rc-4', code: '4', symbol: '♶', name: 'LDPE', fullName: 'Polyethylen niedriger Dichte', examples: 'Plastiktüten, Folien', recyclable: true },
  { id: 'rc-5', code: '5', symbol: '♷', name: 'PP', fullName: 'Polypropylen', examples: 'Joghurtbecher, Verschlüsse', recyclable: true },
  { id: 'rc-6', code: '6', symbol: '♸', name: 'PS', fullName: 'Polystyrol', examples: 'Styropor, Einweggeschirr', recyclable: false },
  { id: 'rc-7', code: '7', symbol: '♹', name: 'O', fullName: 'Andere Kunststoffe', examples: 'PC, PA, ABS, etc.', recyclable: false },
  { id: 'rc-20', code: '20', symbol: '♺', name: 'PAP', fullName: 'Wellpappe', examples: 'Kartons', recyclable: true },
  { id: 'rc-21', code: '21', symbol: '♺', name: 'PAP', fullName: 'Sonstige Pappe', examples: 'Faltschachteln', recyclable: true },
  { id: 'rc-22', code: '22', symbol: '♺', name: 'PAP', fullName: 'Papier', examples: 'Zeitungen, Magazine', recyclable: true },
  { id: 'rc-40', code: '40', symbol: '♻', name: 'FE', fullName: 'Stahl', examples: 'Konservendosen', recyclable: true },
  { id: 'rc-41', code: '41', symbol: '♻', name: 'ALU', fullName: 'Aluminium', examples: 'Getränkedosen', recyclable: true },
  { id: 'rc-70', code: '70', symbol: '♻', name: 'GL', fullName: 'Farbloses Glas', examples: 'Flaschen, Gläser', recyclable: true },
  { id: 'rc-71', code: '71', symbol: '♻', name: 'GL', fullName: 'Grünes Glas', examples: 'Weinflaschen', recyclable: true },
  { id: 'rc-72', code: '72', symbol: '♻', name: 'GL', fullName: 'Braunes Glas', examples: 'Bierflaschen', recyclable: true },
];

// Fallback News
const fallbackNews: NewsItem[] = [
  {
    id: '1',
    title: 'ESPR: Delegierte Rechtsakte für erste Produktkategorien erwartet',
    summary: 'Die EU-Kommission arbeitet an den ersten delegierten Rechtsakten unter der ESPR. Textilien und Eisen/Stahl werden voraussichtlich die ersten sein.',
    content: 'Die Europäische Kommission hat angekündigt, dass die ersten produktspezifischen Anforderungen unter der neuen Ökodesign-Verordnung für nachhaltige Produkte (ESPR) im Laufe des Jahres 2025 verabschiedet werden. Textilien und Eisen/Stahl sind als Pilotkategorien vorgesehen, gefolgt von Möbeln, Reifen und Waschmitteln.',
    category: 'regulation',
    countries: ['EU'],
    publishedAt: '2025-01-15',
    effectiveDate: '2027-01-01',
    priority: 'high',
    tags: ['ESPR', 'DPP', 'Textilien', 'Ökodesign'],
  },
  {
    id: '2',
    title: 'Batterie-DPP: Technische Standards veröffentlicht',
    summary: 'Die EU hat die technischen Spezifikationen für den Batterie-Produktpass veröffentlicht. QR-Code-Anforderungen und Datenformate sind jetzt definiert.',
    content: 'Nach langer Konsultationsphase hat die EU-Kommission die technischen Standards für den digitalen Batteriepass veröffentlicht. Diese definieren die Mindestanforderungen an QR-Codes, Datenformate (JSON-LD), und die verpflichtenden Datenfelder. Hersteller müssen ab Februar 2027 für Batterien >2kWh einen digitalen Pass bereitstellen.',
    category: 'deadline',
    countries: ['EU'],
    publishedAt: '2025-01-10',
    effectiveDate: '2027-02-18',
    priority: 'high',
    tags: ['Batterie', 'DPP', 'QR-Code', 'Standards'],
  },
  {
    id: '3',
    title: 'Frankreich: Reparierbarkeitsindex wird zum Haltbarkeitsindex',
    summary: 'Ab 2025 wird der französische Reparierbarkeitsindex durch den umfassenderen Haltbarkeitsindex ersetzt.',
    content: 'Frankreich erweitert sein Pionier-System der Produktbewertung. Der neue "Indice de Durabilité" (Haltbarkeitsindex) integriert neben der Reparierbarkeit auch Kriterien wie Zuverlässigkeit und Robustheit. Erste Produktkategorien sind Smartphones, Laptops, Fernseher und Waschmaschinen.',
    category: 'update',
    countries: ['FR'],
    publishedAt: '2025-01-05',
    effectiveDate: '2025-01-01',
    priority: 'medium',
    tags: ['Frankreich', 'Reparierbarkeit', 'Haltbarkeit', 'AGEC'],
  },
  {
    id: '4',
    title: 'SCIP-Datenbank: Über 100 Millionen Meldungen erreicht',
    summary: 'Die ECHA-Datenbank für SVHC-haltige Erzeugnisse wächst weiter. Neue Einreichungsanforderungen ab 2025.',
    content: 'Die SCIP-Datenbank (Substances of Concern In articles as such or in complex objects/Products) hat einen Meilenstein erreicht. Die ECHA hat neue Leitlinien veröffentlicht, die die Anforderungen an die Datenqualität verschärfen. Unternehmen müssen ihre bestehenden Einträge überprüfen und aktualisieren.',
    category: 'warning',
    countries: ['EU'],
    publishedAt: '2025-01-02',
    effectiveDate: '2025-03-01',
    priority: 'medium',
    tags: ['REACH', 'SVHC', 'SCIP', 'ECHA'],
  },
  {
    id: '5',
    title: 'Deutschland: stiftung ear aktualisiert Mengenmeldeverfahren',
    summary: 'Neue elektronische Schnittstellen für die Mengenmeldung bei der stiftung ear ab Q2 2025.',
    content: 'Die stiftung elektro-altgeräte register führt ein neues API-basiertes Meldesystem ein. Hersteller und Bevollmächtigte müssen ihre Systeme bis Juni 2025 anpassen. Das alte XML-Format wird ab 2026 nicht mehr unterstützt.',
    category: 'update',
    countries: ['DE'],
    publishedAt: '2024-12-20',
    effectiveDate: '2025-06-01',
    priority: 'medium',
    tags: ['ElektroG', 'stiftung ear', 'API', 'Mengenmeldung'],
  },
  {
    id: '6',
    title: 'PPWR: Finale Abstimmung im EU-Parlament erfolgt',
    summary: 'Die neue Verpackungsverordnung wurde angenommen. Strenge Recycling- und Wiederverwendungsziele kommen.',
    content: 'Das EU-Parlament hat die Verordnung über Verpackungen und Verpackungsabfälle (PPWR) angenommen. Wichtige Punkte: Alle Verpackungen müssen bis 2030 recycelbar sein, Mindestgehalt an recyceltem Kunststoff, Beschränkungen für Einwegverpackungen, harmonisierte Kennzeichnung EU-weit.',
    category: 'regulation',
    countries: ['EU'],
    publishedAt: '2024-12-15',
    effectiveDate: '2025-01-01',
    priority: 'high',
    tags: ['PPWR', 'Verpackung', 'Recycling', 'Kreislaufwirtschaft'],
  },
  {
    id: '7',
    title: 'Textil-DPP: Erste Pilotprojekte gestartet',
    summary: 'Mehrere große Modemarken testen den digitalen Produktpass für Textilien in Pilotprojekten.',
    content: 'Im Vorgriff auf die kommenden ESPR-Anforderungen haben führende Textilunternehmen Pilotprojekte für den digitalen Produktpass gestartet. Die Projekte testen verschiedene Ansätze für QR-Codes, NFC-Tags und die Integration von Lieferkettendaten.',
    category: 'update',
    countries: ['EU'],
    publishedAt: '2024-12-10',
    effectiveDate: '2027-12-31',
    priority: 'low',
    tags: ['Textilien', 'DPP', 'Pilotprojekt', 'Mode'],
  },
  {
    id: '8',
    title: 'EUDR: Übergangsfrist verlängert',
    summary: 'Die EU hat eine 12-monatige Verschiebung der Anwendung der Entwaldungsverordnung angekündigt.',
    content: 'Aufgrund von Bedenken bezüglich der Umsetzungsbereitschaft hat die EU-Kommission vorgeschlagen, die Anwendung der EUDR um 12 Monate zu verschieben. Große Unternehmen müssen nun ab Dezember 2025 statt Dezember 2024 compliant sein.',
    category: 'deadline',
    countries: ['EU'],
    publishedAt: '2024-12-01',
    effectiveDate: '2025-12-30',
    priority: 'high',
    tags: ['EUDR', 'Entwaldung', 'Due Diligence', 'Verschiebung'],
  },
  {
    id: '9',
    title: 'Österreich: Neues EPR-System für Textilien ab 2025',
    summary: 'Österreich führt ein erweitertes Herstellerverantwortungssystem für Textilien ein.',
    content: 'Das Bundesministerium für Klimaschutz hat die Einführung eines EPR-Systems für Textilien und Schuhe angekündigt. Hersteller und Importeure müssen sich registrieren und Entsorgungsgebühren zahlen. Das System soll bis Mitte 2025 operativ sein.',
    category: 'regulation',
    countries: ['AT'],
    publishedAt: '2024-11-25',
    effectiveDate: '2025-07-01',
    priority: 'medium',
    tags: ['Österreich', 'EPR', 'Textilien', 'Kreislaufwirtschaft'],
  },
  {
    id: '10',
    title: 'REACH: Neue SVHC auf der Kandidatenliste',
    summary: 'ECHA hat 5 neue besonders besorgniserregende Stoffe auf die Kandidatenliste gesetzt.',
    content: 'Die Europäische Chemikalienagentur hat die Kandidatenliste um 5 neue SVHCs erweitert. Unternehmen müssen prüfen, ob ihre Produkte diese Stoffe enthalten und ggf. SCIP-Meldungen aktualisieren sowie Kunden informieren.',
    category: 'warning',
    countries: ['EU'],
    publishedAt: '2024-11-20',
    effectiveDate: '2025-01-15',
    priority: 'high',
    tags: ['REACH', 'SVHC', 'Chemikalien', 'ECHA'],
  },
  {
    id: '11',
    title: 'Italien: Neue Verpackungskennzeichnung tritt in Kraft',
    summary: 'Italiens Decreto 116/2020 verlangt detaillierte Entsorgungshinweise auf allen Verpackungen.',
    content: 'Nach mehrfacher Verschiebung ist die italienische Verpackungskennzeichnungspflicht nun verbindlich. Alle Verpackungen müssen Materialcodes (gemäß Entscheidung 129/97/CE) und Entsorgungshinweise für Verbraucher tragen.',
    category: 'deadline',
    countries: ['IT'],
    publishedAt: '2024-11-15',
    effectiveDate: '2024-01-01',
    priority: 'medium',
    tags: ['Italien', 'Verpackung', 'Kennzeichnung', 'CONAI'],
  },
  {
    id: '12',
    title: 'Niederlande: Circular Economy Implementation Programme 2025',
    summary: 'Die Niederlande veröffentlichen ihre aktualisierte Kreislaufwirtschaftsstrategie.',
    content: 'Das niederländische Programm sieht vor, dass die Niederlande bis 2050 vollständig zirkulär wirtschaften. Neue Maßnahmen betreffen insbesondere Kunststoffe, Textilien und Elektronik mit erhöhten Recyclingzielen und Produktdesign-Anforderungen.',
    category: 'regulation',
    countries: ['NL'],
    publishedAt: '2024-11-10',
    effectiveDate: '2025-01-01',
    priority: 'low',
    tags: ['Niederlande', 'Kreislaufwirtschaft', 'Nachhaltigkeit'],
  },
];

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

  // Daten aus API oder Fallback
  const [countries, setCountries] = useState<Country[]>(fallbackCountries);
  const [euRegulations, setEURegulations] = useState<EURegulation[]>(fallbackEURegulations);
  const [countryRegulations, setCountryRegulations] = useState<Record<string, NationalRegulation[]>>(fallbackCountryRegulations);
  const [pictograms, setPictograms] = useState<Pictogram[]>(fallbackPictograms);
  const [recyclingCodes, setRecyclingCodes] = useState<RecyclingCode[]>(fallbackRecyclingCodes);
  const [news, setNews] = useState<NewsItem[]>(fallbackNews);

  // Daten aus API laden
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Alle Master-Daten parallel laden
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

        // Länder setzen
        if (countriesData && countriesData.length > 0) {
          setCountries(countriesData);
        }

        // EU-Regulierungen setzen
        if (euRegsData && euRegsData.length > 0) {
          setEURegulations(euRegsData);
        }

        // Piktogramme setzen
        if (pictogramsData && pictogramsData.length > 0) {
          setPictograms(pictogramsData);
        }

        // Recycling-Codes setzen
        if (recyclingCodesData && recyclingCodesData.length > 0) {
          setRecyclingCodes(recyclingCodesData);
        }

        // News setzen
        if (newsData && newsData.length > 0) {
          setNews(newsData);
        }

        // Nationale Regulierungen für alle Länder mit hardcodiertem Fallback laden
        const nationalRegsPromises = (countriesData && countriesData.length > 0 ? countriesData : fallbackCountries).map(async (country) => {
          try {
            const regs = await getNationalRegulations(country.code);
            return { code: country.code, regulations: regs && regs.length > 0 ? regs : (fallbackCountryRegulations[country.code] || []) };
          } catch {
            return { code: country.code, regulations: fallbackCountryRegulations[country.code] || [] };
          }
        });

        const nationalRegsResults = await Promise.all(nationalRegsPromises);
        const nationalRegsMap: Record<string, NationalRegulation[]> = {};
        nationalRegsResults.forEach(({ code, regulations }) => {
          if (regulations.length > 0) {
            nationalRegsMap[code] = regulations;
          }
        });

        if (Object.keys(nationalRegsMap).length > 0) {
          setCountryRegulations({ ...fallbackCountryRegulations, ...nationalRegsMap });
        }
      } catch (error) {
        console.error('Fehler beim Laden der Regulierungsdaten:', error);
        // Bei Fehler bleiben die Fallback-Daten aktiv
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
          <p className="text-muted-foreground">Lade Regulierungsdaten...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Regulierungen & Compliance</h1>
          <p className="text-muted-foreground">
            Umfassende Übersicht zu EU- und nationalen Vorschriften, Piktogrammen und aktuellen Entwicklungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Drucken
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
                <p className="text-sm text-muted-foreground">Länder abgedeckt</p>
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
                <p className="text-sm text-muted-foreground">EU-Regulierungen</p>
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
                <p className="text-sm text-muted-foreground">Piktogramme</p>
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
                <p className="text-sm text-muted-foreground">Wichtige Updates</p>
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
            Länder
          </TabsTrigger>
          <TabsTrigger value="eu" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            EU-Regulierungen
          </TabsTrigger>
          <TabsTrigger value="pictograms" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Piktogramme
          </TabsTrigger>
          <TabsTrigger value="news" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            News
          </TabsTrigger>
        </TabsList>

        {/* Länder Tab */}
        <TabsContent value="countries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Länderspezifische Regulierungen</CardTitle>
              <CardDescription>
                Wählen Sie ein Land für detaillierte Compliance-Anforderungen und nationale Besonderheiten
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
                            {country.regulations} Regulierungen
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
                  Regulierungen in {countries.find(c => c.code === selectedCountry)?.name}
                </CardTitle>
                <CardDescription>
                  Detaillierte Übersicht der nationalen Anforderungen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {countryRegulations[selectedCountry].map((reg) => (
                    <AccordionItem key={reg.id} value={reg.id}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-4 text-left">
                          <Badge variant={reg.mandatory ? 'default' : 'secondary'}>
                            {reg.mandatory ? 'Pflicht' : 'Optional'}
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
                              <p className="text-sm font-medium">Zuständige Behörde</p>
                              <p className="text-sm text-muted-foreground">{reg.authority}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">In Kraft seit</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(reg.effectiveDate).toLocaleDateString('de-DE')}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Sanktionen</p>
                              <p className="text-sm text-destructive">{reg.penalties}</p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Betroffene Produkte</p>
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

        {/* EU-Regulierungen Tab */}
        <TabsContent value="eu" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>EU-weite Regulierungen</CardTitle>
                  <CardDescription>
                    Gültig in allen EU-Mitgliedsstaaten - Klicken Sie auf eine Regulierung für Details
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Suchen..."
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
                                {reg.status === 'active' ? 'Aktiv' : 'Kommend'}
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
                            <p className="text-sm font-medium mb-2">Vollständiger Name</p>
                            <p className="text-sm text-muted-foreground">{reg.fullName}</p>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">Beschreibung</p>
                            <p className="text-sm text-muted-foreground">{reg.description}</p>
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <p className="text-sm font-medium mb-2">In Kraft getreten</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(reg.effectiveDate).toLocaleDateString('de-DE')}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium mb-2">Anwendung ab</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(reg.applicationDate).toLocaleDateString('de-DE')}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-2">Wesentliche Anforderungen</p>
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
                            <p className="text-sm font-medium mb-2">Betroffene Produktkategorien</p>
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
                              <p className="text-sm font-medium mb-2">DPP-Fristen</p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Produktkategorie</TableHead>
                                    <TableHead>Frist</TableHead>
                                    <TableHead>Verbleibend</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {Object.entries(reg.dppDeadlines).map(([product, deadline]) => {
                                    const daysRemaining = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                    return (
                                      <TableRow key={product}>
                                        <TableCell>{product}</TableCell>
                                        <TableCell>{new Date(deadline).toLocaleDateString('de-DE')}</TableCell>
                                        <TableCell>
                                          <Badge variant={daysRemaining < 365 ? 'destructive' : 'secondary'}>
                                            {daysRemaining} Tage
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
              <CardTitle>DPP-Timeline: Wichtige Fristen</CardTitle>
              <CardDescription>Übersicht der kommenden Digital Product Passport Deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { date: '2027-02-18', product: 'Batterien (>2kWh)', regulation: 'EU-Batterieverordnung' },
                  { date: '2027-12-31', product: 'Textilien', regulation: 'ESPR' },
                  { date: '2028-08-18', product: 'Alle Batterien', regulation: 'EU-Batterieverordnung' },
                  { date: '2028-12-31', product: 'Elektronik', regulation: 'ESPR' },
                  { date: '2029-06-30', product: 'Möbel', regulation: 'ESPR' },
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
                            {daysRemaining} Tage
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {item.regulation} - {new Date(item.date).toLocaleDateString('de-DE')}
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

        {/* Piktogramme Tab */}
        <TabsContent value="pictograms" className="space-y-6">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={categoryFilter === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCategoryFilter(null)}
            >
              Alle
            </Button>
            {['safety', 'recycling', 'chemicals', 'energy', 'durability'].map((cat) => (
              <Button
                key={cat}
                variant={categoryFilter === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'safety' && 'Sicherheit'}
                {cat === 'recycling' && 'Recycling'}
                {cat === 'chemicals' && 'Chemie'}
                {cat === 'energy' && 'Energie'}
                {cat === 'durability' && 'Haltbarkeit'}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Piktogramme & Symbole</CardTitle>
              <CardDescription>
                Wichtige Kennzeichnungen für Ihre Produkte mit detaillierten Anforderungen
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
                            {pictogram.mandatory ? 'Verpflichtend' : 'Freiwillig'}
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
                        <span className="font-medium text-muted-foreground w-20 shrink-0">Maße:</span>
                        <span>{pictogram.dimensions}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-medium text-muted-foreground w-20 shrink-0">Platzierung:</span>
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
              <CardTitle>Recycling-Codes nach ISO 1043 & 14021</CardTitle>
              <CardDescription>Materialidentifikationscodes für Verpackungen und Produkte</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Kurzzeichen</TableHead>
                    <TableHead>Materialname</TableHead>
                    <TableHead>Beispiele</TableHead>
                    <TableHead>Recycelbar</TableHead>
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
                          <Badge className="bg-success/10 text-success">Ja</Badge>
                        ) : (
                          <Badge variant="secondary">Eingeschränkt</Badge>
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
                  <CardTitle>Aktuelle Neuerungen & Fristen</CardTitle>
                  <CardDescription>
                    Wichtige Updates zu Regulierungen, neue Anforderungen und bevorstehende Deadlines
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Suchen..."
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
                    Wichtig
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
                                  {new Date(item.publishedAt).toLocaleDateString('de-DE')}
                                </span>
                              </div>
                            </div>
                            {item.priority === 'high' && (
                              <Badge variant="destructive">Wichtig</Badge>
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
                                <span className="text-muted-foreground">Gültig ab:</span>
                                <span className="font-medium">
                                  {new Date(item.effectiveDate).toLocaleDateString('de-DE')}
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
                Kommende Fristen (nächste 12 Monate)
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
                            {daysRemaining} Tage
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.effectiveDate!).toLocaleDateString('de-DE')}
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
