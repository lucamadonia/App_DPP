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
  setTenant,
  getCurrentTenant,
} from '@/services/api';
import type { ChecklistTemplate, ChecklistProgress } from '@/types/database';
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

// Fallback Checklisten-Daten für jedes Land und jede Produktkategorie
const fallbackChecklistData: Record<string, ChecklistItem[]> = {
  'DE-electronics': [
    // === SICHERHEIT UND CE-KONFORMITÄT ===
    {
      id: 'de-elec-1',
      title: 'CE-Kennzeichnung angebracht',
      description: 'CE-Zeichen muss sichtbar auf Produkt oder Verpackung sein',
      detailedDescription: 'Das CE-Zeichen muss mindestens 5mm hoch sein und die korrekten Proportionen gemäß Anhang II des Beschlusses 768/2008/EG aufweisen. Es darf nicht durch andere Zeichen überdeckt werden und muss lesbar und dauerhaft angebracht sein. Bei kleinen Produkten kann es auf der Verpackung oder den Begleitunterlagen angebracht werden.',
      mandatory: true,
      category: 'Sicherheit & CE-Konformität',
      subcategory: 'CE-Kennzeichnung',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'Verordnung (EG) 765/2008, Beschluss 768/2008/EG',
      authority: 'Marktüberwachungsbehörden der Länder',
      penalties: 'Bis zu 100.000 € Bußgeld, Vertriebsverbot',
      tips: [
        'CE-Zeichen nur anbringen, wenn alle anwendbaren Richtlinien erfüllt sind',
        'Proportionen des CE-Zeichens exakt einhalten',
        'Position dokumentieren und fotografisch festhalten',
      ],
      applicableProducts: ['Alle Elektronikprodukte'],
      priority: 'critical',
    },
    {
      id: 'de-elec-2',
      title: 'EU-Konformitätserklärung (DoC) erstellt',
      description: 'Declaration of Conformity mit allen angewandten Richtlinien und Normen',
      detailedDescription: 'Die EU-Konformitätserklärung muss den Namen und die Anschrift des Herstellers, die Produktidentifikation, alle anwendbaren EU-Richtlinien, die harmonisierten Normen, ggf. die benannte Stelle, sowie Ort, Datum und Unterschrift des Verantwortlichen enthalten. Sie muss in einer Amtssprache des Ziellandes verfasst sein.',
      mandatory: true,
      category: 'Sicherheit & CE-Konformität',
      subcategory: 'Dokumentation',
      documentRequired: true,
      documentTypes: ['EU-Konformitätserklärung', 'Declaration of Conformity'],
      checked: true,
      status: 'completed',
      legalBasis: 'Beschluss 768/2008/EG, Produktsicherheitsrichtlinien',
      authority: 'Marktüberwachungsbehörden',
      penalties: 'Bis zu 10.000 € Bußgeld',
      tips: [
        'Alle anwendbaren Richtlinien vollständig auflisten',
        'Aktuelle Versionen der harmonisierten Normen verwenden',
        'DoC bei Produktänderungen aktualisieren',
        'Mindestens 10 Jahre aufbewahren',
      ],
      applicableProducts: ['Alle CE-pflichtigen Produkte'],
      priority: 'critical',
    },
    {
      id: 'de-elec-3',
      title: 'Technische Dokumentation vollständig',
      description: 'Technische Unterlagen für Konformitätsbewertung',
      detailedDescription: 'Die technische Dokumentation muss umfassen: allgemeine Produktbeschreibung, Konstruktionsentwürfe, Fertigungszeichnungen, Schaltpläne, Beschreibung der Funktionsweise, Liste der angewandten Normen, Risikoanalyse, Prüfberichte, Berechnungen und Qualitätssicherungsmaßnahmen.',
      mandatory: true,
      category: 'Sicherheit & CE-Konformität',
      subcategory: 'Dokumentation',
      documentRequired: true,
      documentTypes: ['Technische Dokumentation', 'Konstruktionsunterlagen', 'Prüfberichte'],
      checked: true,
      status: 'completed',
      legalBasis: 'Produktsicherheitsrichtlinien, MRL, LVD, RED, EMV',
      authority: 'Marktüberwachungsbehörden, benannte Stellen',
      penalties: 'Bis zu 50.000 € Bußgeld',
      tips: [
        'Dokumentation strukturiert und auffindbar ablegen',
        'Mindestens 10 Jahre nach letztem Inverkehrbringen aufbewahren',
        'Bei Anfrage innerhalb von 10 Tagen vorlegen können',
      ],
      applicableProducts: ['Alle CE-pflichtigen Produkte'],
      priority: 'critical',
    },
    {
      id: 'de-elec-4',
      title: 'Niederspannungsrichtlinie (LVD) Konformität',
      description: 'Elektrische Sicherheit für Geräte 50-1000V AC / 75-1500V DC',
      detailedDescription: 'Prüfung auf elektrische Sicherheit gemäß EN 62368-1 (AV-Geräte, IT-Geräte), EN 60335-1/2-x (Haushaltsgeräte), EN 60950-1 (IT-Geräte alt), EN 61010-1 (Messgeräte). Schutz gegen elektrischen Schlag, thermische Gefahren, mechanische Gefahren, Strahlung, chemische Gefahren.',
      mandatory: true,
      category: 'Sicherheit & CE-Konformität',
      subcategory: 'Elektrische Sicherheit',
      documentRequired: true,
      documentTypes: ['LVD-Prüfbericht', 'Sicherheitsprüfung'],
      checked: true,
      status: 'completed',
      legalBasis: 'Richtlinie 2014/35/EU (LVD)',
      authority: 'BAuA, Marktüberwachungsbehörden',
      penalties: 'Bis zu 100.000 € Bußgeld, Produktrückruf',
      tips: [
        'Prüfung durch akkreditiertes Labor empfohlen',
        'Serienprüfung bei Produktion berücksichtigen',
        'Sicherheitshinweise in Landessprache bereitstellen',
      ],
      applicableProducts: ['Netzbetriebene Elektronik', 'Ladegeräte', 'Netzteile'],
      priority: 'critical',
    },
    {
      id: 'de-elec-5',
      title: 'EMV-Richtlinie Konformität',
      description: 'Elektromagnetische Verträglichkeit nachgewiesen',
      detailedDescription: 'Prüfung auf elektromagnetische Störaussendung und Störfestigkeit gemäß EMV-Richtlinie 2014/30/EU. Anwendbare Normen: EN 55032 (Multimedia), EN 55035 (Störfestigkeit), EN 61000-3-2 (Oberschwingungen), EN 61000-3-3 (Spannungsschwankungen). Einhaltung der Grenzwerte für leitungsgebundene und gestrahlte Störungen.',
      mandatory: true,
      category: 'Sicherheit & CE-Konformität',
      subcategory: 'EMV',
      documentRequired: true,
      documentTypes: ['EMV-Prüfbericht', 'EMC Test Report'],
      checked: true,
      status: 'completed',
      legalBasis: 'Richtlinie 2014/30/EU (EMV), EMVG',
      authority: 'Bundesnetzagentur, BAuA',
      penalties: 'Bis zu 100.000 € Bußgeld',
      tips: [
        'EMV-Prüfung frühzeitig in der Entwicklung durchführen',
        'Schirmung und Filterung bereits im Design berücksichtigen',
        'Prüfaufbau dokumentieren',
      ],
      applicableProducts: ['Alle elektronischen Geräte'],
      priority: 'critical',
    },
    {
      id: 'de-elec-6',
      title: 'RED (Funkanlagenrichtlinie) Konformität',
      description: 'Konformität für Funkprodukte (WiFi, Bluetooth, etc.)',
      detailedDescription: 'Für alle Geräte mit Funkfunktionen (WiFi, Bluetooth, Zigbee, LoRa, LTE, 5G, etc.) muss die Konformität mit der Funkanlagenrichtlinie 2014/53/EU nachgewiesen werden. Dies umfasst Gesundheit und Sicherheit (Art. 3.1a), EMV (Art. 3.1b) und effiziente Nutzung des Funkspektrums (Art. 3.2). Ab 2025 gelten zusätzliche Cybersecurity-Anforderungen.',
      mandatory: true,
      category: 'Sicherheit & CE-Konformität',
      subcategory: 'Funk',
      documentRequired: true,
      documentTypes: ['RED-Prüfbericht', 'Funkprüfung', 'SAR-Messung'],
      checked: false,
      status: 'pending',
      legalBasis: 'Richtlinie 2014/53/EU (RED), FTEG',
      authority: 'Bundesnetzagentur',
      penalties: 'Bis zu 500.000 € Bußgeld',
      tips: [
        'Vor Markteinführung Frequenznutzung in Zielländern prüfen',
        'Bei körpernaher Nutzung SAR-Messung erforderlich',
        'Benannte Stelle bei bestimmten Frequenzen erforderlich',
      ],
      applicableProducts: ['WiFi-Geräte', 'Bluetooth-Geräte', 'Mobilfunkgeräte', 'IoT-Geräte'],
      priority: 'critical',
    },
    {
      id: 'de-elec-7',
      title: 'Risikoanalyse und -bewertung durchgeführt',
      description: 'Systematische Ermittlung und Bewertung von Risiken',
      detailedDescription: 'Umfassende Risikoanalyse gemäß EN ISO 12100 oder EN IEC 31010. Identifikation aller Gefährdungen (elektrisch, thermisch, mechanisch, ergonomisch, chemisch), Risikobewertung, Festlegung von Schutzmaßnahmen, Dokumentation des Restrisikos. Die Risikoanalyse muss während des gesamten Produktlebenszyklus aktualisiert werden.',
      mandatory: true,
      category: 'Sicherheit & CE-Konformität',
      subcategory: 'Risikoanalyse',
      documentRequired: true,
      documentTypes: ['Risikoanalyse', 'FMEA', 'Hazard Analysis'],
      checked: true,
      status: 'completed',
      legalBasis: 'EN ISO 12100, Produktsicherheitsrichtlinien',
      authority: 'Marktüberwachungsbehörden',
      tips: [
        'Risikoanalyse kontinuierlich aktualisieren',
        'Vorhersehbare Fehlanwendung berücksichtigen',
        'Dokumentation für Produkthaftung wichtig',
      ],
      applicableProducts: ['Alle Produkte'],
      priority: 'high',
    },

    // === ELEKTROGERÄTEGESETZ (ElektroG) ===
    {
      id: 'de-elec-10',
      title: 'stiftung ear Registrierung',
      description: 'Registrierung als Hersteller bei der stiftung ear',
      detailedDescription: 'Vor dem erstmaligen Inverkehrbringen von Elektrogeräten in Deutschland muss eine Registrierung bei der stiftung elektro-altgeräte register (stiftung ear) erfolgen. Die Registrierung umfasst: Stammdaten, Markenregistrierung, Kategoriezuordnung nach ElektroG, Nachweis einer insolvenzsicheren Garantie und Benennung eines Bevollmächtigten (falls Sitz außerhalb DE).',
      mandatory: true,
      category: 'Elektrogerätegesetz (ElektroG)',
      subcategory: 'Registrierung',
      documentRequired: true,
      documentTypes: ['ear-Registrierungsbestätigung', 'WEEE-Reg.-Nr.'],
      checked: false,
      status: 'in_progress',
      legalBasis: 'ElektroG §6',
      authority: 'stiftung ear, Umweltbundesamt',
      deadline: 'Vor erstem Inverkehrbringen',
      penalties: 'Bis zu 100.000 € Bußgeld, Vertriebsverbot',
      tips: [
        'Registrierung vor erstem Verkauf abschließen',
        'Garantiesystem über Versicherung oder Bankbürgschaft',
        'Alle Marken registrieren, unter denen verkauft wird',
        'Bevollmächtigten benennen, wenn Sitz außerhalb EU',
      ],
      links: [
        { title: 'stiftung ear Portal', url: 'https://www.stiftung-ear.de/' },
      ],
      applicableProducts: ['Alle Elektro- und Elektronikgeräte'],
      priority: 'critical',
    },
    {
      id: 'de-elec-11',
      title: 'WEEE-Registrierungsnummer auf Rechnungen',
      description: 'ear-Registrierungsnummer auf allen B2B-Rechnungen',
      detailedDescription: 'Die WEEE-Registrierungsnummer (Format: WEEE-Reg.-Nr. DE 12345678) muss auf allen Rechnungen an gewerbliche Kunden angegeben werden. Dies dient der Rückverfolgbarkeit und der Überprüfung der ordnungsgemäßen Registrierung.',
      mandatory: true,
      category: 'Elektrogerätegesetz (ElektroG)',
      subcategory: 'Kennzeichnung',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'ElektroG §6 Abs. 3',
      authority: 'stiftung ear',
      penalties: 'Bußgeld, Wettbewerbsverstoß',
      tips: [
        'Automatisch in Rechnungsvorlage integrieren',
        'Bei mehreren Registrierungen die korrekte verwenden',
      ],
      applicableProducts: ['Alle Elektrogeräte bei B2B-Verkauf'],
      priority: 'high',
    },
    {
      id: 'de-elec-12',
      title: 'WEEE-Symbol (durchgestrichene Mülltonne) angebracht',
      description: 'Symbol für getrennte Sammlung auf Produkt oder Verpackung',
      detailedDescription: 'Das WEEE-Symbol (durchgestrichene Mülltonne auf Rädern mit Balken darunter) muss gemäß EN 50419 auf dem Produkt, der Verpackung oder den Begleitpapieren dauerhaft, gut sichtbar, lesbar und unauslöschlich angebracht werden. Mindestgröße: 7mm x 10mm. Der Balken unter der Mülltonne zeigt an, dass das Produkt nach dem 13.08.2005 in Verkehr gebracht wurde.',
      mandatory: true,
      category: 'Elektrogerätegesetz (ElektroG)',
      subcategory: 'Kennzeichnung',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'ElektroG §9, EN 50419',
      authority: 'stiftung ear, Marktüberwachung',
      penalties: 'Bis zu 10.000 € Bußgeld',
      tips: [
        'Mindestgröße 7mm x 10mm einhalten',
        'Dauerhaft und unauslöschlich anbringen',
        'Bei kleinen Produkten auf Verpackung möglich',
        'Kontrastreiche Darstellung wählen',
      ],
      applicableProducts: ['Alle Elektro- und Elektronikgeräte'],
      priority: 'high',
    },
    {
      id: 'de-elec-13',
      title: 'Herstellerkennzeichnung auf Produkt',
      description: 'Name und Anschrift des Herstellers auf Produkt oder Verpackung',
      detailedDescription: 'Der Hersteller muss auf dem Produkt oder, falls nicht möglich, auf der Verpackung oder den Begleitdokumenten eindeutig identifizierbar sein. Anzugeben sind: Firmenname, Postanschrift (nicht nur Postfach), bei Nicht-EU-Herstellern zusätzlich Name und Anschrift des EU-Bevollmächtigten oder Importeurs.',
      mandatory: true,
      category: 'Elektrogerätegesetz (ElektroG)',
      subcategory: 'Kennzeichnung',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'ElektroG §7, ProdSG',
      authority: 'Marktüberwachung',
      penalties: 'Bis zu 10.000 € Bußgeld',
      tips: [
        'Vollständige Postanschrift, nicht nur Website',
        'Bei Dropshipping auf korrekten Hersteller achten',
        'Kontaktmöglichkeit für Verbraucher sicherstellen',
      ],
      applicableProducts: ['Alle Produkte'],
      priority: 'high',
    },
    {
      id: 'de-elec-14',
      title: 'Mengenmeldungen an stiftung ear',
      description: 'Monatliche/jährliche Mengenmeldungen der in Verkehr gebrachten Geräte',
      detailedDescription: 'Hersteller müssen bei der stiftung ear regelmäßige Mengenmeldungen abgeben: Monatlich die in Verkehr gebrachten Mengen je Gerätekategorie (in Stück und kg), jährlich die Gesamtmengen. Die Meldungen sind Basis für die Berechnung der Abholanordnungen und Garantieanforderungen.',
      mandatory: true,
      category: 'Elektrogerätegesetz (ElektroG)',
      subcategory: 'Berichterstattung',
      documentRequired: true,
      documentTypes: ['Mengenmeldung', 'Jahresabstimmung'],
      checked: true,
      status: 'completed',
      legalBasis: 'ElektroG §27',
      authority: 'stiftung ear',
      deadline: 'Monatlich bis zum 15. des Folgemonats',
      penalties: 'Bußgeld bei verspäteter/falscher Meldung',
      tips: [
        'Automatisierte Schnittstelle zum ERP-System einrichten',
        'Gewichte pro Produkt sorgfältig erfassen',
        'Kategoriezuordnung korrekt vornehmen',
      ],
      applicableProducts: ['Alle Elektrogeräte'],
      priority: 'high',
    },
    {
      id: 'de-elec-15',
      title: 'Insolvenzsichere Garantie hinterlegt',
      description: 'Sicherheitsleistung für Entsorgungskosten',
      detailedDescription: 'Hersteller von b2c-Elektrogeräten müssen eine insolvenzsichere Garantie für die zukünftigen Entsorgungskosten nachweisen. Möglichkeiten: Teilnahme an einem kollektiven Garantiesystem, Versicherung oder Bankbürgschaft. Die Höhe richtet sich nach den gemeldeten Mengen und produktspezifischen Entsorgungskosten.',
      mandatory: true,
      category: 'Elektrogerätegesetz (ElektroG)',
      subcategory: 'Finanzierung',
      documentRequired: true,
      documentTypes: ['Garantienachweis', 'Versicherungspolice', 'Bankbürgschaft'],
      checked: false,
      status: 'pending',
      legalBasis: 'ElektroG §7',
      authority: 'stiftung ear',
      penalties: 'Registrierungsentzug, Vertriebsverbot',
      tips: [
        'Kollektives System oft kostengünstiger als Einzelgarantie',
        'Garantiesumme bei Mengensteigerung anpassen',
        'Jährliche Überprüfung der Garantiehöhe',
      ],
      applicableProducts: ['B2C-Elektrogeräte'],
      priority: 'critical',
    },

    // === RoHS ===
    {
      id: 'de-elec-20',
      title: 'RoHS-Konformität dokumentiert',
      description: 'Einhaltung der Stoffbeschränkungen nachgewiesen',
      detailedDescription: 'Nachweis, dass das Produkt die Grenzwerte für die 10 beschränkten Stoffe einhält: Blei (0,1%), Quecksilber (0,1%), Cadmium (0,01%), Chrom VI (0,1%), PBB (0,1%), PBDE (0,1%), DEHP (0,1%), BBP (0,1%), DBP (0,1%), DIBP (0,1%). Für jedes homogene Material. Bei Inanspruchnahme von Ausnahmen: Dokumentation der Anwendbarkeit.',
      mandatory: true,
      category: 'RoHS (Stoffbeschränkungen)',
      subcategory: 'Stoffkonformität',
      documentRequired: true,
      documentTypes: ['RoHS-Erklärung', 'Materialanalyse', 'Lieferantenerklärungen'],
      checked: true,
      status: 'completed',
      legalBasis: 'Richtlinie 2011/65/EU (RoHS), ElektroStoffV',
      authority: 'BAuA, Marktüberwachung',
      penalties: 'Bis zu 100.000 € Bußgeld, Produktrückruf',
      tips: [
        'Lieferantenerklärungen systematisch einfordern',
        'Stichprobenprüfungen durch Labor',
        'Ausnahmen nur bei dokumentierter Anwendbarkeit nutzen',
        'RoHS-Erklärung ist Teil der Konformitätserklärung',
      ],
      applicableProducts: ['Alle Elektro- und Elektronikgeräte'],
      priority: 'critical',
    },
    {
      id: 'de-elec-21',
      title: 'RoHS-Ausnahmen geprüft und dokumentiert',
      description: 'Inanspruchnahme von Ausnahmen rechtmäßig dokumentiert',
      detailedDescription: 'Falls RoHS-Ausnahmen (Anhang III oder IV der RoHS-Richtlinie) in Anspruch genommen werden, muss dokumentiert werden: Welche Ausnahme angewendet wird, in welchem Bauteil, warum die Ausnahme anwendbar ist, Gültigkeitsdauer der Ausnahme. Viele Ausnahmen haben Ablaufdaten und werden regelmäßig überprüft.',
      mandatory: true,
      category: 'RoHS (Stoffbeschränkungen)',
      subcategory: 'Ausnahmen',
      documentRequired: true,
      documentTypes: ['Ausnahmedokumentation'],
      checked: true,
      status: 'completed',
      legalBasis: 'RoHS Anhang III/IV',
      authority: 'BAuA',
      tips: [
        'Ablaufdaten der genutzten Ausnahmen überwachen',
        'Alternativenstudie für auslaufende Ausnahmen',
        'Dokumentation bei Behördenanfrage vorhalten',
      ],
      applicableProducts: ['Elektrogeräte mit Ausnahmen'],
      priority: 'medium',
    },

    // === REACH / SVHC ===
    {
      id: 'de-elec-25',
      title: 'REACH SVHC-Prüfung durchgeführt',
      description: 'Prüfung auf besonders besorgniserregende Stoffe (SVHC)',
      detailedDescription: 'Prüfung aller Materialien und Bauteile auf Stoffe der SVHC-Kandidatenliste (aktuell über 230 Stoffe). Bei Gehalt >0,1% Massenanteil in einem Erzeugnis: Informationspflicht an Kunden (Art. 33) und Meldepflicht an ECHA-SCIP-Datenbank. Die Kandidatenliste wird zweimal jährlich aktualisiert.',
      mandatory: true,
      category: 'REACH (Chemikalien)',
      subcategory: 'SVHC-Prüfung',
      documentRequired: true,
      documentTypes: ['SVHC-Analyse', 'Lieferantenerklärungen', 'Materialdatenblätter'],
      checked: false,
      status: 'pending',
      legalBasis: 'REACH-Verordnung Art. 33, 7(2)',
      authority: 'ECHA, BAuA',
      penalties: 'Bis zu 50.000 € Bußgeld',
      tips: [
        'Kandidatenliste regelmäßig prüfen (halbjährliche Updates)',
        'Lieferkette systematisch abfragen',
        'SVHC-Erklärungen von allen Zulieferern einfordern',
      ],
      links: [
        { title: 'ECHA Kandidatenliste', url: 'https://echa.europa.eu/de/candidate-list-table' },
      ],
      applicableProducts: ['Alle Produkte'],
      priority: 'high',
    },
    {
      id: 'de-elec-26',
      title: 'SCIP-Datenbank-Meldung',
      description: 'Meldung SVHC-haltiger Erzeugnisse an ECHA',
      detailedDescription: 'Erzeugnisse mit SVHC-Gehalt >0,1% müssen vor dem Inverkehrbringen in der SCIP-Datenbank der ECHA gemeldet werden. Die Meldung umfasst: Artikelidentifikation, SVHC-Name und Konzentration, Kategorie, sichere Verwendung. Die Meldepflicht besteht für jeden Akteur der Lieferkette.',
      mandatory: true,
      category: 'REACH (Chemikalien)',
      subcategory: 'SCIP-Meldung',
      documentRequired: true,
      documentTypes: ['SCIP-Meldungsbestätigung', 'SCIP-Nummer'],
      checked: false,
      status: 'pending',
      legalBasis: 'Abfallrahmenrichtlinie Art. 9(1)(i), REACH Art. 33',
      authority: 'ECHA',
      penalties: 'Bußgeld, Wettbewerbsverstoß',
      tips: [
        'IUCLID-Dossier oder Simplified SCIP Notification verwenden',
        'Lieferketteninformationen integrieren',
        'SCIP-Nummer dokumentieren und an Abnehmer weitergeben',
      ],
      links: [
        { title: 'SCIP-Datenbank', url: 'https://echa.europa.eu/de/scip' },
      ],
      applicableProducts: ['Erzeugnisse mit SVHC >0,1%'],
      priority: 'high',
    },
    {
      id: 'de-elec-27',
      title: 'REACH Art. 33 Kundeninformation',
      description: 'Information an Abnehmer über SVHC-Gehalt',
      detailedDescription: 'Bei SVHC-Gehalt >0,1% muss der Abnehmer unaufgefordert informiert werden über: Name des SVHC, Hinweise zur sicheren Verwendung. Bei Verbraucheranfragen muss die Information innerhalb von 45 Tagen kostenlos bereitgestellt werden.',
      mandatory: true,
      category: 'REACH (Chemikalien)',
      subcategory: 'Kundeninformation',
      documentRequired: true,
      documentTypes: ['SVHC-Information für Kunden'],
      checked: false,
      status: 'pending',
      legalBasis: 'REACH Art. 33',
      authority: 'ECHA, nationale Behörden',
      penalties: 'Bis zu 50.000 € Bußgeld',
      tips: [
        'Standardinformationsblatt vorbereiten',
        'Auf Website verfügbar machen',
        'Bei Verbraucheranfrage schnell reagieren (45-Tage-Frist)',
      ],
      applicableProducts: ['Erzeugnisse mit SVHC >0,1%'],
      priority: 'high',
    },
    {
      id: 'de-elec-28',
      title: 'REACH Anhang XVII Beschränkungen eingehalten',
      description: 'Stoffbeschränkungen gemäß REACH Anhang XVII',
      detailedDescription: 'Prüfung auf Einhaltung der Stoffbeschränkungen in REACH Anhang XVII. Relevante Einträge für Elektronik: Cadmium (Eintrag 23), Nickel (Eintrag 27), bestimmte Phthalate (Eintrag 51), PAK in Verbrauchererzeugnissen (Eintrag 50), PFOA (Eintrag 68), BPA (Eintrag 66).',
      mandatory: true,
      category: 'REACH (Chemikalien)',
      subcategory: 'Beschränkungen',
      documentRequired: true,
      documentTypes: ['Konformitätsbewertung Anhang XVII'],
      checked: true,
      status: 'completed',
      legalBasis: 'REACH Anhang XVII',
      authority: 'ECHA, BAuA',
      penalties: 'Bis zu 50.000 € Bußgeld, Vertriebsverbot',
      tips: [
        'Anhang XVII regelmäßig auf Änderungen prüfen',
        'Anwendbare Einträge für Produktkategorie identifizieren',
        'Analytische Prüfung bei Risikoprodukten',
      ],
      applicableProducts: ['Alle Produkte'],
      priority: 'high',
    },

    // === BATTERIEN ===
    {
      id: 'de-elec-30',
      title: 'Batterie-Registrierung bei stiftung ear',
      description: 'Registrierung als Batteriehersteller/-importeur',
      detailedDescription: 'Wer Batterien in Deutschland erstmals in Verkehr bringt (auch eingebaute Batterien in Geräten), muss sich bei der stiftung ear registrieren. Die Registrierung erfolgt getrennt von der ElektroG-Registrierung. Es müssen: Batterietypen, Marken und Mengen gemeldet werden.',
      mandatory: true,
      category: 'Batterien (BattG)',
      subcategory: 'Registrierung',
      documentRequired: true,
      documentTypes: ['BattG-Registrierungsbestätigung'],
      checked: false,
      status: 'pending',
      legalBasis: 'BattG §4',
      authority: 'stiftung ear, UBA',
      deadline: 'Vor erstem Inverkehrbringen',
      penalties: 'Bis zu 100.000 € Bußgeld, Vertriebsverbot',
      tips: [
        'Auch für Geräte mit fest eingebauten Batterien erforderlich',
        'Rücknahmesystem einrichten oder beteiligen',
        'Mengenmeldungen beachten',
      ],
      applicableProducts: ['Batterien', 'Akkumulatoren', 'Geräte mit Batterien'],
      priority: 'critical',
    },
    {
      id: 'de-elec-31',
      title: 'Batteriesymbol auf Batterien/Akkus',
      description: 'Durchgestrichene Mülltonne und ggf. Stoffsymbole',
      detailedDescription: 'Batterien und Akkumulatoren müssen mit dem Symbol der durchgestrichenen Mülltonne gekennzeichnet sein. Mindestgröße: 3% der größten Seitenfläche, max. 5cm x 5cm. Zusätzlich chemische Symbole (Pb, Cd, Hg) wenn über Grenzwert. Bei sehr kleinen Batterien Kennzeichnung auf Verpackung.',
      mandatory: true,
      category: 'Batterien (BattG)',
      subcategory: 'Kennzeichnung',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'BattG §17, EU-Batterieverordnung',
      authority: 'stiftung ear',
      penalties: 'Bis zu 10.000 € Bußgeld',
      tips: [
        'Symbol dauerhaft und gut sichtbar anbringen',
        'Bei kleinen Batterien: Mindestgröße beachten',
        'Chemische Symbole Pb, Cd, Hg wenn zutreffend',
      ],
      applicableProducts: ['Alle Batterien und Akkumulatoren'],
      priority: 'high',
    },
    {
      id: 'de-elec-32',
      title: 'Kapazitätsangabe auf Akkus',
      description: 'Angabe der Kapazität in mAh oder Ah',
      detailedDescription: 'Gerätebatterien und -akkumulatoren sowie Starterbatterien müssen mit ihrer Kapazität gekennzeichnet werden. Die Angabe erfolgt in mAh oder Ah und muss gut lesbar auf der Batterie oder Verpackung angebracht sein.',
      mandatory: true,
      category: 'Batterien (BattG)',
      subcategory: 'Kennzeichnung',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'EU-Batterieverordnung Art. 13',
      authority: 'Marktüberwachung',
      tips: [
        'Nominale Kapazität angeben',
        'Einheit nicht vergessen (mAh, Ah)',
      ],
      applicableProducts: ['Gerätebatterien', 'Akkumulatoren'],
      priority: 'medium',
    },
    {
      id: 'de-elec-33',
      title: 'Rücknahmesystem für Altbatterien',
      description: 'Beteiligung an Rücknahmesystem oder eigenes System',
      detailedDescription: 'Hersteller müssen die Rücknahme von Altbatterien sicherstellen. Dies geschieht durch Beteiligung an einem gemeinsamen Rücknahmesystem (z.B. GRS, REBAT) oder durch Einrichtung eines eigenen Rücknahmesystems. Die Finanzierung der Sammlung und Verwertung muss gewährleistet sein.',
      mandatory: true,
      category: 'Batterien (BattG)',
      subcategory: 'Rücknahme',
      documentRequired: true,
      documentTypes: ['Vertrag mit Rücknahmesystem', 'Genehmigung eigenes System'],
      checked: false,
      status: 'pending',
      legalBasis: 'BattG §5',
      authority: 'stiftung ear, UBA',
      penalties: 'Bis zu 100.000 € Bußgeld',
      tips: [
        'Kollektives System meist einfacher und kostengünstiger',
        'Mengenmeldungen an System korrekt vornehmen',
        'Rücknahmequoten beachten',
      ],
      applicableProducts: ['Alle Batterien'],
      priority: 'critical',
    },

    // === VERPACKUNG ===
    {
      id: 'de-elec-40',
      title: 'LUCID-Registrierung (Verpackungsregister)',
      description: 'Registrierung bei der Zentralen Stelle Verpackungsregister',
      detailedDescription: 'Vor dem Inverkehrbringen von mit Ware befüllten Verkaufsverpackungen muss eine Registrierung bei LUCID erfolgen. Anzugeben sind: Unternehmensdaten, Marken, geplante Materialarten. Die LUCID-Registrierungsnummer ist öffentlich einsehbar.',
      mandatory: true,
      category: 'Verpackung (VerpackG)',
      subcategory: 'Registrierung',
      documentRequired: true,
      documentTypes: ['LUCID-Registrierungsbestätigung', 'LUCID-Nummer'],
      checked: true,
      status: 'completed',
      legalBasis: 'VerpackG §9',
      authority: 'Zentrale Stelle Verpackungsregister',
      deadline: 'Vor erstem Inverkehrbringen',
      penalties: 'Bis zu 200.000 € Bußgeld, Vertriebsverbot',
      tips: [
        'Registrierung vor Systembeteiligung',
        'Alle Marken angeben',
        'Materialarten korrekt auswählen',
      ],
      links: [
        { title: 'LUCID Portal', url: 'https://lucid.verpackungsregister.org/' },
      ],
      applicableProducts: ['Alle verpackten Produkte'],
      priority: 'critical',
    },
    {
      id: 'de-elec-41',
      title: 'Systembeteiligung (Duales System)',
      description: 'Beteiligung an einem Dualen System für Verpackungsentsorgung',
      detailedDescription: 'Für alle systembeteiligungspflichtigen Verpackungen (Verkaufsverpackungen bei privaten Endverbrauchern) muss eine Beteiligung an einem Dualen System erfolgen. Aktive Systeme: Der Grüne Punkt, Interseroh+, BellandVision, Landbell, Reclay, Zentek, etc. Die Mengen müssen korrekt gemeldet werden.',
      mandatory: true,
      category: 'Verpackung (VerpackG)',
      subcategory: 'Systembeteiligung',
      documentRequired: true,
      documentTypes: ['Systemvertrag', 'Mengenmeldungen'],
      checked: true,
      status: 'completed',
      legalBasis: 'VerpackG §7',
      authority: 'Zentrale Stelle Verpackungsregister',
      penalties: 'Bis zu 200.000 € Bußgeld, Vertriebsverbot',
      tips: [
        'Systemvertrag vor Verkaufsstart abschließen',
        'Mengenmeldungen korrekt und fristgerecht',
        'Vollständigkeitserklärung beachten (>80.000 kg)',
      ],
      applicableProducts: ['Verkaufsverpackungen für Endverbraucher'],
      priority: 'critical',
    },
    {
      id: 'de-elec-42',
      title: 'Datenmeldung an LUCID',
      description: 'Mengenmeldungen im Verpackungsregister',
      detailedDescription: 'Die beim Dualen System gemeldeten Mengen müssen parallel auch an LUCID gemeldet werden (monatlich oder jährlich je nach Menge). Die Angaben müssen mit denen beim Dualen System übereinstimmen. LUCID vergleicht automatisch die Meldungen.',
      mandatory: true,
      category: 'Verpackung (VerpackG)',
      subcategory: 'Berichterstattung',
      documentRequired: true,
      documentTypes: ['Datenmeldung LUCID'],
      checked: true,
      status: 'completed',
      legalBasis: 'VerpackG §10',
      authority: 'Zentrale Stelle Verpackungsregister',
      deadline: 'Zeitgleich mit Systemmeldung',
      penalties: 'Bußgeld bei Abweichungen',
      tips: [
        'Abstimmung zwischen Systemmeldung und LUCID-Meldung',
        'Automatisierte Schnittstelle empfohlen',
        'Jahresabschlussmeldung nicht vergessen',
      ],
      applicableProducts: ['Alle systembeteiligungspflichtigen Verpackungen'],
      priority: 'high',
    },
    {
      id: 'de-elec-43',
      title: 'Recyclingfähigkeit der Verpackung',
      description: 'Optimierung der Verpackung für Recycling',
      detailedDescription: 'Die PPWR (ab 2025) und das VerpackG verlangen zunehmend recyclingfähige Verpackungen. Bereits jetzt erfolgt eine öko-modulierte Gebührenberechnung bei Dualen Systemen. Optimierungspotenziale: Monomaterial statt Verbund, Farbloses statt farbiges Material, Verzicht auf schwer recycelbare Zusätze.',
      mandatory: false,
      category: 'Verpackung (VerpackG)',
      subcategory: 'Nachhaltigkeit',
      documentRequired: false,
      checked: false,
      status: 'pending',
      legalBasis: 'VerpackG, PPWR (ab 2025)',
      authority: 'Zentrale Stelle, EU-Kommission',
      tips: [
        'Recyclingfähigkeitsbewertung durchführen',
        'Design for Recycling Guidelines beachten',
        'Öko-Modulation nutzen für Kostenersparnis',
      ],
      applicableProducts: ['Alle Verpackungen'],
      priority: 'medium',
    },

    // === ENERGIEKENNZEICHNUNG ===
    {
      id: 'de-elec-50',
      title: 'EU-Energielabel (falls zutreffend)',
      description: 'Energieeffizienzlabel am Point of Sale',
      detailedDescription: 'Für bestimmte Produktgruppen ist das EU-Energielabel verpflichtend: Kühlgeräte, Waschmaschinen, Geschirrspüler, Fernseher, Leuchtmittel, Klimageräte, Wäschetrockner, etc. Das Label muss am Produkt angebracht und bei Fernabsatz dargestellt werden. Das neue Label (A-G) enthält einen QR-Code zur EPREL-Datenbank.',
      mandatory: true,
      category: 'Energiekennzeichnung',
      subcategory: 'Energielabel',
      documentRequired: true,
      documentTypes: ['Energielabel', 'Produktdatenblatt'],
      checked: false,
      status: 'not_applicable',
      legalBasis: 'Verordnung (EU) 2017/1369, EnVKG',
      authority: 'BAM, Marktüberwachung',
      penalties: 'Bis zu 50.000 € Bußgeld',
      tips: [
        'EPREL-Registrierung vor Markteinführung',
        'Label am Produkt und in Werbung',
        'QR-Code auf Label führt zu EPREL',
      ],
      links: [
        { title: 'EPREL-Datenbank', url: 'https://eprel.ec.europa.eu/' },
      ],
      applicableProducts: ['Haushaltsgeräte', 'Leuchtmittel', 'gewerbliche Kühlgeräte'],
      priority: 'high',
    },
    {
      id: 'de-elec-51',
      title: 'EPREL-Datenbank-Registrierung',
      description: 'Eintragung in European Product Registry for Energy Labelling',
      detailedDescription: 'Produkte, die dem Energielabel unterliegen, müssen vor dem Inverkehrbringen in der EPREL-Datenbank registriert werden. Die Registrierung umfasst: Technische Daten, Produktdatenblatt, Energielabel, technische Dokumentation. Der Eintrag muss während der gesamten Marktpräsenz aktuell gehalten werden.',
      mandatory: true,
      category: 'Energiekennzeichnung',
      subcategory: 'EPREL',
      documentRequired: true,
      documentTypes: ['EPREL-Registrierungsbestätigung'],
      checked: false,
      status: 'not_applicable',
      legalBasis: 'Verordnung (EU) 2019/2013ff',
      authority: 'EU-Kommission',
      tips: [
        'Produktmodell-Identifikation eindeutig',
        'Alle erforderlichen Dokumente hochladen',
        'Bei Produktänderungen aktualisieren',
      ],
      applicableProducts: ['Energielabel-pflichtige Produkte'],
      priority: 'high',
    },

    // === DOKUMENTATION & ANLEITUNGEN ===
    {
      id: 'de-elec-60',
      title: 'Betriebsanleitung in deutscher Sprache',
      description: 'Vollständige Bedienungsanleitung auf Deutsch',
      detailedDescription: 'Die Betriebsanleitung muss in deutscher Sprache vorliegen und alle für die sichere Verwendung erforderlichen Informationen enthalten: Produktidentifikation, bestimmungsgemäße Verwendung, Sicherheitshinweise, Inbetriebnahme, Bedienung, Wartung, Fehlerbehebung, Entsorgungshinweise.',
      mandatory: true,
      category: 'Dokumentation & Anleitungen',
      subcategory: 'Betriebsanleitung',
      documentRequired: true,
      documentTypes: ['Betriebsanleitung DE'],
      checked: true,
      status: 'completed',
      legalBasis: 'ProdSG, Produktsicherheitsrichtlinien',
      authority: 'Marktüberwachung',
      penalties: 'Bis zu 10.000 € Bußgeld',
      tips: [
        'Qualifizierte Übersetzung, nicht maschinell',
        'Sicherheitshinweise prominent platzieren',
        'Verständliche Sprache für Laien',
      ],
      applicableProducts: ['Alle Verbraucherprodukte'],
      priority: 'high',
    },
    {
      id: 'de-elec-61',
      title: 'Sicherheitshinweise und Warnungen',
      description: 'Deutliche Warn- und Sicherheitshinweise',
      detailedDescription: 'Alle relevanten Sicherheitshinweise müssen gut sichtbar kommuniziert werden. Dies umfasst: Warnungen vor vorhersehbarem Fehlgebrauch, Hinweise auf besondere Gefahren, Hinweise zur sicheren Aufbewahrung, Altersempfehlungen, Warnungen bei Verwendung von Batterien.',
      mandatory: true,
      category: 'Dokumentation & Anleitungen',
      subcategory: 'Sicherheit',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'ProdSG, Produktsicherheitsrichtlinien',
      authority: 'Marktüberwachung',
      tips: [
        'Warnsymbole gemäß ISO 7010',
        'Textliche Warnungen in Landessprache',
        'Risikogerecht: GEFAHR > WARNUNG > VORSICHT',
      ],
      applicableProducts: ['Alle Produkte'],
      priority: 'high',
    },
    {
      id: 'de-elec-62',
      title: 'Entsorgungshinweise für Verbraucher',
      description: 'Information zur korrekten Entsorgung',
      detailedDescription: 'Verbraucher müssen über die korrekte Entsorgung informiert werden: Getrennte Sammlung von Elektrogeräten, Batterien, Verpackungen. Hinweis auf kostenlose Rückgabemöglichkeiten, Erklärung des WEEE-Symbols, Hinweis auf Umweltauswirkungen bei falscher Entsorgung.',
      mandatory: true,
      category: 'Dokumentation & Anleitungen',
      subcategory: 'Entsorgung',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'ElektroG §18, BattG §18, VerpackG §14',
      authority: 'UBA, Marktüberwachung',
      tips: [
        'In Anleitung und auf Verpackung',
        'Verweis auf kommunale Sammelstellen',
        'Bedeutung der Symbole erklären',
      ],
      applicableProducts: ['Alle Verbraucherprodukte'],
      priority: 'medium',
    },

    // === PRODUKTIDENTIFIKATION ===
    {
      id: 'de-elec-70',
      title: 'GTIN/EAN vergeben',
      description: 'Eindeutige Produktidentifikation mit GTIN',
      detailedDescription: 'Für Handelsprodukte sollte eine GTIN (Global Trade Item Number, früher EAN) vergeben werden. Die GTIN wird für Barcode-Scanning, Lagerverwaltung und zunehmend für den Digitalen Produktpass benötigt. GTINs werden über GS1 Germany bezogen.',
      mandatory: false,
      category: 'Produktidentifikation',
      subcategory: 'GTIN',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'Handelsüblichkeit, ESPR (ab 2027)',
      authority: 'GS1',
      tips: [
        'GTIN-13 für Endverbraucherprodukte',
        'Basis-GTIN bei GS1 registrieren',
        'Für jede Variante eigene GTIN',
      ],
      links: [
        { title: 'GS1 Germany', url: 'https://www.gs1-germany.de/' },
      ],
      applicableProducts: ['Handelsprodukte'],
      priority: 'medium',
    },
    {
      id: 'de-elec-71',
      title: 'Seriennummer/Chargenidentifikation',
      description: 'Eindeutige Identifikation für Rückverfolgbarkeit',
      detailedDescription: 'Produkte müssen rückverfolgbar sein. Dies erfordert eine eindeutige Seriennummer oder Chargenkennung. Die Rückverfolgbarkeit ist wichtig für: Produktrückrufe, Garantieabwicklung, Qualitätsmanagement, zukünftig den Digitalen Produktpass.',
      mandatory: true,
      category: 'Produktidentifikation',
      subcategory: 'Rückverfolgbarkeit',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'ProdSG, Produktsicherheitsrichtlinien, ESPR',
      authority: 'Marktüberwachung',
      tips: [
        'Seriennummer maschinenlesbar (Barcode, QR)',
        'In Produktionsdatenbank dokumentieren',
        'Zusammenhang zu Komponenten herstellen',
      ],
      applicableProducts: ['Alle Produkte'],
      priority: 'high',
    },
    {
      id: 'de-elec-72',
      title: 'Typ- und Modellbezeichnung',
      description: 'Eindeutige Produktbezeichnung',
      detailedDescription: 'Jedes Produkt muss eine eindeutige Typ- und/oder Modellbezeichnung haben, die eine klare Identifikation ermöglicht. Diese Bezeichnung erscheint auf dem Produkt, der Verpackung, den Dokumenten und in Datenbanken.',
      mandatory: true,
      category: 'Produktidentifikation',
      subcategory: 'Bezeichnung',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'ProdSG, Produktsicherheitsrichtlinien',
      authority: 'Marktüberwachung',
      tips: [
        'Konsistente Bezeichnung über alle Dokumente',
        'In DoC, Anleitung und Verpackung identisch',
      ],
      applicableProducts: ['Alle Produkte'],
      priority: 'high',
    },
  ],

  'DE-textiles': [
    // === PRODUKTSICHERHEIT ===
    {
      id: 'de-tex-1',
      title: 'Textilkennzeichnung (TextilKennzG)',
      description: 'Korrekte Faserzusammensetzung in Deutsch',
      detailedDescription: 'Textilerzeugnisse müssen mit der Faserzusammensetzung in Prozent gekennzeichnet werden, in absteigender Reihenfolge. Nur zugelassene Faserbezeichnungen gemäß EU-Verordnung 1007/2011 verwenden. Kennzeichnung muss dauerhaft, leicht lesbar, sichtbar und zugänglich sein.',
      mandatory: true,
      category: 'Produktkennzeichnung',
      subcategory: 'Faserzusammensetzung',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'Verordnung (EU) 1007/2011, TextilKennzG',
      authority: 'Marktüberwachung, Verbraucherschutz',
      penalties: 'Bis zu 50.000 € Bußgeld',
      tips: [
        'Nur standardisierte Faserbezeichnungen',
        'Prozentangaben mit Toleranz ±3%',
        'Bei Mehrkomponenten: alle Bestandteile angeben',
      ],
      applicableProducts: ['Alle Textilerzeugnisse'],
      priority: 'critical',
    },
    {
      id: 'de-tex-2',
      title: 'Pflegekennzeichnung',
      description: 'Pflegesymbole gemäß DIN EN ISO 3758',
      detailedDescription: 'Die Pflegekennzeichnung erfolgt mit standardisierten Symbolen für: Waschen, Bleichen, Trocknen, Bügeln, professionelle Reinigung. Die Symbole sind dauerhaft am Produkt anzubringen (Etikett, Aufdruck). Textliche Ergänzungen in Landessprache empfohlen.',
      mandatory: false,
      category: 'Produktkennzeichnung',
      subcategory: 'Pflege',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'Handelsüblichkeit, Verbraucherschutz',
      authority: 'Verbraucherschutz',
      tips: [
        'Ginetex-Symbole verwenden',
        'Symbole in korrekter Reihenfolge',
        'Dauerhaft lesbar (waschbeständig)',
      ],
      applicableProducts: ['Bekleidung, Heimtextilien'],
      priority: 'medium',
    },
    {
      id: 'de-tex-3',
      title: 'Größenkennzeichnung',
      description: 'Korrekte Größenangabe nach EU-Standards',
      detailedDescription: 'Die Größenkennzeichnung sollte europäischen Standards folgen (EN 13402 für Bekleidung). Körpermaße in Zentimetern oder standardisierte Größenbezeichnungen. Bei Schuhen: EU-Größensystem oder Mondopoint.',
      mandatory: false,
      category: 'Produktkennzeichnung',
      subcategory: 'Größe',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'EN 13402, Handelsüblichkeit',
      tips: [
        'EN 13402 für Maßangaben',
        'Größentabelle bereitstellen',
        'International unterschiedliche Systeme beachten',
      ],
      applicableProducts: ['Bekleidung, Schuhe'],
      priority: 'low',
    },
    {
      id: 'de-tex-4',
      title: 'Herkunftsland-Kennzeichnung (falls angegeben)',
      description: 'Wahrheitsgemäße Made in/Hergestellt in Angabe',
      detailedDescription: 'Die Angabe des Herkunftslandes ist freiwillig, muss aber wahrheitsgemäß sein. "Made in Germany" setzt wesentliche Herstellungsschritte in Deutschland voraus. Irreführende Herkunftsangaben sind wettbewerbsrechtlich unzulässig.',
      mandatory: false,
      category: 'Produktkennzeichnung',
      subcategory: 'Herkunft',
      documentRequired: false,
      checked: false,
      status: 'not_applicable',
      legalBasis: 'UWG (Wettbewerbsrecht)',
      authority: 'Wettbewerbsbehörden',
      penalties: 'Abmahnung, Unterlassung, Schadensersatz',
      tips: [
        'Nur bei wesentlicher Fertigung im Land',
        'Dokumentation der Lieferkette',
        'Bei Importen vorsichtig sein',
      ],
      applicableProducts: ['Alle Produkte bei freiwilliger Angabe'],
      priority: 'low',
    },

    // === CHEMIKALIEN ===
    {
      id: 'de-tex-10',
      title: 'REACH SVHC-Prüfung für Textilien',
      description: 'Prüfung auf besonders besorgniserregende Stoffe',
      detailedDescription: 'Textilien müssen auf SVHC-Stoffe geprüft werden. Relevante Stoffgruppen: Azofarbstoffe, Phthalate, Flammschutzmittel, PFAS, bestimmte Weichmacher. Bei Gehalt >0,1% Massenanteil: Informationspflicht und SCIP-Meldung.',
      mandatory: true,
      category: 'Chemikalien (REACH)',
      subcategory: 'SVHC',
      documentRequired: true,
      documentTypes: ['SVHC-Analyse', 'Lieferantenerklärungen'],
      checked: true,
      status: 'completed',
      legalBasis: 'REACH-Verordnung',
      authority: 'ECHA, BAuA',
      tips: [
        'Lieferkette systematisch abfragen',
        'Besondere Aufmerksamkeit bei Importen aus Drittländern',
        'Stichprobenprüfung durch Labor',
      ],
      applicableProducts: ['Alle Textilien'],
      priority: 'high',
    },
    {
      id: 'de-tex-11',
      title: 'REACH Anhang XVII Eintrag 43 (Azofarbstoffe)',
      description: 'Verbotene Azofarbstoffe nicht enthalten',
      detailedDescription: 'Textilien und Lederwaren, die mit der Haut in Berührung kommen, dürfen keine Azofarbstoffe enthalten, die eines oder mehrere der 22 gelisteten aromatischen Amine freisetzen können. Grenzwert: 30 mg/kg pro Amin.',
      mandatory: true,
      category: 'Chemikalien (REACH)',
      subcategory: 'Verbotene Stoffe',
      documentRequired: true,
      documentTypes: ['Azofarbstoff-Prüfbericht', 'Lieferantenerklärung'],
      checked: true,
      status: 'completed',
      legalBasis: 'REACH Anhang XVII Eintrag 43',
      authority: 'ECHA, Marktüberwachung',
      penalties: 'Vertriebsverbot, Bußgeld',
      tips: [
        'Laborprüfung bei Risikoprodukten',
        'Nur zertifizierte Färbereien nutzen',
        'Lieferantenerklärungen einfordern',
      ],
      applicableProducts: ['Bekleidung, Heimtextilien, Bettwäsche'],
      priority: 'critical',
    },
    {
      id: 'de-tex-12',
      title: 'REACH Anhang XVII Eintrag 72 (CMR-Stoffe)',
      description: 'CMR-Stoffe in Textilien beschränkt',
      detailedDescription: 'Ab 2024: Bestimmte CMR-Stoffe (krebserzeugend, erbgutverändernd, fortpflanzungsgefährdend) sind in Bekleidung, Textilien und Schuhen beschränkt. Über 30 Stoffe mit spezifischen Grenzwerten betroffen.',
      mandatory: true,
      category: 'Chemikalien (REACH)',
      subcategory: 'CMR-Stoffe',
      documentRequired: true,
      documentTypes: ['CMR-Konformitätsprüfung'],
      checked: true,
      status: 'completed',
      legalBasis: 'REACH Anhang XVII Eintrag 72',
      authority: 'ECHA, Marktüberwachung',
      penalties: 'Vertriebsverbot, Bußgeld',
      tips: [
        'Stoffliste regelmäßig prüfen (Erweiterungen möglich)',
        'Laboranalyse bei Risikoprodukten',
      ],
      applicableProducts: ['Bekleidung, Schuhe, Accessoires'],
      priority: 'critical',
    },
    {
      id: 'de-tex-13',
      title: 'PFAS-Beschränkungen',
      description: 'Per- und polyfluorierte Alkylsubstanzen',
      detailedDescription: 'PFAS werden zunehmend eingeschränkt. Bereits jetzt: PFOA verboten. Kommend: Universelle PFAS-Beschränkung wird diskutiert. PFAS werden in Textilien für Wasser- und Schmutzabweisung verwendet. Alternativen prüfen.',
      mandatory: true,
      category: 'Chemikalien (REACH)',
      subcategory: 'PFAS',
      documentRequired: true,
      documentTypes: ['PFAS-Analyse'],
      checked: false,
      status: 'in_progress',
      legalBasis: 'REACH Anhang XVII Eintrag 68 (PFOA), geplante Universalbeschränkung',
      authority: 'ECHA',
      tips: [
        'PFAS-freie Alternativen evaluieren',
        'Entwicklung der Regulierung beobachten',
        'Lieferkette auf PFAS prüfen',
      ],
      applicableProducts: ['Funktionsbekleidung, Outdoor-Textilien'],
      priority: 'high',
    },

    // === VERPACKUNG ===
    {
      id: 'de-tex-20',
      title: 'LUCID-Registrierung',
      description: 'Verpackungsregister-Registrierung',
      detailedDescription: 'Verkaufsverpackungen für Textilprodukte (Polybeutel, Kartons, Hang-Tags) müssen im LUCID-Register registriert sein.',
      mandatory: true,
      category: 'Verpackung (VerpackG)',
      subcategory: 'Registrierung',
      documentRequired: true,
      documentTypes: ['LUCID-Registrierung'],
      checked: true,
      status: 'completed',
      legalBasis: 'VerpackG §9',
      authority: 'Zentrale Stelle Verpackungsregister',
      penalties: 'Bis zu 200.000 € Bußgeld',
      applicableProducts: ['Alle verpackten Textilien'],
      priority: 'critical',
    },
    {
      id: 'de-tex-21',
      title: 'Systembeteiligung für Verpackungen',
      description: 'Duales System für Verpackungsentsorgung',
      detailedDescription: 'Beteiligung an einem zugelassenen Dualen System für alle systembeteiligungspflichtigen Verpackungen. Mengenmeldungen korrekt und fristgerecht abgeben.',
      mandatory: true,
      category: 'Verpackung (VerpackG)',
      subcategory: 'Systembeteiligung',
      documentRequired: true,
      documentTypes: ['Systemvertrag'],
      checked: true,
      status: 'completed',
      legalBasis: 'VerpackG §7',
      authority: 'ZSVR',
      penalties: 'Bis zu 200.000 € Bußgeld',
      applicableProducts: ['Alle verpackten Produkte'],
      priority: 'critical',
    },

    // === NACHHALTIGKEIT ===
    {
      id: 'de-tex-30',
      title: 'ESPR/DPP Vorbereitung (ab 2027)',
      description: 'Vorbereitung auf Digitalen Produktpass für Textilien',
      detailedDescription: 'Ab 2027 wird der Digitale Produktpass für Textilien verpflichtend. Jetzt vorbereiten: Datenerfassung entlang der Lieferkette, Materialzusammensetzung, Herkunft, Nachhaltigkeitsdaten, Recyclingfähigkeit, Reparierbarkeit.',
      mandatory: false,
      category: 'Nachhaltigkeit',
      subcategory: 'DPP',
      documentRequired: true,
      documentTypes: ['Lieferkettendokumentation', 'Materialdatenblätter'],
      checked: false,
      status: 'pending',
      legalBasis: 'ESPR (EU) 2024/1781',
      authority: 'EU-Kommission',
      deadline: '2027',
      tips: [
        'Datenerfassung jetzt aufbauen',
        'Lieferkettentransparenz erhöhen',
        'IT-Systeme vorbereiten',
      ],
      applicableProducts: ['Alle Textilien ab 2027'],
      priority: 'medium',
    },
    {
      id: 'de-tex-31',
      title: 'EPR für Textilien vorbereiten (ab 2025)',
      description: 'Erweiterte Herstellerverantwortung für Textilien',
      detailedDescription: 'Ab 2025 wird in mehreren EU-Ländern ein EPR-System für Textilien eingeführt. Hersteller müssen sich registrieren und Gebühren für die Sammlung und Verwertung zahlen. Öko-Modulation der Gebühren nach Nachhaltigkeit.',
      mandatory: false,
      category: 'Nachhaltigkeit',
      subcategory: 'EPR',
      documentRequired: false,
      checked: false,
      status: 'pending',
      legalBasis: 'Abfallrahmenrichtlinie, nationale Umsetzung',
      deadline: '2025',
      tips: [
        'Entwicklung in Zielmärkten beobachten',
        'Nachhaltigere Produkte für Gebührenvorteile',
        'Auf Registrierungspflichten vorbereiten',
      ],
      applicableProducts: ['Alle Textilien'],
      priority: 'medium',
    },
  ],

  'DE-batteries': [
    // Umfangreiche Checkliste für Batterien
    {
      id: 'de-bat-1',
      title: 'EU-Batterieverordnung Konformität',
      description: 'Einhaltung der neuen EU-Batterieverordnung 2023/1542',
      detailedDescription: 'Die neue EU-Batterieverordnung ersetzt die alte Batterierichtlinie und führt umfassende neue Anforderungen ein: Digitaler Batteriepass (ab 2027), CO2-Fußabdruck, recycelter Inhalt, Due Diligence, Leistungs- und Haltbarkeitsanforderungen.',
      mandatory: true,
      category: 'EU-Batterieverordnung',
      subcategory: 'Grundanforderungen',
      documentRequired: true,
      documentTypes: ['Konformitätsbewertung'],
      checked: false,
      status: 'in_progress',
      legalBasis: 'Verordnung (EU) 2023/1542',
      authority: 'EU-Kommission, nationale Behörden',
      tips: [
        'Zeitplan für verschiedene Anforderungen beachten',
        'Frühzeitig mit Implementierung beginnen',
        'Lieferkette einbinden',
      ],
      applicableProducts: ['Alle Batterien'],
      priority: 'critical',
    },
    {
      id: 'de-bat-2',
      title: 'stiftung ear Batterie-Registrierung',
      description: 'Registrierung als Batteriehersteller bei der stiftung ear',
      detailedDescription: 'Vor dem Inverkehrbringen von Batterien in Deutschland ist eine Registrierung bei der stiftung ear erforderlich. Dies gilt für alle Batterietypen: Gerätebatterien, Industriebatterien, Fahrzeugbatterien, LMT-Batterien.',
      mandatory: true,
      category: 'Registrierung Deutschland',
      subcategory: 'stiftung ear',
      documentRequired: true,
      documentTypes: ['ear-Registrierung Batterien'],
      checked: true,
      status: 'completed',
      legalBasis: 'BattG §4, EU-Batterieverordnung',
      authority: 'stiftung ear',
      penalties: 'Bis zu 100.000 € Bußgeld, Vertriebsverbot',
      applicableProducts: ['Alle Batterien'],
      priority: 'critical',
    },
    {
      id: 'de-bat-3',
      title: 'Batteriesymbol und chemische Symbole',
      description: 'Durchgestrichene Mülltonne und Pb/Cd/Hg wenn zutreffend',
      detailedDescription: 'Alle Batterien müssen mit dem Symbol der durchgestrichenen Mülltonne gekennzeichnet sein. Zusätzlich chemische Symbole für Blei (Pb), Cadmium (Cd) oder Quecksilber (Hg) wenn diese Stoffe über den Grenzwerten enthalten sind.',
      mandatory: true,
      category: 'Kennzeichnung',
      subcategory: 'Symbole',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'EU-Batterieverordnung Art. 13',
      authority: 'Marktüberwachung',
      tips: [
        'Symbol mind. 3% der Oberfläche',
        'Max. 5cm x 5cm',
        'Chemische Symbole unter dem Mülltonnensymbol',
      ],
      applicableProducts: ['Alle Batterien'],
      priority: 'high',
    },
    {
      id: 'de-bat-4',
      title: 'QR-Code auf Batterie (ab Kapazitätsgrenzen)',
      description: 'QR-Code für Zugang zu Batterieinformationen',
      detailedDescription: 'Ab bestimmten Kapazitätsgrenzen (wird definiert) müssen Batterien einen QR-Code tragen, der zu einem Batterie-Informationsblatt führt. Ab 2027: QR-Code für Digitalen Batteriepass.',
      mandatory: true,
      category: 'Kennzeichnung',
      subcategory: 'QR-Code',
      documentRequired: false,
      checked: false,
      status: 'pending',
      legalBasis: 'EU-Batterieverordnung Art. 13(5), Art. 77',
      authority: 'EU-Kommission',
      deadline: '2027-02-18 für DPP',
      applicableProducts: ['Industriebatterien, LMT-Batterien, EV-Batterien'],
      priority: 'high',
    },
    {
      id: 'de-bat-5',
      title: 'Kapazitätsangabe',
      description: 'Angabe der nominalen Kapazität in mAh oder Ah',
      detailedDescription: 'Die Kapazität muss auf Gerätebatterien und Starterbatterien angegeben werden. Angabe in Milliamperestunden (mAh) oder Amperestunden (Ah).',
      mandatory: true,
      category: 'Kennzeichnung',
      subcategory: 'Kapazität',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'EU-Batterieverordnung Art. 13(3)',
      applicableProducts: ['Gerätebatterien, Starterbatterien'],
      priority: 'high',
    },
    {
      id: 'de-bat-6',
      title: 'Rücknahmesystem Beteiligung',
      description: 'Teilnahme an kollektivem oder eigenem Rücknahmesystem',
      detailedDescription: 'Hersteller müssen die Rücknahme von Altbatterien sicherstellen. Beteiligung an kollektivem System (z.B. GRS, REBAT) oder Einrichtung eines eigenen Systems mit Genehmigung.',
      mandatory: true,
      category: 'Rücknahme & Verwertung',
      subcategory: 'Rücknahmesystem',
      documentRequired: true,
      documentTypes: ['Systemvertrag', 'Genehmigung'],
      checked: true,
      status: 'completed',
      legalBasis: 'BattG §5, EU-Batterieverordnung Kapitel VII',
      authority: 'stiftung ear, UBA',
      penalties: 'Bis zu 100.000 € Bußgeld',
      applicableProducts: ['Alle Batterien'],
      priority: 'critical',
    },
    {
      id: 'de-bat-7',
      title: 'CO2-Fußabdruck-Erklärung (ab 2025/2026)',
      description: 'Deklaration des Carbon Footprint der Batterie',
      detailedDescription: 'Für Traktionsbatterien und Industriebatterien >2kWh ist ab 2025 eine CO2-Fußabdruck-Erklärung erforderlich. Ab 2026 müssen Leistungsklassen eingehalten werden, ab 2028 Höchstgrenzen.',
      mandatory: true,
      category: 'Nachhaltigkeit',
      subcategory: 'CO2-Fußabdruck',
      documentRequired: true,
      documentTypes: ['CO2-Fußabdruck-Erklärung'],
      checked: false,
      status: 'pending',
      legalBasis: 'EU-Batterieverordnung Art. 7',
      deadline: '2025 für Deklaration',
      tips: [
        'LCA nach ISO 14040/44',
        'Berechnungsregeln der EU-Kommission verwenden',
        'Verifizierung durch Dritte',
      ],
      applicableProducts: ['EV-Batterien, Industriebatterien >2kWh'],
      priority: 'high',
    },
    {
      id: 'de-bat-8',
      title: 'Mindestgehalt recyceltes Material (ab 2031)',
      description: 'Mindestanteile von Kobalt, Blei, Lithium, Nickel aus Recycling',
      detailedDescription: 'Ab 2031 (bzw. 2036 mit höheren Werten): Mindestgehalt an recyceltem Kobalt, Blei, Lithium und Nickel. Nachweis über Massenbilanzsystem.',
      mandatory: false,
      category: 'Nachhaltigkeit',
      subcategory: 'Recycelter Inhalt',
      documentRequired: true,
      documentTypes: ['Recyclingnachweis'],
      checked: false,
      status: 'pending',
      legalBasis: 'EU-Batterieverordnung Art. 8',
      deadline: '2031',
      applicableProducts: ['EV-Batterien, Industriebatterien, LMT-Batterien'],
      priority: 'medium',
    },
    {
      id: 'de-bat-9',
      title: 'Due Diligence Lieferkette',
      description: 'Sorgfaltspflichten für Rohstoffe',
      detailedDescription: 'Ab 2025: Wirtschaftsakteure müssen Due Diligence-Pflichten für die Rohstofflieferkette erfüllen. Orientierung an OECD-Leitfaden für Sorgfaltspflichten. Besonders für Kobalt, Lithium, Nickel, natürlichen Graphit.',
      mandatory: true,
      category: 'Nachhaltigkeit',
      subcategory: 'Due Diligence',
      documentRequired: true,
      documentTypes: ['Due Diligence Bericht'],
      checked: false,
      status: 'pending',
      legalBasis: 'EU-Batterieverordnung Kapitel VI',
      deadline: '2025',
      tips: [
        'OECD-Leitfaden befolgen',
        'Risikobewertung der Lieferanten',
        'Jährliche Berichterstattung',
      ],
      applicableProducts: ['Alle Batterien (mit Schwellenwerten)'],
      priority: 'high',
    },
    {
      id: 'de-bat-10',
      title: 'Digitaler Batteriepass (ab 2027)',
      description: 'Elektronischer Datensatz für jede Batterie',
      detailedDescription: 'Ab 18.02.2027 für LMT-Batterien und Industriebatterien >2kWh: Digitaler Produktpass mit allen relevanten Informationen. Zugang über QR-Code. Enthält: Kennung, Hersteller, Materialzusammensetzung, CO2-Fußabdruck, Leistungsparameter, Zustandsdaten.',
      mandatory: true,
      category: 'Digitaler Produktpass',
      subcategory: 'Batteriepass',
      documentRequired: true,
      documentTypes: ['Digitaler Batteriepass'],
      checked: false,
      status: 'pending',
      legalBasis: 'EU-Batterieverordnung Art. 77',
      deadline: '2027-02-18',
      tips: [
        'Technische Spezifikationen der EU beachten',
        'Datenmanagementsystem aufbauen',
        'Batteriemanagementsystem integrieren',
      ],
      applicableProducts: ['LMT-Batterien >2kWh, Industriebatterien >2kWh, EV-Batterien'],
      priority: 'high',
    },
  ],

  'FR-electronics': [
    {
      id: 'fr-elec-1',
      title: 'CE-Kennzeichnung',
      description: 'CE-Zeichen auf Produkt oder Verpackung',
      detailedDescription: 'Identisch mit EU-weiten Anforderungen. Mindestens 5mm Höhe, korrekte Proportionen.',
      mandatory: true,
      category: 'Sicherheit',
      subcategory: 'CE',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'Règlement (CE) 765/2008',
      applicableProducts: ['Alle Elektronikprodukte'],
      priority: 'critical',
    },
    {
      id: 'fr-elec-2',
      title: 'Indice de Réparabilité (Reparierbarkeitsindex)',
      description: 'Index von 0-10 sichtbar am Point of Sale',
      detailedDescription: 'Für bestimmte Produktkategorien muss der Reparierbarkeitsindex (0-10) am Point of Sale angezeigt werden. Bewertet werden: Verfügbarkeit von Dokumentation (20%), Demontierbarkeit (20%), Ersatzteilverfügbarkeit (20%), Ersatzteilpreise (20%), produktspezifische Kriterien (20%).',
      mandatory: true,
      category: 'Nachhaltigkeit',
      subcategory: 'Reparierbarkeit',
      documentRequired: true,
      documentTypes: ['Reparierbarkeitsindex-Berechnung', 'Indexanzeige'],
      checked: false,
      status: 'pending',
      legalBasis: 'Loi AGEC, Décret n° 2020-1757',
      authority: 'DGCCRF',
      penalties: 'Bis zu 15.000 € pro Produkt',
      tips: [
        'Berechnungstool der ADEME nutzen',
        'Index auf Preisschild oder separat am POS',
        'Farbskala Rot-Orange-Gelb-Hellgrün-Grün',
        'Online-Shops: Index auf Produktseite',
      ],
      applicableProducts: ['Smartphones', 'Laptops', 'TVs', 'Waschmaschinen', 'Staubsauger', 'Geschirrspüler', 'Rasenmäher', 'Hochdruckreiniger'],
      priority: 'critical',
    },
    {
      id: 'fr-elec-3',
      title: 'Triman Symbol',
      description: 'Recycling-Symbol auf Verpackung und Produkt',
      detailedDescription: 'Das Triman-Symbol muss auf allen recycelbaren Produkten und Verpackungen angebracht werden. Es zeigt an, dass das Produkt einem Sammelsystem unterliegt. Mindestgröße: 6mm bei bedruckten Flächen.',
      mandatory: true,
      category: 'Recycling',
      subcategory: 'Triman',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'Loi AGEC, Décret n° 2014-1577',
      authority: 'ADEME',
      penalties: 'Bis zu 7.500 € Bußgeld',
      tips: [
        'Symbol auf Produkt oder Verpackung',
        'Mindestgröße 6mm beachten',
        'Kontrastreiche Darstellung',
      ],
      applicableProducts: ['Alle recycelbaren Produkte und Verpackungen'],
      priority: 'high',
    },
    {
      id: 'fr-elec-4',
      title: 'Info-tri Kennzeichnung',
      description: 'Detaillierte Entsorgungshinweise für Verbraucher',
      detailedDescription: 'Zusätzlich zum Triman-Symbol sind detaillierte Sortieranweisungen erforderlich. Das Info-tri zeigt, wie jeder Bestandteil der Verpackung zu entsorgen ist (Gelbe Tonne, Grüne Tonne, etc.).',
      mandatory: true,
      category: 'Recycling',
      subcategory: 'Info-tri',
      documentRequired: false,
      checked: false,
      status: 'pending',
      legalBasis: 'Loi AGEC, Décret n° 2021-835',
      authority: 'CITEO, ADEME',
      penalties: 'Bis zu 7.500 € Bußgeld',
      tips: [
        'CITEO-Leitfaden für korrekte Gestaltung',
        'Für jeden Verpackungsbestandteil',
        'Auf Französisch',
      ],
      applicableProducts: ['Alle Verpackungen für französischen Markt'],
      priority: 'high',
    },
    {
      id: 'fr-elec-5',
      title: 'Ersatzteil-Verfügbarkeit',
      description: 'Information über Ersatzteilverfügbarkeit (mind. 5-10 Jahre)',
      detailedDescription: 'Am Point of Sale muss die Dauer der Ersatzteilverfügbarkeit angegeben werden. Für viele Produktkategorien: mindestens 5 Jahre (bis zu 10 Jahre für manche Kategorien) ab dem letzten Inverkehrbringen.',
      mandatory: true,
      category: 'Nachhaltigkeit',
      subcategory: 'Ersatzteile',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'Loi AGEC Art. 19',
      authority: 'DGCCRF',
      penalties: 'Wettbewerbsverstoß',
      tips: [
        'Verfügbarkeitsdauer auf POS und Online',
        'Lieferfrist für Ersatzteile max. 15 Tage',
        'Ersatzteilliste bereithalten',
      ],
      applicableProducts: ['Elektrogeräte, Möbel'],
      priority: 'high',
    },
    {
      id: 'fr-elec-6',
      title: 'Software-Update Information',
      description: 'Information über Dauer der Software-Unterstützung',
      detailedDescription: 'Für vernetzte Geräte: Information über die Dauer der Software-Updates muss dem Verbraucher bereitgestellt werden.',
      mandatory: true,
      category: 'Nachhaltigkeit',
      subcategory: 'Software',
      documentRequired: false,
      checked: false,
      status: 'pending',
      legalBasis: 'Loi AGEC',
      authority: 'DGCCRF',
      tips: [
        'Update-Zeitraum auf Produktseite',
        'Sicherheitsupdates vs. Funktionsupdates unterscheiden',
      ],
      applicableProducts: ['Smartphones', 'Tablets', 'Smart Home', 'IoT-Geräte'],
      priority: 'medium',
    },
    {
      id: 'fr-elec-7',
      title: 'REP-Registrierung (DEEE)',
      description: 'Registrierung bei einem eco-organisme für Elektrogeräte',
      detailedDescription: 'Vor dem Inverkehrbringen von Elektrogeräten in Frankreich muss eine Registrierung bei einem zugelassenen eco-organisme erfolgen (z.B. ecosystem, Ecologic). Beitrag zur Finanzierung der Sammlung und Verwertung.',
      mandatory: true,
      category: 'REP (Herstellerverantwortung)',
      subcategory: 'DEEE',
      documentRequired: true,
      documentTypes: ['REP-Vertrag', 'Unique Identifier'],
      checked: true,
      status: 'completed',
      legalBasis: 'Loi AGEC, Code de l\'environnement',
      authority: 'ADEME',
      penalties: 'Bis zu 200.000 € Bußgeld',
      tips: [
        'Unique Identifier auf Rechnungen angeben',
        'Mengenmeldungen korrekt',
        'Öko-Modulation beachten',
      ],
      links: [
        { title: 'ecosystem', url: 'https://www.ecosystem.eco/' },
        { title: 'Ecologic', url: 'https://www.ecologic-france.com/' },
      ],
      applicableProducts: ['Alle Elektro- und Elektronikgeräte'],
      priority: 'critical',
    },
    {
      id: 'fr-elec-8',
      title: 'Unique Identifier (Identifiant Unique)',
      description: 'Eindeutiger Produktidentifikator für REP-Produkte',
      detailedDescription: 'Für alle REP-pflichtigen Produkte muss ein eindeutiger Identifikator vergeben und auf Rechnungen angegeben werden. Ermöglicht Rückverfolgbarkeit.',
      mandatory: true,
      category: 'REP (Herstellerverantwortung)',
      subcategory: 'Identifikation',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'Loi AGEC',
      authority: 'ADEME',
      applicableProducts: ['Alle REP-pflichtigen Produkte'],
      priority: 'high',
    },
    {
      id: 'fr-elec-9',
      title: 'Indice de Durabilité (ab 2025)',
      description: 'Erweiterter Index für Haltbarkeit',
      detailedDescription: 'Ab 2025 ersetzt der Haltbarkeitsindex den Reparierbarkeitsindex. Er integriert zusätzlich Zuverlässigkeits- und Robustheitskriterien.',
      mandatory: true,
      category: 'Nachhaltigkeit',
      subcategory: 'Haltbarkeit',
      documentRequired: true,
      documentTypes: ['Haltbarkeitsindex-Berechnung'],
      checked: false,
      status: 'pending',
      legalBasis: 'Loi AGEC Art. 16-III',
      authority: 'DGCCRF',
      deadline: '2025',
      applicableProducts: ['Smartphones', 'Laptops', 'TVs', 'Waschmaschinen'],
      priority: 'high',
    },
    {
      id: 'fr-elec-10',
      title: 'Verbot der geplanten Obsoleszenz',
      description: 'Keine absichtliche Verkürzung der Lebensdauer',
      detailedDescription: 'Das französische Recht verbietet die geplante Obsoleszenz: absichtliche Maßnahmen zur Verkürzung der Produktlebensdauer, um den Ersatz zu beschleunigen. Straftat mit Gefängnisstrafe möglich.',
      mandatory: true,
      category: 'Nachhaltigkeit',
      subcategory: 'Anti-Obsoleszenz',
      documentRequired: false,
      checked: true,
      status: 'completed',
      legalBasis: 'Code de la consommation Art. L441-2',
      authority: 'DGCCRF, Staatsanwaltschaft',
      penalties: 'Bis zu 2 Jahre Gefängnis, 300.000 € Geldstrafe',
      tips: [
        'Produktdesign auf Langlebigkeit ausrichten',
        'Keine absichtlichen Schwachstellen',
        'Software-Updates nicht zur Leistungsminderung nutzen',
      ],
      applicableProducts: ['Alle Produkte'],
      priority: 'critical',
    },
  ],
};

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
  const [isSaving, setIsSaving] = useState(false);

  // Checklisten-Daten aus API oder Fallback
  const [checklistData, setChecklistData] = useState<Record<string, ChecklistItem[]>>(fallbackChecklistData);
  const [progressData, setProgressData] = useState<Record<string, ChecklistProgress>>({});

  const key = `${selectedCountry}-${selectedCategory}`;
  const checklist = checklistData[key] || [];

  const [itemStates, setItemStates] = useState<Record<string, ChecklistItem['status']>>({});

  // Daten aus API laden
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // Tenant setzen falls nicht vorhanden
      if (!getCurrentTenant()) {
        setTenant('demo-tenant');
      }

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
        // Bei Fehler bleiben die Fallback-Daten aktiv
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
