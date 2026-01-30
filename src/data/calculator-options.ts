export interface Country {
  code: string;
  name: string;
  flag: string;
}

export interface PackagingMaterial {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string;
  examples: string;
  recyclable: boolean;
  recyclingHinweis: string;
  erkennungsmerkmal: string;
}

export interface WirelessType {
  id: string;
  name: string;
}

// Länder
export const countries: Country[] = [
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
] as const;

// Umfassende Verpackungsmaterialien mit detaillierten Erklärungen
// Nach DIN EN ISO 1043-1, DIN EN ISO 11469 und Entscheidung 97/129/EG
export const packagingMaterials: PackagingMaterial[] = [
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
] as const;

// Wireless-Typen
export const wirelessTypes: WirelessType[] = [
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
] as const;
