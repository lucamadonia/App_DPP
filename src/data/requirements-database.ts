export interface Requirement {
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
export const requirementsDatabase: Requirement[] = [
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
