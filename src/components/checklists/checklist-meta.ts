import {
  BookOpen,
  Circle,
  CheckCircle2,
  Clock,
  Factory,
  FileText,
  FlaskConical,
  Globe,
  Minus,
  Package,
  Recycle,
  Shield,
  Tag,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export type ChecklistItemStatus = 'pending' | 'in_progress' | 'completed' | 'not_applicable';

export interface ChecklistItem {
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
  status: ChecklistItemStatus;
  legalBasis?: string;
  authority?: string;
  deadline?: string;
  penalties?: string;
  tips?: string[];
  links?: { title: string; url: string }[];
  applicableProducts?: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export const STATUS_ORDER: ChecklistItemStatus[] = ['pending', 'in_progress', 'completed', 'not_applicable'];

export const STATUS_META: Record<
  ChecklistItemStatus,
  { icon: LucideIcon; labelKey: string; iconClass: string; rowClass: string }
> = {
  pending: {
    icon: Circle,
    labelKey: 'Pending',
    iconClass: 'text-muted-foreground',
    rowClass: 'bg-card hover:border-primary/30',
  },
  in_progress: {
    icon: Clock,
    labelKey: 'In Progress',
    iconClass: 'text-warning',
    rowClass: 'border-warning/30 bg-warning/[0.06]',
  },
  completed: {
    icon: CheckCircle2,
    labelKey: 'Completed',
    iconClass: 'text-success',
    rowClass: 'border-success/25 bg-success/[0.06]',
  },
  not_applicable: {
    icon: Minus,
    labelKey: 'Not Applicable',
    iconClass: 'text-muted-foreground',
    rowClass: 'bg-muted/40 opacity-80',
  },
};

/** Section icons for the (free-form, bilingual) checklist group names. */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'Product Safety & CE Conformity': Shield,
  'Safety & CE Conformity': Shield,
  Safety: Shield,
  'CE Conformity': Shield,
  'General Product Safety': Shield,
  'Machine Safety': Shield,
  'Toy Safety': Shield,
  'Food Safety': Shield,
  'Environment & Sustainability': Recycle,
  Sustainability: Recycle,
  Recycling: Recycle,
  'Recycling & Disposal': Recycle,
  'Take-back & Recovery': Recycle,
  'Circular Economy': Recycle,
  'Electrical Equipment Act (ElektroG)': Recycle,
  'Chemicals & Ingredients': FlaskConical,
  'RoHS (Substance Restrictions)': FlaskConical,
  'REACH (Chemicals)': FlaskConical,
  'Chemicals (REACH)': FlaskConical,
  Chemicals: FlaskConical,
  'Ingredients & Safety': FlaskConical,
  'Substance Restrictions': FlaskConical,
  'Labeling & Packaging': Tag,
  Labeling: Tag,
  'Product Labeling': Tag,
  'Product Identification': Tag,
  'Textile Labeling': Tag,
  'Food Labeling': Tag,
  'Energy Labeling': Zap,
  'Packaging (VerpackG)': Package,
  Packaging: Package,
  'Packaging Compliance': Package,
  'Documentation & Traceability': BookOpen,
  'Documentation & Manuals': BookOpen,
  Documentation: BookOpen,
  Traceability: BookOpen,
  'Registration Germany': FileText,
  Registration: FileText,
  'Social Responsibility & Supply Chain': Factory,
  'Supply Chain Due Diligence': Factory,
  'EPR (Producer Responsibility)': Factory,
  'Producer Responsibility': Factory,
  'Digital Product Passport': Globe,
  DPP: Globe,
  'Batteries (BattG)': Zap,
  'EU Battery Regulation': Zap,
  'Battery Compliance': Zap,
};

/**
 * Exact match first, then a keyword fallback so German group names
 * ("Verpackung", "Chemikalien", "Batterien") still get a fitting icon.
 */
export function getChecklistGroupIcon(category: string): LucideIcon {
  const exact = CATEGORY_ICONS[category];
  if (exact) return exact;
  const c = category.toLowerCase();
  if (/batter/.test(c)) return Zap;
  if (/energ/.test(c)) return Zap;
  if (/verpack|packag/.test(c)) return Package;
  if (/chemi|reach|rohs|stoff|substan|ingred/.test(c)) return FlaskConical;
  if (/kennzeich|label|etikett/.test(c)) return Tag;
  if (/recycl|umwelt|environ|sustain|nachhalt|weee|elektrog|entsorg/.test(c)) return Recycle;
  if (/dokument|document|traceab|rückverfolg/.test(c)) return BookOpen;
  if (/regist/.test(c)) return FileText;
  if (/lieferkett|supply|sozial|social|epr|hersteller/.test(c)) return Factory;
  if (/dpp|passport|produktpass/.test(c)) return Globe;
  return Shield;
}

export const COUNTRY_CODES: { code: string; nameKey: string; flag: string }[] = [
  { code: 'DE', nameKey: 'Germany', flag: '🇩🇪' },
  { code: 'FR', nameKey: 'France', flag: '🇫🇷' },
  { code: 'AT', nameKey: 'Austria', flag: '🇦🇹' },
  { code: 'IT', nameKey: 'Italy', flag: '🇮🇹' },
  { code: 'ES', nameKey: 'Spain', flag: '🇪🇸' },
  { code: 'NL', nameKey: 'Netherlands', flag: '🇳🇱' },
  { code: 'GB', nameKey: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', nameKey: 'United States', flag: '🇺🇸' },
  { code: 'CH', nameKey: 'Switzerland', flag: '🇨🇭' },
  { code: 'PL', nameKey: 'Poland', flag: '🇵🇱' },
  { code: 'CZ', nameKey: 'Czech Republic', flag: '🇨🇿' },
  { code: 'SE', nameKey: 'Sweden', flag: '🇸🇪' },
  { code: 'DK', nameKey: 'Denmark', flag: '🇩🇰' },
  { code: 'BE', nameKey: 'Belgium', flag: '🇧🇪' },
  { code: 'PT', nameKey: 'Portugal', flag: '🇵🇹' },
  { code: 'IE', nameKey: 'Ireland', flag: '🇮🇪' },
];

/** Icons come from the shared registry (getCategoryIcon), not from this list. */
export const PRODUCT_CATEGORIES: { id: string; nameKey: string }[] = [
  { id: 'electronics', nameKey: 'Electronics' },
  { id: 'textiles', nameKey: 'Textiles' },
  { id: 'batteries', nameKey: 'Batteries' },
  { id: 'furniture', nameKey: 'Furniture' },
  { id: 'toys', nameKey: 'Toys' },
  { id: 'packaging', nameKey: 'Packaging' },
  { id: 'cosmetics', nameKey: 'Cosmetics' },
  { id: 'food', nameKey: 'Food' },
  { id: 'construction', nameKey: 'Construction Materials' },
  { id: 'machinery', nameKey: 'Machinery' },
  { id: 'medical_devices', nameKey: 'Medical Devices' },
  { id: 'automotive', nameKey: 'Automotive' },
  { id: 'chemicals', nameKey: 'Chemical Products' },
  { id: 'food_supplements', nameKey: 'Food Supplements' },
  { id: 'pet_products', nameKey: 'Pet Products' },
];
