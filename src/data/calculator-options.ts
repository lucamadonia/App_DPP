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

// Countries
export const countries: Country[] = [
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹' },
] as const;

// Comprehensive packaging materials with detailed descriptions
// Per DIN EN ISO 1043-1, DIN EN ISO 11469 and Decision 97/129/EC
export const packagingMaterials: PackagingMaterial[] = [
  // === PLASTICS (01-07) ===
  // Codes 01-07 are internationally standardized for recycling
  {
    id: 'plastic-pet',
    name: 'PET - Polyethylene Terephthalate',
    code: '♳ 01 PET',
    category: 'Plastic',
    description: 'Clear, transparent plastic. Very good gas barrier properties.',
    examples: 'Beverage bottles, food packaging, fruit trays, films',
    recyclable: true,
    recyclingHinweis: 'Highly recyclable, processed into fibers, films or new bottles (rPET)',
    erkennungsmerkmal: 'Clear, slightly bluish, turns whitish when bent',
  },
  {
    id: 'plastic-hdpe',
    name: 'HDPE - High-Density Polyethylene',
    code: '♴ 02 HDPE',
    category: 'Plastic',
    description: 'Rigid, opaque plastic. Chemically resistant.',
    examples: 'Milk bottles, detergent bottles, shampoo bottles, shopping bags',
    recyclable: true,
    recyclingHinweis: 'Highly recyclable into pipes, pallets, trash cans',
    erkennungsmerkmal: 'Opaque, waxy surface, rigid',
  },
  {
    id: 'plastic-pvc',
    name: 'PVC - Polyvinyl Chloride',
    code: '♵ 03 PVC',
    category: 'Plastic',
    description: 'Hard or soft. Contains chlorine. Problematic for recycling.',
    examples: 'Pipes, window frames, cables, blister packaging, films',
    recyclable: false,
    recyclingHinweis: 'Difficult to recycle, disrupts plastic recycling, often thermal recovery',
    erkennungsmerkmal: 'Rigid PVC: stiff, glossy. Soft PVC: flexible, often smells of plasticizer',
  },
  {
    id: 'plastic-ldpe',
    name: 'LDPE - Low-Density Polyethylene',
    code: '♶ 04 LDPE',
    category: 'Plastic',
    description: 'Flexible, stretchable plastic. Good moisture barrier.',
    examples: 'Plastic bags, shrink films, squeeze bottles, freezer bags, cling wrap',
    recyclable: true,
    recyclingHinweis: 'Recyclable into films, trash bags, floor coverings',
    erkennungsmerkmal: 'Thin, flexible, crinkles when touched, translucent',
  },
  {
    id: 'plastic-pp',
    name: 'PP - Polypropylene',
    code: '♷ 05 PP',
    category: 'Plastic',
    description: 'Heat-resistant, chemically resistant. Good mechanical properties.',
    examples: 'Yogurt cups, margarine tubs, caps, microwave containers, straws',
    recyclable: true,
    recyclingHinweis: 'Highly recyclable into automotive parts, crates, pallets',
    erkennungsmerkmal: 'Rigid but flexible, slight "cracking" when bent, heat-resistant',
  },
  {
    id: 'plastic-ps',
    name: 'PS - Polystyrene',
    code: '♸ 06 PS',
    category: 'Plastic',
    description: 'As rigid plastic (GPPS) or expanded foam (EPS/Styrofoam). Brittle.',
    examples: 'Styrofoam packaging, disposable tableware, CD cases, yogurt cups',
    recyclable: false,
    recyclingHinweis: 'Technically recyclable but often too bulky. Usually thermal recovery',
    erkennungsmerkmal: 'Rigid PS: glass-like, breaks with splinters. EPS: foamed, very lightweight',
  },
  {
    id: 'plastic-other',
    name: 'O - Other Plastics',
    code: '♹ 07 O',
    category: 'Plastic',
    description: 'All other plastics or blends (PC, PA, ABS, PMMA, etc.)',
    examples: 'Multi-layer films, electronics housings, toys, CDs, water dispensers',
    recyclable: false,
    recyclingHinweis: 'Usually not recyclable due to unknown composition',
    erkennungsmerkmal: 'Varies greatly depending on material',
  },
  // Additional bioplastics
  {
    id: 'plastic-pla',
    name: 'PLA - Polylactic Acid (Bioplastic)',
    code: '07 PLA',
    category: 'Bioplastic',
    description: 'Bio-based plastic made from corn starch. Compostable under industrial conditions.',
    examples: 'Disposable tableware, cups, packaging films, 3D printing',
    recyclable: false,
    recyclingHinweis: 'NOT for plastic recycling! Industrial composting or general waste',
    erkennungsmerkmal: 'Clear, similar to PET but more brittle, decomposes under heat',
  },

  // === PAPER AND CARDBOARD (20-22) ===
  {
    id: 'pap-20',
    name: 'PAP 20 - Corrugated Cardboard',
    code: 'PAP 20',
    category: 'Paper/Cardboard',
    description: 'Multi-layer cardboard with corrugated structure between liners. Very sturdy.',
    examples: 'Shipping boxes, moving boxes, pallet packaging, displays',
    recyclable: true,
    recyclingHinweis: 'Highly recyclable, one of the most valuable waste paper streams',
    erkennungsmerkmal: 'Visible corrugated structure in cross-section, single or multi-wall',
  },
  {
    id: 'pap-21',
    name: 'PAP 21 - Other Cardboard',
    code: 'PAP 21',
    category: 'Paper/Cardboard',
    description: 'Non-corrugated cardboard. Folding boxes, solid board.',
    examples: 'Folding boxes, cereal boxes, shoe boxes, pizza boxes (uncontaminated)',
    recyclable: true,
    recyclingHinweis: 'Well recyclable, but without coating/contamination',
    erkennungsmerkmal: 'No corrugation, uniform thickness, gray or brown',
  },
  {
    id: 'pap-22',
    name: 'PAP 22 - Paper',
    code: 'PAP 22',
    category: 'Paper/Cardboard',
    description: 'Standard paper without coating.',
    examples: 'Newspapers, magazines, office paper, paper bags, tissue paper',
    recyclable: true,
    recyclingHinweis: 'Highly recyclable, reusable up to 6 times',
    erkennungsmerkmal: 'Thin, tears easily, no coating',
  },

  // === METALS (40-41) ===
  {
    id: 'metal-fe',
    name: 'FE 40 - Steel / Tinplate',
    code: 'FE 40',
    category: 'Metal',
    description: 'Tin-plated steel (tinplate) or uncoated steel.',
    examples: 'Canned goods, beverage cans, drums, bottle caps, metal buckets',
    recyclable: true,
    recyclingHinweis: 'Infinitely recyclable without quality loss, magnetically sortable',
    erkennungsmerkmal: 'Magnetic (magnet sticks to it), heavier than aluminum',
  },
  {
    id: 'metal-alu',
    name: 'ALU 41 - Aluminum',
    code: 'ALU 41',
    category: 'Metal',
    description: 'Lightweight, corrosion-resistant metal.',
    examples: 'Beverage cans, aluminum foil, lids, tubes, aerosol cans, meal trays',
    recyclable: true,
    recyclingHinweis: 'Infinitely recyclable, recycling saves 95% energy compared to new production',
    erkennungsmerkmal: 'Non-magnetic, lightweight, silver-shiny',
  },

  // === WOOD (50-51) ===
  {
    id: 'wood-for50',
    name: 'FOR 50 - Wood (untreated)',
    code: 'FOR 50',
    category: 'Wood',
    description: 'Natural, non-impregnated wood.',
    examples: 'Wooden pallets (untreated), wooden crates, fruit crates, wood wool',
    recyclable: true,
    recyclingHinweis: 'Material recovery or thermal recovery',
    erkennungsmerkmal: 'Natural wood color, no chemical odor',
  },
  {
    id: 'wood-for51',
    name: 'FOR 51 - Cork',
    code: 'FOR 51',
    category: 'Wood',
    description: 'Bark of the cork oak, renewable raw material.',
    examples: 'Wine corks, cork flooring, bulletin boards, gaskets',
    recyclable: true,
    recyclingHinweis: 'Well recyclable into granules for insulation, flooring, etc.',
    erkennungsmerkmal: 'Lightweight, elastic, honeycomb structure',
  },

  // === TEXTILES (60-69) ===
  {
    id: 'tex-60',
    name: 'TEX 60 - Cotton',
    code: 'TEX 60',
    category: 'Textile',
    description: 'Natural fiber from the cotton plant.',
    examples: 'Textile packaging, cotton bags, padding material',
    recyclable: true,
    recyclingHinweis: 'Reusable as material or as cleaning rags',
    erkennungsmerkmal: 'Soft, absorbent, natural',
  },
  {
    id: 'tex-61',
    name: 'TEX 61 - Jute',
    code: 'TEX 61',
    category: 'Textile',
    description: 'Natural fiber, robust and tear-resistant.',
    examples: 'Jute sacks, coffee sacks, gift bags',
    recyclable: true,
    recyclingHinweis: 'Compostable or reusable as material',
    erkennungsmerkmal: 'Coarse texture, brown, slightly scratchy',
  },

  // === GLASS (70-72) ===
  {
    id: 'glass-gl70',
    name: 'GL 70 - Clear Glass',
    code: 'GL 70',
    category: 'Glass',
    description: 'Transparent, clear glass without coloring.',
    examples: 'Food jars, pharmaceutical bottles, cosmetic bottles',
    recyclable: true,
    recyclingHinweis: 'Infinitely recyclable, must be collected separately from colored glass',
    erkennungsmerkmal: 'Completely transparent, clear',
  },
  {
    id: 'glass-gl71',
    name: 'GL 71 - Green Glass',
    code: 'GL 71',
    category: 'Glass',
    description: 'Green-tinted glass, UV protection.',
    examples: 'Wine bottles, beer bottles, some mineral water bottles',
    recyclable: true,
    recyclingHinweis: 'Into green glass container, can also accept brown glass',
    erkennungsmerkmal: 'Green coloring, various shades of green',
  },
  {
    id: 'glass-gl72',
    name: 'GL 72 - Brown Glass',
    code: 'GL 72',
    category: 'Glass',
    description: 'Brown-tinted glass, best light protection.',
    examples: 'Beer bottles, medicine bottles, some food jars',
    recyclable: true,
    recyclingHinweis: 'Into brown glass container (or green glass)',
    erkennungsmerkmal: 'Brown coloring, from light brown to dark brown',
  },

  // === COMPOSITE MATERIALS (80-99) ===
  {
    id: 'composite-c-pap',
    name: 'C/PAP - Composite with Paper',
    code: 'C/PAP',
    category: 'Composite',
    description: 'Paper/cardboard as main component combined with other materials.',
    examples: 'Beverage cartons (Tetra Pak), coated cartons, paper with plastic coating',
    recyclable: true,
    recyclingHinweis: 'Recyclable in many regions via recycling bins, paper fibers are recovered',
    erkennungsmerkmal: 'Feels like cardboard, but glossy coated on the inside',
  },
  {
    id: 'composite-c-ldpe',
    name: 'C/LDPE - Composite Film with LDPE',
    code: 'C/LDPE',
    category: 'Composite',
    description: 'Multi-layer film with LDPE and other plastics or aluminum.',
    examples: 'Chip bags, stand-up pouches, coffee packaging, cheese packaging',
    recyclable: false,
    recyclingHinweis: 'Usually not recyclable as material, thermal recovery',
    erkennungsmerkmal: 'Metallic sheen on inside, crinkles, multiple layers visible',
  },
  {
    id: 'composite-c-alu',
    name: 'C/ALU - Composite with Aluminum',
    code: 'C/ALU',
    category: 'Composite',
    description: 'Material composite with aluminum, often for barrier packaging.',
    examples: 'Blister packs, coffee capsules, lid foils, tubes with aluminum coating',
    recyclable: false,
    recyclingHinweis: 'Difficult to recycle, aluminum hard to separate',
    erkennungsmerkmal: 'Silver-shiny, aluminum is palpable',
  },

  // === OTHER ===
  {
    id: 'ceramic',
    name: 'Ceramic / Porcelain',
    code: 'none',
    category: 'Other',
    description: 'Fired clay or porcelain.',
    examples: 'Ceramic containers, porcelain vessels, clay jugs',
    recyclable: false,
    recyclingHinweis: 'Not recyclable in the glass cycle! General waste or construction debris',
    erkennungsmerkmal: 'Hard, opaque, resonates when tapped',
  },
  {
    id: 'styrofoam-eps',
    name: 'EPS - Expanded Polystyrene (Styrofoam)',
    code: '♸ 06 PS',
    category: 'Plastic',
    description: 'Foamed polystyrene, extremely lightweight.',
    examples: 'Transport protection, insulated boxes, molded parts, insulation',
    recyclable: true,
    recyclingHinweis: 'Recyclable with clean separation, often at collection points',
    erkennungsmerkmal: 'Very lightweight, white, crumbles, squeaks when rubbed',
  },
  {
    id: 'foam-epp',
    name: 'EPP - Expanded Polypropylene',
    code: '♷ 05 PP',
    category: 'Plastic',
    description: 'Foamed PP, elastic and shock-absorbing.',
    examples: 'Automotive bumpers, reusable packaging, protective cases',
    recyclable: true,
    recyclingHinweis: 'Recyclable, often used as a reusable solution',
    erkennungsmerkmal: 'Similar to Styrofoam but more elastic, springs back',
  },
  {
    id: 'bubble-wrap',
    name: 'Bubble Wrap (PE)',
    code: '♴ 02 HDPE / ♶ 04 LDPE',
    category: 'Plastic',
    description: 'PE film with enclosed air chambers.',
    examples: 'Protective packaging, cushioning material',
    recyclable: true,
    recyclingHinweis: 'Recyclable as PE, let air escape before disposal',
    erkennungsmerkmal: 'Transparent, air bubbles visible, poppable',
  },
  {
    id: 'shrink-wrap',
    name: 'Shrink Wrap (PE/PVC/PET)',
    code: 'depends on material',
    category: 'Plastic',
    description: 'Film that shrinks when heated.',
    examples: 'Pallet securing, bundle packaging, sealing',
    recyclable: true,
    recyclingHinweis: 'Depends on material, PE is most recyclable',
    erkennungsmerkmal: 'Tightly stretched, closely fitted to product',
  },
  {
    id: 'stretch-wrap',
    name: 'Stretch Wrap (LLDPE)',
    code: '♶ 04 LLDPE',
    category: 'Plastic',
    description: 'Highly stretchable film for load securing.',
    examples: 'Pallet wrapping, bundling, transport protection',
    recyclable: true,
    recyclingHinweis: 'Well recyclable, often commercial collection',
    erkennungsmerkmal: 'Highly stretchable, tacky, transparent',
  },
  {
    id: 'fill-material',
    name: 'Fill Material (Paper/Plastic)',
    code: 'depends on material',
    category: 'Other',
    description: 'Cushioning and fill material of various types.',
    examples: 'Packing paper, packing peanuts, air pillows, shredded paper',
    recyclable: true,
    recyclingHinweis: 'Separate by material and dispose accordingly',
    erkennungsmerkmal: 'Loose material for void filling',
  },
  {
    id: 'desiccant',
    name: 'Desiccant (Silica Gel)',
    code: 'none',
    category: 'Other',
    description: 'Moisture absorber in small packets.',
    examples: 'Inserts in packaging, shoes, electronics',
    recyclable: false,
    recyclingHinweis: 'General waste, can be regenerated but not typical for households',
    erkennungsmerkmal: 'Small packets with beads, "Do not eat"',
  },
] as const;

// Wireless types
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
