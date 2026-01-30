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
  recyclingNote: string;
  identificationFeature: string;
  /** @deprecated Use recyclingNote instead */
  recyclingHinweis: string;
  /** @deprecated Use identificationFeature instead */
  erkennungsmerkmal: string;
}

export interface WirelessType {
  id: string;
  name: string;
}

// English countries
const countriesEn: Country[] = [
  { code: 'DE', name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'FR', name: 'France', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'AT', name: 'Austria', flag: '\u{1F1E6}\u{1F1F9}' },
  { code: 'IT', name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'ES', name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'NL', name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'BE', name: 'Belgium', flag: '\u{1F1E7}\u{1F1EA}' },
  { code: 'PL', name: 'Poland', flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'SE', name: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'DK', name: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}' },
  { code: 'CZ', name: 'Czech Republic', flag: '\u{1F1E8}\u{1F1FF}' },
  { code: 'PT', name: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}' },
];

// German countries
const countriesDe: Country[] = [
  { code: 'DE', name: 'Deutschland', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'FR', name: 'Frankreich', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'AT', name: '\u00D6sterreich', flag: '\u{1F1E6}\u{1F1F9}' },
  { code: 'IT', name: 'Italien', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'ES', name: 'Spanien', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'NL', name: 'Niederlande', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'BE', name: 'Belgien', flag: '\u{1F1E7}\u{1F1EA}' },
  { code: 'PL', name: 'Polen', flag: '\u{1F1F5}\u{1F1F1}' },
  { code: 'SE', name: 'Schweden', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'DK', name: 'D\u00E4nemark', flag: '\u{1F1E9}\u{1F1F0}' },
  { code: 'CZ', name: 'Tschechien', flag: '\u{1F1E8}\u{1F1FF}' },
  { code: 'PT', name: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}' },
];

// Helper to create a PackagingMaterial with both old and new field names
function makeMaterial(
  base: Omit<PackagingMaterial, 'recyclingHinweis' | 'erkennungsmerkmal'>
): PackagingMaterial {
  return {
    ...base,
    recyclingHinweis: base.recyclingNote,
    erkennungsmerkmal: base.identificationFeature,
  };
}

// English packaging materials
const packagingMaterialsEn: PackagingMaterial[] = [
  // === PLASTICS (01-07) ===
  makeMaterial({
    id: 'plastic-pet',
    name: 'PET - Polyethylene Terephthalate',
    code: '\u2673 01 PET',
    category: 'Plastic',
    description: 'Clear, transparent plastic. Very good gas barrier properties.',
    examples: 'Beverage bottles, food packaging, fruit trays, films',
    recyclable: true,
    recyclingNote: 'Highly recyclable, processed into fibers, films or new bottles (rPET)',
    identificationFeature: 'Clear, slightly bluish, turns whitish when bent',
  }),
  makeMaterial({
    id: 'plastic-hdpe',
    name: 'HDPE - High-Density Polyethylene',
    code: '\u2674 02 HDPE',
    category: 'Plastic',
    description: 'Rigid, opaque plastic. Chemically resistant.',
    examples: 'Milk bottles, detergent bottles, shampoo bottles, shopping bags',
    recyclable: true,
    recyclingNote: 'Highly recyclable into pipes, pallets, trash cans',
    identificationFeature: 'Opaque, waxy surface, rigid',
  }),
  makeMaterial({
    id: 'plastic-pvc',
    name: 'PVC - Polyvinyl Chloride',
    code: '\u2675 03 PVC',
    category: 'Plastic',
    description: 'Hard or soft. Contains chlorine. Problematic for recycling.',
    examples: 'Pipes, window frames, cables, blister packaging, films',
    recyclable: false,
    recyclingNote: 'Difficult to recycle, disrupts plastic recycling, often thermal recovery',
    identificationFeature: 'Rigid PVC: stiff, glossy. Soft PVC: flexible, often smells of plasticizer',
  }),
  makeMaterial({
    id: 'plastic-ldpe',
    name: 'LDPE - Low-Density Polyethylene',
    code: '\u2676 04 LDPE',
    category: 'Plastic',
    description: 'Flexible, stretchable plastic. Good moisture barrier.',
    examples: 'Plastic bags, shrink films, squeeze bottles, freezer bags, cling wrap',
    recyclable: true,
    recyclingNote: 'Recyclable into films, trash bags, floor coverings',
    identificationFeature: 'Thin, flexible, crinkles when touched, translucent',
  }),
  makeMaterial({
    id: 'plastic-pp',
    name: 'PP - Polypropylene',
    code: '\u2677 05 PP',
    category: 'Plastic',
    description: 'Heat-resistant, chemically resistant. Good mechanical properties.',
    examples: 'Yogurt cups, margarine tubs, caps, microwave containers, straws',
    recyclable: true,
    recyclingNote: 'Highly recyclable into automotive parts, crates, pallets',
    identificationFeature: 'Rigid but flexible, slight "cracking" when bent, heat-resistant',
  }),
  makeMaterial({
    id: 'plastic-ps',
    name: 'PS - Polystyrene',
    code: '\u2678 06 PS',
    category: 'Plastic',
    description: 'As rigid plastic (GPPS) or expanded foam (EPS/Styrofoam). Brittle.',
    examples: 'Styrofoam packaging, disposable tableware, CD cases, yogurt cups',
    recyclable: false,
    recyclingNote: 'Technically recyclable but often too bulky. Usually thermal recovery',
    identificationFeature: 'Rigid PS: glass-like, breaks with splinters. EPS: foamed, very lightweight',
  }),
  makeMaterial({
    id: 'plastic-other',
    name: 'O - Other Plastics',
    code: '\u2679 07 O',
    category: 'Plastic',
    description: 'All other plastics or blends (PC, PA, ABS, PMMA, etc.)',
    examples: 'Multi-layer films, electronics housings, toys, CDs, water dispensers',
    recyclable: false,
    recyclingNote: 'Usually not recyclable due to unknown composition',
    identificationFeature: 'Varies greatly depending on material',
  }),
  makeMaterial({
    id: 'plastic-pla',
    name: 'PLA - Polylactic Acid (Bioplastic)',
    code: '07 PLA',
    category: 'Bioplastic',
    description: 'Bio-based plastic made from corn starch. Compostable under industrial conditions.',
    examples: 'Disposable tableware, cups, packaging films, 3D printing',
    recyclable: false,
    recyclingNote: 'NOT for plastic recycling! Industrial composting or general waste',
    identificationFeature: 'Clear, similar to PET but more brittle, decomposes under heat',
  }),

  // === PAPER AND CARDBOARD (20-22) ===
  makeMaterial({
    id: 'pap-20',
    name: 'PAP 20 - Corrugated Cardboard',
    code: 'PAP 20',
    category: 'Paper/Cardboard',
    description: 'Multi-layer cardboard with corrugated structure between liners. Very sturdy.',
    examples: 'Shipping boxes, moving boxes, pallet packaging, displays',
    recyclable: true,
    recyclingNote: 'Highly recyclable, one of the most valuable waste paper streams',
    identificationFeature: 'Visible corrugated structure in cross-section, single or multi-wall',
  }),
  makeMaterial({
    id: 'pap-21',
    name: 'PAP 21 - Other Cardboard',
    code: 'PAP 21',
    category: 'Paper/Cardboard',
    description: 'Non-corrugated cardboard. Folding boxes, solid board.',
    examples: 'Folding boxes, cereal boxes, shoe boxes, pizza boxes (uncontaminated)',
    recyclable: true,
    recyclingNote: 'Well recyclable, but without coating/contamination',
    identificationFeature: 'No corrugation, uniform thickness, gray or brown',
  }),
  makeMaterial({
    id: 'pap-22',
    name: 'PAP 22 - Paper',
    code: 'PAP 22',
    category: 'Paper/Cardboard',
    description: 'Standard paper without coating.',
    examples: 'Newspapers, magazines, office paper, paper bags, tissue paper',
    recyclable: true,
    recyclingNote: 'Highly recyclable, reusable up to 6 times',
    identificationFeature: 'Thin, tears easily, no coating',
  }),

  // === METALS (40-41) ===
  makeMaterial({
    id: 'metal-fe',
    name: 'FE 40 - Steel / Tinplate',
    code: 'FE 40',
    category: 'Metal',
    description: 'Tin-plated steel (tinplate) or uncoated steel.',
    examples: 'Canned goods, beverage cans, drums, bottle caps, metal buckets',
    recyclable: true,
    recyclingNote: 'Infinitely recyclable without quality loss, magnetically sortable',
    identificationFeature: 'Magnetic (magnet sticks to it), heavier than aluminum',
  }),
  makeMaterial({
    id: 'metal-alu',
    name: 'ALU 41 - Aluminum',
    code: 'ALU 41',
    category: 'Metal',
    description: 'Lightweight, corrosion-resistant metal.',
    examples: 'Beverage cans, aluminum foil, lids, tubes, aerosol cans, meal trays',
    recyclable: true,
    recyclingNote: 'Infinitely recyclable, recycling saves 95% energy compared to new production',
    identificationFeature: 'Non-magnetic, lightweight, silver-shiny',
  }),

  // === WOOD (50-51) ===
  makeMaterial({
    id: 'wood-for50',
    name: 'FOR 50 - Wood (untreated)',
    code: 'FOR 50',
    category: 'Wood',
    description: 'Natural, non-impregnated wood.',
    examples: 'Wooden pallets (untreated), wooden crates, fruit crates, wood wool',
    recyclable: true,
    recyclingNote: 'Material recovery or thermal recovery',
    identificationFeature: 'Natural wood color, no chemical odor',
  }),
  makeMaterial({
    id: 'wood-for51',
    name: 'FOR 51 - Cork',
    code: 'FOR 51',
    category: 'Wood',
    description: 'Bark of the cork oak, renewable raw material.',
    examples: 'Wine corks, cork flooring, bulletin boards, gaskets',
    recyclable: true,
    recyclingNote: 'Well recyclable into granules for insulation, flooring, etc.',
    identificationFeature: 'Lightweight, elastic, honeycomb structure',
  }),

  // === TEXTILES (60-69) ===
  makeMaterial({
    id: 'tex-60',
    name: 'TEX 60 - Cotton',
    code: 'TEX 60',
    category: 'Textile',
    description: 'Natural fiber from the cotton plant.',
    examples: 'Textile packaging, cotton bags, padding material',
    recyclable: true,
    recyclingNote: 'Reusable as material or as cleaning rags',
    identificationFeature: 'Soft, absorbent, natural',
  }),
  makeMaterial({
    id: 'tex-61',
    name: 'TEX 61 - Jute',
    code: 'TEX 61',
    category: 'Textile',
    description: 'Natural fiber, robust and tear-resistant.',
    examples: 'Jute sacks, coffee sacks, gift bags',
    recyclable: true,
    recyclingNote: 'Compostable or reusable as material',
    identificationFeature: 'Coarse texture, brown, slightly scratchy',
  }),

  // === GLASS (70-72) ===
  makeMaterial({
    id: 'glass-gl70',
    name: 'GL 70 - Clear Glass',
    code: 'GL 70',
    category: 'Glass',
    description: 'Transparent, clear glass without coloring.',
    examples: 'Food jars, pharmaceutical bottles, cosmetic bottles',
    recyclable: true,
    recyclingNote: 'Infinitely recyclable, must be collected separately from colored glass',
    identificationFeature: 'Completely transparent, clear',
  }),
  makeMaterial({
    id: 'glass-gl71',
    name: 'GL 71 - Green Glass',
    code: 'GL 71',
    category: 'Glass',
    description: 'Green-tinted glass, UV protection.',
    examples: 'Wine bottles, beer bottles, some mineral water bottles',
    recyclable: true,
    recyclingNote: 'Into green glass container, can also accept brown glass',
    identificationFeature: 'Green coloring, various shades of green',
  }),
  makeMaterial({
    id: 'glass-gl72',
    name: 'GL 72 - Brown Glass',
    code: 'GL 72',
    category: 'Glass',
    description: 'Brown-tinted glass, best light protection.',
    examples: 'Beer bottles, medicine bottles, some food jars',
    recyclable: true,
    recyclingNote: 'Into brown glass container (or green glass)',
    identificationFeature: 'Brown coloring, from light brown to dark brown',
  }),

  // === COMPOSITE MATERIALS (80-99) ===
  makeMaterial({
    id: 'composite-c-pap',
    name: 'C/PAP - Composite with Paper',
    code: 'C/PAP',
    category: 'Composite',
    description: 'Paper/cardboard as main component combined with other materials.',
    examples: 'Beverage cartons (Tetra Pak), coated cartons, paper with plastic coating',
    recyclable: true,
    recyclingNote: 'Recyclable in many regions via recycling bins, paper fibers are recovered',
    identificationFeature: 'Feels like cardboard, but glossy coated on the inside',
  }),
  makeMaterial({
    id: 'composite-c-ldpe',
    name: 'C/LDPE - Composite Film with LDPE',
    code: 'C/LDPE',
    category: 'Composite',
    description: 'Multi-layer film with LDPE and other plastics or aluminum.',
    examples: 'Chip bags, stand-up pouches, coffee packaging, cheese packaging',
    recyclable: false,
    recyclingNote: 'Usually not recyclable as material, thermal recovery',
    identificationFeature: 'Metallic sheen on inside, crinkles, multiple layers visible',
  }),
  makeMaterial({
    id: 'composite-c-alu',
    name: 'C/ALU - Composite with Aluminum',
    code: 'C/ALU',
    category: 'Composite',
    description: 'Material composite with aluminum, often for barrier packaging.',
    examples: 'Blister packs, coffee capsules, lid foils, tubes with aluminum coating',
    recyclable: false,
    recyclingNote: 'Difficult to recycle, aluminum hard to separate',
    identificationFeature: 'Silver-shiny, aluminum is palpable',
  }),

  // === OTHER ===
  makeMaterial({
    id: 'ceramic',
    name: 'Ceramic / Porcelain',
    code: 'none',
    category: 'Other',
    description: 'Fired clay or porcelain.',
    examples: 'Ceramic containers, porcelain vessels, clay jugs',
    recyclable: false,
    recyclingNote: 'Not recyclable in the glass cycle! General waste or construction debris',
    identificationFeature: 'Hard, opaque, resonates when tapped',
  }),
  makeMaterial({
    id: 'styrofoam-eps',
    name: 'EPS - Expanded Polystyrene (Styrofoam)',
    code: '\u2678 06 PS',
    category: 'Plastic',
    description: 'Foamed polystyrene, extremely lightweight.',
    examples: 'Transport protection, insulated boxes, molded parts, insulation',
    recyclable: true,
    recyclingNote: 'Recyclable with clean separation, often at collection points',
    identificationFeature: 'Very lightweight, white, crumbles, squeaks when rubbed',
  }),
  makeMaterial({
    id: 'foam-epp',
    name: 'EPP - Expanded Polypropylene',
    code: '\u2677 05 PP',
    category: 'Plastic',
    description: 'Foamed PP, elastic and shock-absorbing.',
    examples: 'Automotive bumpers, reusable packaging, protective cases',
    recyclable: true,
    recyclingNote: 'Recyclable, often used as a reusable solution',
    identificationFeature: 'Similar to Styrofoam but more elastic, springs back',
  }),
  makeMaterial({
    id: 'bubble-wrap',
    name: 'Bubble Wrap (PE)',
    code: '\u2674 02 HDPE / \u2676 04 LDPE',
    category: 'Plastic',
    description: 'PE film with enclosed air chambers.',
    examples: 'Protective packaging, cushioning material',
    recyclable: true,
    recyclingNote: 'Recyclable as PE, let air escape before disposal',
    identificationFeature: 'Transparent, air bubbles visible, poppable',
  }),
  makeMaterial({
    id: 'shrink-wrap',
    name: 'Shrink Wrap (PE/PVC/PET)',
    code: 'depends on material',
    category: 'Plastic',
    description: 'Film that shrinks when heated.',
    examples: 'Pallet securing, bundle packaging, sealing',
    recyclable: true,
    recyclingNote: 'Depends on material, PE is most recyclable',
    identificationFeature: 'Tightly stretched, closely fitted to product',
  }),
  makeMaterial({
    id: 'stretch-wrap',
    name: 'Stretch Wrap (LLDPE)',
    code: '\u2676 04 LLDPE',
    category: 'Plastic',
    description: 'Highly stretchable film for load securing.',
    examples: 'Pallet wrapping, bundling, transport protection',
    recyclable: true,
    recyclingNote: 'Well recyclable, often commercial collection',
    identificationFeature: 'Highly stretchable, tacky, transparent',
  }),
  makeMaterial({
    id: 'fill-material',
    name: 'Fill Material (Paper/Plastic)',
    code: 'depends on material',
    category: 'Other',
    description: 'Cushioning and fill material of various types.',
    examples: 'Packing paper, packing peanuts, air pillows, shredded paper',
    recyclable: true,
    recyclingNote: 'Separate by material and dispose accordingly',
    identificationFeature: 'Loose material for void filling',
  }),
  makeMaterial({
    id: 'desiccant',
    name: 'Desiccant (Silica Gel)',
    code: 'none',
    category: 'Other',
    description: 'Moisture absorber in small packets.',
    examples: 'Inserts in packaging, shoes, electronics',
    recyclable: false,
    recyclingNote: 'General waste, can be regenerated but not typical for households',
    identificationFeature: 'Small packets with beads, "Do not eat"',
  }),
];

// German packaging materials
const packagingMaterialsDe: PackagingMaterial[] = [
  // === KUNSTSTOFFE (01-07) ===
  makeMaterial({
    id: 'plastic-pet',
    name: 'PET - Polyethylenterephthalat',
    code: '\u2673 01 PET',
    category: 'Kunststoff',
    description: 'Klarer, transparenter Kunststoff. Sehr gute Gasbarriere-Eigenschaften.',
    examples: 'Getränkeflaschen, Lebensmittelverpackungen, Obstschalen, Folien',
    recyclable: true,
    recyclingNote: 'Sehr gut recycelbar, wird zu Fasern, Folien oder neuen Flaschen (rPET) verarbeitet',
    identificationFeature: 'Klar, leicht bläulich, wird beim Knicken weißlich',
  }),
  makeMaterial({
    id: 'plastic-hdpe',
    name: 'HDPE - Polyethylen hoher Dichte',
    code: '\u2674 02 HDPE',
    category: 'Kunststoff',
    description: 'Steifer, undurchsichtiger Kunststoff. Chemisch beständig.',
    examples: 'Milchflaschen, Waschmittelflaschen, Shampooflaschen, Einkaufstüten',
    recyclable: true,
    recyclingNote: 'Sehr gut recycelbar zu Rohren, Paletten, Mülltonnen',
    identificationFeature: 'Undurchsichtig, wachsartige Oberfläche, steif',
  }),
  makeMaterial({
    id: 'plastic-pvc',
    name: 'PVC - Polyvinylchlorid',
    code: '\u2675 03 PVC',
    category: 'Kunststoff',
    description: 'Hart oder weich. Enthält Chlor. Problematisch beim Recycling.',
    examples: 'Rohre, Fensterrahmen, Kabel, Blisterverpackungen, Folien',
    recyclable: false,
    recyclingNote: 'Schwer recycelbar, stört Kunststoffrecycling, oft thermische Verwertung',
    identificationFeature: 'Hart-PVC: steif, glänzend. Weich-PVC: biegsam, riecht oft nach Weichmacher',
  }),
  makeMaterial({
    id: 'plastic-ldpe',
    name: 'LDPE - Polyethylen niedriger Dichte',
    code: '\u2676 04 LDPE',
    category: 'Kunststoff',
    description: 'Flexibler, dehnbarer Kunststoff. Gute Feuchtigkeitsbarriere.',
    examples: 'Plastiktüten, Schrumpffolien, Quetschflaschen, Gefrierbeutel, Frischhaltefolie',
    recyclable: true,
    recyclingNote: 'Recycelbar zu Folien, Müllsäcken, Bodenbelägen',
    identificationFeature: 'Dünn, flexibel, knistert bei Berührung, durchscheinend',
  }),
  makeMaterial({
    id: 'plastic-pp',
    name: 'PP - Polypropylen',
    code: '\u2677 05 PP',
    category: 'Kunststoff',
    description: 'Hitzebeständig, chemisch beständig. Gute mechanische Eigenschaften.',
    examples: 'Joghurtbecher, Margarinedosen, Verschlüsse, Mikrowellenbehälter, Strohhalme',
    recyclable: true,
    recyclingNote: 'Sehr gut recycelbar zu Autoteilen, Kisten, Paletten',
    identificationFeature: 'Steif aber biegsam, leichtes "Knacken" beim Biegen, hitzebeständig',
  }),
  makeMaterial({
    id: 'plastic-ps',
    name: 'PS - Polystyrol',
    code: '\u2678 06 PS',
    category: 'Kunststoff',
    description: 'Als Hartkunststoff (GPPS) oder geschäumter Schaum (EPS/Styropor). Spröde.',
    examples: 'Styroporverpackungen, Einweggeschirr, CD-Hüllen, Joghurtbecher',
    recyclable: false,
    recyclingNote: 'Technisch recycelbar, aber oft zu sperrig. Meist thermische Verwertung',
    identificationFeature: 'Hart-PS: glasartig, bricht mit Splittern. EPS: geschäumt, sehr leicht',
  }),
  makeMaterial({
    id: 'plastic-other',
    name: 'O - Sonstige Kunststoffe',
    code: '\u2679 07 O',
    category: 'Kunststoff',
    description: 'Alle anderen Kunststoffe oder Mischungen (PC, PA, ABS, PMMA usw.)',
    examples: 'Mehrschichtfolien, Elektronikgehäuse, Spielzeug, CDs, Wasserspender',
    recyclable: false,
    recyclingNote: 'Meist nicht recycelbar wegen unbekannter Zusammensetzung',
    identificationFeature: 'Variiert stark je nach Material',
  }),
  makeMaterial({
    id: 'plastic-pla',
    name: 'PLA - Polymilchsäure (Biokunststoff)',
    code: '07 PLA',
    category: 'Biokunststoff',
    description: 'Biobasierter Kunststoff aus Maisstärke. Kompostierbar unter industriellen Bedingungen.',
    examples: 'Einweggeschirr, Becher, Verpackungsfolien, 3D-Druck',
    recyclable: false,
    recyclingNote: 'NICHT ins Kunststoffrecycling! Industrielle Kompostierung oder Restmüll',
    identificationFeature: 'Klar, ähnlich PET aber spröder, zersetzt sich unter Hitze',
  }),

  // === PAPIER UND KARTON (20-22) ===
  makeMaterial({
    id: 'pap-20',
    name: 'PAP 20 - Wellpappe',
    code: 'PAP 20',
    category: 'Papier/Karton',
    description: 'Mehrlagiger Karton mit Wellenstruktur zwischen Decklagen. Sehr stabil.',
    examples: 'Versandkartons, Umzugskartons, Palettenverpackung, Displays',
    recyclable: true,
    recyclingNote: 'Sehr gut recycelbar, einer der wertvollsten Altpapierströme',
    identificationFeature: 'Sichtbare Wellenstruktur im Querschnitt, ein- oder mehrwellig',
  }),
  makeMaterial({
    id: 'pap-21',
    name: 'PAP 21 - Sonstiger Karton',
    code: 'PAP 21',
    category: 'Papier/Karton',
    description: 'Nicht-gewellter Karton. Faltschachteln, Vollpappe.',
    examples: 'Faltschachteln, Müslikartons, Schuhkartons, Pizzakartons (unverschmutzt)',
    recyclable: true,
    recyclingNote: 'Gut recycelbar, aber ohne Beschichtung/Verschmutzung',
    identificationFeature: 'Keine Wellung, gleichmäßige Dicke, grau oder braun',
  }),
  makeMaterial({
    id: 'pap-22',
    name: 'PAP 22 - Papier',
    code: 'PAP 22',
    category: 'Papier/Karton',
    description: 'Standardpapier ohne Beschichtung.',
    examples: 'Zeitungen, Zeitschriften, Büropapier, Papiertüten, Seidenpapier',
    recyclable: true,
    recyclingNote: 'Sehr gut recycelbar, bis zu 6 Mal wiederverwendbar',
    identificationFeature: 'Dünn, reißt leicht, keine Beschichtung',
  }),

  // === METALLE (40-41) ===
  makeMaterial({
    id: 'metal-fe',
    name: 'FE 40 - Stahl / Weißblech',
    code: 'FE 40',
    category: 'Metall',
    description: 'Verzinnter Stahl (Weißblech) oder unbeschichteter Stahl.',
    examples: 'Konservendosen, Getränkedosen, Fässer, Kronkorken, Metalleimer',
    recyclable: true,
    recyclingNote: 'Unendlich recycelbar ohne Qualitätsverlust, magnetisch sortierbar',
    identificationFeature: 'Magnetisch (Magnet haftet), schwerer als Aluminium',
  }),
  makeMaterial({
    id: 'metal-alu',
    name: 'ALU 41 - Aluminium',
    code: 'ALU 41',
    category: 'Metall',
    description: 'Leichtes, korrosionsbeständiges Metall.',
    examples: 'Getränkedosen, Alufolie, Deckel, Tuben, Spraydosen, Menüschalen',
    recyclable: true,
    recyclingNote: 'Unendlich recycelbar, Recycling spart 95% Energie gegenüber Neuproduktion',
    identificationFeature: 'Nicht magnetisch, leicht, silber-glänzend',
  }),

  // === HOLZ (50-51) ===
  makeMaterial({
    id: 'wood-for50',
    name: 'FOR 50 - Holz (unbehandelt)',
    code: 'FOR 50',
    category: 'Holz',
    description: 'Naturbelassenes, nicht imprägniertes Holz.',
    examples: 'Holzpaletten (unbehandelt), Holzkisten, Obstkisten, Holzwolle',
    recyclable: true,
    recyclingNote: 'Stoffliche Verwertung oder thermische Verwertung',
    identificationFeature: 'Natürliche Holzfarbe, kein chemischer Geruch',
  }),
  makeMaterial({
    id: 'wood-for51',
    name: 'FOR 51 - Kork',
    code: 'FOR 51',
    category: 'Holz',
    description: 'Rinde der Korkeiche, nachwachsender Rohstoff.',
    examples: 'Weinkorken, Korkboden, Pinnwände, Dichtungen',
    recyclable: true,
    recyclingNote: 'Gut recycelbar zu Granulat für Dämmung, Bodenbeläge usw.',
    identificationFeature: 'Leicht, elastisch, Wabenstruktur',
  }),

  // === TEXTILIEN (60-69) ===
  makeMaterial({
    id: 'tex-60',
    name: 'TEX 60 - Baumwolle',
    code: 'TEX 60',
    category: 'Textil',
    description: 'Naturfaser der Baumwollpflanze.',
    examples: 'Textilverpackung, Baumwollbeutel, Polstermaterial',
    recyclable: true,
    recyclingNote: 'Stofflich wiederverwendbar oder als Putzlappen',
    identificationFeature: 'Weich, saugfähig, natürlich',
  }),
  makeMaterial({
    id: 'tex-61',
    name: 'TEX 61 - Jute',
    code: 'TEX 61',
    category: 'Textil',
    description: 'Naturfaser, robust und reißfest.',
    examples: 'Jutesäcke, Kaffeesäcke, Geschenkbeutel',
    recyclable: true,
    recyclingNote: 'Kompostierbar oder stofflich wiederverwendbar',
    identificationFeature: 'Grobe Struktur, braun, leicht kratzig',
  }),

  // === GLAS (70-72) ===
  makeMaterial({
    id: 'glass-gl70',
    name: 'GL 70 - Weißglas',
    code: 'GL 70',
    category: 'Glas',
    description: 'Transparentes, klares Glas ohne Einfärbung.',
    examples: 'Lebensmittelgläser, Pharmaflaschen, Kosmetikflaschen',
    recyclable: true,
    recyclingNote: 'Unendlich recycelbar, muss getrennt von Buntglas gesammelt werden',
    identificationFeature: 'Völlig transparent, klar',
  }),
  makeMaterial({
    id: 'glass-gl71',
    name: 'GL 71 - Grünglas',
    code: 'GL 71',
    category: 'Glas',
    description: 'Grün eingefärbtes Glas, UV-Schutz.',
    examples: 'Weinflaschen, Bierflaschen, einige Mineralwasserflaschen',
    recyclable: true,
    recyclingNote: 'In den Grünglas-Container, kann auch Braunglas aufnehmen',
    identificationFeature: 'Grüne Einfärbung, verschiedene Grüntöne',
  }),
  makeMaterial({
    id: 'glass-gl72',
    name: 'GL 72 - Braunglas',
    code: 'GL 72',
    category: 'Glas',
    description: 'Braun eingefärbtes Glas, bester Lichtschutz.',
    examples: 'Bierflaschen, Medizinflaschen, einige Lebensmittelgläser',
    recyclable: true,
    recyclingNote: 'In den Braunglas-Container (oder Grünglas)',
    identificationFeature: 'Braune Einfärbung, von hellbraun bis dunkelbraun',
  }),

  // === VERBUNDMATERIALIEN (80-99) ===
  makeMaterial({
    id: 'composite-c-pap',
    name: 'C/PAP - Verbund mit Papier',
    code: 'C/PAP',
    category: 'Verbund',
    description: 'Papier/Karton als Hauptbestandteil kombiniert mit anderen Materialien.',
    examples: 'Getränkekartons (Tetra Pak), beschichtete Kartons, Papier mit Kunststoffbeschichtung',
    recyclable: true,
    recyclingNote: 'In vielen Regionen über Gelben Sack/Tonne recycelbar, Papierfasern werden zurückgewonnen',
    identificationFeature: 'Fühlt sich wie Karton an, aber innen glänzend beschichtet',
  }),
  makeMaterial({
    id: 'composite-c-ldpe',
    name: 'C/LDPE - Verbundfolie mit LDPE',
    code: 'C/LDPE',
    category: 'Verbund',
    description: 'Mehrschichtfolie mit LDPE und anderen Kunststoffen oder Aluminium.',
    examples: 'Chipstüten, Standbodenbeutel, Kaffeeverpackung, Käseverpackung',
    recyclable: false,
    recyclingNote: 'Meist nicht stofflich recycelbar, thermische Verwertung',
    identificationFeature: 'Metallischer Glanz innen, knistert, mehrere Schichten sichtbar',
  }),
  makeMaterial({
    id: 'composite-c-alu',
    name: 'C/ALU - Verbund mit Aluminium',
    code: 'C/ALU',
    category: 'Verbund',
    description: 'Materialverbund mit Aluminium, oft für Barriereverpackungen.',
    examples: 'Blisterverpackungen, Kaffeekapseln, Deckelfolien, Tuben mit Aluminiumbeschichtung',
    recyclable: false,
    recyclingNote: 'Schwer recycelbar, Aluminium schwer trennbar',
    identificationFeature: 'Silber-glänzend, Aluminium ist fühlbar',
  }),

  // === SONSTIGE ===
  makeMaterial({
    id: 'ceramic',
    name: 'Keramik / Porzellan',
    code: 'none',
    category: 'Sonstige',
    description: 'Gebrannter Ton oder Porzellan.',
    examples: 'Keramikbehälter, Porzellangefäße, Tonkrüge',
    recyclable: false,
    recyclingNote: 'Nicht im Glaskreislauf recycelbar! Restmüll oder Bauschutt',
    identificationFeature: 'Hart, undurchsichtig, klingt beim Klopfen',
  }),
  makeMaterial({
    id: 'styrofoam-eps',
    name: 'EPS - Expandiertes Polystyrol (Styropor)',
    code: '\u2678 06 PS',
    category: 'Kunststoff',
    description: 'Geschäumtes Polystyrol, extrem leicht.',
    examples: 'Transportschutz, Isolierboxen, Formteile, Dämmung',
    recyclable: true,
    recyclingNote: 'Bei sauberer Trennung recycelbar, oft an Sammelstellen',
    identificationFeature: 'Sehr leicht, weiß, bröselt, quietscht beim Reiben',
  }),
  makeMaterial({
    id: 'foam-epp',
    name: 'EPP - Expandiertes Polypropylen',
    code: '\u2677 05 PP',
    category: 'Kunststoff',
    description: 'Geschäumtes PP, elastisch und stoßabsorbierend.',
    examples: 'Auto-Stoßfänger, Mehrwegverpackungen, Schutzkoffer',
    recyclable: true,
    recyclingNote: 'Recycelbar, wird oft als Mehrweglösung eingesetzt',
    identificationFeature: 'Ähnlich Styropor aber elastischer, federt zurück',
  }),
  makeMaterial({
    id: 'bubble-wrap',
    name: 'Luftpolsterfolie (PE)',
    code: '\u2674 02 HDPE / \u2676 04 LDPE',
    category: 'Kunststoff',
    description: 'PE-Folie mit eingeschlossenen Luftkammern.',
    examples: 'Schutzverpackung, Polstermaterial',
    recyclable: true,
    recyclingNote: 'Als PE recycelbar, Luft vor Entsorgung ablassen',
    identificationFeature: 'Transparent, Luftblasen sichtbar, ploppbar',
  }),
  makeMaterial({
    id: 'shrink-wrap',
    name: 'Schrumpffolie (PE/PVC/PET)',
    code: 'materialabhängig',
    category: 'Kunststoff',
    description: 'Folie, die sich unter Hitze zusammenzieht.',
    examples: 'Palettensicherung, Bündelverpackung, Versiegelung',
    recyclable: true,
    recyclingNote: 'Abhängig vom Material, PE ist am besten recycelbar',
    identificationFeature: 'Straff gespannt, eng am Produkt anliegend',
  }),
  makeMaterial({
    id: 'stretch-wrap',
    name: 'Stretchfolie (LLDPE)',
    code: '\u2676 04 LLDPE',
    category: 'Kunststoff',
    description: 'Hochdehnbare Folie zur Ladungssicherung.',
    examples: 'Palettenwicklung, Bündelung, Transportschutz',
    recyclable: true,
    recyclingNote: 'Gut recycelbar, oft gewerbliche Sammlung',
    identificationFeature: 'Hochdehnbar, klebrig, transparent',
  }),
  makeMaterial({
    id: 'fill-material',
    name: 'Füllmaterial (Papier/Kunststoff)',
    code: 'materialabhängig',
    category: 'Sonstige',
    description: 'Polster- und Füllmaterial verschiedener Art.',
    examples: 'Packpapier, Verpackungschips, Luftkissen, Schredder-Papier',
    recyclable: true,
    recyclingNote: 'Nach Material trennen und entsprechend entsorgen',
    identificationFeature: 'Loses Material zum Hohlraumfüllen',
  }),
  makeMaterial({
    id: 'desiccant',
    name: 'Trockenmittel (Silikagel)',
    code: 'none',
    category: 'Sonstige',
    description: 'Feuchtigkeitsabsorber in kleinen Beuteln.',
    examples: 'Beilagen in Verpackungen, Schuhen, Elektronik',
    recyclable: false,
    recyclingNote: 'Restmüll, kann regeneriert werden, aber nicht haushaltstypisch',
    identificationFeature: 'Kleine Beutel mit Kügelchen, "Nicht essen"',
  }),
];

// Backwards compatibility: default English exports
export const countries: Country[] = countriesEn;
export const packagingMaterials: PackagingMaterial[] = packagingMaterialsEn;

// Wireless types (no translation needed, technical terms)
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
];

/**
 * Get countries in the specified locale.
 * @param locale - 'en' for English, 'de' for German. Defaults to 'en'.
 */
export function getCountries(locale: 'en' | 'de' = 'en'): Country[] {
  return locale === 'de' ? countriesDe : countriesEn;
}

/**
 * Get packaging materials in the specified locale.
 * @param locale - 'en' for English, 'de' for German. Defaults to 'en'.
 */
export function getPackagingMaterials(locale: 'en' | 'de' = 'en'): PackagingMaterial[] {
  return locale === 'de' ? packagingMaterialsDe : packagingMaterialsEn;
}
