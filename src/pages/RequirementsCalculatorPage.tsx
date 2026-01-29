import { useState } from 'react';
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


interface Requirement {
  id: string;
  name: string;
  description: string;
  detailedDescription: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  countries: string[];
  documents: string[];
  registrations: string[];
  symbols: string[];
  deadlines?: string;
  costs?: string;
  authority: string;
  penalties: string;
  tips: string[];
  links?: { title: string; url: string }[];
}

// Umfassende Anforderungsdatenbank
const requirementsDatabase: Requirement[] = [
  // === CE-KENNZEICHNUNG ===
  {
    id: 'ce-marking',
    name: 'CE-Kennzeichnung',
    description: 'Konformitätskennzeichen für den EU-Binnenmarkt',
    detailedDescription: 'Das CE-Zeichen muss auf dem Produkt, der Verpackung oder den Begleitdokumenten angebracht werden. Mindesthöhe 5mm, korrekte Proportionen gemäß Anhang II Beschluss 768/2008/EG.',
    category: 'Produktsicherheit',
    priority: 'critical',
    countries: ['EU', 'DE', 'FR', 'AT', 'IT', 'ES', 'NL', 'BE', 'PL', 'SE', 'DK', 'CZ', 'PT'],
    documents: ['EU-Konformitätserklärung', 'Technische Dokumentation', 'Risikoanalyse'],
    registrations: [],
    symbols: ['CE'],
    authority: 'Marktüberwachungsbehörden',
    penalties: 'Bis zu 100.000 € Bußgeld, Vertriebsverbot, Produktrückruf',
    tips: [
      'CE-Zeichen erst anbringen, wenn alle Richtlinien erfüllt sind',
      'Proportionen und Mindestgröße einhalten',
      'DoC mindestens 10 Jahre aufbewahren',
    ],
    links: [
      { title: 'EU Blue Guide', url: 'https://ec.europa.eu/growth/single-market/goods/blue-guide_en' },
    ],
  },
  {
    id: 'lvd',
    name: 'Niederspannungsrichtlinie (LVD)',
    description: 'Elektrische Sicherheit für 50-1000V AC / 75-1500V DC',
    detailedDescription: 'Prüfung auf elektrische Sicherheit nach relevanten EN-Normen. Schutz gegen elektrischen Schlag, thermische Gefahren, mechanische Gefahren.',
    category: 'Produktsicherheit',
    priority: 'critical',
    countries: ['EU'],
    documents: ['LVD-Prüfbericht', 'Schaltpläne', 'Stückliste'],
    registrations: [],
    symbols: ['CE'],
    authority: 'BAuA, Marktüberwachung',
    penalties: 'Bis zu 100.000 € Bußgeld, Produktrückruf',
    tips: [
      'Prüfung durch akkreditiertes Labor empfohlen',
      'Sicherheitshinweise in Landessprache',
    ],
  },
  {
    id: 'emv',
    name: 'EMV-Richtlinie',
    description: 'Elektromagnetische Verträglichkeit',
    detailedDescription: 'Prüfung auf elektromagnetische Störaussendung und Störfestigkeit. Einhaltung der Grenzwerte für leitungsgebundene und gestrahlte Störungen.',
    category: 'Produktsicherheit',
    priority: 'critical',
    countries: ['EU'],
    documents: ['EMV-Prüfbericht'],
    registrations: [],
    symbols: ['CE'],
    authority: 'Bundesnetzagentur, BAuA',
    penalties: 'Bis zu 100.000 € Bußgeld',
    tips: [
      'EMV früh in der Entwicklung berücksichtigen',
      'Schirmung und Filterung einplanen',
    ],
  },
  {
    id: 'red',
    name: 'Funkanlagenrichtlinie (RED)',
    description: 'Anforderungen für Funkprodukte (WiFi, Bluetooth, etc.)',
    detailedDescription: 'Für alle Geräte mit Funkfunktionen. Umfasst Sicherheit, EMV und effiziente Nutzung des Funkspektrums. Ab 2025 zusätzliche Cybersecurity-Anforderungen.',
    category: 'Produktsicherheit',
    priority: 'critical',
    countries: ['EU'],
    documents: ['RED-Prüfbericht', 'Funkprüfung', 'ggf. SAR-Messung'],
    registrations: [],
    symbols: ['CE', 'Frequenzangabe'],
    authority: 'Bundesnetzagentur',
    penalties: 'Bis zu 500.000 € Bußgeld',
    tips: [
      'Frequenznutzung in Zielländern prüfen',
      'Bei körpernaher Nutzung SAR-Messung',
      'Benannte Stelle bei bestimmten Frequenzen',
    ],
  },

  // === ELEKTROGERÄTE ===
  {
    id: 'weee-de',
    name: 'ElektroG / WEEE Registrierung (DE)',
    description: 'Registrierung bei stiftung ear für Elektrogeräte in Deutschland',
    detailedDescription: 'Vor dem Inverkehrbringen von Elektrogeräten in Deutschland muss eine Registrierung bei der stiftung ear erfolgen. Garantie hinterlegen, Marken registrieren, Mengenmeldungen abgeben.',
    category: 'Elektrogeräte',
    priority: 'critical',
    countries: ['DE'],
    documents: ['ear-Registrierungsbestätigung'],
    registrations: ['stiftung ear'],
    symbols: ['WEEE-Symbol (durchgestrichene Mülltonne)'],
    deadlines: 'Vor erstem Inverkehrbringen',
    costs: 'Registrierungsgebühr + Garantie + Entsorgungsbeiträge',
    authority: 'stiftung ear, UBA',
    penalties: 'Bis zu 100.000 € Bußgeld, Vertriebsverbot',
    tips: [
      'Registrierung vor erstem Verkauf abschließen',
      'WEEE-Nummer auf B2B-Rechnungen',
      'Alle Marken registrieren',
    ],
    links: [
      { title: 'stiftung ear', url: 'https://www.stiftung-ear.de/' },
    ],
  },
  {
    id: 'weee-fr',
    name: 'DEEE Registrierung (FR)',
    description: 'Registrierung bei eco-organisme für Elektrogeräte in Frankreich',
    detailedDescription: 'Registrierung bei ecosystem oder Ecologic. Beitragszahlungen nach Mengen und Produktkategorien.',
    category: 'Elektrogeräte',
    priority: 'critical',
    countries: ['FR'],
    documents: ['REP-Vertrag', 'Unique Identifier'],
    registrations: ['ecosystem', 'Ecologic'],
    symbols: ['WEEE-Symbol', 'Triman'],
    authority: 'ADEME',
    penalties: 'Bis zu 200.000 € Bußgeld',
    tips: [
      'Unique Identifier auf Rechnungen',
      'Öko-Modulation beachten',
    ],
    links: [
      { title: 'ecosystem', url: 'https://www.ecosystem.eco/' },
    ],
  },

  // === BATTERIEN ===
  {
    id: 'battery-de',
    name: 'Batteriegesetz Registrierung (DE)',
    description: 'Registrierung bei stiftung ear für Batterien',
    detailedDescription: 'Registrierung vor Inverkehrbringen von Batterien. Gilt auch für Geräte mit eingebauten Batterien.',
    category: 'Batterien',
    priority: 'critical',
    countries: ['DE'],
    documents: ['BattG-Registrierung', 'Rücknahmesystemvertrag'],
    registrations: ['stiftung ear - Batterien'],
    symbols: ['Batteriesymbol', 'Pb/Cd/Hg wenn zutreffend', 'Kapazitätsangabe'],
    authority: 'stiftung ear, UBA',
    penalties: 'Bis zu 100.000 € Bußgeld, Vertriebsverbot',
    tips: [
      'Auch bei fest eingebauten Batterien',
      'Kapazität in mAh/Ah angeben',
      'Rücknahmesystem wählen (z.B. GRS)',
    ],
  },
  {
    id: 'battery-dpp',
    name: 'Digitaler Batteriepass (EU)',
    description: 'DPP für Industrie- und EV-Batterien ab 2027',
    detailedDescription: 'Ab 18.02.2027 für Batterien >2kWh: Digitaler Produktpass mit QR-Code, enthält Kennung, Materialzusammensetzung, CO2-Fußabdruck, Leistungsparameter.',
    category: 'Batterien',
    priority: 'high',
    countries: ['EU'],
    documents: ['Digitaler Batteriepass', 'CO2-Fußabdruck-Erklärung'],
    registrations: [],
    symbols: ['QR-Code für DPP'],
    deadlines: '18.02.2027',
    authority: 'EU-Kommission',
    penalties: 'Vertriebsverbot',
    tips: [
      'Jetzt mit Datenerfassung beginnen',
      'Technische Spezifikationen beachten',
    ],
  },

  // === VERPACKUNG ===
  {
    id: 'packaging-de',
    name: 'Verpackungsgesetz (DE)',
    description: 'LUCID-Registrierung und Systembeteiligung',
    detailedDescription: 'Registrierung bei LUCID vor Inverkehrbringen. Systembeteiligung bei Dualem System für alle Verkaufsverpackungen bei privaten Endverbrauchern.',
    category: 'Verpackung',
    priority: 'critical',
    countries: ['DE'],
    documents: ['LUCID-Registrierung', 'Systemvertrag'],
    registrations: ['LUCID', 'Duales System'],
    symbols: [],
    authority: 'Zentrale Stelle Verpackungsregister',
    penalties: 'Bis zu 200.000 € Bußgeld, Vertriebsverbot',
    tips: [
      'Erst LUCID, dann Systemvertrag',
      'Mengenmeldungen fristgerecht',
      'Vollständigkeitserklärung ab 80.000 kg',
    ],
    links: [
      { title: 'LUCID', url: 'https://lucid.verpackungsregister.org/' },
    ],
  },
  {
    id: 'packaging-fr',
    name: 'Verpackungs-REP (FR)',
    description: 'CITEO Registrierung für Verpackungen in Frankreich',
    detailedDescription: 'Registrierung bei CITEO oder anderem zugelassenen eco-organisme. Triman-Symbol und Info-tri Kennzeichnung erforderlich.',
    category: 'Verpackung',
    priority: 'critical',
    countries: ['FR'],
    documents: ['REP-Vertrag Verpackung'],
    registrations: ['CITEO', 'Léko'],
    symbols: ['Triman', 'Info-tri'],
    authority: 'ADEME',
    penalties: 'Bis zu 100.000 € Bußgeld',
    tips: [
      'Triman auf Produkt oder Verpackung',
      'Info-tri mit Sortierhinweisen',
    ],
    links: [
      { title: 'CITEO', url: 'https://www.citeo.com/' },
    ],
  },

  // === RoHS ===
  {
    id: 'rohs',
    name: 'RoHS-Konformität',
    description: 'Beschränkung gefährlicher Stoffe in Elektrogeräten',
    detailedDescription: 'Einhaltung der Grenzwerte für 10 beschränkte Stoffe. RoHS-Erklärung ist Teil der EU-Konformitätserklärung.',
    category: 'Chemikalien',
    priority: 'critical',
    countries: ['EU'],
    documents: ['RoHS-Erklärung', 'Materialanalysen', 'Lieferantenerklärungen'],
    registrations: [],
    symbols: [],
    authority: 'BAuA, Marktüberwachung',
    penalties: 'Bis zu 100.000 € Bußgeld, Produktrückruf',
    tips: [
      'Lieferantenerklärungen systematisch einfordern',
      'Stichprobenprüfung durch Labor',
      'Ausnahmen dokumentieren',
    ],
  },

  // === REACH ===
  {
    id: 'reach-svhc',
    name: 'REACH SVHC-Prüfung',
    description: 'Prüfung auf besonders besorgniserregende Stoffe',
    detailedDescription: 'Prüfung auf 230+ SVHC-Stoffe. Bei Gehalt >0,1%: Informationspflicht und SCIP-Meldung.',
    category: 'Chemikalien',
    priority: 'high',
    countries: ['EU'],
    documents: ['SVHC-Analyse', 'SCIP-Meldung', 'Art. 33 Information'],
    registrations: ['SCIP-Datenbank'],
    symbols: [],
    authority: 'ECHA, BAuA',
    penalties: 'Bis zu 50.000 € Bußgeld',
    tips: [
      'Kandidatenliste regelmäßig prüfen',
      'Lieferkette abfragen',
      'SCIP-Meldung vor Inverkehrbringen',
    ],
    links: [
      { title: 'ECHA SCIP', url: 'https://echa.europa.eu/de/scip' },
    ],
  },

  // === ENERGIEKENNZEICHNUNG ===
  {
    id: 'energy-label',
    name: 'EU-Energielabel',
    description: 'Energieeffizienzklassenkennzeichnung',
    detailedDescription: 'Für bestimmte Produktgruppen: Energielabel am POS und EPREL-Registrierung. Label mit QR-Code zur Datenbank.',
    category: 'Energie',
    priority: 'high',
    countries: ['EU'],
    documents: ['Energielabel', 'Produktdatenblatt', 'EPREL-Registrierung'],
    registrations: ['EPREL-Datenbank'],
    symbols: ['EU-Energielabel A-G', 'QR-Code'],
    authority: 'BAM, Marktüberwachung',
    penalties: 'Bis zu 50.000 € Bußgeld',
    tips: [
      'EPREL vor Markteinführung',
      'Label am Produkt und in Werbung',
    ],
    links: [
      { title: 'EPREL', url: 'https://eprel.ec.europa.eu/' },
    ],
  },

  // === FRANKREICH SPEZIFISCH ===
  {
    id: 'repairability-fr',
    name: 'Reparierbarkeitsindex (FR)',
    description: 'Index 0-10 am Point of Sale',
    detailedDescription: 'Für bestimmte Elektronik: Reparierbarkeitsindex (0-10) am POS anzeigen. Bewertet Dokumentation, Demontage, Ersatzteile, Preise.',
    category: 'Nachhaltigkeit',
    priority: 'critical',
    countries: ['FR'],
    documents: ['Reparierbarkeitsindex-Berechnung'],
    registrations: [],
    symbols: ['Reparierbarkeitsindex-Logo mit Wert'],
    authority: 'DGCCRF',
    penalties: 'Bis zu 15.000 € pro Produkt',
    tips: [
      'ADEME-Berechnungstool nutzen',
      'Index auf POS und Online',
      'Farbskala beachten',
    ],
    links: [
      { title: 'ADEME Reparierbarkeit', url: 'https://www.indicereparabilite.fr/' },
    ],
  },
  {
    id: 'spare-parts-fr',
    name: 'Ersatzteilverfügbarkeit (FR)',
    description: 'Information über Verfügbarkeitsdauer am POS',
    detailedDescription: 'Angabe der Dauer der Ersatzteilverfügbarkeit (min. 5-10 Jahre je nach Kategorie). Lieferfrist max. 15 Tage.',
    category: 'Nachhaltigkeit',
    priority: 'high',
    countries: ['FR'],
    documents: [],
    registrations: [],
    symbols: [],
    authority: 'DGCCRF',
    penalties: 'Wettbewerbsverstoß',
    tips: [
      'Verfügbarkeit auf POS und Online',
      'Ersatzteilliste bereithalten',
    ],
  },

  // === TEXTILIEN ===
  {
    id: 'textile-label',
    name: 'Textilkennzeichnung',
    description: 'Faserzusammensetzung in Prozent',
    detailedDescription: 'Angabe der Faserzusammensetzung in absteigender Reihenfolge. Nur standardisierte Faserbezeichnungen gemäß EU-Verordnung 1007/2011.',
    category: 'Textilien',
    priority: 'critical',
    countries: ['EU'],
    documents: [],
    registrations: [],
    symbols: ['Faserkennzeichnung'],
    authority: 'Verbraucherschutz, Marktüberwachung',
    penalties: 'Bis zu 50.000 € Bußgeld',
    tips: [
      'Nur standardisierte Bezeichnungen',
      'Prozentangaben mit Toleranz ±3%',
    ],
  },
  {
    id: 'textile-azodyes',
    name: 'Azofarbstoffe (REACH)',
    description: 'Verbot bestimmter Azofarbstoffe in Textilien',
    detailedDescription: 'Textilien mit Hautkontakt dürfen keine verbotenen Azofarbstoffe enthalten. Grenzwert 30 mg/kg pro Amin.',
    category: 'Textilien',
    priority: 'critical',
    countries: ['EU'],
    documents: ['Azofarbstoff-Prüfbericht'],
    registrations: [],
    symbols: [],
    authority: 'ECHA, Marktüberwachung',
    penalties: 'Vertriebsverbot, Bußgeld',
    tips: [
      'Laborprüfung bei Risikoprodukten',
      'Nur zertifizierte Färbereien',
    ],
  },
];

// Umfassende Produktkategorien mit Unterkategorien
const productCategories = [
  {
    id: 'electronics',
    name: 'Elektronik & IT',
    icon: '💻',
    description: 'Alle elektronischen Geräte und IT-Equipment',
    subcategories: [
      'Smartphone', 'Tablet', 'Laptop', 'Desktop-PC', 'Server', 'Monitor', 'TV/Fernseher',
      'Kopfhörer', 'Lautsprecher', 'Soundbar', 'HiFi-Anlage', 'Mikrofon',
      'Drucker', 'Scanner', 'Router', 'Switch', 'NAS-Speicher',
      'Externes Laufwerk', 'USB-Stick', 'Speicherkarte',
      'Webcam', 'Projektor', 'Digitalkamera', 'Videokamera',
      'Spielkonsole', 'Gaming-PC', 'VR-Headset',
      'Smartwatch', 'Fitness-Tracker', 'E-Reader',
      'IoT-Gerät', 'Smart Speaker', 'Smart Display',
      'Drohne', 'E-Scooter', 'E-Bike Display',
    ],
  },
  {
    id: 'household-electronics',
    name: 'Haushaltsgeräte',
    icon: '🏠',
    description: 'Elektrische Haushaltsgeräte (Weiße Ware, Kleingeräte)',
    subcategories: [
      'Kühlschrank', 'Gefrierschrank', 'Kühl-Gefrier-Kombi',
      'Waschmaschine', 'Trockner', 'Waschtrockner',
      'Geschirrspüler', 'Herd', 'Backofen', 'Mikrowelle',
      'Dunstabzugshaube', 'Induktionskochfeld',
      'Kaffeevollautomat', 'Kaffeemaschine', 'Wasserkocher', 'Toaster',
      'Mixer', 'Küchenmaschine', 'Handmixer', 'Pürierstab',
      'Staubsauger', 'Saugroboter', 'Dampfreiniger',
      'Bügeleisen', 'Dampfbügelstation', 'Nähmaschine',
      'Klimaanlage', 'Ventilator', 'Heizlüfter', 'Luftreiniger',
      'Luftbefeuchter', 'Luftentfeuchter',
      'Haartrockner', 'Glätteisen', 'Lockenstab', 'Haarschneider',
      'Rasierer', 'Epiliergerät', 'Elektrische Zahnbürste',
    ],
  },
  {
    id: 'lighting',
    name: 'Beleuchtung',
    icon: '💡',
    description: 'Leuchtmittel und Leuchten',
    subcategories: [
      'LED-Lampe E27', 'LED-Lampe E14', 'LED-Lampe GU10', 'LED-Lampe G9',
      'LED-Röhre T8', 'LED-Panel', 'LED-Streifen',
      'Halogenlampe', 'Energiesparlampe',
      'Deckenleuchte', 'Wandleuchte', 'Stehlampe', 'Tischlampe',
      'Pendelleuchte', 'Einbaustrahler', 'Außenleuchte',
      'Smart Lighting', 'Smarte Birne', 'Lichtsteuerung',
      'Notbeleuchtung', 'Fluchtwegleuchte', 'Sicherheitsbeleuchtung',
      'UV-Lampe', 'Infrarotlampe', 'Wachstumslampe',
      'Taschenlampe', 'Stirnlampe', 'Arbeitsleuchte',
    ],
  },
  {
    id: 'textiles',
    name: 'Textilien & Mode',
    icon: '👕',
    description: 'Bekleidung, Schuhe und textile Produkte',
    subcategories: [
      'T-Shirt', 'Hemd', 'Bluse', 'Pullover', 'Jacke', 'Mantel',
      'Hose', 'Jeans', 'Rock', 'Kleid', 'Anzug',
      'Unterwäsche', 'Socken', 'Strumpfhose',
      'Sportbekleidung', 'Funktionskleidung', 'Outdoor-Bekleidung',
      'Arbeitskleidung', 'Berufskleidung', 'Schutzkleidung',
      'Kinderbekleidung', 'Babybekleidung',
      'Schuhe', 'Sneaker', 'Stiefel', 'Sandalen', 'Sportschuhe',
      'Taschen', 'Rucksäcke', 'Koffer',
      'Gürtel', 'Schals', 'Mützen', 'Handschuhe',
      'Heimtextilien', 'Bettwäsche', 'Handtücher', 'Vorhänge',
      'Teppiche', 'Matten', 'Polsterbezüge',
      'Technische Textilien', 'Geotextilien', 'Agrartextilien',
    ],
  },
  {
    id: 'toys',
    name: 'Spielzeug',
    icon: '🧸',
    description: 'Spielwaren für alle Altersgruppen',
    subcategories: [
      'Elektronisches Spielzeug', 'Lerncomputer', 'Interaktive Puppen',
      'Ferngesteuertes Auto', 'Drohne (Spielzeug)', 'Roboter',
      'Plüschtiere', 'Stofftiere', 'Puppen',
      'LEGO/Bausteine', 'Konstruktionsspielzeug',
      'Brettspiele', 'Kartenspiele', 'Puzzles',
      'Outdoor-Spielzeug', 'Sandspielzeug', 'Wasserspielzeug',
      'Sportspielzeug', 'Bälle', 'Schaukeln',
      'Musikspielzeug', 'Instrumente (Spielzeug)',
      'Kreativspielzeug', 'Malsets', 'Bastelsets',
      'Lernspielzeug', 'Experimentierkästen', 'MINT-Spielzeug',
      'Baby-Spielzeug', 'Rasseln', 'Beißringe',
      'Spielfahrzeuge', 'Modellautos', 'Eisenbahn',
      'Actionfiguren', 'Sammelfiguren',
      'Kostüme', 'Rollenspiel-Zubehör',
    ],
  },
  {
    id: 'furniture',
    name: 'Möbel & Einrichtung',
    icon: '🛋️',
    description: 'Möbel für Wohn- und Arbeitsbereich',
    subcategories: [
      'Sofa', 'Sessel', 'Stuhl', 'Hocker', 'Bank',
      'Esstisch', 'Couchtisch', 'Schreibtisch', 'Beistelltisch',
      'Kleiderschrank', 'Kommode', 'Sideboard', 'Regal', 'Vitrine',
      'Bett', 'Bettgestell', 'Hochbett', 'Kinderbett',
      'Matratze', 'Lattenrost', 'Topper',
      'Küchenmöbel', 'Küchenzeile', 'Arbeitsplatte',
      'Badmöbel', 'Waschtisch', 'Spiegelschrank',
      'Büromöbel', 'Bürostuhl', 'Konferenztisch',
      'Gartenmöbel', 'Loungemöbel', 'Sonnenliege',
      'Kindermöbel', 'Wickelkommode', 'Kinderschreibtisch',
      'Polstermöbel', 'Schlafsofa', 'Recamiere',
    ],
  },
  {
    id: 'cosmetics',
    name: 'Kosmetik & Körperpflege',
    icon: '💄',
    description: 'Kosmetische Produkte und Körperpflegeartikel',
    subcategories: [
      'Gesichtspflege', 'Tagescreme', 'Nachtcreme', 'Serum',
      'Reinigung', 'Gesichtswasser', 'Peeling', 'Maske',
      'Körperpflege', 'Bodylotion', 'Duschgel', 'Seife',
      'Haarpflege', 'Shampoo', 'Conditioner', 'Haarkur',
      'Styling', 'Haarspray', 'Gel', 'Wachs',
      'Make-up', 'Foundation', 'Concealer', 'Puder',
      'Lippenstift', 'Lipgloss', 'Lipliner',
      'Mascara', 'Eyeliner', 'Lidschatten',
      'Nagellack', 'Nagelpflege',
      'Parfüm', 'Eau de Toilette', 'Deo',
      'Sonnenschutz', 'Selbstbräuner', 'After-Sun',
      'Männerpflege', 'Rasiercreme', 'Aftershave',
      'Babypflege', 'Kinderpflege',
      'Naturkosmetik', 'Biokosmetik',
    ],
  },
  {
    id: 'food-contact',
    name: 'Lebensmittelkontakt',
    icon: '🍽️',
    description: 'Materialien und Gegenstände mit Lebensmittelkontakt',
    subcategories: [
      'Geschirr', 'Teller', 'Schüssel', 'Tasse',
      'Gläser', 'Weingläser', 'Biergläser',
      'Besteck', 'Messer', 'Gabel', 'Löffel',
      'Kochtöpfe', 'Pfannen', 'Auflaufformen',
      'Küchenutensilien', 'Schneidebretter', 'Kochlöffel',
      'Lebensmittelbehälter', 'Vorratsdosen', 'Frischhaltebox',
      'Trinkflaschen', 'Thermoskannen', 'Isolierbecher',
      'Backformen', 'Muffinformen', 'Kuchenformen',
      'Grillzubehör', 'Grillrost', 'Grillzange',
      'Babyflaschen', 'Schnuller', 'Beikostgeschirr',
      'Einweggeschirr', 'Einwegbesteck',
      'Lebensmittelverpackung', 'Folien', 'Beutel',
      'Küchenmaschinen', 'Mixer', 'Entsafter',
    ],
  },
  {
    id: 'batteries',
    name: 'Batterien & Akkus',
    icon: '🔋',
    description: 'Alle Arten von Batterien und Akkumulatoren',
    subcategories: [
      'Gerätebatterie AA', 'Gerätebatterie AAA', 'Gerätebatterie C', 'Gerätebatterie D',
      'Knopfzelle', 'Lithium-Knopfzelle', 'Silberoxid-Knopfzelle',
      '9V-Block', 'Spezialbatterien',
      'Lithium-Ionen-Akku', 'Lithium-Polymer-Akku',
      'NiMH-Akku', 'NiCd-Akku',
      'Powerbank', 'Laptop-Akku', 'Smartphone-Akku',
      'E-Bike-Akku', 'E-Scooter-Akku', 'LMT-Batterie',
      'Starterbatterie (SLI)', 'Motorradbatterie',
      'Industriebatterie', 'USV-Batterie', 'Gabelstapler-Batterie',
      'EV-Batterie', 'Traktionsbatterie',
      'Solarspeicher', 'Heimspeicher',
      'Blei-Säure-Batterie', 'AGM-Batterie', 'Gel-Batterie',
    ],
  },
  {
    id: 'chemicals',
    name: 'Chemikalien & Gemische',
    icon: '🧪',
    description: 'Chemische Stoffe und Zubereitungen',
    subcategories: [
      'Reinigungsmittel', 'Allzweckreiniger', 'Glasreiniger', 'Badreiniger',
      'Waschmittel', 'Vollwaschmittel', 'Colorwaschmittel', 'Weichspüler',
      'Geschirrspülmittel', 'Handspülmittel', 'Maschinenspülmittel',
      'Farben', 'Wandfarbe', 'Holzfarbe', 'Metallfarbe',
      'Lacke', 'Klarlack', 'Buntlack', 'Holzlasur',
      'Verdünner', 'Lösemittel', 'Pinselreiniger',
      'Klebstoffe', 'Holzleim', 'Sekundenkleber', 'Montagekleber',
      'Dichtstoffe', 'Silikon', 'Acryl', 'PU-Schaum',
      'Öle', 'Motoröl', 'Hydrauliköl', 'Schmieröl',
      'Frostschutzmittel', 'Kühlerfrostschutz',
      'Insektizide', 'Pestizide', 'Herbizide',
      'Düngemittel', 'Pflanzenschutzmittel',
      'Industriechemikalien', 'Säuren', 'Laugen',
    ],
  },
  {
    id: 'medical',
    name: 'Medizinprodukte',
    icon: '🏥',
    description: 'Medizinische Geräte und Hilfsmittel',
    subcategories: [
      'Klasse I - Nicht-invasiv', 'Verbandmaterial', 'Kompressionsstrümpfe',
      'Klasse I - Steril', 'Einmalhandschuhe steril',
      'Klasse IIa', 'Blutdruckmessgerät', 'Fieberthermometer', 'Hörgerät',
      'Klasse IIb', 'Beatmungsgerät', 'Infusionspumpe', 'Defibrilator',
      'Klasse III', 'Herzschrittmacher', 'Implantate',
      'IVD Klasse A', 'Schwangerschaftstest', 'Urintest',
      'IVD Klasse B', 'Blutzuckermessgerät',
      'IVD Klasse C', 'HIV-Test', 'Hepatitis-Test',
      'IVD Klasse D', 'Blutgruppenbestimmung',
      'Hilfsmittel', 'Rollator', 'Rollstuhl', 'Gehhilfe',
      'Orthopädische Einlagen', 'Bandagen', 'Orthesen',
    ],
  },
  {
    id: 'construction',
    name: 'Bauprodukte',
    icon: '🏗️',
    description: 'Baumaterialien und Bauprodukte',
    subcategories: [
      'Dämmstoffe', 'Mineralwolle', 'EPS', 'XPS', 'PUR',
      'Fenster', 'Türen', 'Tore',
      'Bodenbeläge', 'Laminat', 'Parkett', 'Vinyl', 'Fliesen',
      'Sanitärprodukte', 'WC', 'Waschbecken', 'Badewanne', 'Dusche',
      'Heizung', 'Heizkörper', 'Fußbodenheizung', 'Wärmepumpe',
      'Elektroinstallation', 'Steckdosen', 'Schalter', 'Kabel',
      'Rohre', 'Fittings', 'Armaturen',
      'Beton', 'Mörtel', 'Estrich',
      'Ziegel', 'Kalksandstein', 'Porenbeton',
      'Holzwerkstoffe', 'OSB', 'MDF', 'Sperrholz',
      'Dachziegel', 'Dachbahnen', 'Dachdämmung',
      'Fassade', 'Putz', 'WDVS',
    ],
  },
  {
    id: 'machinery',
    name: 'Maschinen & Werkzeuge',
    icon: '🔧',
    description: 'Maschinen und elektrische Werkzeuge',
    subcategories: [
      'Bohrmaschine', 'Bohrhammer', 'Schlagbohrmaschine',
      'Winkelschleifer', 'Schwingschleifer', 'Bandschleifer',
      'Kreissäge', 'Stichsäge', 'Kappsäge', 'Kettensäge',
      'Akkuschrauber', 'Schlagschrauber',
      'Kompressor', 'Druckluft-Werkzeug',
      'Schweißgerät', 'Lötstation',
      'Rasenmäher', 'Rasentrimmer', 'Heckenschere',
      'Hochdruckreiniger', 'Nasssauger',
      'Industriemaschine', 'CNC-Maschine', 'Fräse', 'Drehmaschine',
      'Fördertechnik', 'Gabelstapler', 'Hubwagen',
      'Druckluftkompressor', 'Hydraulikpumpe',
      'Messinstrumente', 'Multimeter', 'Oszilloskop',
    ],
  },
  {
    id: 'automotive',
    name: 'Kfz-Teile & Zubehör',
    icon: '🚗',
    description: 'Fahrzeugteile und Autozubehör',
    subcategories: [
      'Reifen', 'Sommerreifen', 'Winterreifen', 'Ganzjahresreifen',
      'Felgen', 'Alufelgen', 'Stahlfelgen',
      'Bremsscheiben', 'Bremsbeläge', 'Bremsflüssigkeit',
      'Ölfilter', 'Luftfilter', 'Kraftstofffilter',
      'Scheinwerfer', 'Rückleuchten', 'Blinker',
      'Auspuff', 'Katalysator', 'Partikelfilter',
      'Batterie', 'Anlasser', 'Lichtmaschine',
      'Kühlerschläuche', 'Keilriemen', 'Zahnriemen',
      'Stoßdämpfer', 'Federn', 'Fahrwerk',
      'Scheibenwischer', 'Scheibenwascher',
      'Innenausstattung', 'Sitzbezüge', 'Fußmatten',
      'Navigation', 'Autoradio', 'Dashcam',
      'Kindersitz', 'Babyschale',
    ],
  },
  {
    id: 'sports',
    name: 'Sport & Freizeit',
    icon: '⚽',
    description: 'Sportgeräte und Freizeitartikel',
    subcategories: [
      'Fahrrad', 'E-Bike', 'Mountainbike', 'Rennrad',
      'Heimtrainer', 'Laufband', 'Crosstrainer', 'Rudergerät',
      'Hanteln', 'Gewichte', 'Kraftstation',
      'Fußball', 'Basketball', 'Volleyball', 'Tennis',
      'Golf', 'Golfschläger', 'Golfbag',
      'Skiausrüstung', 'Ski', 'Skistöcke', 'Skischuhe',
      'Snowboard', 'Snowboardbindung',
      'Schwimmausrüstung', 'Schwimmbrille', 'Neopren',
      'Camping', 'Zelt', 'Schlafsack', 'Isomatte',
      'Wanderausrüstung', 'Wanderschuhe', 'Trekkingstöcke',
      'Angeln', 'Angel', 'Rolle', 'Köder',
      'Reitsport', 'Sattel', 'Reithelm',
      'PSA Sport', 'Helm', 'Protektoren', 'Schienbeinschoner',
    ],
  },
  {
    id: 'packaging',
    name: 'Verpackungen',
    icon: '📦',
    description: 'Verpackungsmaterialien und -lösungen',
    subcategories: [
      'Kartonage', 'Wellpappe', 'Faltschachtel',
      'Kunststoffverpackung', 'Folien', 'Beutel', 'Schalen',
      'Glasverpackung', 'Flaschen', 'Gläser',
      'Metallverpackung', 'Dosen', 'Tuben',
      'Holzverpackung', 'Paletten', 'Kisten',
      'Verbundverpackung', 'Getränkekarton', 'Standbodenbeutel',
      'Schutzverpackung', 'Luftpolsterfolie', 'Füllmaterial',
      'Versandverpackung', 'Versandtasche', 'Versandkarton',
      'Lebensmittelverpackung', 'MAP-Verpackung', 'Vakuumverpackung',
      'Kosmetikverpackung', 'Tiegel', 'Pumspender',
      'Pharmaverpackung', 'Blister', 'Ampullen',
      'Industrieverpackung', 'IBC', 'Fässer',
    ],
  },
  {
    id: 'pet',
    name: 'Tierbedarf',
    icon: '🐕',
    description: 'Heimtierbedarf und Tiernahrung',
    subcategories: [
      'Hundefutter', 'Katzenfutter', 'Vogelfutter',
      'Aquarienbedarf', 'Aquarium', 'Filter', 'Fischfutter',
      'Terraristik', 'Terrarium', 'Reptilienfutter',
      'Kleintierzubehör', 'Käfig', 'Streu',
      'Hundezubehör', 'Leine', 'Halsband', 'Hundebett',
      'Katzenzubehör', 'Kratzbaum', 'Katzenklo', 'Katzenstreu',
      'Spielzeug', 'Kauspielzeug', 'Intelligenzspielzeug',
      'Transportbox', 'Reisezubehör',
      'Pflegeprodukte', 'Shampoo', 'Bürste',
      'Tierpharmazie', 'Ergänzungsfutter', 'Pflegemittel',
    ],
  },
  {
    id: 'garden',
    name: 'Garten & Outdoor',
    icon: '🌳',
    description: 'Gartenbedarf und Outdoor-Produkte',
    subcategories: [
      'Pflanzen', 'Blumen', 'Sträucher', 'Bäume',
      'Samen', 'Saatgut', 'Blumenzwiebeln',
      'Erde', 'Blumenerde', 'Spezialerde',
      'Dünger', 'Mineraldünger', 'Organischer Dünger',
      'Pflanzenschutz', 'Schneckenkorn', 'Unkrautvernichter',
      'Gartenwerkzeug', 'Spaten', 'Harke', 'Gartenschere',
      'Bewässerung', 'Gartenschlauch', 'Sprinkler', 'Tropfbewässerung',
      'Gartenmöbel', 'Gartenbank', 'Pavillon', 'Sonnenschirm',
      'Grill', 'Gasgrill', 'Kohlegrill', 'Elektrogrill',
      'Pool', 'Aufstellpool', 'Poolzubehör',
      'Gartenhaus', 'Gewächshaus', 'Geräteschuppen',
      'Außenbeleuchtung', 'Solarleuchten', 'Wegeleuchten',
    ],
  },
  {
    id: 'office',
    name: 'Büro & Schreibwaren',
    icon: '📎',
    description: 'Bürobedarf und Schreibwaren',
    subcategories: [
      'Schreibgeräte', 'Kugelschreiber', 'Füller', 'Bleistift',
      'Papier', 'Druckerpapier', 'Kopierpapier', 'Briefpapier',
      'Ordner', 'Aktenordner', 'Hängeregister',
      'Mappen', 'Schnellhefter', 'Klarsichthüllen',
      'Klebeband', 'Tesafilm', 'Paketband',
      'Tacker', 'Locher', 'Heftklammern',
      'Kalender', 'Planer', 'Terminbuch',
      'Notizblock', 'Notizbuch', 'Haftnotizen',
      'Präsentationsbedarf', 'Flipchart', 'Whiteboard',
      'Versandbedarf', 'Briefumschläge', 'Versandtaschen',
      'Büroklammern', 'Gummibänder', 'Magnete',
      'Scheren', 'Cutter', 'Schneidegeräte',
    ],
  },
  {
    id: 'jewelry',
    name: 'Schmuck & Uhren',
    icon: '💍',
    description: 'Schmuckwaren, Uhren und Accessoires',
    subcategories: [
      'Ringe', 'Verlobungsringe', 'Eheringe', 'Modeschmuck-Ringe',
      'Halsketten', 'Ketten', 'Anhänger', 'Colliers',
      'Armbänder', 'Armreifen', 'Charm-Armbänder',
      'Ohrringe', 'Ohrstecker', 'Creolen', 'Hänger',
      'Armbanduhren', 'Automatikuhren', 'Quarzuhren', 'Smartwatches',
      'Taschenuhren', 'Wanduhren', 'Wecker',
      'Edelmetallschmuck', 'Goldschmuck', 'Silberschmuck', 'Platinschmuck',
      'Edelsteinschmuck', 'Diamanten', 'Rubine', 'Saphire',
      'Modeschmuck', 'Bijouterie', 'Kostümschmuck',
      'Piercingschmuck', 'Körperschmuck',
      'Manschettenknöpfe', 'Broschen', 'Anstecknadeln',
    ],
  },
  {
    id: 'baby',
    name: 'Baby & Kleinkind',
    icon: '👶',
    description: 'Babyausstattung und Kleinkindprodukte',
    subcategories: [
      'Kinderwagen', 'Buggy', 'Kombikinderwagen', 'Geschwisterwagen',
      'Autositze', 'Babyschale', 'Kindersitz Gruppe 1', 'Kindersitz Gruppe 2/3',
      'Babybetten', 'Stubenwagen', 'Reisebett', 'Beistellbett',
      'Hochstühle', 'Treppenhochstuhl', 'Reisehochstuhl',
      'Babytragen', 'Tragetuch', 'Babytrage', 'Kraxe',
      'Stillzubehör', 'Stillkissen', 'Milchpumpe', 'Stilleinlagen',
      'Babyflaschen', 'Sauger', 'Flaschenwärmer', 'Sterilisator',
      'Windeln', 'Einwegwindeln', 'Stoffwindeln', 'Schwimmwindeln',
      'Babypflege', 'Wickelauflage', 'Badewanne', 'Pflegeprodukte',
      'Babykleidung', 'Strampler', 'Bodies', 'Schlafsäcke',
      'Laufgitter', 'Türschutzgitter', 'Treppenschutzgitter',
      'Babyphone', 'Babykamera', 'Sensormatten',
    ],
  },
  {
    id: 'food',
    name: 'Lebensmittel & Getränke',
    icon: '🍎',
    description: 'Nahrungsmittel und Getränke (verpackt)',
    subcategories: [
      'Grundnahrungsmittel', 'Mehl', 'Zucker', 'Reis', 'Nudeln',
      'Konserven', 'Gemüsekonserven', 'Obstkonserven', 'Fischkonserven',
      'Tiefkühlware', 'TK-Gemüse', 'TK-Obst', 'TK-Fertiggerichte',
      'Milchprodukte', 'Milch', 'Joghurt', 'Käse', 'Butter',
      'Fleisch & Wurst', 'Frischfleisch', 'Wurstwaren', 'Aufschnitt',
      'Backwaren', 'Brot', 'Brötchen', 'Kuchen', 'Gebäck',
      'Süßwaren', 'Schokolade', 'Bonbons', 'Kekse',
      'Snacks', 'Chips', 'Nüsse', 'Trockenfrüchte',
      'Getränke', 'Wasser', 'Säfte', 'Limonaden',
      'Alkoholische Getränke', 'Bier', 'Wein', 'Spirituosen',
      'Kaffee & Tee', 'Kaffeebohnen', 'Teebeutel', 'Instantkaffee',
      'Bio-Lebensmittel', 'Vegane Produkte', 'Glutenfreie Produkte',
      'Babynahrung', 'Säuglingsmilch', 'Babybrei',
      'Nahrungsergänzung', 'Vitamine', 'Mineralstoffe', 'Proteinpulver',
    ],
  },
  {
    id: 'psa',
    name: 'PSA - Schutzausrüstung',
    icon: '🦺',
    description: 'Persönliche Schutzausrüstung',
    subcategories: [
      'Kopfschutz', 'Schutzhelm', 'Anstoßkappe', 'Haarschutz',
      'Augenschutz', 'Schutzbrille', 'Vollsichtbrille', 'Gesichtsschild',
      'Gehörschutz', 'Ohrstöpsel', 'Kapselgehörschutz', 'Bügelgehörschutz',
      'Atemschutz', 'FFP-Masken', 'Halbmasken', 'Vollmasken', 'Gebläseatemschutz',
      'Handschutz', 'Arbeitshandschuhe', 'Chemikalienschutz', 'Schnittschutz',
      'Fußschutz', 'Sicherheitsschuhe S1-S3', 'Gummistiefel', 'Überschuhe',
      'Körperschutz', 'Warnweste', 'Schweißerschutz', 'Hitzeschutz',
      'Fallschutz', 'Auffanggurt', 'Sicherheitsseil', 'Höhensicherung',
      'Knieschutz', 'Knieschoner', 'Kniematte',
      'Arbeitskleidung', 'Bundhose', 'Latzhose', 'Arbeitsjacke',
      'Einwegschutz', 'Einwegoverall', 'Einweghandschuhe', 'Überzieher',
    ],
  },
  {
    id: 'optics',
    name: 'Optik & Fotografie',
    icon: '📷',
    description: 'Optische Geräte und Fotozubehör',
    subcategories: [
      'Brillen', 'Korrektionsbrille', 'Sonnenbrille', 'Lesebrille',
      'Kontaktlinsen', 'Tageslinsen', 'Monatslinsen', 'Pflegemittel',
      'Kameras', 'DSLR', 'Systemkamera', 'Kompaktkamera', 'Actioncam',
      'Objektive', 'Weitwinkel', 'Tele', 'Makro', 'Festbrennweite',
      'Stative', 'Dreibeinstativ', 'Einbeinstativ', 'Gimbal',
      'Blitzgeräte', 'Aufsteckblitz', 'Studioblitz', 'Dauerlicht',
      'Ferngläser', 'Feldstecher', 'Opernglas', 'Monokular',
      'Teleskope', 'Refraktor', 'Reflektor', 'Spektiv',
      'Mikroskope', 'Lichtmikroskop', 'USB-Mikroskop', 'Stereomikroskop',
      'Lupen', 'Handlupe', 'Standlupe', 'Leuchtlupe',
      'Fotozubehör', 'Kamerataschen', 'Filter', 'Speicherkarten',
    ],
  },
  {
    id: 'music',
    name: 'Musikinstrumente',
    icon: '🎸',
    description: 'Musikinstrumente und Zubehör',
    subcategories: [
      'Gitarren', 'Akustikgitarre', 'E-Gitarre', 'Bassgitarre', 'Ukulele',
      'Tasteninstrumente', 'Klavier', 'Keyboard', 'Synthesizer', 'E-Piano',
      'Blasinstrumente', 'Flöte', 'Klarinette', 'Saxophon', 'Trompete',
      'Streichinstrumente', 'Violine', 'Cello', 'Kontrabass',
      'Schlaginstrumente', 'Schlagzeug', 'E-Drums', 'Percussion', 'Cajon',
      'DJ-Equipment', 'Plattenspieler', 'DJ-Controller', 'Mixer',
      'Verstärker', 'Gitarrenverstärker', 'Bassverstärker', 'PA-Anlage',
      'Mikrofone', 'Gesangsmikrofon', 'Instrumentenmikrofon', 'USB-Mikrofon',
      'Aufnahme', 'Audio-Interface', 'Mischpult', 'Monitore',
      'Zubehör', 'Saiten', 'Plektren', 'Notenständer', 'Koffer',
    ],
  },
  {
    id: 'heating-cooling',
    name: 'Heizung & Klima',
    icon: '🌡️',
    description: 'Heizungs- und Klimatechnik',
    subcategories: [
      'Heizkessel', 'Gasheizung', 'Ölheizung', 'Pelletheizung',
      'Wärmepumpen', 'Luft-Wasser', 'Sole-Wasser', 'Wasser-Wasser',
      'Heizkörper', 'Flachheizkörper', 'Röhrenheizkörper', 'Designheizkörper',
      'Fußbodenheizung', 'Warmwasser-FB', 'Elektrische FB', 'Dünnschicht-FB',
      'Klimaanlagen', 'Split-Klimagerät', 'Mobiles Klimagerät', 'Multisplit',
      'Lüftung', 'Lüftungsanlage', 'Wärmerückgewinnung', 'Abluftventilator',
      'Kamine & Öfen', 'Kaminofen', 'Pelletofen', 'Kachelofen',
      'Solarthermie', 'Sonnenkollektoren', 'Warmwasserspeicher',
      'Thermostate', 'Raumthermostat', 'Smart Thermostat', 'Heizkörperthermostat',
      'Warmwasserbereiter', 'Durchlauferhitzer', 'Boiler', 'Warmwasserspeicher',
    ],
  },
  {
    id: 'security',
    name: 'Sicherheitstechnik',
    icon: '🔒',
    description: 'Sicherheits- und Überwachungstechnik',
    subcategories: [
      'Alarmanlagen', 'Funk-Alarmanlage', 'Kabel-Alarmanlage', 'Smart-Alarm',
      'Überwachungskameras', 'IP-Kamera', 'Analog-Kamera', 'PTZ-Kamera',
      'Videorekorder', 'NVR', 'DVR', 'Cloud-Speicher',
      'Bewegungsmelder', 'PIR-Melder', 'Mikrowellen-Melder', 'Dual-Melder',
      'Türklingeln', 'Video-Türklingel', 'Gegensprechanlage', 'Smart-Klingel',
      'Schlösser', 'Türschloss', 'Smart-Lock', 'Zylinder',
      'Tresore', 'Möbeltresor', 'Wandtresor', 'Dokumententresor',
      'Rauchmelder', 'Ionisationsmelder', 'Optischer Melder', 'Dual-Melder',
      'CO-Melder', 'Gasmelder', 'Wassermelder',
      'Zutrittskontrolle', 'Kartenleser', 'Fingerprint', 'Codeschloss',
    ],
  },
  {
    id: 'renewable',
    name: 'Erneuerbare Energien',
    icon: '☀️',
    description: 'Solar, Wind und Energiespeicher',
    subcategories: [
      'Solarmodule', 'Monokristallin', 'Polykristallin', 'Dünnschicht',
      'Wechselrichter', 'String-Wechselrichter', 'Hybrid-Wechselrichter', 'Mikro-Wechselrichter',
      'Batteriespeicher', 'Lithium-Speicher', 'Blei-Speicher', 'Salzwasser-Speicher',
      'Montagesysteme', 'Aufdach', 'Indach', 'Flachdach', 'Freifläche',
      'Balkonkraftwerk', 'Stecker-Solar', 'Mini-PV',
      'Solarthermie', 'Flachkollektoren', 'Röhrenkollektoren',
      'Kleinwindanlagen', 'Vertikalachser', 'Horizontalachser',
      'Energiemanagement', 'Smart Meter', 'Energiemonitor', 'Lastmanagement',
      'Wallbox', 'AC-Wallbox', 'DC-Schnelllader', 'Mobile Ladestation',
      'Kabel & Zubehör', 'Solarkabel', 'Stecker', 'Überspannungsschutz',
    ],
  },
  {
    id: 'agriculture',
    name: 'Landwirtschaft',
    icon: '🚜',
    description: 'Landwirtschaftliche Produkte und Maschinen',
    subcategories: [
      'Traktoren', 'Kompakttraktor', 'Standardtraktor', 'Schmalspurtraktor',
      'Anbaugeräte', 'Pflug', 'Egge', 'Sämaschine', 'Düngerstreuer',
      'Erntemaschinen', 'Mähdrescher', 'Feldhäcksler', 'Kartoffelroder',
      'Futtermittel', 'Kraftfutter', 'Raufutter', 'Mineralfutter',
      'Saatgut', 'Getreidesaatgut', 'Gemüsesaatgut', 'Grassaat',
      'Düngemittel', 'Stickstoffdünger', 'Phosphatdünger', 'Kalidünger',
      'Pflanzenschutz', 'Herbizide', 'Fungizide', 'Insektizide',
      'Bewässerung', 'Beregnungsanlage', 'Tropfbewässerung', 'Pumpen',
      'Stalleinrichtung', 'Melkanlage', 'Fütterungssystem', 'Entmistung',
      'Landwirtschaftliche Gebäude', 'Gewächshaus', 'Stall', 'Lagerhalle',
    ],
  },
  {
    id: 'cleaning',
    name: 'Reinigung & Hygiene',
    icon: '🧹',
    description: 'Reinigungsgeräte und Hygieneartikel',
    subcategories: [
      'Reinigungsgeräte', 'Besen', 'Wischmopp', 'Eimer', 'Abzieher',
      'Reinigungsmittel', 'Allzweckreiniger', 'Spezialreiniger', 'Desinfektionsmittel',
      'Gewerbliche Reinigung', 'Scheuersaugmaschine', 'Kehrmaschine', 'Poliermaschine',
      'Müllentsorgung', 'Mülleimer', 'Müllsäcke', 'Abfallbehälter',
      'Toilettenartikel', 'Toilettenpapier', 'Papiertücher', 'Seifenspender',
      'Handpflege', 'Handseife', 'Desinfektionsgel', 'Handcreme',
      'Wäschepflege', 'Waschmittel', 'Weichspüler', 'Fleckentferner',
      'Raumdüfte', 'Lufterfrischer', 'Duftkerzen', 'Diffusor',
      'Einwegartikel', 'Einweghandschuhe', 'Wischtücher', 'Schwämme',
      'Hygienebehälter', 'Damenhygiene', 'Wickelstation-Zubehör',
    ],
  },
];

// Länder
const countries = [
  { code: 'DE', name: 'Deutschland', flag: '🇩🇪' },
  { code: 'FR', name: 'Frankreich', flag: '🇫🇷' },
  { code: 'AT', name: 'Österreich', flag: '🇦🇹' },
  { code: 'IT', name: 'Italien', flag: '🇮🇹' },
  { code: 'ES', name: 'Spanien', flag: '🇪🇸' },
  { code: 'NL', name: 'Niederlande', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgien', flag: '🇧🇪' },
  { code: 'PL', name: 'Polen', flag: '🇵🇱' },
  { code: 'SE', name: 'Schweden', flag: '🇸🇪' },
  { code: 'DK', name: 'Dänemark', flag: '🇩🇰' },
  { code: 'CZ', name: 'Tschechien', flag: '🇨🇿' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
];

// Umfassende Verpackungsmaterialien mit detaillierten Erklärungen
// Nach DIN EN ISO 1043-1, DIN EN ISO 11469 und Entscheidung 97/129/EG
const packagingMaterials = [
  // === KUNSTSTOFFE (01-07) ===
  // Die Codes 01-07 sind international standardisiert für Recycling
  {
    id: 'plastic-pet',
    name: 'PET - Polyethylenterephthalat',
    code: '♳ 01 PET',
    category: 'Kunststoff',
    description: 'Klarer, transparenter Kunststoff. Sehr gute Barriere gegen Gase.',
    examples: 'Getränkeflaschen, Lebensmittelverpackungen, Obstschalen, Folien',
    recyclable: true,
    recyclingHinweis: 'Gut recycelbar, wird zu Fasern, Folien oder neuen Flaschen (rPET)',
    erkennungsmerkmal: 'Klar, leicht bläulich, beim Biegen weißlich',
  },
  {
    id: 'plastic-hdpe',
    name: 'HDPE - Polyethylen hoher Dichte',
    code: '♴ 02 HDPE',
    category: 'Kunststoff',
    description: 'Steifer, undurchsichtiger Kunststoff. Chemisch beständig.',
    examples: 'Milchflaschen, Reinigungsmittelflaschen, Shampooflaschen, Einkaufstüten',
    recyclable: true,
    recyclingHinweis: 'Gut recycelbar zu Rohren, Paletten, Mülleimern',
    erkennungsmerkmal: 'Undurchsichtig, wachsartige Oberfläche, steif',
  },
  {
    id: 'plastic-pvc',
    name: 'PVC - Polyvinylchlorid',
    code: '♵ 03 PVC',
    category: 'Kunststoff',
    description: 'Hart oder weich. Enthält Chlor. Problematisch beim Recycling.',
    examples: 'Rohre, Fensterrahmen, Kabel, Blisterverpackungen, Folien',
    recyclable: false,
    recyclingHinweis: 'Schwer recycelbar, stört Kunststoffrecycling, oft thermische Verwertung',
    erkennungsmerkmal: 'Hart-PVC: steif, glänzend. Weich-PVC: flexibel, oft Geruch nach Weichmacher',
  },
  {
    id: 'plastic-ldpe',
    name: 'LDPE - Polyethylen niedriger Dichte',
    code: '♶ 04 LDPE',
    category: 'Kunststoff',
    description: 'Flexibler, dehnbarer Kunststoff. Gute Feuchtigkeitsbarriere.',
    examples: 'Plastiktüten, Schrumpffolien, Squeeze-Flaschen, Gefrierbeutel, Frischhaltefolie',
    recyclable: true,
    recyclingHinweis: 'Recycelbar zu Folien, Müllbeuteln, Bodenbelägen',
    erkennungsmerkmal: 'Dünn, flexibel, knistert beim Anfassen, durchscheinend',
  },
  {
    id: 'plastic-pp',
    name: 'PP - Polypropylen',
    code: '♷ 05 PP',
    category: 'Kunststoff',
    description: 'Hitzebeständig, chemisch resistent. Gute mechanische Eigenschaften.',
    examples: 'Joghurtbecher, Margarinedosen, Verschlüsse, Mikrowellenbehälter, Strohhalme',
    recyclable: true,
    recyclingHinweis: 'Gut recycelbar zu Autoteilen, Kisten, Paletten',
    erkennungsmerkmal: 'Steif aber flexibel, leichtes "Knacken" beim Biegen, hitzebeständig',
  },
  {
    id: 'plastic-ps',
    name: 'PS - Polystyrol',
    code: '♸ 06 PS',
    category: 'Kunststoff',
    description: 'Als Hartkunststoff (GPPS) oder geschäumt (EPS/Styropor). Spröde.',
    examples: 'Styroporverpackung, Einweggeschirr, CD-Hüllen, Joghurtbecher',
    recyclable: false,
    recyclingHinweis: 'Technisch recycelbar, aber oft zu voluminös. Meist thermische Verwertung',
    erkennungsmerkmal: 'Hart-PS: glasartig, zerbricht splitternd. EPS: geschäumt, sehr leicht',
  },
  {
    id: 'plastic-other',
    name: 'O - Andere Kunststoffe',
    code: '♹ 07 O',
    category: 'Kunststoff',
    description: 'Alle anderen Kunststoffe oder Mischungen (PC, PA, ABS, PMMA, etc.)',
    examples: 'Mehrschichtfolien, Elektronikgehäuse, Spielzeug, CDs, Wasserspender',
    recyclable: false,
    recyclingHinweis: 'Meist nicht recycelbar wegen unbekannter Zusammensetzung',
    erkennungsmerkmal: 'Sehr unterschiedlich je nach Material',
  },
  // Zusätzliche Biokunststoffe
  {
    id: 'plastic-pla',
    name: 'PLA - Polymilchsäure (Biokunststoff)',
    code: '07 PLA',
    category: 'Biokunststoff',
    description: 'Biobasierter Kunststoff aus Maisstärke. Kompostierbar unter Industriebedingungen.',
    examples: 'Einweggeschirr, Becher, Verpackungsfolien, 3D-Druck',
    recyclable: false,
    recyclingHinweis: 'NICHT im Kunststoffrecycling! Industrielle Kompostierung oder Restmüll',
    erkennungsmerkmal: 'Klar, ähnlich PET, aber spröder, zersetzt sich bei Hitze',
  },

  // === PAPIER UND PAPPE (20-22) ===
  {
    id: 'pap-20',
    name: 'PAP 20 - Wellpappe',
    code: 'PAP 20',
    category: 'Papier/Pappe',
    description: 'Mehrlagige Pappe mit Wellenstruktur zwischen Deckbahnen. Sehr stabil.',
    examples: 'Versandkartons, Umzugskartons, Palettenverpackungen, Displays',
    recyclable: true,
    recyclingHinweis: 'Sehr gut recycelbar, einer der wertvollsten Altpapierströme',
    erkennungsmerkmal: 'Sichtbare Wellenstruktur im Querschnitt, ein- oder mehrwellig',
  },
  {
    id: 'pap-21',
    name: 'PAP 21 - Sonstige Pappe',
    code: 'PAP 21',
    category: 'Papier/Pappe',
    description: 'Nicht-gewellte Pappe. Faltschachteln, Vollpappe.',
    examples: 'Faltschachteln, Cerealienpackungen, Schuhkartons, Pizzakartons (unverschmutzt)',
    recyclable: true,
    recyclingHinweis: 'Gut recycelbar, aber ohne Beschichtung/Verschmutzung',
    erkennungsmerkmal: 'Keine Wellen, gleichmäßige Dicke, grau oder braun',
  },
  {
    id: 'pap-22',
    name: 'PAP 22 - Papier',
    code: 'PAP 22',
    category: 'Papier/Pappe',
    description: 'Normales Papier ohne Beschichtung.',
    examples: 'Zeitungen, Zeitschriften, Büropapier, Papiertüten, Seidenpapier',
    recyclable: true,
    recyclingHinweis: 'Sehr gut recycelbar, bis zu 6x wiederverwendbar',
    erkennungsmerkmal: 'Dünn, reißt leicht, keine Beschichtung',
  },

  // === METALLE (40-41) ===
  {
    id: 'metal-fe',
    name: 'FE 40 - Stahl / Weißblech',
    code: 'FE 40',
    category: 'Metall',
    description: 'Verzinnter Stahl (Weißblech) oder unverzinnter Stahl.',
    examples: 'Konservendosen, Getränkedosen, Fässer, Kronkorken, Metalleimer',
    recyclable: true,
    recyclingHinweis: 'Unendlich recycelbar ohne Qualitätsverlust, magnetisch sortierbar',
    erkennungsmerkmal: 'Magnetisch (Magnet bleibt haften), schwerer als Aluminium',
  },
  {
    id: 'metal-alu',
    name: 'ALU 41 - Aluminium',
    code: 'ALU 41',
    category: 'Metall',
    description: 'Leichtes, korrosionsbeständiges Metall.',
    examples: 'Getränkedosen, Alufolie, Deckel, Tuben, Aerosoldosen, Menüschalen',
    recyclable: true,
    recyclingHinweis: 'Unendlich recycelbar, Recycling spart 95% Energie gegenüber Neuproduktion',
    erkennungsmerkmal: 'Nicht magnetisch, leicht, silbrig glänzend',
  },

  // === HOLZ (50-51) ===
  {
    id: 'wood-for50',
    name: 'FOR 50 - Holz (unbehandelt)',
    code: 'FOR 50',
    category: 'Holz',
    description: 'Naturbelassenes, nicht imprägniertes Holz.',
    examples: 'Holzpaletten (unbehandelt), Holzkisten, Obststeigen, Holzwolle',
    recyclable: true,
    recyclingHinweis: 'Stoffliche Verwertung oder thermische Verwertung',
    erkennungsmerkmal: 'Natürliche Holzfarbe, kein Geruch nach Chemikalien',
  },
  {
    id: 'wood-for51',
    name: 'FOR 51 - Kork',
    code: 'FOR 51',
    category: 'Holz',
    description: 'Rinde der Korkeiche, nachwachsender Rohstoff.',
    examples: 'Weinkorken, Korkböden, Pinnwände, Dichtungen',
    recyclable: true,
    recyclingHinweis: 'Gut recycelbar zu Granulat für Dämmung, Böden etc.',
    erkennungsmerkmal: 'Leicht, elastisch, wabenförmige Struktur',
  },

  // === TEXTILIEN (60-69) ===
  {
    id: 'tex-60',
    name: 'TEX 60 - Baumwolle',
    code: 'TEX 60',
    category: 'Textil',
    description: 'Naturfaser aus der Baumwollpflanze.',
    examples: 'Textilverpackung, Baumwollbeutel, Polstermaterial',
    recyclable: true,
    recyclingHinweis: 'Stofflich oder als Putzlappen verwertbar',
    erkennungsmerkmal: 'Weich, saugfähig, natürlich',
  },
  {
    id: 'tex-61',
    name: 'TEX 61 - Jute',
    code: 'TEX 61',
    category: 'Textil',
    description: 'Naturfaser, robust und reißfest.',
    examples: 'Jutesäcke, Kaffeesäcke, Geschenkbeutel',
    recyclable: true,
    recyclingHinweis: 'Kompostierbar oder stofflich verwertbar',
    erkennungsmerkmal: 'Grobe Struktur, braun, leicht kratzig',
  },

  // === GLAS (70-72) ===
  {
    id: 'glass-gl70',
    name: 'GL 70 - Farbloses Glas',
    code: 'GL 70',
    category: 'Glas',
    description: 'Transparentes, klares Glas ohne Einfärbung.',
    examples: 'Lebensmittelgläser, Arzneimittelflaschen, Kosmetikflaschen',
    recyclable: true,
    recyclingHinweis: 'Unendlich recycelbar, muss getrennt von farbigem Glas gesammelt werden',
    erkennungsmerkmal: 'Völlig transparent, klar',
  },
  {
    id: 'glass-gl71',
    name: 'GL 71 - Grünes Glas',
    code: 'GL 71',
    category: 'Glas',
    description: 'Grün eingefärbtes Glas, UV-Schutz.',
    examples: 'Weinflaschen, Bierflaschen, einige Mineralwasserflaschen',
    recyclable: true,
    recyclingHinweis: 'In Grünglas-Container, kann auch Braunglas aufnehmen',
    erkennungsmerkmal: 'Grüne Färbung, verschiedene Grüntöne',
  },
  {
    id: 'glass-gl72',
    name: 'GL 72 - Braunes Glas',
    code: 'GL 72',
    category: 'Glas',
    description: 'Braun eingefärbtes Glas, bester Lichtschutz.',
    examples: 'Bierflaschen, Medikamentenflaschen, einige Lebensmittelgläser',
    recyclable: true,
    recyclingHinweis: 'In Braunglas-Container (oder Grünglas)',
    erkennungsmerkmal: 'Braune Färbung, von hellbraun bis dunkelbraun',
  },

  // === VERBUNDMATERIALIEN (80-99) ===
  {
    id: 'composite-c-pap',
    name: 'C/PAP - Verbund mit Papier',
    code: 'C/PAP',
    category: 'Verbund',
    description: 'Papier/Pappe als Hauptkomponente mit anderen Materialien.',
    examples: 'Getränkekartons (Tetra Pak), beschichtete Kartons, Papier mit Kunststoffbeschichtung',
    recyclable: true,
    recyclingHinweis: 'In vielen Regionen über Gelbe Tonne/Sack recycelbar, Papierfasern werden zurückgewonnen',
    erkennungsmerkmal: 'Fühlt sich wie Karton an, aber innen glänzend beschichtet',
  },
  {
    id: 'composite-c-ldpe',
    name: 'C/LDPE - Verbundfolie mit LDPE',
    code: 'C/LDPE',
    category: 'Verbund',
    description: 'Mehrschichtfolie mit LDPE und anderen Kunststoffen oder Aluminium.',
    examples: 'Chipstüten, Standbodenbeutel, Kaffeeverpackungen, Käseverpackungen',
    recyclable: false,
    recyclingHinweis: 'Meist nicht stofflich recycelbar, thermische Verwertung',
    erkennungsmerkmal: 'Metallisch glänzend innen, knistert, mehrere Schichten sichtbar',
  },
  {
    id: 'composite-c-alu',
    name: 'C/ALU - Verbund mit Aluminium',
    code: 'C/ALU',
    category: 'Verbund',
    description: 'Materialverbund mit Aluminium, oft für Barriereverpackungen.',
    examples: 'Blisterpackungen, Kaffee-Kapseln, Deckelfolien, Tube mit Alubeschichtung',
    recyclable: false,
    recyclingHinweis: 'Schwer recycelbar, Aluminium schwer trennbar',
    erkennungsmerkmal: 'Silbrig glänzend, Aluminium fühlbar',
  },

  // === SONSTIGE ===
  {
    id: 'ceramic',
    name: 'Keramik / Porzellan',
    code: 'keine',
    category: 'Sonstige',
    description: 'Gebrannte Tonware oder Porzellan.',
    examples: 'Keramikdosen, Porzellangefäße, Tonkrüge',
    recyclable: false,
    recyclingHinweis: 'Nicht recycelbar im Glaskreislauf! Restmüll oder Bauschutt',
    erkennungsmerkmal: 'Hart, undurchsichtig, klingt beim Klopfen',
  },
  {
    id: 'styrofoam-eps',
    name: 'EPS - Expandiertes Polystyrol (Styropor)',
    code: '♸ 06 PS',
    category: 'Kunststoff',
    description: 'Geschäumtes Polystyrol, extrem leicht.',
    examples: 'Transportschutz, Isolierboxen, Formteile, Dämmung',
    recyclable: true,
    recyclingHinweis: 'Recycelbar bei sauberer Trennung, oft Sammelstellen',
    erkennungsmerkmal: 'Sehr leicht, weiß, bröckelt, quietscht beim Reiben',
  },
  {
    id: 'foam-epp',
    name: 'EPP - Expandiertes Polypropylen',
    code: '♷ 05 PP',
    category: 'Kunststoff',
    description: 'Geschäumtes PP, elastisch und stoßdämpfend.',
    examples: 'Automobil-Stoßdämpfer, Mehrwegverpackungen, Schutzhüllen',
    recyclable: true,
    recyclingHinweis: 'Recycelbar, wird oft als Mehrweglösung eingesetzt',
    erkennungsmerkmal: 'Ähnlich wie Styropor aber elastischer, federt zurück',
  },
  {
    id: 'bubble-wrap',
    name: 'Luftpolsterfolie (PE)',
    code: '♴ 02 HDPE / ♶ 04 LDPE',
    category: 'Kunststoff',
    description: 'PE-Folie mit eingeschlossenen Luftkammern.',
    examples: 'Schutzverpackung, Polstermaterial',
    recyclable: true,
    recyclingHinweis: 'Recycelbar als PE, Luft entweichen lassen vor Entsorgung',
    erkennungsmerkmal: 'Durchsichtig, Luftblasen sichtbar, lässt sich platzen',
  },
  {
    id: 'shrink-wrap',
    name: 'Schrumpffolie (PE/PVC/PET)',
    code: 'je nach Material',
    category: 'Kunststoff',
    description: 'Folie die sich beim Erwärmen zusammenzieht.',
    examples: 'Palettensicherung, Gebindeverpackung, Versiegelung',
    recyclable: true,
    recyclingHinweis: 'Je nach Material, PE am besten recycelbar',
    erkennungsmerkmal: 'Straff gespannt, eng anliegend an Produkt',
  },
  {
    id: 'stretch-wrap',
    name: 'Stretchfolie (LLDPE)',
    code: '♶ 04 LLDPE',
    category: 'Kunststoff',
    description: 'Sehr dehnbare Folie für Ladungssicherung.',
    examples: 'Palettenwicklung, Bündelung, Transportschutz',
    recyclable: true,
    recyclingHinweis: 'Gut recycelbar, oft gewerbliche Sammlung',
    erkennungsmerkmal: 'Stark dehnbar, klebrig, transparent',
  },
  {
    id: 'fill-material',
    name: 'Füllmaterial (Papier/Kunststoff)',
    code: 'je nach Material',
    category: 'Sonstige',
    description: 'Polster- und Füllmaterial verschiedener Art.',
    examples: 'Packpapier, Chips, Luftpolster, Papierschnitzel',
    recyclable: true,
    recyclingHinweis: 'Nach Material trennen und entsprechend entsorgen',
    erkennungsmerkmal: 'Loses Material zur Hohlraumfüllung',
  },
  {
    id: 'desiccant',
    name: 'Trockenmittel (Silicagel)',
    code: 'keine',
    category: 'Sonstige',
    description: 'Feuchtigkeitsbinder in kleinen Beuteln.',
    examples: 'Beipack in Verpackungen, Schuhe, Elektronik',
    recyclable: false,
    recyclingHinweis: 'Restmüll, kann regeneriert werden aber nicht haushaltsüblich',
    erkennungsmerkmal: 'Kleine Beutel mit Kügelchen, "Do not eat"',
  },
];

// Wireless-Typen
const wirelessTypes = [
  { id: 'wifi', name: 'WiFi (2.4/5/6 GHz)' },
  { id: 'bluetooth', name: 'Bluetooth' },
  { id: 'zigbee', name: 'Zigbee' },
  { id: 'zwave', name: 'Z-Wave' },
  { id: 'lora', name: 'LoRa/LoRaWAN' },
  { id: 'lte', name: 'LTE/4G' },
  { id: '5g', name: '5G' },
  { id: 'nfc', name: 'NFC' },
  { id: 'rfid', name: 'RFID' },
  { id: 'uwb', name: 'UWB (Ultra-Wideband)' },
];

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
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
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
        </div>
      )}
    </div>
  );
}
