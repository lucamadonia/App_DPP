import {
  Apple,
  Armchair,
  Baby,
  BatteryCharging,
  BrickWall,
  Car,
  Cog,
  Cpu,
  FlaskConical,
  Gem,
  Glasses,
  HardHat,
  House,
  Lightbulb,
  Music,
  Package,
  Paperclip,
  PawPrint,
  Pill,
  Shirt,
  ShieldCheck,
  Sparkles,
  SprayCan,
  Sprout,
  Stethoscope,
  Sun,
  Thermometer,
  ToyBrick,
  Tractor,
  UtensilsCrossed,
  Volleyball,
  type LucideIcon,
} from 'lucide-react';
import type { Category } from '@/types/database';

/**
 * One icon per product category, for every surface that shows one — the
 * checklist picker, the category directory, the market-entry wizard.
 *
 * Single source of truth on purpose: those screens each carried their own
 * list, which is how the same category ended up as an emoji on one page and
 * a Lucide glyph on the next. Add a category here, not at the call site.
 * Note this is *product* categories — the compliance-topic icons in
 * ChecklistPage (Safety, Recycling, ...) are a separate taxonomy.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  electronics: Cpu,
  household_electronics: House,
  lighting: Lightbulb,
  textiles: Shirt,
  toys: ToyBrick,
  furniture: Armchair,
  cosmetics: Sparkles,
  food: Apple,
  food_contact: UtensilsCrossed,
  food_supplements: Pill,
  batteries: BatteryCharging,
  chemicals: FlaskConical,
  medical: Stethoscope,
  medical_devices: Stethoscope,
  construction: BrickWall,
  machinery: Cog,
  automotive: Car,
  packaging: Package,
  pet_products: PawPrint,
  sports: Volleyball,
  baby: Baby,
  psa: HardHat,
  renewable: Sun,
  pet: PawPrint,
  garden: Sprout,
  office: Paperclip,
  jewelry: Gem,
  optics: Glasses,
  music: Music,
  heating_cooling: Thermometer,
  security: ShieldCheck,
  agriculture: Tractor,
  cleaning: SprayCan,
  general: Package,
};

/**
 * Name fragments that resolve to a category, for rows that carry no usable
 * slug. Seeded `categories` rows have a generated UUID id and a German name
 * ("Elektronik"), so an id lookup alone would silently fall through to the
 * generic icon for every real database category.
 *
 * Ordered, first match wins: the narrower fragments must come before the
 * broader ones they contain ("food contact" before "food", otherwise Food
 * Contact Materials would resolve to the apple).
 */
const NAME_FRAGMENTS: [fragment: string, key: string][] = [
  ['food contact', 'food_contact'],
  ['food_contact', 'food_contact'],
  ['lebensmittelkontakt', 'food_contact'],
  ['food supplement', 'food_supplements'],
  ['food_supplement', 'food_supplements'],
  ['nahrungsergänzung', 'food_supplements'],
  ['household', 'household_electronics'],
  ['haushalt', 'household_electronics'],
  ['elektronik', 'electronics'],
  ['electronic', 'electronics'],
  ['lighting', 'lighting'],
  ['beleuchtung', 'lighting'],
  ['textil', 'textiles'],
  ['fashion', 'textiles'],
  ['toy', 'toys'],
  ['spielzeug', 'toys'],
  ['spielwaren', 'toys'],
  ['furniture', 'furniture'],
  ['möbel', 'furniture'],
  ['mobel', 'furniture'],
  ['cosmetic', 'cosmetics'],
  ['kosmetik', 'cosmetics'],
  ['batter', 'batteries'], // battery / batteries / Batterien
  ['akku', 'batteries'],
  ['chemical', 'chemicals'],
  ['chemikalien', 'chemicals'],
  ['medical', 'medical'],
  ['medizin', 'medical'],
  ['construction', 'construction'],
  ['baumaterial', 'construction'],
  ['baustoff', 'construction'],
  ['machinery', 'machinery'],
  ['maschine', 'machinery'],
  ['automotive', 'automotive'],
  ['fahrzeug', 'automotive'],
  ['packaging', 'packaging'],
  ['verpackung', 'packaging'],
  ['sport', 'sports'],
  ['baby', 'baby'],
  ['ppe', 'psa'],
  ['protective', 'psa'],
  ['schutzausrüstung', 'psa'],
  ['renewable', 'renewable'],
  ['erneuerbar', 'renewable'],
  ['pet ', 'pet_products'],
  ['haustier', 'pet_products'],
  ['tierbedarf', 'pet_products'],
  ['garden', 'garden'],
  ['garten', 'garden'],
  ['office', 'office'],
  ['büro', 'office'],
  ['schreibwaren', 'office'],
  ['jewel', 'jewelry'],
  ['schmuck', 'jewelry'],
  ['optic', 'optics'],
  ['optik', 'optics'],
  ['music', 'music'],
  ['musik', 'music'],
  ['heating', 'heating_cooling'],
  ['heizung', 'heating_cooling'],
  ['klima', 'heating_cooling'],
  ['security', 'security'],
  ['sicherheit', 'security'],
  ['agricultur', 'agriculture'],
  ['landwirtschaft', 'agriculture'],
  ['cleaning', 'cleaning'],
  ['reinigung', 'cleaning'],
  ['food', 'food'],
  ['lebensmittel', 'food'],
];

/**
 * Resolve a category to its icon. Pass every identifying string you have —
 * typically the id and the display name — and the first one that resolves
 * wins. Callers differ in what they hold: the hard-coded pickers have slug
 * ids, database rows have a UUID plus a localised name.
 */
export function getCategoryIcon(...candidates: (string | undefined | null)[]): LucideIcon {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalised = candidate.toLowerCase().trim();

    const bySlug = CATEGORY_ICONS[normalised.replace(/-/g, '_')];
    if (bySlug) return bySlug;

    const fragment = NAME_FRAGMENTS.find(([f]) => normalised.includes(f));
    if (fragment) return CATEGORY_ICONS[fragment[1]] ?? Package;
  }

  return Package;
}

export function getCategoryDisplayName(cat: Category, locale: string): string {
  return cat.translations?.[locale] || cat.name;
}

export function getSubcategoryDisplayName(cat: Category, subName: string, locale: string): string {
  return cat.subcategory_translations?.[subName]?.[locale] || subName;
}
