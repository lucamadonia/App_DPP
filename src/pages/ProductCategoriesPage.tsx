import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Package,
  FileText,
  ShieldCheck,
  Zap,
  Globe,
  Tag,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { getCategories } from '@/services/api';
import type { Category } from '@/types/database';

// Fallback-Daten für den Fall, dass die API nicht erreichbar ist
const fallbackCategories: Category[] = [
  {
    id: 'electronics',
    name: 'Elektronik & IT',
    icon: '💻',
    description: 'Alle elektronischen Geräte und IT-Equipment',
    regulations: ['CE', 'RoHS', 'WEEE', 'EMV', 'RED'],
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
    regulations: ['CE', 'RoHS', 'WEEE', 'Energielabel', 'Ökodesign'],
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
    regulations: ['CE', 'RoHS', 'WEEE', 'Energielabel', 'Ökodesign'],
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
    regulations: ['REACH', 'Textilkennzeichnung', 'ESPR/DPP'],
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
    regulations: ['CE', 'Spielzeugrichtlinie', 'REACH', 'EN 71'],
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
    regulations: ['REACH', 'Holzhandelsverordnung', 'ESPR/DPP'],
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
    regulations: ['Kosmetikverordnung (EG) 1223/2009', 'REACH', 'CPNP'],
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
    regulations: ['VO (EG) 1935/2004', 'VO (EU) 10/2011', 'LFGB'],
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
    regulations: ['EU-Batterieverordnung', 'BattG', 'Digitaler Batteriepass'],
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
    regulations: ['REACH', 'CLP', 'Biozidverordnung', 'Detergenzienverordnung'],
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
    regulations: ['MDR (EU) 2017/745', 'IVDR (EU) 2017/746', 'CE'],
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
    regulations: ['Bauproduktenverordnung (EU) 305/2011', 'CE', 'DoP'],
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
    regulations: ['Maschinenrichtlinie 2006/42/EG', 'CE', 'Outdoor-Lärm-RL'],
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
    regulations: ['ECE-Regelungen', 'Typgenehmigung', 'REACH'],
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
    regulations: ['PSA-Verordnung', 'CE', 'EN-Normen'],
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
    id: 'baby',
    name: 'Baby & Kleinkind',
    icon: '👶',
    description: 'Babyausstattung und Kleinkindprodukte',
    regulations: ['Spielzeugrichtlinie', 'EN 1888', 'ECE R44/R129', 'REACH'],
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
    id: 'psa',
    name: 'PSA - Schutzausrüstung',
    icon: '🦺',
    description: 'Persönliche Schutzausrüstung',
    regulations: ['PSA-Verordnung (EU) 2016/425', 'CE', 'Kategorie I-III'],
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
    id: 'renewable',
    name: 'Erneuerbare Energien',
    icon: '☀️',
    description: 'Solar, Wind und Energiespeicher',
    regulations: ['CE', 'Niederspannungsrichtlinie', 'EMV', 'Ökodesign'],
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
];

export function ProductCategoriesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [isLoading, setIsLoading] = useState(true);

  // Kategorien aus der API laden
  useEffect(() => {
    async function loadCategories() {
      try {
        const apiCategories = await getCategories();
        if (apiCategories.length > 0) {
          setCategories(apiCategories);
        }
      } catch (error) {
        console.warn('Kategorien konnten nicht geladen werden, verwende Fallback-Daten:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadCategories();
  }, []);

  const filteredCategories = categories.filter(cat => {
    const searchLower = searchTerm.toLowerCase();
    const subcategories = cat.subcategories || [];
    return (
      cat.name.toLowerCase().includes(searchLower) ||
      (cat.description || '').toLowerCase().includes(searchLower) ||
      subcategories.some(sub => sub.toLowerCase().includes(searchLower))
    );
  });

  const totalSubcategories = categories.reduce((acc, cat) => acc + (cat.subcategories?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Produktkategorien</h1>
          <p className="text-muted-foreground">
            {categories.length} Hauptkategorien mit {totalSubcategories} Unterkategorien
          </p>
        </div>
        <Link to="/requirements-calculator">
          <Button>
            <Zap className="mr-2 h-4 w-4" />
            Anforderungs-Kalkulator
          </Button>
        </Link>
      </div>

      {/* Suche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Kategorie oder Produkt suchen..."
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Statistik-Karten */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{categories.length}</p>
                <p className="text-sm text-muted-foreground">Hauptkategorien</p>
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
                <p className="text-2xl font-bold">{totalSubcategories}</p>
                <p className="text-sm text-muted-foreground">Unterkategorien</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">27+</p>
                <p className="text-sm text-muted-foreground">EU-Länder abgedeckt</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">50+</p>
                <p className="text-sm text-muted-foreground">Regulierungen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Kategorien-Liste */}
      {!isLoading && (
        <div className="grid gap-4">
          {filteredCategories.map((category) => {
            const regulations = category.regulations || [];
            const subcategories = category.subcategories || [];

            return (
              <Card key={category.id} className="overflow-hidden">
                <Accordion type="single" collapsible>
                  <AccordionItem value={category.id} className="border-none">
                    <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/50">
                      <div className="flex items-center gap-4 text-left w-full">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-2xl">
                          {category.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{category.name}</h3>
                            <Badge variant="secondary">{subcategories.length} Produkte</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{category.description}</p>
                        </div>
                        <div className="hidden md:flex flex-wrap gap-1 max-w-xs justify-end">
                          {regulations.slice(0, 3).map(reg => (
                            <Badge key={reg} variant="outline" className="text-xs">
                              {reg}
                            </Badge>
                          ))}
                          {regulations.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{regulations.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <div className="space-y-4">
                        {/* Regulierungen */}
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4" />
                            Relevante Regulierungen
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {regulations.map(reg => (
                              <Badge key={reg} variant="default">
                                {reg}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Unterkategorien */}
                        <div>
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Produkttypen ({subcategories.length})
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {subcategories.map(sub => (
                              <Badge key={sub} variant="secondary" className="text-xs">
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Aktionen */}
                        <div className="flex gap-2 pt-2">
                          <Link to={`/requirements-calculator?category=${category.id}`}>
                            <Button size="sm">
                              <Zap className="mr-2 h-4 w-4" />
                              Anforderungen prüfen
                            </Button>
                          </Link>
                          <Link to={`/checklists?category=${category.id}`}>
                            <Button size="sm" variant="outline">
                              <FileText className="mr-2 h-4 w-4" />
                              Checkliste öffnen
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            );
          })}
        </div>
      )}

      {!isLoading && filteredCategories.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Keine Kategorien gefunden</h3>
            <p className="text-muted-foreground">Versuchen Sie einen anderen Suchbegriff</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
