import type { ProductGroup } from '@/types/master-label';

// ---------------------------------------------------------------------------
// Category → Product Group mapping
// ---------------------------------------------------------------------------

export const CATEGORY_TO_PRODUCT_GROUP: Record<string, ProductGroup> = {
  // Electronics
  'Electronics': 'electronics',
  'Consumer Electronics': 'electronics',
  'IT Equipment': 'electronics',
  'Telecommunications': 'electronics',
  'Electrical Equipment': 'electronics',
  'Batteries': 'electronics',
  'Lighting': 'electronics',
  'Smart Home': 'electronics',
  'Audio & Video': 'electronics',
  'Wearables': 'electronics',
  'Computer Hardware': 'electronics',

  // Textiles
  'Textiles': 'textiles',
  'Clothing': 'textiles',
  'Footwear': 'textiles',
  'Fashion': 'textiles',
  'Home Textiles': 'textiles',
  'Sportswear': 'textiles',
  'Workwear': 'textiles',

  // Toys
  'Toys': 'toys',
  'Games': 'toys',
  'Children Products': 'toys',
  'Baby Products': 'toys',

  // Household
  'Household': 'household',
  'Kitchen': 'household',
  'Home & Garden': 'household',
  'Cleaning': 'household',
  'Food Contact Materials': 'household',
  'Furniture': 'household',
  'Kitchenware': 'household',
};

// Fallback: regex patterns for category name matching
export const CATEGORY_NAME_PATTERNS: Array<{ pattern: RegExp; group: ProductGroup }> = [
  { pattern: /electr|batter|power|charger|cable|audio|video|smart|iot|sensor|led|lamp|lighting/i, group: 'electronics' },
  { pattern: /textil|cloth|wear|fabric|shirt|pant|dress|shoe|boot|sneaker|jacket/i, group: 'textiles' },
  { pattern: /toy|game|play|child|baby|kid|infant|doll|puzzle/i, group: 'toys' },
  { pattern: /household|kitchen|cook|clean|furnitur|garden|home.*app|food.*contact/i, group: 'household' },
];

// ---------------------------------------------------------------------------
// Certification detection patterns
// ---------------------------------------------------------------------------

export const CERT_PATTERNS: Record<string, RegExp> = {
  ce: /\bce\b|ce[- ]?kennzeichnung|ce[- ]?mark/i,
  rohs: /\brohs\b/i,
  weee: /\bweee\b/i,
  ukca: /\bukca\b/i,
  en71: /\ben[- ]?71\b/i,
  oeko_tex: /oeko[- ]?tex|öko[- ]?tex/i,
  gots: /\bgots\b/i,
  food_contact: /food[- ]?contact|food[- ]?grade|fcm|regulation.*1935/i,
  reach: /\breach\b/i,
  emc: /\bemc\b|electromagnetic/i,
  red: /\bred\b|radio.*equipment/i,
  energy_label: /energy[- ]?label|energy[- ]?star|eprel/i,
  gs: /\bgs[- ]?zeichen\b|\bgs[- ]?mark\b|\btüv\b/i,
};

// ---------------------------------------------------------------------------
// CE-applicable product groups
// ---------------------------------------------------------------------------

export const CE_APPLICABLE_GROUPS: ProductGroup[] = ['electronics', 'toys', 'household'];

// ---------------------------------------------------------------------------
// Product group display labels (i18n keys)
// ---------------------------------------------------------------------------

export const PRODUCT_GROUP_LABELS: Record<ProductGroup, string> = {
  electronics: 'Electronics',
  textiles: 'Textiles',
  toys: 'Toys',
  household: 'Household',
  general: 'General',
};

// ---------------------------------------------------------------------------
// Packaging material code mappings (common recycling codes)
// ---------------------------------------------------------------------------

export const PACKAGING_MATERIAL_CODES: Record<string, string> = {
  'paper': 'PAP 20',
  'cardboard': 'PAP 20',
  'corrugated cardboard': 'PAP 20',
  'karton': 'PAP 20',
  'papier': 'PAP 20',
  'pappe': 'PAP 20',
  'ldpe': 'LDPE 4',
  'polyethylene': 'LDPE 4',
  'hdpe': 'HDPE 2',
  'pp': 'PP 5',
  'polypropylene': 'PP 5',
  'pet': 'PET 1',
  'ps': 'PS 6',
  'polystyrene': 'PS 6',
  'styrofoam': 'PS 6',
  'eps': 'EPS 6',
  'glass': 'GL 70',
  'aluminum': 'ALU 41',
  'aluminium': 'ALU 41',
  'steel': 'FE 40',
  'tin': 'FE 40',
  'wood': 'FOR 50',
  'holz': 'FOR 50',
  'cotton': 'TEX 60',
  'baumwolle': 'TEX 60',
  'foam': 'PS 6',
  'bubble wrap': 'LDPE 4',
  'plastic film': 'LDPE 4',
  'folie': 'LDPE 4',
  'kunststoff': 'PP 5',
};
